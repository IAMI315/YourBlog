import Link from "next/link";

import { searchArticles } from "../../../modules/articles/public";
import { pageQueries } from "../../../modules/site-designer/public";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = ((await searchParams)?.q ?? "").trim();
  const [articles, pages] = query
    ? await Promise.all([searchArticles(query), pageQueries.searchPublished(query)])
    : [[], []];
  const hasResults = articles.length + pages.length > 0;

  return (
    <main className="public-page search-results">
      <header className="public-page__header">
        <p className="home__eyebrow">站内搜索</p>
        <h1>{query ? `“${query}” 的搜索结果` : "搜索内容"}</h1>
        <p>{query ? "已同时检索已发布的技术教程和普通页面。" : "在顶部搜索栏输入关键词后开始搜索。"}</p>
      </header>
      {hasResults ? (
        <section className="search-results__grid" aria-label="搜索结果">
          {articles.map((article) => (
            <Link className="tutorial-card" href={`/tutorials/${article.slug}`} key={`article-${article.id}`}>
              <span>技术教程</span>
              <h2>{article.title}</h2>
              <p>{article.summary}</p>
            </Link>
          ))}
          {pages.map((page) => (
            <Link className="tutorial-card" href={`/pages/${page.slug}`} key={`page-${page.id}`}>
              <span>独立页面</span>
              <h2>{page.title}</h2>
              <p>{page.summary}</p>
            </Link>
          ))}
        </section>
      ) : query ? (
        <p className="search-results__empty">没有找到匹配的已发布内容。</p>
      ) : null}
    </main>
  );
}
