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
    id: 1, openId: "test-user-1", email: "buyer@test.com", name: "Test Buyer",
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

describe("cart.list", () => {
  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.cart.list()).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.cart.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("cart.add — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.cart.add({ productId: 1, quantity: 1 })
    ).rejects.toThrow();
  });

  it("rejects quantity of zero", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.cart.add({ productId: 1, quantity: 0 })
    ).rejects.toThrow();
  });

  it("rejects negative quantity", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.cart.add({ productId: 1, quantity: -1 })
    ).rejects.toThrow();
  });

  it("rejects quantity exceeding maximum", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.cart.add({ productId: 1, quantity: 1000 })
    ).rejects.toThrow();
  });
});

describe("cart.update — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.cart.update({ id: 1, quantity: 2 })
    ).rejects.toThrow();
  });

  it("rejects quantity of zero", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.cart.update({ id: 1, quantity: 0 })
    ).rejects.toThrow();
  });

  it("rejects negative quantity", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.cart.update({ id: 1, quantity: -1 })
    ).rejects.toThrow();
  });

  it("rejects quantity exceeding maximum", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.cart.update({ id: 1, quantity: 1000 })
    ).rejects.toThrow();
  });
});

describe("cart.remove", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.cart.remove({ id: 1 })
    ).rejects.toThrow();
  });
});

describe("cart.clear", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.cart.clear()).rejects.toThrow();
  });

  it("succeeds for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.cart.clear();
    expect(result).toEqual({ success: true });
  });
});
