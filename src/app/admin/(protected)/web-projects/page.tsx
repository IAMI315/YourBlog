import Link from "next/link";
import { Plus } from "lucide-react";

import { pageQueries } from "../../../../modules/site-designer/public";
import { listWebProjectsForAdmin, projectPagePath } from "../../../../modules/web-projects/public";

export default async function WebProjectsAdminPage() {
  const [projects, pages] = await Promise.all([
    listWebProjectsForAdmin(),
    pageQueries.listForAdmin(),
  ]);

  return (
    <section className="admin-section admin-section--wide" aria-labelledby="web-projects-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">网页实验室</p>
          <h1 id="web-projects-title">网页项目</h1>
        </div>
        <Link className="button" href="/admin/web-projects/new">
          <Plus size={16} />
          <span>上传项目</span>
        </Link>
      </div>
      <section className="web-projects__site-pages" aria-labelledby="site-pages-title">
        <div className="web-projects__section-header">
          <div>
            <p>站点页面</p>
            <h2 id="site-pages-title">来自页面管理</h2>
          </div>
          <Link className="button button--quiet" href="/admin/pages">管理页面</Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>页面地址</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td>{page.title}</td>
                <td>/pages/{page.slug}</td>
                <td>{page.status === "PUBLISHED" ? "已发布" : "草稿"}</td>
                <td>{page.updatedAt.toLocaleString("zh-CN")}</td>
                <td>
                  <div className="admin-table__actions">
                    <Link href={`/admin/pages/${page.id}`}>编辑</Link>
                    {page.status === "PUBLISHED" ? <Link href={`/pages/${page.slug}`}>访问</Link> : null}
                  </div>
                </td>
              </tr>
            ))}
            {pages.length === 0 ? <tr><td colSpan={5}>还没有站点页面。</td></tr> : null}
          </tbody>
        </table>
      </section>
      <div className="web-projects__section-header">
        <div>
          <p>上传项目</p>
          <h2>HTML / ZIP 网页项目</h2>
        </div>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>页面地址</th>
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
              <td>/projects/{project.slug}/</td>
              <td>{project.status === "PUBLISHED" ? "已发布" : "草稿"}</td>
              <td>{project.currentVersion ?? "—"}</td>
              <td>{project.publishedAt?.toLocaleString("zh-CN") ?? "—"}</td>
              <td>
                <div className="admin-table__actions">
                  <Link href={`/admin/web-projects/${project.id}`}>管理</Link>
                  {project.status === "PUBLISHED" ? (
                    <a href={projectPagePath(project.slug)} rel="noreferrer" target="_blank">
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
