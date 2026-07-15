import type { ReactNode } from "react";
import Link from "next/link";
import {
  DatabaseBackup,
  FileText,
  FlaskConical,
  Home,
  Image as ImageIcon,
  Menu,
  Paintbrush,
  Settings,
} from "lucide-react";

import { requireAdminSession } from "../../../modules/auth/public";

function AdminNavigation() {
  return (
    <nav className="admin-shell__nav" aria-label="管理后台导航">
      <Link href="/admin">
        <Home size={18} />
        <span>概览</span>
      </Link>
      <Link href="/admin/settings">
        <Settings size={18} />
        <span>站点设置</span>
      </Link>
      <Link href="/admin/appearance">
        <Paintbrush size={18} />
        <span>外观与页面</span>
      </Link>
      <Link href="/admin/articles">
        <FileText size={18} />
        <span>文章</span>
      </Link>
      <Link href="/admin/media">
        <ImageIcon size={18} />
        <span>媒体库</span>
      </Link>
      <Link href="/admin/web-projects">
        <FlaskConical size={18} />
        <span>网页项目</span>
      </Link>
      <Link href="/admin/backups">
        <DatabaseBackup size={18} />
        <span>备份</span>
      </Link>
    </nav>
  );
}

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAdminSession();

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <Link className="admin-shell__brand" href="/admin">
          YourBlog
        </Link>
        <AdminNavigation />
      </aside>
      <details className="admin-shell__drawer">
        <summary>
          <Menu size={18} />
          <span>菜单</span>
        </summary>
        <AdminNavigation />
      </details>
      <main className="admin-shell__content">{children}</main>
    </div>
  );
}
