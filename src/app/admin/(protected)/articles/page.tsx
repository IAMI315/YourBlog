import Link from "next/link";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";

import { articleQueries } from "../../../../modules/articles/public";

export default async function ArticlesPage() {
  const articles = await articleQueries.listForAdmin();

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
              <td>{article.status === "PUBLISHED" ? "已发布" : "草稿"}</td>
              <td>{article.categoryName ?? "-"}</td>
              <td>{article.updatedAt.toLocaleString("zh-CN")}</td>
              <td>
                <div className="admin-table__actions">
                  <Link aria-label="编辑" href={`/admin/articles/${article.id}`}>
                    <Pencil size={16} />
                  </Link>
                  <button aria-label="回收" type="button">
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {articles.length === 0 ? (
            <tr>
              <td colSpan={5}>还没有文章。</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
