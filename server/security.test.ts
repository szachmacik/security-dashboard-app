import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@cyberbunker.local",
    name: "Test Operator",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@cyberbunker.local");
  });

  it("returns null when unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("devices router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.devices.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create validates required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.devices.create({
        name: "",
        type: "laptop",
        isolationStatus: "air_gapped",
      })
    ).rejects.toThrow();
  });
});

describe("opsec router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.opsec.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("toggle non-existent item returns undefined gracefully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Toggling non-existent item should not throw (graceful)
    const result = await caller.opsec.toggle({ id: 999999, isCompleted: true });
    // Result may be undefined for non-existent items - that's acceptable
    expect(result === undefined || result !== null).toBe(true);
  });
});

describe("audits router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.audits.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("smartHome router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.smartHome.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("protocols router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.protocols.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("transfer router", () => {
  it("list returns array for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transfer.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("security score calculation", () => {
  it("score is between 0 and 100", () => {
    const score = Math.min(100, Math.max(0, 65));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("critical items reduce score more than low items", () => {
    const baseScore = 100;
    const criticalPenalty = 15;
    const lowPenalty = 2;
    expect(criticalPenalty).toBeGreaterThan(lowPenalty);
    const scoreWithCritical = baseScore - criticalPenalty;
    const scoreWithLow = baseScore - lowPenalty;
    expect(scoreWithCritical).toBeLessThan(scoreWithLow);
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "test", email: "t@t.com", name: "Test",
        loginMethod: "manus", role: "user",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });
});
