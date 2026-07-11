import { NextRequest, NextResponse } from "next/server";

import { AppError } from "../../../../infrastructure/errors/app-error";
import { requireAdminSession } from "../../../../modules/auth/public";
import { uploadMedia } from "../../../../modules/media/public";

export async function POST(request: NextRequest) {
  await requireAdminSession();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, code: "MEDIA_FILE_REQUIRED" }, { status: 400 });
  }

  let uploaded: Awaited<ReturnType<typeof uploadMedia>>;

  try {
    uploaded = await uploadMedia({
      bytes: new Uint8Array(await file.arrayBuffer()),
      originalName: file.name,
      altText: String(formData.get("altText") ?? ""),
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.safeMessage },
        { status: error.status },
      );
    }

    throw error;
  }

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/admin/media?uploaded=1", request.url), 303);
  }

  return NextResponse.json({ ok: true, media: uploaded });
}
