import { ArticleEditor } from "../../../../../modules/articles/ui/article-editor";
import { listMedia } from "../../../../../modules/media/public";
import { savePageAction } from "../[id]/actions";

const emptyDoc = { type: "doc", content: [{ type: "paragraph", content: [] }] };

export default async function NewPagePage() {
  const media = await listMedia();

  return (
    <section className="article-admin" aria-labelledby="new-page-title">
      <form action={savePageAction.bind(null, undefined)} className="article-admin__layout">
        <main className="article-admin__content">
          <input aria-label="页面标题" className="article-admin__title" name="title" placeholder="无标题页面" required />
          <ArticleEditor articleId="new-page" contentFieldName="content" initialRevision={0} initialValue={emptyDoc} showPublishButton={false} />
        </main>
        <aside className="article-admin__meta">
          <h1 id="new-page-title">新建页面</h1>
          <label>网址标识<input name="slug" placeholder="留空自动生成" /></label>
          <label>摘要<textarea name="summary" rows={4} /></label>
          <label>封面媒体
            <select defaultValue="" name="coverMediaId"><option value="">不使用封面</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.originalName}</option>)}</select>
          </label>
          <label className="article-admin__checkbox"><input name="showInNavigation" type="checkbox" />显示在顶部导航</label>
          <label>SEO 标题<input name="seoTitle" /></label>
          <label>SEO 描述<textarea name="seoDescription" rows={4} /></label>
          <div className="article-admin__actions"><button className="button" type="submit">保存草稿</button></div>
        </aside>
      </form>
    </section>
  );
}
