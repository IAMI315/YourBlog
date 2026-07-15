import Link from "next/link";
import { notFound } from "next/navigation";

import { TipTapPreview } from "../../../../../../modules/articles/ui/tiptap-preview";
import { getMediaUrl } from "../../../../../../modules/media/public";
import { pageQueries } from "../../../../../../modules/site-designer/public";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ mode?: string }>;
};

export default async function PagePreviewPage({ params, searchParams }: PreviewPageProps) {
  const { id } = await params;
  const mode = (await searchParams)?.mode === "mobile" ? "mobile" : "desktop";
  const page = await pageQueries.findForEditor(id);
  if (!page) notFound();
  const coverImageUrl = page.coverMediaStorageKey ? getMediaUrl(page.coverMediaStorageKey) : null;

  return (
    <section className="article-preview" aria-labelledby="page-preview-title">
      <div className="segmented-control" aria-label="预览模式">
        <Link aria-current={mode === "desktop"} href={`/admin/pages/${id}/preview?mode=desktop`}>桌面</Link>
        <Link aria-current={mode === "mobile"} href={`/admin/pages/${id}/preview?mode=mobile`}>手机</Link>
      </div>
      <article className={`article-preview__frame article-preview__frame--${mode}`}>
        <h1 id="page-preview-title">{page.title}</h1>
        {page.summary ? <p className="article-preview__summary">{page.summary}</p> : null}
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 页面封面来自本地媒体管线。
          <img alt={page.title} className="article-preview__cover" src={coverImageUrl} />
        ) : null}
        <TipTapPreview content={page.content} />
      </article>
    </section>
  );
}
