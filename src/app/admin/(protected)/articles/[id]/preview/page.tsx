import { notFound } from "next/navigation";

import { articleQueries } from "../../../../../../modules/articles/public";
import { TipTapPreview } from "../../../../../../modules/articles/ui/tiptap-preview";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ArticlePreviewPage({ params, searchParams }: PreviewPageProps) {
  const { id } = await params;
  const mode = (await searchParams)?.mode === "mobile" ? "mobile" : "desktop";
  const article = await articleQueries.findForEditor(id);

  if (!article) {
    notFound();
  }

  return (
    <section className="article-preview" aria-labelledby="preview-title">
      <div className="segmented-control" aria-label="Preview mode">
        <a aria-current={mode === "desktop"} href={`/admin/articles/${id}/preview?mode=desktop`}>
          Desktop
        </a>
        <a aria-current={mode === "mobile"} href={`/admin/articles/${id}/preview?mode=mobile`}>
          Mobile
        </a>
      </div>
      <article className={`article-preview__frame article-preview__frame--${mode}`}>
        <h1 id="preview-title">{article.title}</h1>
        {article.summary ? <p className="article-preview__summary">{article.summary}</p> : null}
        <TipTapPreview content={article.content} />
      </article>
    </section>
  );
}
