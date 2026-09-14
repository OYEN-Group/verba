-- H6 Concurrency & Isolation Migration

-- 1. Enforce uniqueness for document versions to prevent duplicate version checkpoints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_document_id_version_number_key'
  ) THEN
    ALTER TABLE document_versions
    ADD CONSTRAINT document_versions_document_id_version_number_key UNIQUE (document_id, version_number);
  END IF;
END $$;

-- 2. Transaction-safe source creation with advisory lock
CREATE OR REPLACE FUNCTION create_or_get_source(
    p_work_id UUID,
    p_source_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_source_id UUID;
    v_lock_key BIGINT;
    v_existing_id UUID;
    v_identity_string TEXT;
    v_identifier JSONB;
    v_location JSONB;
    v_result JSONB;
    v_user_id UUID;
    v_work_owner UUID;
BEGIN
    -- 1. Enforce authentication and authorization inside SECURITY DEFINER
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Verify work ownership
    SELECT user_id INTO v_work_owner FROM public.works WHERE id = p_work_id;
    IF v_work_owner IS NULL OR v_work_owner != v_user_id THEN
        RAISE EXCEPTION 'Unauthorized work access' USING ERRCODE = 'P0002';
    END IF;

    -- 2. Derive a deterministic lock key based on work_id and a primary identity string
    v_identity_string := COALESCE(p_source_data->>'doi', p_source_data->>'title', 'unknown_source');
    v_lock_key := hashtext(p_work_id::text || v_identity_string);

    -- 3. Take a transaction-level advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 3. Duplicate Check: By DOI
    IF p_source_data->>'doi' IS NOT NULL THEN
        SELECT id INTO v_existing_id FROM public.work_sources 
        WHERE work_id = p_work_id AND doi = p_source_data->>'doi' LIMIT 1;
    END IF;

    -- 4. Duplicate Check: By Identifiers
    IF v_existing_id IS NULL AND jsonb_typeof(p_source_data->'identifiers') = 'array' THEN
        SELECT si.source_id INTO v_existing_id 
        FROM public.source_identifiers si
        JOIN public.work_sources ws ON ws.id = si.source_id
        WHERE ws.work_id = p_work_id 
        AND si.normalized_value IN (
            SELECT value->>'normalized_value' FROM jsonb_array_elements(p_source_data->'identifiers')
        )
        LIMIT 1;
    END IF;

    -- 5. Duplicate Check: By Title and Year
    IF v_existing_id IS NULL AND p_source_data->>'title' IS NOT NULL THEN
        SELECT ws.id INTO v_existing_id
        FROM public.work_sources ws
        WHERE ws.work_id = p_work_id
        AND ws.title = p_source_data->>'title'
        AND ws.publication_year = (p_source_data->>'publication_year')::INT
        AND (
            p_source_data->'authors' IS NULL OR 
            jsonb_array_length(p_source_data->'authors') = 0 OR
            LOWER(ws.authors->0->>'family') = LOWER(p_source_data->'authors'->0->>'family')
        )
        LIMIT 1;
    END IF;

    -- 6. Insert or Return Existing
    IF v_existing_id IS NOT NULL THEN
        -- Return the existing source
        SELECT to_jsonb(ws.*) || '{"_is_new": false}'::jsonb INTO v_result 
        FROM public.work_sources ws WHERE id = v_existing_id;
        
        RETURN v_result;
    ELSE
        -- Insert new source
        INSERT INTO public.work_sources (
            work_id, user_id, title, publication_year, doi, authors, source_type, container_title, abstract
        ) VALUES (
            p_work_id, 
            v_user_id, 
            p_source_data->>'title',
            (p_source_data->>'publication_year')::INT,
            p_source_data->>'doi',
            p_source_data->'authors',
            p_source_data->>'source_type',
            p_source_data->>'container_title',
            p_source_data->>'abstract'
        ) RETURNING id INTO v_source_id;

        -- Insert identifiers
        IF jsonb_typeof(p_source_data->'identifiers') = 'array' THEN
            FOR v_identifier IN SELECT * FROM jsonb_array_elements(p_source_data->'identifiers')
            LOOP
                INSERT INTO public.source_identifiers (source_id, identifier_type, original_value, normalized_value)
                VALUES (
                    v_source_id, 
                    v_identifier->>'identifier_type', 
                    v_identifier->>'original_value', 
                    v_identifier->>'normalized_value'
                );
            END LOOP;
        END IF;

        -- Insert locations
        IF jsonb_typeof(p_source_data->'locations') = 'array' THEN
            FOR v_location IN SELECT * FROM jsonb_array_elements(p_source_data->'locations')
            LOOP
                INSERT INTO public.source_locations (source_id, location_type, url, is_best, pdf_url)
                VALUES (
                    v_source_id, 
                    v_location->>'location_type', 
                    v_location->>'url', 
                    (v_location->>'is_best')::BOOLEAN, 
                    v_location->>'pdf_url'
                );
            END LOOP;
        END IF;

        -- Return the newly inserted source
        SELECT to_jsonb(ws.*) || '{"_is_new": true}'::jsonb INTO v_result 
        FROM public.work_sources ws WHERE id = v_source_id;
        
        RETURN v_result;
    END IF;
END;
$$;


-- 3. Transaction-safe Document Restore RPC
CREATE OR REPLACE FUNCTION restore_document_version(
    p_document_id UUID,
    p_version_id UUID,
    p_expected_version INT,
    p_safety_hash TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_version INT;
    v_new_version INT;
    v_user_id UUID;
    v_current_state JSONB;
    v_restore_state JSONB;
BEGIN
    -- Authenticate user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Get the target restore state
    SELECT editor_state INTO v_restore_state
    FROM public.document_versions
    WHERE id = p_version_id AND document_id = p_document_id AND user_id = v_user_id;

    IF v_restore_state IS NULL THEN
        RAISE EXCEPTION 'Version not found' USING ERRCODE = 'P0003';
    END IF;

    -- Validate expected version and get current state, taking a row-level lock
    SELECT editor_version, editor_state INTO v_current_version, v_current_state
    FROM public.documents
    WHERE id = p_document_id AND user_id = v_user_id
    FOR UPDATE;

    IF v_current_version IS NULL THEN
        RAISE EXCEPTION 'Document not found' USING ERRCODE = 'P0001';
    END IF;

    IF v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'Stale write conflict' USING ERRCODE = 'P0002';
    END IF;

    v_new_version := v_current_version + 1;

    -- Create safety checkpoint of current state
    INSERT INTO public.document_versions (
        document_id, user_id, version_number, source, editor_state, content_hash
    ) VALUES (
        p_document_id, v_user_id, v_new_version, 'restore_safety_checkpoint', v_current_state, p_safety_hash
    );

    v_new_version := v_new_version + 1;

    -- Update document with restored state
    UPDATE public.documents
    SET 
        editor_state = v_restore_state,
        editor_version = v_new_version,
        editor_updated_at = NOW()
    WHERE id = p_document_id AND user_id = v_user_id;

    -- Create restored checkpoint
    INSERT INTO public.document_versions (
        document_id, user_id, version_number, source, editor_state, content_hash
    ) VALUES (
        p_document_id, v_user_id, v_new_version, 'restored', v_restore_state, 'restore_' || p_version_id::text
    );

    RETURN v_new_version;
END;
$$;

-- 4. Harden RPC Grants
REVOKE EXECUTE ON FUNCTION create_or_get_source(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_or_get_source(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION create_or_get_source(UUID, JSONB) TO authenticated;

REVOKE EXECUTE ON FUNCTION restore_document_version(UUID, UUID, INT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION restore_document_version(UUID, UUID, INT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION restore_document_version(UUID, UUID, INT, TEXT) TO authenticated;
