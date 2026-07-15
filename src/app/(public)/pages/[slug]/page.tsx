import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicBackLink } from "../../../../components/site/public-back-link";
import { ArticleRenderer } from "../../../../modules/articles/ui/article-renderer";
import { getMediaUrl } from "../../../../modules/media/public";
import { pageQueries } from "../../../../modules/site-designer/public";

type SitePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: SitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await pageQueries.findPublishedBySlug(slug);

  if (!page) return {};

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.summary,
    alternates: { canonical: `/pages/${page.slug}` },
  };
}

export default async function SitePage({ params }: SitePageProps) {
  const { slug } = await params;
  const page = await pageQueries.findPublishedBySlug(slug);

  if (!page) notFound();
  const coverImageUrl = page.coverMediaStorageKey ? getMediaUrl(page.coverMediaStorageKey) : null;

  return (
    <main className="public-page">
      <PublicBackLink href="/" label="返回首页" />
      <article>
        <header className="public-page__header">
          <h1>{page.title}</h1>
          {page.summary ? <p>{page.summary}</p> : null}
        </header>
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 页面封面来自本地媒体管线。
          <img alt={page.title} className="public-page__cover" src={coverImageUrl} />
        ) : null}
        <ArticleRenderer content={page.content} />
      </article>
    </main>
  );
}
