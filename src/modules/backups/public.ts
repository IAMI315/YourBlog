import "server-only";

import { prisma } from "../../infrastructure/db/prisma";
import type { BackupRecord } from "./domain/backup-record";

export async function listBackupRecords(limit = 20): Promise<BackupRecord[]> {
  const records = await prisma.backupRecord.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return records.map((record) => ({
    id: record.id,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    includedData: record.includedData,
    archiveSize: record.archiveSize === null ? null : Number(record.archiveSize),
    status: record.status,
    safeErrorMessage: record.safeErrorMessage,
  }));
}

export type { BackupArchive, BackupRecord, BackupRetentionPolicy, BackupStatus } from "./domain/backup-record";
export {
  selectBackupArchiveNamesToRemove,
  selectBackupArchivesToKeep,
} from "./domain/backup-record";
