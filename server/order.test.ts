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

const validOrderInput = {
  vendorId: 1,
  paymentMethod: "pay_on_delivery" as const,
  shippingAddress: "123 Main St, Accra",
  shippingCity: "Accra",
  shippingRegion: "Greater Accra",
  buyerPhone: "0241234567",
  buyerName: "Test Buyer",
  items: [
    { productId: 1, productName: "Brake Pad", quantity: 2, unitPrice: "50.00", totalPrice: "100.00" },
  ],
};

describe("order.create — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.order.create(validOrderInput)).rejects.toThrow();
  });

  it("rejects empty shipping address", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, shippingAddress: "" })
    ).rejects.toThrow();
  });

  it("rejects empty city", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, shippingCity: "" })
    ).rejects.toThrow();
  });

  it("rejects empty region", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, shippingRegion: "" })
    ).rejects.toThrow();
  });

  it("rejects empty buyer phone", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, buyerPhone: "" })
    ).rejects.toThrow();
  });

  it("rejects empty buyer name", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, buyerName: "" })
    ).rejects.toThrow();
  });

  it("rejects empty items array", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, items: [] })
    ).rejects.toThrow();
  });

  it("rejects invalid payment method", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, paymentMethod: "crypto" as any })
    ).rejects.toThrow();
  });

  it("rejects item with zero quantity", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({
        ...validOrderInput,
        items: [{ productId: 1, productName: "Part", quantity: 0, unitPrice: "10", totalPrice: "0" }],
      })
    ).rejects.toThrow();
  });

  it("rejects invalid Ghana phone number", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.create({ ...validOrderInput, buyerPhone: "1234567890" })
    ).rejects.toThrow("valid Ghana phone number");
  });
});

describe("order.myOrders", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.order.myOrders()).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.order.myOrders();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("order.vendorOrders", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.order.vendorOrders()).rejects.toThrow();
  });

  it("rejects for regular user (non-vendor)", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.order.vendorOrders()).rejects.toThrow();
  });
});

describe("order.getById", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.order.getById({ id: 1 })).rejects.toThrow();
  });
});

describe("order.updateStatus — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.order.updateStatus({ id: 1, status: "confirmed" })
    ).rejects.toThrow();
  });

  it("rejects for regular user", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.updateStatus({ id: 1, status: "confirmed" })
    ).rejects.toThrow();
  });

  it("rejects invalid status value", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.order.updateStatus({ id: 1, status: "invalid" as any })
    ).rejects.toThrow();
  });
});

describe("order.cancel", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.order.cancel({ id: 1 })).rejects.toThrow();
  });
});
