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

const validRegInput = { businessName: "Shop", phone: "0241234567", ghanaCardNumber: "GHA-123456789-0" };

describe("vendor.register — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.vendor.register(validRegInput)
    ).rejects.toThrow();
  });

  it("rejects empty business name", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.register({ ...validRegInput, businessName: "" })
    ).rejects.toThrow();
  });

  it("rejects empty phone", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.register({ ...validRegInput, phone: "" })
    ).rejects.toThrow();
  });

  it("rejects invalid Ghana phone", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.register({ ...validRegInput, phone: "1234567890" })
    ).rejects.toThrow("valid Ghana phone number");
  });

  it("rejects missing Ghana Card number", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.register({ businessName: "Shop", phone: "0241234567" } as any)
    ).rejects.toThrow();
  });

  it("rejects business name exceeding max length", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.register({ ...validRegInput, businessName: "A".repeat(256) })
    ).rejects.toThrow();
  });

  it("rejects invalid email format", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.register({ ...validRegInput, email: "bad-email" })
    ).rejects.toThrow();
  });

  it("rejects description exceeding max length", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.register({ ...validRegInput, description: "A".repeat(2001) })
    ).rejects.toThrow();
  });
});

describe("vendor.me", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.vendor.me()).rejects.toThrow();
  });

  it("returns undefined for user without vendor profile", async () => {
    const caller = appRouter.createCaller(createUserContext({ id: 9999 }));
    const result = await caller.vendor.me();
    expect(result).toBeUndefined();
  });
});

describe("vendor.list", () => {
  it("returns array of approved vendors (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.vendor.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("vendor.getById", () => {
  it("returns undefined for non-existent vendor", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.vendor.getById({ id: 999999 });
    expect(result).toBeUndefined();
  });
});

describe("vendor.update — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.vendor.update({ businessName: "Updated" })
    ).rejects.toThrow();
  });

  it("rejects invalid email", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.update({ email: "not-valid" })
    ).rejects.toThrow();
  });

  it("rejects invalid logo URL", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.vendor.update({ logoUrl: "not-a-url" })
    ).rejects.toThrow();
  });
});
