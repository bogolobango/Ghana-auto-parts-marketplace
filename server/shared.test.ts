import { describe, expect, it } from "vitest";
import {
  isValidGhanaPhone,
  isValidStatusTransition,
  formatGHS,
  generateWhatsAppLink,
  VALID_STATUS_TRANSITIONS,
} from "../shared/marketplace";

describe("isValidGhanaPhone", () => {
  it("accepts valid 10-digit number starting with 0", () => {
    expect(isValidGhanaPhone("0241234567")).toBe(true);
    expect(isValidGhanaPhone("0551234567")).toBe(true);
    expect(isValidGhanaPhone("0201234567")).toBe(true);
  });

  it("accepts valid 12-digit number starting with 233", () => {
    expect(isValidGhanaPhone("233241234567")).toBe(true);
    expect(isValidGhanaPhone("233551234567")).toBe(true);
  });

  it("accepts numbers with spaces and dashes", () => {
    expect(isValidGhanaPhone("024 123 4567")).toBe(true);
    expect(isValidGhanaPhone("024-123-4567")).toBe(true);
    expect(isValidGhanaPhone("(024) 123-4567")).toBe(true);
  });

  it("rejects numbers starting with 01", () => {
    expect(isValidGhanaPhone("0112345678")).toBe(false);
  });

  it("rejects too short numbers", () => {
    expect(isValidGhanaPhone("024123")).toBe(false);
  });

  it("rejects too long numbers", () => {
    expect(isValidGhanaPhone("02412345678")).toBe(false);
  });

  it("rejects international format not 233", () => {
    expect(isValidGhanaPhone("1234567890")).toBe(false);
    expect(isValidGhanaPhone("+1234567890")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidGhanaPhone("")).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(isValidGhanaPhone("abcdefghij")).toBe(false);
  });
});

describe("isValidStatusTransition", () => {
  it("allows pending → confirmed", () => {
    expect(isValidStatusTransition("pending", "confirmed")).toBe(true);
  });

  it("allows pending → cancelled", () => {
    expect(isValidStatusTransition("pending", "cancelled")).toBe(true);
  });

  it("allows confirmed → processing", () => {
    expect(isValidStatusTransition("confirmed", "processing")).toBe(true);
  });

  it("allows confirmed → cancelled", () => {
    expect(isValidStatusTransition("confirmed", "cancelled")).toBe(true);
  });

  it("allows processing → shipped", () => {
    expect(isValidStatusTransition("processing", "shipped")).toBe(true);
  });

  it("allows processing → cancelled", () => {
    expect(isValidStatusTransition("processing", "cancelled")).toBe(true);
  });

  it("allows shipped → delivered", () => {
    expect(isValidStatusTransition("shipped", "delivered")).toBe(true);
  });

  it("disallows pending → delivered (skipping steps)", () => {
    expect(isValidStatusTransition("pending", "delivered")).toBe(false);
  });

  it("disallows pending → shipped (skipping steps)", () => {
    expect(isValidStatusTransition("pending", "shipped")).toBe(false);
  });

  it("disallows delivered → cancelled", () => {
    expect(isValidStatusTransition("delivered", "cancelled")).toBe(false);
  });

  it("disallows cancelled → any", () => {
    expect(isValidStatusTransition("cancelled", "pending")).toBe(false);
    expect(isValidStatusTransition("cancelled", "confirmed")).toBe(false);
  });

  it("disallows shipped → cancelled", () => {
    expect(isValidStatusTransition("shipped", "cancelled")).toBe(false);
  });

  it("handles unknown status gracefully", () => {
    expect(isValidStatusTransition("unknown", "confirmed")).toBe(false);
  });

  it("covers all defined transitions", () => {
    for (const [from, allowed] of Object.entries(VALID_STATUS_TRANSITIONS)) {
      for (const to of allowed) {
        expect(isValidStatusTransition(from, to)).toBe(true);
      }
    }
  });
});

describe("formatGHS", () => {
  it("formats string amount", () => {
    const result = formatGHS("100");
    expect(result).toContain("GH₵");
    expect(result).toContain("100");
  });

  it("formats number amount", () => {
    const result = formatGHS(250.5);
    expect(result).toContain("GH₵");
    expect(result).toContain("250");
  });

  it("formats zero", () => {
    const result = formatGHS(0);
    expect(result).toContain("GH₵");
    expect(result).toContain("0.00");
  });

  it("includes two decimal places", () => {
    const result = formatGHS("99");
    expect(result).toMatch(/\d+\.\d{2}/);
  });
});

describe("generateWhatsAppLink", () => {
  it("converts local Ghana number to international format", () => {
    const link = generateWhatsAppLink("0241234567", "Hello");
    expect(link).toContain("wa.me/233241234567");
    expect(link).toContain("text=Hello");
  });

  it("keeps 233-prefixed numbers unchanged", () => {
    const link = generateWhatsAppLink("233241234567", "Hi");
    expect(link).toContain("wa.me/233241234567");
  });

  it("encodes message text", () => {
    const link = generateWhatsAppLink("0241234567", "Hello World & More");
    expect(link).toContain("Hello%20World%20%26%20More");
  });

  it("strips non-numeric characters from phone", () => {
    const link = generateWhatsAppLink("024-123-4567", "Test");
    expect(link).toContain("wa.me/233241234567");
  });
});
