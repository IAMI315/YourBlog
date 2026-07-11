import "server-only";

import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "../../infrastructure/db/prisma";
import { createAuthenticate } from "./application/authenticate";
import { findAdminSession } from "./application/require-session";
import {
  MIN_ADMIN_PASSWORD_LENGTH,
  resetAdminPasswordHash,
} from "./application/reset-admin-password";
import { PrismaAuthRepository } from "./adapters/prisma-auth-repository";
import type { AdminIdentity, AuthenticateInput, AuthResult } from "./domain/auth-types";

export const ADMIN_SESSION_COOKIE = "admin_session";

const repository = new PrismaAuthRepository(prisma);
const clock = { now: () => new Date() };
const authenticateWithDependencies = createAuthenticate({ repository, clock });

export function authenticate(input: AuthenticateInput): Promise<AuthResult> {
  return authenticateWithDependencies(input);
}

export function hashIpAddress(ipAddress: string): string {
  return createHash("sha256").update(ipAddress).digest("hex");
}

export async function requireAdminSession(): Promise<AdminIdentity> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const identity = sessionToken
    ? await findAdminSession({ repository, clock }, sessionToken)
    : null;

  if (!identity) {
    redirect("/admin/login");
  }

  return identity;
}

export async function resetAdminPassword(password: string): Promise<void> {
  await resetAdminPasswordHash({ repository, clock }, password);
}

export type { AdminIdentity, AuthenticateInput, AuthResult };
export { MIN_ADMIN_PASSWORD_LENGTH };
