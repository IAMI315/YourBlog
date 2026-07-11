import { ArticleEditor } from "../../../../../modules/articles/ui/article-editor";
import { saveArticleAction } from "../[id]/actions";

const emptyDoc = { type: "doc", content: [{ type: "paragraph", content: [] }] };

export default function NewArticlePage() {
  return (
    <section className="article-admin" aria-labelledby="new-article-title">
      <form action={saveArticleAction.bind(null, undefined)} className="article-admin__layout">
        <main className="article-admin__content">
          <input
            aria-label="文章标题"
            className="article-admin__title"
            name="title"
            placeholder="无标题"
            required
          />
          <ArticleEditor
            articleId="new"
            contentFieldName="content"
            initialRevision={0}
            initialValue={emptyDoc}
          />
        </main>
        <aside className="article-admin__meta">
          <h1 id="new-article-title">新建文章</h1>
          <label>
            Slug
            <input name="slug" placeholder="auto-generated" />
          </label>
          <label>
            摘要
            <textarea name="summary" rows={4} />
          </label>
          <label>
            SEO 标题
            <input name="seoTitle" />
          </label>
          <label>
            SEO 描述
            <textarea name="seoDescription" rows={4} />
          </label>
          <button className="button" type="submit">
            保存草稿
          </button>
        </aside>
      </form>
    </section>
  );
}
