import Link from "next/link";

import { articleQueries } from "../../../modules/articles/public";

export const dynamic = "force-dynamic";

function yearFor(date: Date | null): string {
  return date ? String(date.getFullYear()) : "未发布";
}

export const metadata = {
  title: "归档",
  description: "按年份浏览技术教程。",
};

export default async function ArchivePage() {
  const articles = await articleQueries.listPublished();
  const grouped = Map.groupBy(articles, (article) => yearFor(article.publishedAt));

  return (
    <main className="public-page">
      <section className="public-page__header">
        <p className="home__eyebrow">Archive</p>
        <h1>文章归档</h1>
        <p>按发布时间回看所有已发布教程。</p>
      </section>
      <div className="archive-list">
        {[...grouped.entries()].map(([year, items]) => (
          <section key={year}>
            <h2>{year}</h2>
            {items.map((article) => (
              <Link href={`/tutorials/${article.slug}`} key={article.id}>
                <span>{article.publishedAt?.toLocaleDateString("zh-CN")}</span>
                <strong>{article.title}</strong>
              </Link>
            ))}
          </section>
        ))}
        {articles.length === 0 ? <p>还没有已发布文章。</p> : null}
      </div>
    </main>
  );
}
