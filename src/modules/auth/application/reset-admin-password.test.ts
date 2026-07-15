import { verify } from "argon2";
import { describe, expect, it, vi } from "vitest";

import type { Clock } from "../../../infrastructure/time/clock";
import type { AdminPasswordRepository } from "../ports/auth-repository";
import { resetAdminPasswordHash } from "./reset-admin-password";

const NOW = new Date("2026-07-11T09:00:00.000Z");
const clock: Clock = { now: () => NOW };

function createRepository(): AdminPasswordRepository {
  return {
    resetAdminPasswordHash: vi.fn().mockResolvedValue(undefined),
  };
}

describe("resetAdminPasswordHash", () => {
  it("rejects passwords shorter than thirteen characters", async () => {
    const repository = createRepository();

    await expect(
      resetAdminPasswordHash({ repository, clock }, "too-short"),
    ).rejects.toThrow("至少需要 13 个字符");
    expect(repository.resetAdminPasswordHash).not.toHaveBeenCalled();
  });

  it("stores an Argon2id password hash and delegates session revocation to the repository", async () => {
    const repository = createRepository();
    const password = "new-admin-password-long-enough";

    await resetAdminPasswordHash({ repository, clock }, password);

    expect(repository.resetAdminPasswordHash).toHaveBeenCalledOnce();
    const [passwordHash, changedAt] = vi.mocked(repository.resetAdminPasswordHash).mock.calls[0]!;
    await expect(verify(passwordHash, password)).resolves.toBe(true);
    expect(passwordHash).toContain("argon2id");
    expect(passwordHash).not.toContain(password);
    expect(changedAt).toEqual(NOW);
  });
});
