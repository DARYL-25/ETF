/**
 * Reads positions from what a reader pastes or uploads: a CSV or TSV export from a broker, cells copied from a
 * spreadsheet, or text taken out of a PDF statement. Nothing is guessed silently: every row says what it
 * found, and rows without an identifier and a quantity are reported, not dropped without a word.
 */
export type ImportedRow = { line: number; identifier: string; quantity: number | null; price: number | null; date: string | null; note: string | null; side?: "buy" | "sell"; fee?: number | null };
export type ImportResult = { rows: ImportedRow[]; skipped: { line: number; text: string; reason: string }[]; columns: Record<string, number | null> };

const ISIN = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/;

/** ISO 6166 check digit, so random 12-character codes are not taken for ISINs. */
export function isValidIsin(code: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(code)) return false;
  const digits = code.split("").map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join("");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Numbers as brokers write them: 1,234.56 or 1 234,56 or 1.234,56, with or without a currency sign. */
export function parseNumber(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  let s = raw.replace(/['’\s  €$£]|CHF|EUR|USD|GBP/gi, "").replace(/^\((.*)\)$/, "-$1");
  if (!s || !/\d/.test(s)) return null;
  const comma = s.lastIndexOf(","), dot = s.lastIndexOf(".");
  if (dot < 0 && comma >= 0) {
    // Only commas: 1,234,567 is thousands; 12,5 or 0,875 is a decimal comma.
    s = /^-?\d{1,3}(,\d{3}){2,}$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (comma > dot) s = s.replace(/\./g, "").replace(",", ".");
  else if (comma >= 0) s = s.replace(/,/g, "");
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/** Dates as 2026-11-17, 17/11/2026, 17.11.2026 or 17-11-2026, read day first as European brokers write them. */
export function parseDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(s);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    const d = Number(m[1]), mo = Number(m[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

const HEADERS: Record<keyof Omit<ImportedRow, "line" | "note">, RegExp> = {
  side: /^(side|type|sens|operation|opération|op[ée]ration type|action|buy\/sell|achat\/vente|transaction|transaktion|typ)$/i,
  fee: /^(fee|fees|frais|commission|courtage|commissions|gebühr|gebühren|kosten|costs)$/i,
  identifier: /^(isin|code isin|ticker|symbol|symbole|mnémo|mnemo|code|valeur|instrument|wkn|security|titre)$/i,
  quantity: /^(quantity|qty|quantité|quantite|qté|qte|nombre|nb|shares|units|parts|anzahl|stück|stuck|position)$/i,
  price: /^(price|prix|prix moyen|pru|cost|avg price|average price|purchase price|prix d'achat|prix de revient|kurs|einstandskurs)$/i,
  date: /^(date|trade date|date d'achat|date d'opération|date operation|datum|purchase date)$/i,
};

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cell = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (c === sep && !quoted) { out.push(cell.trim()); cell = ""; }
    else cell += c;
  }
  out.push(cell.trim());
  return out;
}

function pickSeparator(lines: string[]): string | null {
  const sample = lines.slice(0, 10);
  let best: string | null = null, bestScore = 0;
  for (const sep of ["\t", ";", ","]) {
    const counts = sample.map((l) => splitLine(l, sep).length);
    const score = counts.filter((c) => c > 1 && c === counts[0]).length * counts[0];
    if (score > bestScore) { best = sep; bestScore = score; }
  }
  return best;
}

/** Table text: finds the header row by its names, or reads columns by what their cells look like. */
export function parsePositions(text: string): ImportResult {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
  const sep = pickSeparator(lines);
  if (!sep) return parseLoose(lines);
  const table = lines.map((l) => splitLine(l, sep));
  const headerAt = table.findIndex((cells) => cells.some((c) => HEADERS.identifier.test(c)) && cells.some((c) => HEADERS.quantity.test(c)));
  const columns: ImportResult["columns"] = { identifier: null, quantity: null, price: null, date: null, side: null, fee: null };
  if (headerAt >= 0) {
    for (const [field, re] of Object.entries(HEADERS)) {
      // An ISIN column beats a name or ticker column when both are present.
      const hits = table[headerAt].map((c, i) => (re.test(c) ? i : -1)).filter((i) => i >= 0);
      columns[field] = field === "identifier" ? hits.find((i) => /isin/i.test(table[headerAt][i])) ?? hits[0] ?? null : hits[0] ?? null;
    }
  }
  const rows: ImportedRow[] = [], skipped: ImportResult["skipped"] = [];
  table.forEach((cells, i) => {
    if (i <= headerAt) return;
    let id = columns.identifier !== null ? cells[columns.identifier] : undefined;
    if (!id || !(isValidIsin(id.toUpperCase()) || /^[A-Z0-9.]{1,10}$/i.test(id))) {
      const isin = cells.map((c) => ISIN.exec(c.toUpperCase())?.[1]).find((c) => c && isValidIsin(c));
      id = isin ?? id;
    }
    let qty = columns.quantity !== null ? parseNumber(cells[columns.quantity]) : null;
    if (qty === null && headerAt < 0) qty = cells.map(parseNumber).find((v, j) => v !== null && v > 0 && cells[j] !== id) ?? null;
    const negative = qty !== null && qty < 0;
    if (negative && columns.side === null) qty = Math.abs(qty!);
    if (!id || qty === null || qty === 0) { skipped.push({ line: i + 1, text: lines[i].slice(0, 120), reason: !id ? "No ISIN or ticker found" : "No positive quantity found" }); return; }
    const sideText = columns.side !== null ? (cells[columns.side] ?? "").toLowerCase() : "";
    const sell = /sell|vente|vendu|verkauf|sale|cession|rachat/.test(sideText) || negative;
    const price = columns.price !== null ? parseNumber(cells[columns.price]) : null;
    rows.push({ line: i + 1, identifier: id.toUpperCase(), quantity: Math.abs(qty), price: price !== null ? Math.abs(price) : null, date: columns.date !== null ? parseDate(cells[columns.date]) : null, note: null, side: sell ? "sell" : "buy", fee: columns.fee !== null ? Math.abs(parseNumber(cells[columns.fee]) ?? 0) : null });
  });
  return { rows, skipped, columns };
}

/**
 * Text without a table, such as lines out of a PDF statement: each line with a valid ISIN becomes a row,
 * with the first plausible quantity on that line or the next one. The reader checks every row before import.
 */
export function parseLoose(lines: string[]): ImportResult {
  const rows: ImportedRow[] = [], skipped: ImportResult["skipped"] = [];
  lines.forEach((line, i) => {
    const isin = [...line.toUpperCase().matchAll(new RegExp(ISIN, "g"))].map((m) => m[1]).find(isValidIsin);
    if (!isin) return;
    // Numbers labelled as a quantity or a price win; otherwise the numbers that follow the ISIN, so figures in
    // the fund's name (S&P 500, MSCI World 2030) are not taken for a quantity.
    const text = `${line} ${lines[i + 1] ?? ""}`;
    // In free text a plain space separates numbers; only the non-breaking spaces French typesetting puts in 1 234,56 join them.
    const NUM = "(-?\\d[\\d.,'\u00a0\u202f]*\\d|\\d)";
    const labelled = (words: string) => parseNumber(new RegExp(`(?:${words})\\s*[:=]?\\s*${NUM}`, "i").exec(text)?.[1]);
    const after = text.slice(text.toUpperCase().indexOf(isin) + isin.length);
    const numbers = [...after.matchAll(/(?<![\w/.-])-?\d[\d.,'\u00a0\u202f]*(?![\w/])/g)].map((m) => parseNumber(m[0])).filter((v): v is number => v !== null && v > 0);
    const qty = labelled("qt[ée]|qty|quantit[ée]|quantity|nombre|nb|parts|units|shares|anzahl|st[üu]ck") ?? numbers[0] ?? null;
    const price = labelled("cours|price|prix|pru|kurs") ?? (numbers[0] === qty ? numbers[1] : numbers[0]) ?? null;
    if (qty === null) { skipped.push({ line: i + 1, text: line.slice(0, 120), reason: "No positive quantity found" }); return; }
    rows.push({ line: i + 1, identifier: isin, quantity: qty, price, date: null, note: "Read from text: check the quantity" });
  });
  return { rows, skipped, columns: { identifier: null, quantity: null, price: null, date: null, side: null, fee: null } };
}
