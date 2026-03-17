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

describe("product.search", () => {
  it("returns products array and total for empty search", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.search({});
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.products)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("accepts search with all filter parameters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.search({
      search: "brake",
      categoryId: 1,
      vendorId: 1,
      vehicleMake: "Toyota",
      vehicleModel: "Corolla",
      yearFrom: 2015,
      yearTo: 2020,
      condition: "new",
      minPrice: 10,
      maxPrice: 500,
      limit: 10,
      offset: 0,
    });
    expect(result).toHaveProperty("products");
    expect(result).toHaveProperty("total");
  });

  it("rejects search string exceeding max length", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.search({ search: "x".repeat(201) })
    ).rejects.toThrow();
  });

  it("rejects negative minPrice", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.search({ minPrice: -10 })
    ).rejects.toThrow();
  });

  it("rejects limit exceeding maximum", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.search({ limit: 101 })
    ).rejects.toThrow();
  });

  it("rejects limit of zero", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.search({ limit: 0 })
    ).rejects.toThrow();
  });

  it("rejects negative offset", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.search({ offset: -1 })
    ).rejects.toThrow();
  });
});

describe("product.featured", () => {
  it("returns array of featured products", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.featured();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("product.latest", () => {
  it("returns array of latest products", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.latest();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("product.makes", () => {
  it("returns array of vehicle makes", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.makes();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("product.models", () => {
  it("returns array of models for a given make", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.models({ make: "Toyota" });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("product.getById", () => {
  it("returns null for non-existent product", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.product.getById({ id: 999999 });
    expect(result).toBeNull();
  });
});

describe("product.create — validation", () => {
  it("rejects product creation without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.create({ name: "Test Part", price: "100.00" })
    ).rejects.toThrow();
  });

  it("rejects product creation from regular user (not vendor)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({ name: "Test Part", price: "100.00" })
    ).rejects.toThrow();
  });

  it("rejects product with empty name", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({ name: "", price: "100.00" })
    ).rejects.toThrow();
  });

  it("rejects product with zero price", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({ name: "Test Part", price: "0" })
    ).rejects.toThrow();
  });

  it("rejects product with negative price", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({ name: "Test Part", price: "-50" })
    ).rejects.toThrow();
  });

  it("rejects product with non-numeric price", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({ name: "Test Part", price: "abc" })
    ).rejects.toThrow();
  });

  it("rejects product with too many images", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const images = Array.from({ length: 11 }, (_, i) => `https://example.com/img${i}.jpg`);
    await expect(
      caller.product.create({ name: "Test Part", price: "100", images })
    ).rejects.toThrow();
  });

  it("rejects product with invalid year range", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({
        name: "Test Part",
        price: "100",
        yearFrom: 1800, // Below min
      })
    ).rejects.toThrow();
  });

  it("rejects product with year above max", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({
        name: "Test Part",
        price: "100",
        yearTo: 2200, // Above max
      })
    ).rejects.toThrow();
  });

  it("rejects invalid condition value", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.create({
        name: "Test Part",
        price: "100",
        condition: "broken" as any,
      })
    ).rejects.toThrow();
  });
});

describe("product.update — validation", () => {
  it("rejects update without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.update({ id: 1, name: "Updated" })
    ).rejects.toThrow();
  });

  it("rejects update from regular user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.update({ id: 1, name: "Updated" })
    ).rejects.toThrow();
  });

  it("rejects invalid status value", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.product.update({ id: 1, status: "deleted" as any })
    ).rejects.toThrow();
  });
});

describe("product.delete — validation", () => {
  it("rejects delete without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.product.delete({ id: 1 })
    ).rejects.toThrow();
  });
});
