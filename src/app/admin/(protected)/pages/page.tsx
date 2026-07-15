import Link from "next/link";
import { FilePlus2, Import, Pencil } from "lucide-react";

import { pageQueries } from "../../../../modules/site-designer/public";
import { importPageAction } from "./actions";

const pageImportErrorMessages = {
  PAGE_IMPORT_FILE_REQUIRED: "请选择要导入的页面包。",
  PAGE_IMPORT_FILE_TOO_LARGE: "页面包不能超过 1 MB。",
  PAGE_IMPORT_INVALID: "页面包格式无效或版本不受支持。",
  PAGE_IMPORT_SLUG_TAKEN: "该页面地址已被使用，请先修改导入包中的网址标识。",
  PAGE_IMPORT_VALIDATION_FAILED: "页面包中的字段不符合要求。",
} as const;

function pageImportErrorMessage(code: string | undefined): string | null {
  return code && code in pageImportErrorMessages
    ? pageImportErrorMessages[code as keyof typeof pageImportErrorMessages]
    : null;
}

type PagesPageProps = {
  searchParams?: Promise<{ deleted?: string; importError?: string }>;
};

export default async function PagesPage({ searchParams }: PagesPageProps) {
  const [pages, params] = await Promise.all([pageQueries.listForAdmin(), searchParams]);

  return (
    <section className="admin-section" aria-labelledby="pages-title">
      <div className="admin-section__header">
        <div>
          <p className="admin-section__eyebrow">外观与页面</p>
          <h1 id="pages-title">页面管理</h1>
        </div>
        <Link className="button" href="/admin/pages/new"><FilePlus2 size={18} /><span>新建页面</span></Link>
      </div>
      {params?.deleted ? <p className="admin-toast" role="status">页面已删除，媒体文件仍保留在媒体库。</p> : null}
      {pageImportErrorMessage(params?.importError) ? <p className="admin-error" role="alert">{pageImportErrorMessage(params?.importError)}</p> : null}
      <form action={importPageAction} className="page-import-form">
        <label>
          <span>导入页面包</span>
          <input accept="application/json,.json" name="file" required type="file" />
        </label>
        <button className="button button--quiet" type="submit"><Import size={16} /><span>导入为草稿</span></button>
        <small>支持 YourBlog 页面包，不包含媒体库文件。</small>
      </form>
      <table className="admin-table">
        <thead><tr><th>标题</th><th>状态</th><th>导航</th><th>更新时间</th><th>操作</th></tr></thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id}>
              <td><strong>{page.title}</strong><small>/pages/{page.slug}</small></td>
              <td>{page.status === "PUBLISHED" ? "已发布" : "草稿"}</td>
              <td>{page.showInNavigation && page.status === "PUBLISHED" ? "显示" : "隐藏"}</td>
              <td>{page.updatedAt.toLocaleString("zh-CN")}</td>
              <td><div className="admin-table__actions"><Link aria-label={`编辑${page.title}`} href={`/admin/pages/${page.id}`}><Pencil size={16} /></Link></div></td>
            </tr>
          ))}
          {pages.length === 0 ? <tr><td colSpan={5}>还没有独立页面。</td></tr> : null}
        </tbody>
      </table>
    </section>
  );
}
