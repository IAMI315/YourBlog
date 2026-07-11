import { NextRequest, NextResponse } from "next/server";

import { AppError } from "../../../../../infrastructure/errors/app-error";
import { requireAdminSession } from "../../../../../modules/auth/public";
import { validateAndStageUpload } from "../../../../../modules/web-projects/public";

export async function POST(request: NextRequest) {
  await requireAdminSession();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, code: "WEB_PROJECT_FILE_REQUIRED" }, { status: 400 });
  }

  try {
    const staged = await validateAndStageUpload({
      bytes: new Uint8Array(await file.arrayBuffer()),
      filename: file.name,
    });

    return NextResponse.json({
      ok: true,
      previewUrl: staged.previewUrl,
      ticket: staged.ticket,
      validation: {
        kind: staged.validated.kind,
        checksum: staged.validated.checksum,
        compressedBytes: staged.validated.compressedBytes,
        extractedBytes: staged.validated.extractedBytes,
        fileCount: staged.validated.fileCount,
      },
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
}
