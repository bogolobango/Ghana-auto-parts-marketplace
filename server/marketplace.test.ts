import { describe, expect, it, vi, beforeEach } from "vitest";
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
    id: 1,
    openId: "test-user-1",
    email: "buyer@test.com",
    name: "Test Buyer",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  return createUserContext({ id: 99, openId: "admin-1", role: "admin", name: "Admin User" });
}

describe("category router", () => {
  it("lists categories as public", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.category.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects category creation from non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.category.create({ name: "Test", slug: "test" })
    ).rejects.toThrow();
  });
});

describe("vendor router", () => {
  it("returns null for unregistered vendor", async () => {
    const caller = appRouter.createCaller(createUserContext({ id: 9999 }));
    const result = await caller.vendor.me();
    expect(result).toBeUndefined();
  });

  it("lists approved vendors as public", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.vendor.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects vendor registration without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.vendor.register({
        businessName: "Test Shop",
        phone: "0241234567",
      })
    ).rejects.toThrow();
  });
});

describe("product router", () => {
  it("searches products as public", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.search({});
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.products)).toBe(true);
  });

  it("returns featured products", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.featured();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns latest products", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.latest();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns makes list", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.makes();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects product creation without vendor auth", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({
        name: "Test Part",
        price: "100.00",
      })
    ).rejects.toThrow();
  });
});

describe("cart router", () => {
  it("rejects cart access without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.cart.list()).rejects.toThrow();
  });

  it("lists cart items for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.cart.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("notification router", () => {
  it("rejects notification access without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.notification.list()).rejects.toThrow();
  });

  it("lists notifications for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.notification.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("admin router", () => {
  it("rejects admin stats from non-admin", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("returns admin stats for admin user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.stats();
    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("totalVendors");
    expect(result).toHaveProperty("totalProducts");
    expect(result).toHaveProperty("totalOrders");
    expect(result).toHaveProperty("totalRevenue");
    expect(result).toHaveProperty("pendingVendors");
  });

  it("lists vendors for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.vendors();
    expect(Array.isArray(result)).toBe(true);
  });

  it("lists orders for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders();
    expect(Array.isArray(result)).toBe(true);
  });

  it("seeds categories for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.seedCategories();
    expect(result.success).toBe(true);
    expect(result.count).toBe(12);
  });
});

describe("auth router", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name", "Test Buyer");
  });
});
