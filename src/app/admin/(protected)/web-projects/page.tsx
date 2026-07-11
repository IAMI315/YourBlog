import Link from "next/link";
import { Plus } from "lucide-react";

import { listWebProjectsForAdmin } from "../../../../modules/web-projects/public";

export default async function WebProjectsAdminPage() {
  const projects = await listWebProjectsForAdmin();

  return (
    <section className="admin-section admin-section--wide" aria-labelledby="web-projects-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">Labs</p>
          <h1 id="web-projects-title">网页项目</h1>
        </div>
        <Link className="button" href="/admin/web-projects/new">
          <Plus size={16} />
          <span>上传项目</span>
        </Link>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>Slug</th>
            <th>状态</th>
            <th>版本</th>
            <th>发布时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>{project.title}</td>
              <td>{project.slug}</td>
              <td>{project.status === "PUBLISHED" ? "已发布" : "草稿"}</td>
              <td>{project.currentVersion ?? "—"}</td>
              <td>{project.publishedAt?.toLocaleString("zh-CN") ?? "—"}</td>
              <td>
                <div className="admin-table__actions">
                  <Link href={`/admin/web-projects/${project.id}`}>管理</Link>
                  {project.stableUrl ? (
                    <a href={project.stableUrl} rel="noreferrer" target="_blank">
                      访问
                    </a>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {projects.length === 0 ? <p>还没有网页项目。上传一个 HTML 或 ZIP 项目开始。</p> : null}
    </section>
  );
}
