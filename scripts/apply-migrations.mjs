import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`;

/**
 * @param {string} sql
 */
export function checksumSql(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

/**
 * @param {string} [root]
 */
export async function readMigrationFiles(root = "prisma/migrations") {
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    directories.map(async (name) => ({
      name,
      sql: await readFile(join(root, name, "migration.sql"), "utf8"),
    })),
  );
}

/**
 * @param {{
 *   databaseUrl: string | undefined;
 *   migrationsRoot?: string;
 * }} input
 */
export async function applyPendingMigrations({ databaseUrl, migrationsRoot = "prisma/migrations" }) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to apply database migrations.");
  }

  const migrations = await readMigrationFiles(migrationsRoot);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(MIGRATIONS_TABLE_SQL);
    const appliedResult = await client.query(
      'SELECT "migration_name", "checksum" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL',
    );
    const applied = new Map(
      appliedResult.rows.map((row) => [row.migration_name, row.checksum]),
    );

    let appliedCount = 0;

    for (const migration of migrations) {
      const checksum = checksumSql(migration.sql);
      const appliedChecksum = applied.get(migration.name);

      if (appliedChecksum === checksum) {
        continue;
      }

      if (appliedChecksum && appliedChecksum !== checksum) {
        throw new Error(`Migration ${migration.name} checksum differs from the applied database record.`);
      }

      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count") VALUES ($1, $2, now(), $3, now(), 1)',
          [randomUUID(), checksum, migration.name],
        );
        await client.query("COMMIT");
        appliedCount += 1;
        process.stdout.write(`Applied migration ${migration.name}.\n`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }

    process.stdout.write(
      appliedCount === 0
        ? "No pending database migrations.\n"
        : `Applied ${appliedCount} database migration(s).\n`,
    );
    return appliedCount;
  } finally {
    await client.end();
  }
}

async function main() {
  await applyPendingMigrations({ databaseUrl: process.env.DATABASE_URL });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown migration failure.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
