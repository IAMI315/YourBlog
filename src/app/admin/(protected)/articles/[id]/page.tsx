import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, RotateCcw } from "lucide-react";

import { articleQueries } from "../../../../../modules/articles/public";
import { ArticleEditor } from "../../../../../modules/articles/ui/article-editor";
import { ConfirmRecycleButton } from "./confirm-recycle-button";
import { ConfirmRestoreRevisionButton } from "./confirm-restore-revision-button";
import {
  autosaveArticleAction,
  publishArticleAction,
  recycleArticleAction,
  restoreRevisionAction,
  saveArticleAction,
  saveConflictAsNewDraftAction,
} from "./actions";

type ArticleEditorPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArticleEditorPage({ params }: ArticleEditorPageProps) {
  const { id } = await params;
  const article = await articleQueries.findForEditor(id);
  const revisions = await articleQueries.listRevisions(id);

  if (!article) {
    notFound();
  }

  return (
    <section className="article-admin" aria-labelledby="article-title">
      <form action={saveArticleAction.bind(null, id)} className="article-admin__layout">
        <main className="article-admin__content">
          <input
            aria-label="文章标题"
            className="article-admin__title"
            defaultValue={article.title}
            name="title"
            required
          />
          <ArticleEditor
            articleId={id}
            contentFieldName="content"
            initialRevision={article.revision}
            initialValue={article.content}
            publishAction={publishArticleAction.bind(null, id)}
            save={autosaveArticleAction}
            saveAsNewDraftAction={saveConflictAsNewDraftAction}
          />
        </main>
        <aside className="article-admin__meta">
          <h1 id="article-title">编辑文章</h1>
          <div className="segmented-control" aria-label="预览模式">
            <Link href={`/admin/articles/${id}/preview?mode=desktop`}>桌面</Link>
            <Link href={`/admin/articles/${id}/preview?mode=mobile`}>手机</Link>
          </div>
          <label>
            网址标识
            <input defaultValue={article.slug} name="slug" />
          </label>
          <label>
            摘要
            <textarea defaultValue={article.summary} name="summary" rows={4} />
          </label>
          <label>
            SEO 标题
            <input defaultValue={article.seoTitle} name="seoTitle" />
          </label>
          <label>
            SEO 描述
            <textarea defaultValue={article.seoDescription} name="seoDescription" rows={4} />
          </label>
          <div className="revision-list">
            <h2>修订</h2>
            {revisions.map((revision) => (
              <p key={revision.revision}>
                #{revision.revision} {revision.title}
                <ConfirmRestoreRevisionButton
                  action={restoreRevisionAction.bind(null, id, revision.revision)}
                  revision={revision.revision}
                />
              </p>
            ))}
          </div>
          <div className="article-admin__actions">
            <button className="button" type="submit">
              <RotateCcw size={16} />
              <span>保存</span>
            </button>
            <Link className="button" href={`/admin/articles/${id}/preview`}>
              <Eye size={16} />
              <span>预览</span>
            </Link>
          </div>
          <ConfirmRecycleButton action={recycleArticleAction.bind(null, id)} />
        </aside>
      </form>
    </section>
  );
}
