import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractClaimScope, generateClaimHash } from '@/lib/citations/scope';
import { fetchAccessibleContent } from '@/lib/evidence/reader/fetcher';
import { locateEvidencePassages } from '@/lib/evidence/reader/locator';
import { evaluateClaimSupport } from '@/lib/evidence/reader/evaluator';
import { upsertClaim } from '@/lib/evidence/claims';
import { normalizeClaimText } from '@/lib/evidence/normalize';

export async function GET(
  request: Request,
  { params }: { params: { workId: string; citationId: string } }
) {
  try {
    const { citationId, workId } = params;
    const url = new URL(request.url);
    const claimText = url.searchParams.get('claimText') || '';

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: citation } = await supabase
      .from('citations')
      .select('claim_support_status, document_id, source_id')
      .eq('id', citationId)
      .single();

    if (!citation) {
      return NextResponse.json({ error: 'Citation not found' }, { status: 404 });
    }

    // Relationship Scope & Authorization: Citation -> Document -> Work -> User
    const { data: docCheck } = await supabase
      .from('documents')
      .select('id')
      .eq('id', citation.document_id)
      .eq('work_id', workId)
      .eq('user_id', user.id)
      .single();
      
    if (!docCheck) {
      return NextResponse.json({ error: 'Unauthorized cross-work access' }, { status: 403 });
    }

    if (!citation.claim_support_status || citation.claim_support_status === 'not_checked') {
      return NextResponse.json({ status: 'not_checked' });
    }

    // Resolve current claim based on hash
    const normalizedText = normalizeClaimText(claimText);
    const contentHash = generateClaimHash(normalizedText, citationId, null);

    const { data: claim } = await supabase
      .from('claims')
      .select('id')
      .eq('document_id', citation.document_id)
      .eq('content_hash', contentHash)
      .maybeSingle();

    if (!claim) {
      // Claim text changed, old verification doesn't apply
      return NextResponse.json({ status: 'not_checked' });
    }

    const { data: cse } = await supabase
      .from('claim_source_evidence')
      .select('*')
      .eq('claim_id', claim.id)
      .eq('source_id', citation.source_id)
      .maybeSingle();

    if (!cse || cse.relationship === 'not_checked') {
      return NextResponse.json({ status: 'not_checked' });
    }

    const metadata = cse.metadata as any || {};
    return NextResponse.json({
      status: cse.relationship,
      conversationalResponse: metadata.conversationalResponse || '',
      passages: metadata.evidence_passages || [],
      method: cse.evidence_level === 'abstract_checked' ? 'abstract' : 'full_text'
    });
  } catch (err: any) {
    console.error('[verify GET] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { workId: string; citationId: string } }
) {
  try {
    const { citationId, workId } = params;
    
    // Auth & Workspace checks
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { candidateClaimText } = body;
    if (!candidateClaimText) {
      return NextResponse.json({ error: 'Missing candidateClaimText' }, { status: 400 });
    }

    // Load Citation & Source
    const { data: citation } = await supabase
      .from('citations')
      .select('source_id, document_id, metadata')
      .eq('id', citationId)
      .single();
      
    if (!citation || !citation.source_id || !citation.document_id) {
      return NextResponse.json({ error: 'Citation or source not found' }, { status: 404 });
    }

    // Relationship Scope & Authorization: Citation -> Document -> Work -> User
    const { data: docCheck } = await supabase
      .from('documents')
      .select('id')
      .eq('id', citation.document_id)
      .eq('work_id', workId)
      .eq('user_id', user.id)
      .single();
      
    if (!docCheck) {
      return NextResponse.json({ error: 'Unauthorized cross-work access' }, { status: 403 });
    }

    const { data: dbSource } = await supabase
      .from('sources')
      .select('normalized_source')
      .eq('id', citation.source_id)
      .single();

    if (!dbSource?.normalized_source) {
       return NextResponse.json({ error: 'Invalid source data' }, { status: 400 });
    }

    const scope = extractClaimScope(citationId, citation.source_id, candidateClaimText);
    if (scope.atomicClaims.length === 0) {
      return NextResponse.json({ error: 'Could not extract valid claim' }, { status: 400 });
    }

    // Upsert Claim
    const claimId = await upsertClaim(supabase, {
      workId,
      documentId: citation.document_id,
      userId: user.id,
      blockId: citationId,
      claimText: candidateClaimText
    });

    // 1. Fetch Content
    const fetched = await fetchAccessibleContent(dbSource.normalized_source, undefined);
    
    if (!fetched) {
       return NextResponse.json({ 
         status: 'unclear', 
         conversationalResponse: "I could not retrieve any accessible text for this source to verify the claim." 
       });
    }

    // 2. Locate Passages
    const passages = locateEvidencePassages(fetched.text, scope, 3);
    if (fetched.sourceUrl) {
      passages.forEach(p => p.sourceUrl = fetched.sourceUrl);
    }

    // 3. Evaluate
    const verification = await evaluateClaimSupport(scope, passages);

    // 4. Save to claim_source_evidence
    const evidence_level = fetched.method === 'abstract' ? 'abstract_checked' : 'full_text_section_checked';
    const evidence_source = fetched.method === 'abstract' ? 'provider_abstract' : 'open_access_content';

    await supabase.from('claim_source_evidence').upsert({
      claim_id: claimId,
      source_id: citation.source_id,
      citation_id: citationId,
      user_id: user.id,
      relationship: verification.status,
      evidence_level,
      evidence_source,
      verification_method: 'llm_evaluated',
      metadata: {
        conversationalResponse: verification.conversationalResponse,
        evidence_passages: passages
      }
    }, { onConflict: 'claim_id,source_id' });

    // Update citation status and clear old heavy metadata
    const currentMetadata = typeof citation.metadata === 'object' && citation.metadata !== null ? citation.metadata : {};
    if ('claim_source_evidence' in currentMetadata) {
      delete currentMetadata.claim_source_evidence;
    }
    
    await supabase.from('citations').update({
       claim_support_status: verification.status,
       metadata: { ...currentMetadata, lastEvidenceCheckAt: new Date().toISOString() }
    }).eq('id', citationId);

    return NextResponse.json({
      status: verification.status,
      conversationalResponse: verification.conversationalResponse,
      passages,
      method: fetched.method
    });

  } catch (err: any) {
    console.error('[verify] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
