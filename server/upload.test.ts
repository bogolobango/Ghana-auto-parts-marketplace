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

describe("upload.image — validation", () => {
  it("rejects without auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.upload.image({
        base64: Buffer.from("fake-image").toString("base64"),
        fileName: "test.jpg",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("rejects empty base64", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.upload.image({
        base64: "",
        fileName: "test.jpg",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("rejects empty fileName", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.upload.image({
        base64: Buffer.from("fake").toString("base64"),
        fileName: "",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow();
  });

  it("rejects non-image content type", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.upload.image({
        base64: Buffer.from("fake").toString("base64"),
        fileName: "test.pdf",
        contentType: "application/pdf",
      })
    ).rejects.toThrow();
  });

  it("rejects content type that doesn't start with image/", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.upload.image({
        base64: Buffer.from("fake").toString("base64"),
        fileName: "test.txt",
        contentType: "text/plain",
      })
    ).rejects.toThrow();
  });
});
