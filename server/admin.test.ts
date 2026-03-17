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

function createAdminContext(): TrpcContext {
  return createUserContext({ id: 99, openId: "admin-1", role: "admin", name: "Admin" });
}

describe("admin.stats", () => {
  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("rejects non-admin user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("rejects vendor user (not admin)", async () => {
    const caller = appRouter.createCaller(createUserContext({ role: "vendor" }));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("returns stats for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.stats();
    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("totalVendors");
    expect(result).toHaveProperty("totalProducts");
    expect(result).toHaveProperty("totalOrders");
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("pendingVendors");
    expect(typeof result.totalUsers).toBe("number");
    expect(typeof result.totalVendors).toBe("number");
    expect(typeof result.totalProducts).toBe("number");
    expect(typeof result.totalOrders).toBe("number");
    expect(typeof result.pendingVendors).toBe("number");
  });
});

describe("admin.vendors", () => {
  it("rejects non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.vendors()).rejects.toThrow();
  });

  it("returns array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.vendors();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("admin.orders", () => {
  it("rejects non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.orders()).rejects.toThrow();
  });

  it("returns array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("admin.updateVendorStatus — validation", () => {
  it("rejects non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.admin.updateVendorStatus({ id: 1, status: "approved" })
    ).rejects.toThrow();
  });

  it("rejects invalid status value", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.updateVendorStatus({ id: 1, status: "deleted" as any })
    ).rejects.toThrow();
  });
});

describe("admin.seedCategories", () => {
  it("rejects non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.seedCategories()).rejects.toThrow();
  });

  it("seeds 12 categories for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.seedCategories();
    expect(result.success).toBe(true);
    expect(result.count).toBe(12);
  });
});
