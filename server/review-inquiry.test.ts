import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "test-user-1", email: "user@test.com", name: "Test User",
    loginMethod: "phone", role: "user",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Reviews ───

describe("review.create — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.review.create({ vendorId: 1, rating: 5 })
    ).rejects.toThrow();
  });

  it("rejects rating below 1", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.review.create({ vendorId: 1, rating: 0 })
    ).rejects.toThrow();
  });

  it("rejects rating above 5", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.review.create({ vendorId: 1, rating: 6 })
    ).rejects.toThrow();
  });

  it("rejects non-integer rating", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.review.create({ vendorId: 1, rating: 3.5 })
    ).rejects.toThrow();
  });

  it("rejects comment shorter than 3 characters", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.review.create({ vendorId: 1, rating: 4, comment: "ab" })
    ).rejects.toThrow();
  });

  it("rejects comment exceeding max length", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.review.create({ vendorId: 1, rating: 4, comment: "A".repeat(2001) })
    ).rejects.toThrow();
  });
});

describe("review.vendorReviews", () => {
  it("returns array for public access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.review.vendorReviews({ vendorId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Inquiries ───

describe("inquiry.create — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.inquiry.create({ productId: 1, vendorId: 1 })
    ).rejects.toThrow();
  });

  it("rejects invalid buyer phone", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.inquiry.create({ productId: 1, vendorId: 1, buyerPhone: "999" })
    ).rejects.toThrow();
  });

  it("rejects message exceeding max length", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.inquiry.create({ productId: 1, vendorId: 1, message: "A".repeat(2001) })
    ).rejects.toThrow();
  });
});

describe("inquiry.myInquiries", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.inquiry.myInquiries()).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.inquiry.myInquiries();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("inquiry.vendorInquiries", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.inquiry.vendorInquiries()).rejects.toThrow();
  });

  it("rejects for regular user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.inquiry.vendorInquiries()).rejects.toThrow();
  });
});

describe("inquiry.updateStatus — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.inquiry.updateStatus({ id: 1, status: "responded" })
    ).rejects.toThrow();
  });

  it("rejects invalid status value", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.inquiry.updateStatus({ id: 1, status: "invalid" as any })
    ).rejects.toThrow();
  });
});
