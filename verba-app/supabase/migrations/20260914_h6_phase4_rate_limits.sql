-- H6 Phase 4: Durable Rate Limiting

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    user_id UUID NOT NULL,
    action_prefix TEXT NOT NULL,
    tokens FLOAT NOT NULL,
    last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, action_prefix)
);

-- Index for bounds cleanup (e.g., pruning old buckets)
CREATE INDEX IF NOT EXISTS rate_limit_buckets_last_refill_idx ON public.rate_limit_buckets (last_refill);

CREATE OR REPLACE FUNCTION consume_rate_limit(
    p_action TEXT,
    p_limit INT,
    p_window_seconds INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_last_refill TIMESTAMPTZ;
    v_elapsed_seconds FLOAT;
    v_current_tokens FLOAT;
    v_refill_rate FLOAT;
    v_new_tokens FLOAT;
    v_allowed BOOLEAN;
BEGIN
    -- 1. Enforce authentication and authorization inside SECURITY DEFINER
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized rate limit check' USING ERRCODE = 'P0001';
    END IF;

    v_refill_rate := p_limit::FLOAT / p_window_seconds::FLOAT;

    -- 2. Ensure the bucket exists
    INSERT INTO public.rate_limit_buckets (user_id, action_prefix, tokens, last_refill)
    VALUES (v_user_id, p_action, p_limit, NOW())
    ON CONFLICT (user_id, action_prefix) DO NOTHING;

    -- 3. Lock the row to prevent concurrency races
    SELECT tokens, last_refill INTO v_current_tokens, v_last_refill
    FROM public.rate_limit_buckets
    WHERE user_id = v_user_id AND action_prefix = p_action
    FOR UPDATE;

    -- 4. Calculate token refill
    v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - v_last_refill));
    v_new_tokens := LEAST(p_limit::FLOAT, v_current_tokens + (v_elapsed_seconds * v_refill_rate));

    -- 5. Atomic check and consume
    IF v_new_tokens >= 1.0 THEN
        v_allowed := TRUE;
        UPDATE public.rate_limit_buckets
        SET tokens = v_new_tokens - 1.0, last_refill = NOW()
        WHERE user_id = v_user_id AND action_prefix = p_action;
    ELSE
        v_allowed := FALSE;
    END IF;

    RETURN v_allowed;
END;
$$;

-- Harden RPC Grants
REVOKE EXECUTE ON FUNCTION consume_rate_limit(TEXT, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION consume_rate_limit(TEXT, INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INT, INT) TO authenticated;
