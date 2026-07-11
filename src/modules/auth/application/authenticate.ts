import { createHash, randomBytes } from "node:crypto";

import { verify } from "argon2";

import type { Clock } from "../../../infrastructure/time/clock";
import type { AuthenticateInput, AuthResult } from "../domain/auth-types";
import type { AuthRepository } from "../ports/auth-repository";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

type AuthenticateDependencies = {
  repository: AuthRepository;
  clock: Clock;
};

export function createAuthenticate({ repository, clock }: AuthenticateDependencies) {
  return async (input: AuthenticateInput): Promise<AuthResult> => {
    const now = clock.now();
    const since = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);
    const recentFailures = await repository.countRecentFailures(input.ipHash, since);

    if (recentFailures >= MAX_FAILURES) {
      return { ok: false, code: "RATE_LIMITED" };
    }

    const admin = await repository.getAdmin();
    const passwordMatches = admin ? await verify(admin.passwordHash, input.password) : false;

    if (!admin || !passwordMatches) {
      await repository.recordFailure(input.ipHash, now);
      return { ok: false, code: "INVALID_CREDENTIALS" };
    }

    const sessionToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
    const expiresAt = new Date(now.getTime() + SESSION_LIFETIME_MS);

    await repository.createSession({ adminId: admin.id, tokenHash, expiresAt });

    return { ok: true, sessionToken, expiresAt };
  };
}
