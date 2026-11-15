import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DATASETS } from "../data/policy";
import { TAX_COUNTRIES } from "../tax/content";

/**
 * Every English string the interface can show, gathered from t("…") calls and from the data tables whose
 * text is translated when rendered. A test uses this to prove the French dictionary is complete.
 */
export function collectKeys(root: string): string[] {
  const keys = new Set<string>();
  const add = (s: string | undefined | null) => { const k = (s ?? "").trim(); if (k && /[A-Za-z]{2}/.test(k)) keys.add(k); };
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name) && !path.includes("i18n")) {
        const text = readFileSync(path, "utf8");
        for (const m of text.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) add(JSON.parse(`"${m[1]}"`));
        // Label tables that are translated where they are rendered.
        if (/components\/(shell|palette|assistant)\.tsx$|app\/(pricing|compare|data)\/page\.tsx$|etfs\/screener-params\.ts$|lib\/format\.ts$|components\/etf-bits\.tsx$/.test(path)) {
          for (const m of text.matchAll(/(?:label|title): "((?:[^"\\]|\\.)*)"/g)) add(JSON.parse(`"${m[1]}"`));
          for (const block of text.matchAll(/const (?:EXAMPLES|FREE|PREMIUM|PAGES|STATE|REPLICATION|DISTRIBUTION|FREQUENCY|ASSET_CLASS|PRODUCT|STYLE|FEE_LABEL|[A-Z_]+_LABELS?)\b[^=]*=\s*([\[{][\s\S]*?[\]}]);/g)) {
            for (const m of block[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) { const v = JSON.parse(`"${m[1]}"`); if (!v.startsWith("/")) add(v); }
          }
        }
      }
    }
  };
  walk(join(root, "src"));
  // Tax notes shown on ETF pages.
  for (const m of readFileSync(join(root, "src/lib/tax/content.ts"), "utf8").matchAll(/\btext: "((?:[^"\\]|\\.)*)"/g)) add(JSON.parse(`"${m[1]}"`));
  for (const d of DATASETS) { add(d.name); add(d.what); add(d.cadence); add(d.schedule); for (const s of d.sources) { add(s.covers); add(s.note); } }
  for (const c of TAX_COUNTRIES) {
    add(c.summary);
    for (const r of c.rules) { add(r.title); add(r.body); add(r.why); }
    for (const w of c.wrappers) { add(w.name); add(w.body); }
    for (const x of c.compare) { add(x.fact); add(x.matters); }
    for (const o of c.open) add(o);
  }
  return [...keys].sort();
}
