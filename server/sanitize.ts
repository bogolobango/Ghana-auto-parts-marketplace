// Basic XSS sanitization for user-supplied text fields
// Strips HTML tags and dangerous characters from string inputs

const HTML_TAG_RE = /<[^>]*>/g;
const SCRIPT_RE = /javascript:|data:|vbscript:/gi;
const EVENT_HANDLER_RE = /on\w+\s*=/gi;

/**
 * Sanitize a single string value by removing HTML tags and script injection patterns.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(HTML_TAG_RE, "")
    .replace(SCRIPT_RE, "")
    .replace(EVENT_HANDLER_RE, "")
    .trim();
}

/**
 * Recursively sanitize all string values in an object.
 * Skips keys that are expected to contain safe data (e.g. base64).
 */
const SKIP_KEYS = new Set(["base64", "password", "token", "otp"]);

export function sanitizeInput<T>(input: T): T {
  if (input === null || input === undefined) return input;

  if (typeof input === "string") {
    return sanitizeString(input) as T;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item)) as T;
  }

  if (typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (SKIP_KEYS.has(key)) {
        result[key] = value;
      } else {
        result[key] = sanitizeInput(value);
      }
    }
    return result as T;
  }

  return input;
}
