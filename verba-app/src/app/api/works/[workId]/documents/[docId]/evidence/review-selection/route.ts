import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractPassageClaims, generateClaimHash } from '@/lib/citations/scope';
import { evaluateClaimCheckability, classifyClaimType, evaluateClaimSupportDeterministic, checkNumericalAnchors, detectTemporalMismatch, ClaimSupportStatus } from '@/lib/citations/claimSupport';
import { upsertClaim } from '@/lib/evidence/claims';
import { fetchAccessibleContent } from '@/lib/evidence/reader/fetcher';
import { locateEvidencePassages } from '@/lib/evidence/reader/locator';
import { evaluateClaimSupport } from '@/lib/evidence/reader/evaluator';
import { normalizeClaimText } from '@/lib/evidence/normalize';

export async function POST(
  request: Request,
  { params }: { params: { workId: string; docId: string } }
) {
  try {
    const { workId, docId } = params;
    
    // Auth & Workspace checks
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { selectionText, blockId, associatedCitations = [] } = body;
    
    if (!selectionText) {
      return NextResponse.json({ error: 'Missing selectionText' }, { status: 400 });
    }

    const { data: docCheck } = await supabase
      .from('documents')
      .select('id')
      .eq('id', docId)
      .eq('work_id', workId)
      .eq('user_id', user.id)
      .single();
      
    if (!docCheck) {
      return NextResponse.json({ error: 'Unauthorized cross-work access' }, { status: 403 });
    }

    // Extract sentences from selection
    const sentences = extractPassageClaims(selectionText);
    const results = [];

    for (const sentence of sentences) {
      const checkability = evaluateClaimCheckability(sentence);
      const claimType = classifyClaimType(sentence);
      
      // Determine if missing citation
      if (associatedCitations.length === 0) {
        if (checkability === 'checkable_claim') {
           // Insert claim as missing evidence
           await upsertClaim(supabase, {
             workId,
             documentId: docId,
             userId: user.id,
             blockId: blockId || 'selection',
             claimText: sentence,
             claimType
           });
           results.push({
             claimText: sentence,
             type: claimType,
             checkability,
             missingCitation: true,
             status: 'not_checked',
             conversationalResponse: "This sentence makes a specific claim, but no citation is associated. You should add a citation or find evidence.",
             passages: []
           });
           continue;
        } else {
           results.push({
             claimText: sentence,
             type: claimType,
             checkability,
             missingCitation: false,
             status: 'not_checkable',
             conversationalResponse: "Not enough of a factual claim to check.",
             passages: []
           });
           continue;
        }
      }

      // If citations are associated, we will check against the first one for simplicity
      const targetCitationId = associatedCitations[0];
      
      const { data: citation } = await supabase
        .from('citations')
        .select('source_id')
        .eq('id', targetCitationId)
        .single();
        
      if (!citation || !citation.source_id) {
         results.push({
             claimText: sentence,
             type: claimType,
             checkability,
             missingCitation: true,
             status: 'not_checked',
             conversationalResponse: "Citation source could not be resolved.",
             passages: []
         });
         continue;
      }

      // 1. Persist the claim
      const claimId = await upsertClaim(supabase, {
         workId,
         documentId: docId,
         userId: user.id,
         blockId: blockId || targetCitationId,
         claimText: sentence,
         claimType
      });

      // 2. Cache Check via claim_source_evidence
      const normalizedText = normalizeClaimText(sentence);
      const contentHash = generateClaimHash(normalizedText, targetCitationId, null);

      const { data: cse } = await supabase
        .from('claim_source_evidence')
        .select('*')
        .eq('claim_id', claimId)
        .eq('source_id', citation.source_id)
        .maybeSingle();

      if (cse && cse.relationship !== 'not_checked') {
        const metadata = cse.metadata as any || {};
        results.push({
          claimText: sentence,
          type: claimType,
          checkability,
          missingCitation: false,
          associatedCitationId: targetCitationId,
          status: cse.relationship,
          conversationalResponse: metadata.conversationalResponse || '',
          passages: metadata.evidence_passages || [],
          method: cse.evidence_level === 'abstract_checked' ? 'abstract' : 'full_text'
        });
        continue;
      }

      // Load DB Source
      const { data: dbSource } = await supabase
        .from('sources')
        .select('normalized_source')
        .eq('id', citation.source_id)
        .single();

      if (!dbSource?.normalized_source) {
         results.push({
             claimText: sentence,
             type: claimType,
             checkability,
             missingCitation: false,
             associatedCitationId: targetCitationId,
             status: 'unclear',
             conversationalResponse: "Source metadata is missing.",
             passages: []
         });
         continue;
      }

      // 3. Fallback: Fetch content
      const fetched = await fetchAccessibleContent(dbSource.normalized_source, undefined);
      if (!fetched) {
         results.push({
             claimText: sentence,
             type: claimType,
             checkability,
             missingCitation: false,
             associatedCitationId: targetCitationId,
             status: 'unclear',
             conversationalResponse: "I could not retrieve any accessible text for this source to verify the claim.",
             passages: []
         });
         continue;
      }

      // 4. Deterministic evaluation
      if (checkability === 'non_claim' || checkability === 'weak_or_incomplete_claim') {
         results.push({
             claimText: sentence,
             type: claimType,
             checkability,
             missingCitation: false,
             associatedCitationId: targetCitationId,
             status: 'not_checkable',
             conversationalResponse: "Not enough of a factual claim to check.",
             passages: []
         });
         continue;
      }
      
      const claimScope = {
         citationId: targetCitationId,
         sourceId: citation.source_id,
         sentence,
         paragraphContext: selectionText,
         candidateClaimText: selectionText,
         atomicClaims: [sentence],
         passageClaims: [sentence],
         claimHash: contentHash
      };

      // 5. Locate passages
      const passages = locateEvidencePassages(fetched.text, claimScope, 3);
      if (fetched.sourceUrl) {
         passages.forEach(p => p.sourceUrl = fetched.sourceUrl);
      }

      // 6. Semantic Evaluation (LLM)
      const verification = await evaluateClaimSupport(claimScope, passages);

      const evidence_level = fetched.method === 'abstract' ? 'abstract_checked' : 'full_text_section_checked';
      const evidence_source = fetched.method === 'abstract' ? 'provider_abstract' : 'open_access_content';

      // 7. Cache the result
      await supabase.from('claim_source_evidence').upsert({
        claim_id: claimId,
        source_id: citation.source_id,
        citation_id: targetCitationId,
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

      results.push({
          claimText: sentence,
          type: claimType,
          checkability,
          missingCitation: false,
          associatedCitationId: targetCitationId,
          status: verification.status,
          conversationalResponse: verification.conversationalResponse,
          passages,
          method: fetched.method
      });
    }

    return NextResponse.json({ results });

  } catch (err: any) {
    console.error('[review-selection] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
