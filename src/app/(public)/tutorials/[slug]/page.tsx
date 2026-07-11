import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { articleQueries } from "../../../../modules/articles/public";
import { ArticleRenderer } from "../../../../modules/articles/ui/article-renderer";

type TutorialPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(date)
    : "未发布";
}

export async function generateMetadata({ params }: TutorialPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await articleQueries.findPublishedBySlug(slug);

  if (!article) return {};

  return {
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.summary,
    alternates: { canonical: `/tutorials/${article.slug}` },
    openGraph: {
      title: article.seoTitle || article.title,
      description: article.seoDescription || article.summary,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
    },
  };
}

export default async function TutorialPage({ params }: TutorialPageProps) {
  const { slug } = await params;
  const article = await articleQueries.findPublishedBySlug(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="article-page">
      <article>
        <header className="article-page__header">
          <p className="home__eyebrow">{formatDate(article.publishedAt)}</p>
          <h1>{article.title}</h1>
          {article.summary ? <p>{article.summary}</p> : null}
        </header>
        <ArticleRenderer content={article.content} />
      </article>
    </main>
  );
}
