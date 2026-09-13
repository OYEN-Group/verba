import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SourceSchema, normalizeDoi } from '@/lib/sources/normalize';

export async function GET(
  request: Request,
  { params }: { params: { workId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', params.workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const { data: sources, error } = await supabase
      .from('work_sources')
      .select('*, identifiers:source_identifiers(*), locations:source_locations(*)')
      .eq('work_id', params.workId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(sources);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { workId: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: work, error: workError } = await supabase
      .from('works')
      .select('id')
      .eq('id', params.workId)
      .eq('user_id', user.id)
      .single();

    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const body = await request.json();
    const { claimId, evidenceText, evidenceLevel, evidenceLocation, ...sourceBody } = body;
    
    const parseResult = SourceSchema.safeParse(sourceBody);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source data', details: parseResult.error.format() }, { status: 400 });
    }

    const sourceData = parseResult.data;

    // Relationship Scope Authorization: Verify the claim belongs to this work
    if (claimId) {
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select('id')
        .eq('id', claimId)
        .eq('work_id', params.workId)
        .eq('user_id', user.id)
        .single();
        
      if (claimError || !claimData) {
        return NextResponse.json({ error: 'Claim not found in this work' }, { status: 403 });
      }
    }
    
    // Transactional deduplication and creation handled safely in DB RPC
    const { data: sourceResult, error: rpcError } = await supabase.rpc('create_or_get_source', {
      p_work_id: params.workId,
      p_source_data: sourceData
    });

    if (rpcError) {
      console.error('[sources API] RPC error:', rpcError.message);
      return NextResponse.json({ error: 'Failed to save source safely' }, { status: 500 });
    }
    if (!sourceResult || !sourceResult.id) {
      return NextResponse.json({ error: 'Failed to retrieve source' }, { status: 500 });
    }

    const existingId = !sourceResult._is_new ? sourceResult.id : null;

    if (existingId) {
      if (claimId) {
        // Source already existed, link it to the claim
        await supabase.from('claim_source_evidence').upsert({
          claim_id: claimId,
          source_id: existingId,
          user_id: user.id,
          relationship: 'not_checked',
          evidence_level: evidenceLevel || 'metadata_only',
          evidence_text: evidenceText ? evidenceText.substring(0, 1000) : null,
          evidence_location: evidenceLocation || null,
          verification_method: 'not_checked',
        }, { onConflict: 'claim_id,source_id' });
        
        // Return existing source so frontend knows it succeeded
        const { data: existingSrc } = await supabase
          .from('work_sources')
          .select('*, identifiers:source_identifiers(*), locations:source_locations(*)')
          .eq('id', existingId)
          .single();
        return NextResponse.json(existingSrc);
      }
      return NextResponse.json({ error: 'SOURCE_ALREADY_EXISTS', sourceId: existingId }, { status: 409 });
    }

    // It is a newly inserted source. 
    // Insert claim evidence mapping if provided.
    if (claimId) {
      await supabase.from('claim_source_evidence').insert({
        claim_id: claimId,
        source_id: sourceResult.id,
        user_id: user.id,
        relationship: 'not_checked',
        evidence_level: evidenceLevel || 'metadata_only',
        evidence_text: evidenceText ? evidenceText.substring(0, 1000) : null,
        evidence_location: evidenceLocation || null,
        verification_method: 'not_checked',
      });
    }

    // Return with fetched arrays matching the format expected by the frontend
    const { data: finalInserted } = await supabase
      .from('work_sources')
      .select('*, identifiers:source_identifiers(*), locations:source_locations(*)')
      .eq('id', sourceResult.id)
      .single();

    return NextResponse.json(finalInserted || sourceResult);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
