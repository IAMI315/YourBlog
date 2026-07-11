import { createHash } from "node:crypto";

import { hash } from "argon2";
import { describe, expect, it, vi } from "vitest";

import type { Clock } from "../../../infrastructure/time/clock";
import type { AuthRepository } from "../ports/auth-repository";
import { createAuthenticate } from "./authenticate";
import { findAdminSession } from "./require-session";

const NOW = new Date("2026-07-11T08:00:00.000Z");
const VALID_PASSWORD = "correct-admin-password-long-enough";

function createRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    getAdmin: vi.fn().mockResolvedValue(null),
    countRecentFailures: vi.fn().mockResolvedValue(0),
    recordFailure: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(undefined),
    findSession: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const clock: Clock = { now: () => NOW };

describe("authenticate", () => {
  it("returns one browser token for a valid password and persists only its hash", async () => {
    const repository = createRepository({
      getAdmin: vi.fn().mockResolvedValue({
        id: "admin-1",
        passwordHash: await hash(VALID_PASSWORD),
      }),
    });
    const authenticate = createAuthenticate({ repository, clock });

    const result = await authenticate({ password: VALID_PASSWORD, ipHash: "hashed-ip" });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected authentication to succeed");
    expect(result.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.expiresAt).toEqual(new Date("2026-07-18T08:00:00.000Z"));
    expect(repository.createSession).toHaveBeenCalledOnce();
    expect(repository.createSession).toHaveBeenCalledWith({
      adminId: "admin-1",
      tokenHash: createHash("sha256").update(result.sessionToken).digest("hex"),
      expiresAt: result.expiresAt,
    });
    expect(JSON.stringify(vi.mocked(repository.createSession).mock.calls)).not.toContain(
      VALID_PASSWORD,
    );
  });

  it("returns INVALID_CREDENTIALS and records a failed attempt for an invalid password", async () => {
    const repository = createRepository({
      getAdmin: vi.fn().mockResolvedValue({
        id: "admin-1",
        passwordHash: await hash(VALID_PASSWORD),
      }),
    });
    const authenticate = createAuthenticate({ repository, clock });

    const result = await authenticate({ password: "wrong-password", ipHash: "hashed-ip" });

    expect(result).toEqual({ ok: false, code: "INVALID_CREDENTIALS" });
    expect(repository.recordFailure).toHaveBeenCalledWith("hashed-ip", NOW);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("returns RATE_LIMITED after five failures within fifteen minutes", async () => {
    const repository = createRepository({
      countRecentFailures: vi.fn().mockResolvedValue(5),
    });
    const authenticate = createAuthenticate({ repository, clock });

    const result = await authenticate({ password: "any-password", ipHash: "hashed-ip" });

    expect(result).toEqual({ ok: false, code: "RATE_LIMITED" });
    expect(repository.countRecentFailures).toHaveBeenCalledWith(
      "hashed-ip",
      new Date("2026-07-11T07:45:00.000Z"),
    );
    expect(repository.getAdmin).not.toHaveBeenCalled();
  });
});

describe("findAdminSession", () => {
  it("rejects an expired session", async () => {
    const token = "expired-browser-token";
    const repository = createRepository({
      findSession: vi.fn().mockResolvedValue({
        adminId: "admin-1",
        expiresAt: new Date("2026-07-11T07:59:59.999Z"),
      }),
    });

    const identity = await findAdminSession({ repository, clock }, token);

    expect(identity).toBeNull();
    expect(repository.findSession).toHaveBeenCalledWith(
      createHash("sha256").update(token).digest("hex"),
    );
  });
});
