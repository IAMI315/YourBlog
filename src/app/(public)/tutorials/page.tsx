import Link from "next/link";

import { articleQueries, searchArticles } from "../../../modules/articles/public";

type TutorialsPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date)
    : "未发布";
}

export const metadata = {
  title: "教程",
  description: "浏览已发布的技术教程。",
};

export default async function TutorialsPage({ searchParams }: TutorialsPageProps) {
  const query = (await searchParams)?.q?.trim() ?? "";
  const articles = query ? await searchArticles(query) : await articleQueries.listPublished();

  return (
    <main className="public-page public-page--wide">
      <section className="public-page__header">
        <p className="home__eyebrow">Tutorials</p>
        <h1>技术教程</h1>
        <p>检索和阅读已发布的自托管、部署、工程实践笔记。</p>
        <form className="public-search">
          <input defaultValue={query} name="q" placeholder="搜索：自托管" type="search" />
          <button type="submit">搜索</button>
        </form>
      </section>
      <section className="tutorial-grid" aria-label="教程列表">
        {articles.map((article) => (
          <Link className="tutorial-card" href={`/tutorials/${article.slug}`} key={article.id}>
            <span>{formatDate(article.publishedAt)}</span>
            <h2>{article.title}</h2>
            <p>{article.summary}</p>
          </Link>
        ))}
        {articles.length === 0 ? <p>没有找到匹配的教程。</p> : null}
      </section>
    </main>
  );
}
