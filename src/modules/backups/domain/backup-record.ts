export type BackupStatus = "RUNNING" | "SUCCEEDED" | "FAILED";

export type BackupRecord = {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  includedData: unknown;
  archiveSize: number | null;
  status: BackupStatus;
  safeErrorMessage: string | null;
};

export type BackupArchive = {
  name: string;
  completedAt: Date;
};

export type BackupRetentionPolicy = {
  daily: number;
  weekly: number;
};

const DEFAULT_RETENTION_POLICY: BackupRetentionPolicy = {
  daily: 7,
  weekly: 4,
};

export function selectBackupArchivesToKeep(
  archives: BackupArchive[],
  policy: BackupRetentionPolicy = DEFAULT_RETENTION_POLICY,
): BackupArchive[] {
  const newestFirst = [...archives].sort((left, right) => right.completedAt.getTime() - left.completedAt.getTime());
  const kept = new Map<string, BackupArchive>();
  const dailyBuckets = new Set<string>();

  for (const archive of newestFirst) {
    const bucket = dayBucket(archive.completedAt);

    if (dailyBuckets.size < policy.daily && !dailyBuckets.has(bucket)) {
      kept.set(archive.name, archive);
      dailyBuckets.add(bucket);
    }
  }

  const weeklyBuckets = new Set<string>();

  for (const archive of newestFirst) {
    if (kept.has(archive.name)) continue;

    const bucket = weekBucket(archive.completedAt);

    if (weeklyBuckets.size < policy.weekly && !weeklyBuckets.has(bucket)) {
      kept.set(archive.name, archive);
      weeklyBuckets.add(bucket);
    }
  }

  return newestFirst.filter((archive) => kept.has(archive.name));
}

export function selectBackupArchiveNamesToRemove(
  archives: BackupArchive[],
  policy: BackupRetentionPolicy = DEFAULT_RETENTION_POLICY,
): string[] {
  const keep = new Set(selectBackupArchivesToKeep(archives, policy).map((archive) => archive.name));

  return archives.filter((archive) => !keep.has(archive.name)).map((archive) => archive.name);
}

function dayBucket(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekBucket(date: Date): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
