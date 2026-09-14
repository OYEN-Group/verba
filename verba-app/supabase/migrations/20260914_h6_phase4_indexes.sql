-- H6 Phase 4 Capacity Readiness: Missing Indexes

-- 1. Optimize GET /works/[workId]/sources which orders by created_at DESC
CREATE INDEX IF NOT EXISTS work_sources_work_id_created_at_idx 
ON public.work_sources (work_id, created_at DESC);

-- 2. Optimize N+1 prevention queries for source relations
CREATE INDEX IF NOT EXISTS source_identifiers_source_id_idx 
ON public.source_identifiers (source_id);

CREATE INDEX IF NOT EXISTS source_locations_source_id_idx 
ON public.source_locations (source_id);

-- 3. Optimize document save route citation cleanup (document_citations by document_id)
CREATE INDEX IF NOT EXISTS document_citations_document_id_idx 
ON public.document_citations (document_id);

-- 4. Optimize claim resolution (claims by document_id)
CREATE INDEX IF NOT EXISTS claims_document_id_idx 
ON public.claims (document_id);
