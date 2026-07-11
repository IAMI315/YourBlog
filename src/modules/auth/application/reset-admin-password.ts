import { argon2id, hash } from "argon2";

import type { Clock } from "../../../infrastructure/time/clock";
import type { AdminPasswordRepository } from "../ports/auth-repository";

export const MIN_ADMIN_PASSWORD_LENGTH = 14;

type ResetAdminPasswordDependencies = {
  repository: AdminPasswordRepository;
  clock: Clock;
};

export async function resetAdminPasswordHash(
  { repository, clock }: ResetAdminPasswordDependencies,
  password: string,
): Promise<void> {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`Admin password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
  }

  const passwordHash = await hash(password, { type: argon2id });
  await repository.resetAdminPasswordHash(passwordHash, clock.now());
}
