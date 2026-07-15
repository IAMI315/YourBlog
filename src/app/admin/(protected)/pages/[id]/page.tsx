import Link from "next/link";
import { Download, Eye, Save, Upload } from "lucide-react";
import { notFound } from "next/navigation";

import { ArticleEditor } from "../../../../../modules/articles/ui/article-editor";
import { listMedia } from "../../../../../modules/media/public";
import { pageQueries } from "../../../../../modules/site-designer/public";
import { DeletePageButton } from "./delete-page-button";
import { deletePageAction, publishPageAction, savePageAction, unpublishPageAction } from "./actions";

const pageErrorMessages: Record<string, string> = {
  PAGE_TITLE_REQUIRED: "页面标题不能为空。",
  PAGE_TITLE_TOO_LONG: "页面标题不能超过 160 个字符。",
  PAGE_SUMMARY_TOO_LONG: "摘要不能超过 400 个字符。",
  PAGE_SLUG_RESERVED: "该网址标识为系统保留名称。",
  PAGE_SLUG_TAKEN: "该网址标识已被其他页面使用。",
  PAGE_SEO_TITLE_TOO_LONG: "SEO 标题不能超过 160 个字符。",
  PAGE_SEO_DESCRIPTION_TOO_LONG: "SEO 描述不能超过 320 个字符。",
};

type PageEditorPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function PageEditorPage({ params, searchParams }: PageEditorPageProps) {
  const { id } = await params;
  const [page, media, query] = await Promise.all([pageQueries.findForEditor(id), listMedia(), searchParams]);
  if (!page) notFound();
  const paramsValue = query ?? {};
  const error = Object.values(paramsValue).map((code) => code && pageErrorMessages[code]).find(Boolean);

  return (
    <section className="article-admin" aria-labelledby="page-editor-title">
      <form action={savePageAction.bind(null, id)} className="article-admin__layout">
        <main className="article-admin__content">
          <input aria-label="页面标题" className="article-admin__title" defaultValue={page.title} name="title" required />
          <ArticleEditor articleId={`page-${id}`} contentFieldName="content" initialRevision={0} initialValue={page.content} showPublishButton={false} />
        </main>
        <aside className="article-admin__meta">
          <h1 id="page-editor-title">编辑页面</h1>
          {paramsValue.saved ? <p className="admin-toast" role="status">草稿已保存。</p> : null}
          {paramsValue.imported ? <p className="admin-toast" role="status">页面包已导入为草稿，请确认后发布。</p> : null}
          {paramsValue.published ? <p className="admin-toast" role="status">页面已发布。</p> : null}
          {paramsValue.unpublished ? <p className="admin-toast" role="status">页面已下线。</p> : null}
          {paramsValue.publishError ? <p className="admin-error" role="alert">页面需要标题和正文后才能发布。</p> : null}
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          <label>网址标识<input defaultValue={page.slug} name="slug" /></label>
          <label>摘要<textarea defaultValue={page.summary} name="summary" rows={4} /></label>
          <label>封面媒体
            <select defaultValue={page.coverMediaId ?? ""} name="coverMediaId"><option value="">不使用封面</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName}</option>)}</select>
          </label>
          <label className="article-admin__checkbox"><input defaultChecked={page.showInNavigation} name="showInNavigation" type="checkbox" />显示在顶部导航</label>
          <label>SEO 标题<input defaultValue={page.seoTitle} name="seoTitle" /></label>
          <label>SEO 描述<textarea defaultValue={page.seoDescription} name="seoDescription" rows={4} /></label>
          <div className="article-admin__actions">
            <button className="button" type="submit"><Save size={16} /><span>保存草稿</span></button>
            <button className="button" formAction={publishPageAction.bind(null, id)} type="submit"><Upload size={16} /><span>发布</span></button>
            <Link className="button button--quiet" href={`/admin/pages/${id}/preview`}><Eye size={16} /><span>预览</span></Link>
            <a className="button button--quiet" download href={`/api/admin/pages/${id}/export`}><Download size={16} /><span>导出页面包</span></a>
          </div>
          {page.status === "PUBLISHED" ? <button className="button button--quiet" formAction={unpublishPageAction.bind(null, id)} type="submit">下线页面</button> : null}
        </aside>
      </form>
      <form action={deletePageAction.bind(null, id)} className="page-delete-form"><DeletePageButton action={deletePageAction.bind(null, id)} /></form>
    </section>
  );
}
