// Simple in-memory rate limiter for auth endpoints
// No external dependencies needed

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt < now) store.delete(key);
  });
}, 5 * 60 * 1000).unref();

export interface RateLimitConfig {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export const RATE_LIMITS = {
  otpRequest: { windowMs: 60_000, maxRequests: 3 } as RateLimitConfig,     // 3 OTP requests per minute
  otpVerify: { windowMs: 300_000, maxRequests: 10 } as RateLimitConfig,    // 10 verify attempts per 5 min
  upload: { windowMs: 60_000, maxRequests: 20 } as RateLimitConfig,        // 20 uploads per minute
  orderCreate: { windowMs: 60_000, maxRequests: 5 } as RateLimitConfig,    // 5 orders per minute
} as const;

/**
 * Check rate limit for a given key. Throws if limit exceeded.
 * @param key Unique identifier (e.g. "otp:0241234567" or "upload:userId:5")
 * @param config Rate limit configuration
 */
export function checkRateLimit(key: string, config: RateLimitConfig): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new Error(`Too many requests. Please try again in ${retryAfterSec} seconds.`);
  }
}
