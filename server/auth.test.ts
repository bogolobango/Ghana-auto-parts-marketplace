import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserContext(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-1",
    email: "buyer@test.com",
    name: "Test Buyer",
    loginMethod: "phone",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.auth.me();
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("name", "Test Buyer");
    expect(result).toHaveProperty("email", "buyer@test.com");
    expect(result).toHaveProperty("role", "user");
  });

  it("returns admin role for admin user", async () => {
    const caller = appRouter.createCaller(createUserContext({ role: "admin" }));
    const result = await caller.auth.me();
    expect(result).toHaveProperty("role", "admin");
  });

  it("returns vendor role for vendor user", async () => {
    const caller = appRouter.createCaller(createUserContext({ role: "vendor" }));
    const result = await caller.auth.me();
    expect(result).toHaveProperty("role", "vendor");
  });
});

describe("auth.requestOtp", () => {
  it("rejects empty phone number", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.requestOtp({ phone: "", name: "Test" })
    ).rejects.toThrow();
  });

  it("rejects empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.requestOtp({ phone: "0241234567", name: "" })
    ).rejects.toThrow();
  });

  it("rejects invalid Ghana phone number format", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.requestOtp({ phone: "1234567890", name: "Test User" })
    ).rejects.toThrow("valid Ghana phone number");
  });

  it("rejects phone number that is too short", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.requestOtp({ phone: "024123", name: "Test User" })
    ).rejects.toThrow();
  });

  it("rejects name exceeding max length", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.requestOtp({ phone: "0241234567", name: "A".repeat(256) })
    ).rejects.toThrow();
  });
});

describe("auth.verifyOtp", () => {
  it("rejects empty phone", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.verifyOtp({ phone: "", otp: "1234" })
    ).rejects.toThrow();
  });

  it("rejects empty otp", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.verifyOtp({ phone: "0241234567", otp: "" })
    ).rejects.toThrow();
  });
});

describe("auth.updateProfile", () => {
  it("rejects profile update without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.auth.updateProfile({ name: "New Name" })
    ).rejects.toThrow();
  });

  it("rejects invalid email format", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.auth.updateProfile({ email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("rejects invalid Ghana phone in profile update", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.auth.updateProfile({ phone: "999" })
    ).rejects.toThrow();
  });
});

describe("auth.logout", () => {
  it("clears cookie and returns success", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});
