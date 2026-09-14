import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Consumes a token from the durable Postgres-backed rate limiter.
 * @param supabase The authenticated Supabase client (must have auth.uid() context)
 * @param action The action scope (e.g. 'save', 'source')
 * @param limit The maximum number of requests allowed in the window
 * @param windowSeconds The window duration in seconds
 * @returns boolean - true if allowed, false if rate limited
 */
export async function consumeRateLimit(
  supabase: SupabaseClient,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (error) {
    console.error(`[RateLimit] Failed to consume rate limit for ${action}:`, error.message);
    throw error;
  }

  return data === true;
}

// Limits
export const LIMITS = {
  AUTOSAVE: { limit: 100, window: 60 },
  SOURCES: { limit: 20, window: 60 },
  RESEARCH: { limit: 10, window: 60 }
};
