import { notFound } from "next/navigation";

import {
  findWebProjectForAdmin,
  listWebProjectVersions,
} from "../../../../../modules/web-projects/public";
import { ProjectUploader } from "../../../../../modules/web-projects/client";
import { publishUploadedWebProjectAction, rollbackWebProjectAction } from "../actions";

type WebProjectDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ published?: string; rolledBack?: string }>;
};

export default async function WebProjectDetailPage({ params, searchParams }: WebProjectDetailPageProps) {
  const { id } = await params;
  const project = await findWebProjectForAdmin(id);
  const notices = await searchParams;

  if (!project) notFound();

  const versions = await listWebProjectVersions(id);

  return (
    <section className="admin-section admin-section--wide" aria-labelledby="web-project-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">Labs Project</p>
          <h1 id="web-project-title">{project.title}</h1>
          <p>{project.summary || "没有简介。"}</p>
        </div>
        {project.stableUrl ? (
          <a className="button" href={project.stableUrl} rel="noreferrer" target="_blank">
            访问稳定地址
          </a>
        ) : null}
      </div>

      {notices?.published ? <p className="admin-toast">项目已发布。</p> : null}
      {notices?.rolledBack ? <p className="admin-toast">已回滚到上一版本。</p> : null}

      <div className="web-project-grid">
        <article className="web-project-panel">
          <h2>上传新版本</h2>
          <ProjectUploader
            defaultSlug={project.slug}
            defaultSummary={project.summary}
            defaultTitle={project.title}
            projectId={project.id}
            publishAction={publishUploadedWebProjectAction}
          />
        </article>
        <article className="web-project-panel">
          <h2>版本</h2>
          <form action={rollbackWebProjectAction.bind(null, project.id)}>
            <button className="button" disabled={versions.length < 2} type="submit">
              回滚到上一版本
            </button>
          </form>
          <ol className="web-project-versions">
            {versions.map((version) => (
              <li key={version.id}>
                <strong>v{version.version}</strong>
                <span>{version.publishedAt?.toLocaleString("zh-CN") ?? "未激活"}</span>
                <code>{version.storagePrefix}</code>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  );
}
