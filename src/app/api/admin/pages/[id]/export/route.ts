import { NextResponse } from "next/server";

import { requireAdminSession } from "../../../../../../modules/auth/public";
import { createPageTransferPackage, pageQueries } from "../../../../../../modules/site-designer/public";

type ExportPageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: ExportPageRouteProps) {
  await requireAdminSession();

  const { id } = await params;
  const page = await pageQueries.findForEditor(id);
  if (!page) {
    return NextResponse.json({ ok: false, code: "PAGE_NOT_FOUND" }, { status: 404 });
  }

  const filename = `page-${page.slug}.yourblog-page.json`;
  const body = `${JSON.stringify(createPageTransferPackage(page), null, 2)}\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
