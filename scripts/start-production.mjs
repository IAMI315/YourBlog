import { applyPendingMigrations } from "./apply-migrations.mjs";
import { ensureAdminPassword, readConfiguredAdminPassword } from "./ensure-admin-password.mjs";

await applyPendingMigrations({ databaseUrl: process.env.DATABASE_URL });

const adminPasswordResult = await ensureAdminPassword({
  databaseUrl: process.env.DATABASE_URL,
  password: readConfiguredAdminPassword(),
});
process.stdout.write(`Administrator password ${adminPasswordResult} from ADMIN_PASSWORD.\n`);

await import("../server.js");
