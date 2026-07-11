import type { ReactNode } from "react";
import Link from "next/link";
import { Home, Menu, Settings } from "lucide-react";

import { requireAdminSession } from "../../../modules/auth/public";

function AdminNavigation() {
  return (
    <nav className="admin-shell__nav" aria-label="Admin navigation">
      <Link href="/admin">
        <Home size={18} />
        <span>概览</span>
      </Link>
      <Link href="/admin/settings">
        <Settings size={18} />
        <span>站点设置</span>
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
          Tech Notes
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
