import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_ADMIN_PASSWORD,
  MIN_ADMIN_PASSWORD_LENGTH,
  readConfiguredAdminPassword,
} from "./ensure-admin-password.mjs";

const ROOT = resolve(import.meta.dirname, "..");

describe("ensure-admin-password startup script", () => {
  it("uses the requested default administrator password", () => {
    expect(DEFAULT_ADMIN_PASSWORD).toBe("YourBlogadmin");
    expect(readConfiguredAdminPassword({})).toBe("YourBlogadmin");
    expect(DEFAULT_ADMIN_PASSWORD).toHaveLength(MIN_ADMIN_PASSWORD_LENGTH);
  });

  it("allows the administrator password to be configured through ADMIN_PASSWORD", () => {
    expect(readConfiguredAdminPassword({ ADMIN_PASSWORD: "CustomAdminPass2026" })).toBe(
      "CustomAdminPass2026",
    );
  });

  it("rejects configured administrator passwords that are shorter than the default", () => {
    expect(() => readConfiguredAdminPassword({ ADMIN_PASSWORD: "short" })).toThrow(
      "ADMIN_PASSWORD must be at least 13 characters.",
    );
  });

  it("wires the startup script into Docker without logging the plaintext password", async () => {
    const [dockerfile, compose, envExample, script, startScript] = await Promise.all([
      readFile(resolve(ROOT, "Dockerfile"), "utf8"),
      readFile(resolve(ROOT, "compose.yaml"), "utf8"),
      readFile(resolve(ROOT, ".env.example"), "utf8"),
      readFile(resolve(ROOT, "scripts/ensure-admin-password.mjs"), "utf8"),
      readFile(resolve(ROOT, "scripts/start-production.mjs"), "utf8"),
    ]);

    expect(dockerfile).toContain("scripts/ensure-admin-password.mjs");
    expect(dockerfile).toContain("scripts/start-production.mjs");
    expect(startScript).toContain("ensureAdminPassword");
    expect(startScript).toContain("readConfiguredAdminPassword");
    expect(compose).toContain("ADMIN_PASSWORD: ${ADMIN_PASSWORD:-YourBlogadmin}");
    expect(envExample).toContain("ADMIN_PASSWORD=YourBlogadmin");
    expect(script).toContain('DELETE FROM "Session"');
    expect(script).not.toContain("process.stdout.write(password");
  });
});
