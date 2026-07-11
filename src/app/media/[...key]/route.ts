import { NextResponse } from "next/server";

import { readMedia } from "../../../modules/media/public";

type MediaRouteProps = {
  params: Promise<{ key: string[] }>;
};

const mimeByExtension: Record<string, string | undefined> = {
  avif: "image/avif",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function validateKey(segments: string[]): string | null {
  if (segments.length === 0 || segments[0] !== "media") return null;
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) {
    return null;
  }

  return segments.join("/");
}

export async function GET(_request: Request, { params }: MediaRouteProps) {
  const key = validateKey((await params).key);

  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readMedia(key);
    const extension = key.split(".").pop()?.toLowerCase() ?? "";
    const body = new ArrayBuffer(data.byteLength);
    new Uint8Array(body).set(data);

    return new NextResponse(body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": mimeByExtension[extension] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
