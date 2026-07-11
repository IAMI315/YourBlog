import Link from "next/link";
import type { CSSProperties } from "react";

import type { ArticleSummary } from "../../modules/articles/public";

type EditorialHomeProps = {
  articles: ArticleSummary[];
  featuredImageUrl?: string | null;
  settings: {
    authorName: string;
    blogName: string;
    homeTitle: string;
    homeDescription: string;
  };
};

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date)
    : "未发布";
}

export function EditorialHome({ articles, featuredImageUrl, settings }: EditorialHomeProps) {
  const [featuredArticle, ...restArticles] = articles;

  return (
    <main className="editorial-home">
      <section className="editorial-hero" aria-labelledby="home-title">
        <div className="editorial-hero__copy">
          <p className="home__eyebrow">{settings.authorName}</p>
          <h1 id="home-title">{settings.homeTitle || settings.blogName}</h1>
          <p>{settings.homeDescription}</p>
        </div>
        <Link
          className="editorial-hero__feature"
          href={featuredArticle ? `/tutorials/${featuredArticle.slug}` : "/tutorials"}
        >
          {featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Featured tutorial image comes from the local media pipeline.
            <img alt={featuredArticle?.title ?? settings.blogName} src={featuredImageUrl} />
          ) : (
            <span className="editorial-hero__image-fallback" aria-hidden="true" />
          )}
          <span>
            <small>Featured tutorial</small>
            <strong>{featuredArticle?.title ?? "开始整理你的技术教程"}</strong>
            <em>{featuredArticle?.summary ?? "写作、预览、发布，一切都在自己的服务器里。"}</em>
          </span>
        </Link>
      </section>
      <section className="editorial-layers" aria-label="Public sections">
        <Link className="editorial-layers__lab" href="/labs">
          <span>Web experiments</span>
          <strong>把网页项目发布到独立 Labs 空间</strong>
          <em>上传 HTML/ZIP 后，后续会通过隔离域名展示。</em>
        </Link>
        <div className="editorial-layers__list">
          {restArticles.slice(0, 4).map((article, index) => (
            <Link
              className="editorial-note-card"
              href={`/tutorials/${article.slug}`}
              key={article.id}
              style={{ "--stagger": index } as CSSProperties}
            >
              <span>{formatDate(article.publishedAt)}</span>
              <strong>{article.title}</strong>
              <em>{article.summary}</em>
            </Link>
          ))}
          {restArticles.length === 0 ? (
            <Link className="editorial-note-card" href="/tutorials">
              <span>Archive</span>
              <strong>教程列表会显示在这里</strong>
              <em>发布第一篇文章后，首页会自动出现精选和最近文章。</em>
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
