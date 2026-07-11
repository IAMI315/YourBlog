import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { argon2id, hash, verify } from "argon2";
import pg from "pg";

export const DEFAULT_ADMIN_PASSWORD = "YourNoteadmin";
export const MIN_ADMIN_PASSWORD_LENGTH = 13;

/**
 * @param {Record<string, string | undefined>} [env]
 */
export function readConfiguredAdminPassword(env = process.env) {
  const password = env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`);
  }

  return password;
}

/**
 * @param {{
 *   databaseUrl: string | undefined;
 *   password: string;
 *   now?: Date;
 * }} input
 */
export async function ensureAdminPassword({ databaseUrl, password, now = new Date() }) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to ensure the administrator password.");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const existing = await client.query(
      'SELECT "id", "passwordHash" FROM "Admin" ORDER BY "createdAt" ASC LIMIT 1',
    );
    const admin = existing.rows[0];

    if (admin && (await verify(admin.passwordHash, password))) {
      return "unchanged";
    }

    const passwordHash = await hash(password, { type: argon2id });
    await client.query("BEGIN");

    if (admin) {
      await client.query(
        'UPDATE "Admin" SET "passwordHash" = $1, "passwordChangedAt" = $2 WHERE "id" = $3',
        [passwordHash, now, admin.id],
      );
    } else {
      await client.query(
        'INSERT INTO "Admin" ("id", "passwordHash", "passwordChangedAt", "createdAt") VALUES ($1, $2, $3, $3)',
        [randomUUID(), passwordHash, now],
      );
    }

    await client.query('DELETE FROM "Session"');
    await client.query("COMMIT");

    return admin ? "updated" : "created";
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const password = readConfiguredAdminPassword();
  const result = await ensureAdminPassword({
    databaseUrl: process.env.DATABASE_URL,
    password,
  });

  process.stdout.write(`Administrator password ${result} from ADMIN_PASSWORD.\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown admin password setup failure.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
