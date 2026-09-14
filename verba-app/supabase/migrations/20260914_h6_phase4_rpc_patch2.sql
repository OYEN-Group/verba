-- H6 Phase 4 Patch 2: Fix create_or_get_source column mismatch for source_locations

CREATE OR REPLACE FUNCTION create_or_get_source(
    p_work_id UUID,
    p_source_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
                -- Handle backward compatibility where payload sends 'original_value'
                INSERT INTO public.source_identifiers (source_id, identifier_type, identifier_value, normalized_value, is_primary)
                VALUES (
                    v_source_id, 
                    v_identifier->>'identifier_type', 
                    COALESCE(v_identifier->>'identifier_value', v_identifier->>'original_value'), 
                    v_identifier->>'normalized_value',
                    COALESCE((v_identifier->>'is_primary')::BOOLEAN, false)
                ) ON CONFLICT (source_id, identifier_type, normalized_value) DO NOTHING;
            END LOOP;
        END IF;

        -- Insert locations
        IF jsonb_typeof(p_source_data->'locations') = 'array' THEN
            FOR v_location IN SELECT * FROM jsonb_array_elements(p_source_data->'locations')
            LOOP
                INSERT INTO public.source_locations (source_id, location_type, url, is_primary, content_type, access_status)
                VALUES (
                    v_source_id, 
                    v_location->>'location_type', 
                    v_location->>'url', 
                    COALESCE((v_location->>'is_primary')::BOOLEAN, false), 
                    v_location->>'content_type',
                    v_location->>'access_status'
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
