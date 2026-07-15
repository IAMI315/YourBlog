import Link from "next/link";
import type { CSSProperties } from "react";

import type { ArticleSummary } from "../../modules/articles/public";
import type { HomeLayoutSettings, HomeModule } from "../../modules/site-designer/public";
import { homeGridResponsiveStyle } from "../../modules/site-designer/domain/home-grid";

type EditorialHomeProps = {
  articles: ArticleSummary[];
  featuredImageUrl?: string | null;
  homeLayout: HomeLayoutSettings;
  settings: {
    authorName: string;
    blogName: string;
    homeTitle: string;
    homeDescription: string;
  };
};

function moduleGridStyle(module: HomeModule): CSSProperties {
  return homeGridResponsiveStyle(module.layout) as CSSProperties;
}

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date)
    : "未发布";
}

function Hero({ homeLayout, settings }: Pick<EditorialHomeProps, "homeLayout" | "settings">) {
  return (
    <section className="editorial-hero editorial-hero--solo" aria-labelledby="home-title">
      <div className="editorial-hero__copy">
        <p className="home__eyebrow">{settings.authorName}</p>
        <h1 id="home-title">{homeLayout.heroTitle || settings.homeTitle || settings.blogName}</h1>
        <p>{homeLayout.heroDescription || settings.homeDescription}</p>
      </div>
    </section>
  );
}

function FeaturedTutorial({
  article,
  featuredImageUrl,
  label,
  blogName,
}: {
  article: ArticleSummary | undefined;
  featuredImageUrl?: string | null;
  label: string;
  blogName: string;
}) {
  return (
    <Link
      className="editorial-hero__feature editorial-feature-card"
      href={article ? `/tutorials/${article.slug}` : "/tutorials"}
    >
      {featuredImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 精选教程封面来自本地媒体管线。
        <img alt={article?.title ?? blogName} src={featuredImageUrl} />
      ) : (
        <span className="editorial-hero__image-fallback" aria-hidden="true" />
      )}
      <span className="editorial-hero__feature-content">
        <small>{label}</small>
        <strong>{article?.title ?? "开始整理你的技术教程"}</strong>
        <em>{article?.summary ?? "写作、预览、发布，一切都在自己的服务器里。"}</em>
      </span>
    </Link>
  );
}

function RecentTutorials({ articles, count, archiveLabel }: { articles: ArticleSummary[]; count: number; archiveLabel: string }) {
  return (
    <section className="editorial-layers__list" aria-label="最近教程">
      {articles.slice(0, count).map((article, index) => (
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
      {articles.length === 0 ? (
        <Link className="editorial-note-card" href="/tutorials">
          <span>{archiveLabel}</span>
          <strong>教程列表会显示在这里</strong>
          <em>发布第一篇文章后，首页会自动出现精选和最近文章。</em>
        </Link>
      ) : null}
    </section>
  );
}

function LabCard({ homeLayout }: Pick<EditorialHomeProps, "homeLayout">) {
  return (
    <Link className="editorial-layers__lab" href="/labs">
      <span>{homeLayout.labLabel}</span>
      <strong>{homeLayout.labTitle}</strong>
      <em>{homeLayout.labDescription}</em>
    </Link>
  );
}

function ArchiveCard({ label }: { label: string }) {
  return (
    <Link className="editorial-archive-link" href="/archive">
      <span>{label}</span>
      <strong>按时间查看全部教程</strong>
    </Link>
  );
}

function renderModule(
  module: HomeModule,
  { articles, featuredImageUrl, homeLayout, settings }: EditorialHomeProps,
) {
  if (!module.enabled) return null;

  const [featuredArticle, ...recentArticles] = articles;

  switch (module.id) {
    case "hero":
      return <Hero homeLayout={homeLayout} settings={settings} />;
    case "featured":
      return (
        <FeaturedTutorial
          article={featuredArticle}
          blogName={settings.blogName}
          featuredImageUrl={featuredImageUrl}
          label={homeLayout.featuredLabel}
        />
      );
    case "recent":
      return (
        <RecentTutorials
          archiveLabel={homeLayout.archiveLabel}
          articles={recentArticles}
          count={homeLayout.recentArticlesCount}
        />
      );
    case "labs":
      return <LabCard homeLayout={homeLayout} />;
    case "archive":
      return <ArchiveCard label={homeLayout.archiveLabel} />;
  }
}

export function EditorialHome(props: EditorialHomeProps) {
  return (
    <main className="editorial-home">
      {props.homeLayout.modules.map((module) => {
        const content = renderModule(module, props);
        if (!content) return null;

        return (
          <div
            className="editorial-home__module"
            key={module.id}
            style={moduleGridStyle(module)}
          >
            {content}
          </div>
        );
      })}
    </main>
  );
}
