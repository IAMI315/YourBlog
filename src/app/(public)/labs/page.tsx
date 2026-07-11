import { ExternalLink } from "lucide-react";

import { listPublishedWebProjects } from "../../../modules/web-projects/public";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Labs",
  description: "浏览可交互的网页项目和实验教程。",
};

export default async function LabsPage() {
  const projects = await listPublishedWebProjects();

  return (
    <main className="public-page">
      <section className="public-page__header">
        <p className="home__eyebrow">Labs</p>
        <h1>网页实验室</h1>
        <p>这里收集可直接打开的交互式教程、网页 Demo 和科技实验项目。</p>
      </section>
      <div className="labs-grid">
        {projects.map((project) => (
          <a className="labs-card" href={project.stableUrl} key={project.id} rel="noreferrer" target="_blank">
            <span>{project.publishedAt.toLocaleDateString("zh-CN")}</span>
            <h2>{project.title}</h2>
            <p>{project.summary || "打开独立沙箱中的网页项目。"}</p>
            <strong>
              进入实验
              <ExternalLink size={16} />
            </strong>
          </a>
        ))}
        {projects.length === 0 ? <p>还没有已发布网页项目。</p> : null}
      </div>
    </main>
  );
}
