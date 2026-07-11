import Link from "next/link";
import { FilePlus2, Pencil } from "lucide-react";

import { articleQueries } from "../../../../modules/articles/public";
import { recoverArticleAction, recycleArticleAction } from "./[id]/actions";
import { RecoverArticleButton } from "./recover-article-button";
import { RecycleArticleButton } from "./recycle-article-button";

type ArticlesPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const isRecycleView = (await searchParams)?.view === "recycled";
  const articles = await articleQueries.listForAdmin({ recycled: isRecycleView });

  return (
    <section className="admin-section" aria-labelledby="articles-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">Articles</p>
          <h1 id="articles-title">文章</h1>
        </div>
        <Link className="button" href="/admin/articles/new">
          <FilePlus2 size={18} />
          <span>新建文章</span>
        </Link>
      </div>
      <div className="segmented-control" aria-label="Article list view">
        <Link aria-current={!isRecycleView} href="/admin/articles">
          全部
        </Link>
        <Link aria-current={isRecycleView} href="/admin/articles?view=recycled">
          回收站
        </Link>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>分类</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => (
            <tr key={article.id}>
              <td>{article.title}</td>
              <td>
                {isRecycleView ? "回收站" : article.status === "PUBLISHED" ? "已发布" : "草稿"}
              </td>
              <td>{article.categoryName ?? "-"}</td>
              <td>{article.updatedAt.toLocaleString("zh-CN")}</td>
              <td>
                <div className="admin-table__actions">
                  {isRecycleView ? (
                    <RecoverArticleButton action={recoverArticleAction.bind(null, article.id)} />
                  ) : (
                    <>
                      <Link aria-label="编辑" href={`/admin/articles/${article.id}`}>
                        <Pencil size={16} />
                      </Link>
                      <RecycleArticleButton action={recycleArticleAction.bind(null, article.id)} />
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {articles.length === 0 ? (
            <tr>
              <td colSpan={5}>{isRecycleView ? "回收站是空的。" : "还没有文章。"}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
