import { describe, expect, it } from "vitest";
import { checkRateLimit, type RateLimitConfig } from "./rateLimit";

describe("checkRateLimit", () => {
  const config: RateLimitConfig = { windowMs: 1000, maxRequests: 3 };

  it("allows requests within the limit", () => {
    const key = `test-allow-${Date.now()}`;
    expect(() => checkRateLimit(key, config)).not.toThrow();
    expect(() => checkRateLimit(key, config)).not.toThrow();
    expect(() => checkRateLimit(key, config)).not.toThrow();
  });

  it("blocks requests exceeding the limit", () => {
    const key = `test-block-${Date.now()}`;
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    expect(() => checkRateLimit(key, config)).toThrow("Too many requests");
  });

  it("uses separate counters for different keys", () => {
    const key1 = `test-separate-1-${Date.now()}`;
    const key2 = `test-separate-2-${Date.now()}`;
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    // key2 should still work
    expect(() => checkRateLimit(key2, config)).not.toThrow();
  });

  it("includes retry time in error message", () => {
    const key = `test-retry-${Date.now()}`;
    const cfg: RateLimitConfig = { windowMs: 60000, maxRequests: 1 };
    checkRateLimit(key, cfg);
    try {
      checkRateLimit(key, cfg);
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.message).toMatch(/try again in \d+ seconds/);
    }
  });
});
