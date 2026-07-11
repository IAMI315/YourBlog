export type AuthenticateInput = { password: string; ipHash: string };

export type AuthResult =
  | { ok: true; sessionToken: string; expiresAt: Date }
  | { ok: false; code: "INVALID_CREDENTIALS" | "RATE_LIMITED" };

export type AdminIdentity = { id: string };
