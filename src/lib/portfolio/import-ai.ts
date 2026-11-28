import { aiChat, aiConfig, type AiConfig } from "@/lib/ai/provider";
import { isValidIsin, parseNumber, type ImportResult, type ImportedRow, type Layout } from "./import";

/**
 * When a broker's layout is not one we know, the language model is asked only where things are: which row is the
 * header and which column holds the identifier, quantity, price, date, buy or sell, and fees. The figures are
 * then read by our own code. For a statement without a table (PDF text), the model may list positions, and each
 * is kept only if its ISIN or ticker and its quantity appear as written in the statement. The reader checks every
 * row before anything is added either way.
 */
const FIELDS = ["identifier", "quantity", "price", "date", "side", "fee"] as const;

const LAYOUT_PROMPT = `You read the first rows of a broker export. Rows are numbered from 0, cells are separated by " | " and numbered from 0.
Reply with JSON only, no prose: {"header_row": n, "identifier": c, "quantity": c, "price": c, "date": c, "side": c, "fee": c}
- header_row: the row holding column names, or -1 if there is none.
- identifier: the column with the ISIN (preferred) or the ticker/symbol of each security. Not the security's name.
- quantity: number of shares or units held or traded. Not an amount of money.
- price: price per share paid (cost) if present, otherwise the current price per share. Not a total value.
- date: trade or purchase date. side: buy/sell or transaction type. fee: broker fees.
Use null for any column that is absent. Never invent a column.`;

const ROWS_PROMPT = `You read text taken from a broker or bank statement. List each security position or purchase it shows.
Reply with JSON only: {"rows": [{"identifier": "ISIN or ticker as written", "quantity": "the quantity exactly as written", "price": "price per share as written, or null", "date": "YYYY-MM-DD or null"}]}
Copy numbers exactly as they appear in the text. Leave out cash lines, totals and anything that is not a security. If there are none, reply {"rows": []}.`;

function json<T>(text: string): T | null {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}

/** Which row is the header and which column holds what, for a table we could not read by its headers. */
export async function aiLayout(table: string[][], config: AiConfig | null = aiConfig()): Promise<Layout | null> {
  if (!config || !table.length) return null;
  const sample = table.slice(0, 25).map((cells, i) => `${i}: ${cells.map((c) => c.slice(0, 40)).join(" | ")}`).join("\n");
  const reply = await aiChat({ system: LAYOUT_PROMPT, turns: [{ role: "user", text: sample }], maxTokens: 200, config });
  if (!reply.ok) return null;
  const got = json<Record<string, unknown>>(reply.text);
  if (!got) return null;
  const width = Math.max(...table.slice(0, 25).map((r) => r.length));
  const col = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < width ? (v as number) : null);
  const columns = Object.fromEntries(FIELDS.map((f) => [f, col(got[f])])) as ImportResult["columns"];
  const headerAt = Number.isInteger(got.header_row) && (got.header_row as number) >= -1 && (got.header_row as number) < table.length ? (got.header_row as number) : -1;
  if (columns.identifier === null || columns.quantity === null || columns.identifier === columns.quantity) return null;
  return { headerAt, columns };
}

/** Positions listed by the model from statement text, kept only where the statement shows them as given. */
export async function aiRows(lines: string[], config: AiConfig | null = aiConfig()): Promise<ImportResult | null> {
  if (!config || !lines.length) return null;
  const text = lines.slice(0, 400).join("\n").slice(0, 24_000);
  const reply = await aiChat({ system: ROWS_PROMPT, turns: [{ role: "user", text }], maxTokens: 1500, config });
  if (!reply.ok) return null;
  const got = json<{ rows?: { identifier?: unknown; quantity?: unknown; price?: unknown; date?: unknown }[] }>(reply.text);
  if (!got?.rows) return null;
  const rows: ImportedRow[] = [], skipped: ImportResult["skipped"] = [];
  const upper = text.toUpperCase();
  got.rows.slice(0, 200).forEach((r, i) => {
    const id = String(r.identifier ?? "").trim().toUpperCase();
    const qtyText = String(r.quantity ?? "").trim();
    const qty = parseNumber(qtyText);
    const line = lines.findIndex((l) => l.toUpperCase().includes(id));
    // Only what the statement itself shows: the identifier and the quantity as written.
    if (!id || !upper.includes(id) || !(isValidIsin(id) || /^[A-Z0-9.]{1,10}$/.test(id))) { skipped.push({ line: i + 1, text: id.slice(0, 40), reason: "No ISIN or ticker found" }); return; }
    if (qty === null || qty <= 0 || !text.includes(qtyText)) { skipped.push({ line: line + 1, text: (lines[line] ?? id).slice(0, 120), reason: "No positive quantity found" }); return; }
    const priceText = r.price === null || r.price === undefined ? "" : String(r.price).trim();
    const price = priceText && text.includes(priceText) ? parseNumber(priceText) : null;
    const date = typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null;
    rows.push({ line: line + 1, identifier: id, quantity: qty, price, date, note: "Read by the AI from the statement: check it", side: "buy" });
  });
  return { rows, skipped, columns: { identifier: null, quantity: null, price: null, date: null, side: null, fee: null } };
}
