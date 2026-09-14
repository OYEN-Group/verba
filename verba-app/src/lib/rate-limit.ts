export class RateLimiter {
  private cache = new Map<string, { count: number; expiresAt: number }>();

  constructor(private windowMs: number, private maxRequests: number) {}

  /**
   * Check if the given identifier (e.g., IP or User ID) has exceeded the rate limit.
   * Returns true if allowed, false if rate limited.
   */
  public check(identifier: string): boolean {
    const now = Date.now();
    const record = this.cache.get(identifier);

    if (!record) {
      this.cache.set(identifier, { count: 1, expiresAt: now + this.windowMs });
      return true;
    }

    if (now > record.expiresAt) {
      // Window expired, reset
      record.count = 1;
      record.expiresAt = now + this.windowMs;
      return true;
    }

    if (record.count >= this.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}

// Global instance for document saves (e.g., 50 requests per 10 seconds per user/IP)
export const saveRateLimiter = new RateLimiter(10000, 50);

// Global instance for heavy research endpoints (e.g., 10 requests per minute)
export const researchRateLimiter = new RateLimiter(60000, 10);
