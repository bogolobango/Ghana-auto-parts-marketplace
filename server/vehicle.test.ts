import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("vehicle.makes", () => {
  it("returns array of vehicle makes (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.vehicle.makes();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("vehicle.models", () => {
  it("returns array of models for a given makeId (public)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.vehicle.models({ makeId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});
