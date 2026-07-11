import { createHash } from "node:crypto";

import type { Clock } from "../../../infrastructure/time/clock";
import type { AdminIdentity } from "../domain/auth-types";
import type { AuthRepository } from "../ports/auth-repository";

type SessionDependencies = {
  repository: AuthRepository;
  clock: Clock;
};

export async function findAdminSession(
  { repository, clock }: SessionDependencies,
  sessionToken: string,
): Promise<AdminIdentity | null> {
  const tokenHash = createHash("sha256").update(sessionToken).digest("hex");
  const session = await repository.findSession(tokenHash);

  if (!session || session.expiresAt.getTime() <= clock.now().getTime()) {
    return null;
  }

  return { id: session.adminId };
}
