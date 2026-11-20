import { NextResponse, type NextRequest } from "next/server";
import { parseLoose, parsePositions, type ImportResult } from "@/lib/portfolio/import";
import { resolveIdentifiers } from "@/lib/etfs/portfolio-data";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;

async function pdfLines(data: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data, useSystemFonts: false, disableFontFace: true });
  const doc = await task.promise;
  const lines: string[] = [];
  for (let n = 1; n <= Math.min(doc.numPages, 40); n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    // Rebuild lines from text pieces that share a baseline, left to right.
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as { str: string; transform: number[] }[]) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      rows.set(key, [...(rows.get(key) ?? []), { x: item.transform[4], s: item.str }]);
    }
    for (const y of [...rows.keys()].sort((a, b) => b - a)) lines.push(rows.get(y)!.sort((a, b) => a.x - b.x).map((p) => p.s).join(" "));
  }
  await task.destroy();
  return lines;
}

async function excelText(data: Buffer): Promise<string> {
  const { readSheet } = await import("read-excel-file/node");
  const rows = await readSheet(data);
  return rows.map((r) => r.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c === null || c === undefined ? "" : String(c).replace(/\t/g, " "))).join("\t")).join("\n");
}

/**
 * Reads positions from a CSV, TSV, Excel or PDF file, or from pasted text, and matches each identifier to an ETF.
 * The file is read in memory and never stored. The reader reviews every row before anything is added.
 */
export async function POST(request: NextRequest) {
  let result: ImportResult;
  let kind = "text";
  try {
    const type = request.headers.get("content-type") ?? "";
    if (type.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "The file is larger than 5 MB." }, { status: 413 });
      const name = (file as File).name?.toLowerCase() ?? "";
      const bytes = Buffer.from(await file.arrayBuffer());
      if (name.endsWith(".pdf") || bytes.subarray(0, 4).toString() === "%PDF") { kind = "pdf"; result = parseLoose(await pdfLines(new Uint8Array(bytes))); }
      else if (name.endsWith(".xlsx") || bytes.subarray(0, 2).toString() === "PK") { kind = "excel"; result = parsePositions(await excelText(bytes)); }
      else { kind = "csv"; result = parsePositions(bytes.toString("utf8")); }
    } else {
      const json = (await request.json().catch(() => null)) as { text?: unknown } | null;
      if (!json || typeof json.text !== "string" || json.text.length > 500_000) return NextResponse.json({ error: "Paste the rows as text." }, { status: 400 });
      result = parsePositions(json.text);
    }
  } catch {
    return NextResponse.json({ error: "We could not read this file. Export it as CSV, or paste the rows." }, { status: 422 });
  }
  const matches = await resolveIdentifiers(result.rows.map((r) => r.identifier));
  return NextResponse.json({ kind, ...result, rows: result.rows.slice(0, 200).map((r) => ({ ...r, match: matches[r.identifier] ?? null })) });
}
