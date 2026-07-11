"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  authenticate,
  hashIpAddress,
} from "../../../modules/auth/public";

const loginSchema = z.object({
  password: z.string().min(1),
});

function getClientIpHash(headerStore: Headers): string {
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const ipAddress = forwardedFor || realIp || "unknown";

  return hashIpAddress(ipAddress);
}

export async function loginAction(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/admin/login?error=invalid");
  }

  const headerStore = await headers();
  const result = await authenticate({
    password: parsed.data.password,
    ipHash: getClientIpHash(headerStore),
  });

  if (!result.ok) {
    redirect(`/admin/login?error=${result.code.toLowerCase()}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: result.expiresAt,
  });

  redirect("/admin");
}
