import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";

/** Finds a stored issuer icon by brand. Sends a transparent pixel when none exists, so initials show. */
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (/^[a-z-]+$/.test(slug)) {
    for (const ext of ["png", "ico", "svg"]) {
      if (existsSync(join(process.cwd(), "public/logos", `${slug}.${ext}`))) return NextResponse.redirect(new URL(`/logos/${slug}.${ext}`, request.url));
    }
  }
  return new NextResponse(PIXEL, { headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" } });
}
