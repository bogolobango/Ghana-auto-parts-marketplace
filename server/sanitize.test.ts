import { describe, expect, it } from "vitest";
import { sanitizeString, sanitizeInput } from "./sanitize";

describe("sanitizeString", () => {
  it("removes HTML tags", () => {
    expect(sanitizeString("<b>bold</b>")).toBe("bold");
    expect(sanitizeString("<script>alert('xss')</script>")).toBe("alert('xss')");
  });

  it("removes javascript: protocol", () => {
    expect(sanitizeString("javascript:alert(1)")).toBe("alert(1)");
  });

  it("removes event handlers", () => {
    expect(sanitizeString("text onerror=alert(1)")).toBe("text alert(1)");
    expect(sanitizeString("onclick=hack()")).toBe("hack()");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("preserves normal text", () => {
    expect(sanitizeString("Toyota Corolla 2020 Brake Pad")).toBe("Toyota Corolla 2020 Brake Pad");
  });

  it("preserves special characters in normal text", () => {
    expect(sanitizeString("GH₵100.00 - Best Price!")).toBe("GH₵100.00 - Best Price!");
  });
});

describe("sanitizeInput", () => {
  it("sanitizes string values in objects", () => {
    const result = sanitizeInput({ name: "<b>Shop</b>", phone: "0241234567" });
    expect(result.name).toBe("Shop");
    expect(result.phone).toBe("0241234567");
  });

  it("sanitizes nested objects", () => {
    const result = sanitizeInput({ data: { name: "<script>x</script>" } });
    expect(result.data.name).toBe("x");
  });

  it("sanitizes arrays", () => {
    const result = sanitizeInput(["<b>a</b>", "<i>b</i>"]);
    expect(result).toEqual(["a", "b"]);
  });

  it("skips base64 fields", () => {
    const result = sanitizeInput({ base64: "<data>test</data>", name: "<b>Name</b>" });
    expect(result.base64).toBe("<data>test</data>");
    expect(result.name).toBe("Name");
  });

  it("passes through numbers and booleans unchanged", () => {
    const result = sanitizeInput({ count: 5, active: true });
    expect(result).toEqual({ count: 5, active: true });
  });

  it("handles null and undefined", () => {
    expect(sanitizeInput(null)).toBeNull();
    expect(sanitizeInput(undefined)).toBeUndefined();
  });
});
