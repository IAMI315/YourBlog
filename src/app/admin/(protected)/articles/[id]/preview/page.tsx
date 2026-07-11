type PreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ArticlePreviewPage({ params, searchParams }: PreviewPageProps) {
  const { id } = await params;
  const mode = (await searchParams)?.mode === "mobile" ? "mobile" : "desktop";

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
        <h1 id="preview-title">Article preview</h1>
        <p>Preview renders from saved TipTap JSON.</p>
      </article>
    </section>
  );
}
