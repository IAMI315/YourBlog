import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  selectBackupArchiveNamesToRemove,
  selectBackupArchivesToKeep,
  type BackupArchive,
} from "../src/modules/backups/domain/backup-record";

const ROOT = resolve(import.meta.dirname, "..");

function archive(daysAgo: number): BackupArchive {
  const completedAt = new Date(Date.UTC(2026, 6, 11 - daysAgo, 8, 0, 0));

  return {
    name: `backup-${completedAt.toISOString().slice(0, 10)}`,
    completedAt,
  };
}

describe("backup retention", () => {
  it("keeps seven daily archives plus four older weekly archives", () => {
    const archives = Array.from({ length: 50 }, (_value, index) => archive(index));
    const kept = selectBackupArchivesToKeep(archives);

    expect(kept.map((item) => item.name).slice(0, 7)).toEqual([
      "backup-2026-07-11",
      "backup-2026-07-10",
      "backup-2026-07-09",
      "backup-2026-07-08",
      "backup-2026-07-07",
      "backup-2026-07-06",
      "backup-2026-07-05",
    ]);
    expect(kept).toHaveLength(11);
    expect(new Set(kept.map((item) => item.name)).size).toBe(11);
    expect(selectBackupArchiveNamesToRemove(archives)).toHaveLength(39);
  });

  it("ships backup and restore scripts with checksum and safety gates", async () => {
    const backupScript = await readFile(resolve(ROOT, "scripts/backup.ps1"), "utf8");
    const restoreScript = await readFile(resolve(ROOT, "scripts/restore.ps1"), "utf8");

    expect(backupScript).toContain("pg_dump");
    expect(backupScript).toContain("Get-FileHash");
    expect(backupScript).toContain("BackupRecord");
    expect(backupScript).toContain("Select-BackupArchivesToKeep");
    expect(restoreScript).toContain("Test-BackupChecksums");
    expect(restoreScript).toContain("Refusing to restore while production services are running");
    expect(restoreScript).toContain("Restore requires an explicit archive path");
  });
});
