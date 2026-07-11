import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { applyPendingMigrations, checksumSql, readMigrationFiles } from "./apply-migrations.mjs";

describe("apply-migrations startup script", () => {
  it("reads migration SQL files in lexical order", async ({ task }) => {
    const root = join(
      process.cwd(),
      "node_modules/.tmp",
      `${task.name.replaceAll(/\W+/g, "-")}-${Date.now()}`,
    );

    await mkdir(join(root, "2026071102_second"), { recursive: true });
    await mkdir(join(root, "2026071101_first"), { recursive: true });
    await writeFile(join(root, "2026071102_second", "migration.sql"), "SELECT 2;", "utf8");
    await writeFile(join(root, "2026071101_first", "migration.sql"), "SELECT 1;", "utf8");

    await expect(readMigrationFiles(root)).resolves.toEqual([
      { name: "2026071101_first", sql: "SELECT 1;" },
      { name: "2026071102_second", sql: "SELECT 2;" },
    ]);
  });

  it("uses stable SHA-256 checksums compatible with Prisma migration records", () => {
    expect(checksumSql("SELECT 1;")).toMatch(/^[a-f0-9]{64}$/);
    expect(checksumSql("SELECT 1;")).toBe(checksumSql("SELECT 1;"));
    expect(checksumSql("SELECT 1;")).not.toBe(checksumSql("SELECT 2;"));
  });

  it("fails loudly when DATABASE_URL is missing", async () => {
    await expect(applyPendingMigrations({ databaseUrl: undefined })).rejects.toThrow(
      "DATABASE_URL is required to apply database migrations.",
    );
  });
});
