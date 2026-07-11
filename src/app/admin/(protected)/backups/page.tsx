import { listBackupRecords } from "../../../../modules/backups/public";

function sizeLabel(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusLabel(status: string): string {
  if (status === "SUCCEEDED") return "成功";
  if (status === "FAILED") return "失败";

  return "运行中";
}

export default async function BackupsPage() {
  const backups = await listBackupRecords();

  return (
    <section className="admin-section admin-section--wide" aria-labelledby="backups-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">Operations</p>
          <h1 id="backups-title">备份与恢复</h1>
          <p>备份脚本会导出 PostgreSQL、媒体库和网页项目，并写入 SHA-256 校验。</p>
        </div>
      </div>
      <div className="web-project-panel">
        <h2>手动备份命令</h2>
        <pre>pwsh ./scripts/backup.ps1</pre>
        <h2>恢复命令</h2>
        <pre>pwsh ./scripts/restore.ps1 -ArchivePath ./backups/backup-YYYYMMDD-HHMMSS</pre>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>开始时间</th>
            <th>完成时间</th>
            <th>状态</th>
            <th>大小</th>
            <th>错误</th>
          </tr>
        </thead>
        <tbody>
          {backups.map((backup) => (
            <tr key={backup.id}>
              <td>{backup.startedAt.toLocaleString("zh-CN")}</td>
              <td>{backup.completedAt?.toLocaleString("zh-CN") ?? "—"}</td>
              <td>{statusLabel(backup.status)}</td>
              <td>{sizeLabel(backup.archiveSize)}</td>
              <td>{backup.safeErrorMessage ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {backups.length === 0 ? <p>还没有备份记录。</p> : null}
    </section>
  );
}
