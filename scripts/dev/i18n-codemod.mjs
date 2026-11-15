// One-off tool: wraps user-visible text in .tsx files with t(), and prints the English strings it found.
// Usage: node scripts/dev/i18n-codemod.mjs <file.tsx>...   (prints JSON list of keys to stdout)
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";

const ATTRS = new Set(["placeholder", "aria-label", "title", "alt"]);
const LABELS = new Set(["assetClassLabel", "replicationLabel", "distributionLabel", "frequencyLabel", "productLabel", "styleLabel", "yesNoUnknown", "countryName"]);
const WITH_LANG = new Set(["formatDate", "formatMoney"]);
const decode = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const keys = new Set();

for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8");
  if (source.includes("i18n/")) continue; // Already converted.
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const client = /^\s*["']use client["']/.test(source);
  const edits = [];
  const owners = new Set();

  const ownerOf = (node) => {
    let top = null;
    for (let n = node.parent; n; n = n.parent) if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) top = n;
    if (!top) return null;
    const name = ts.isFunctionDeclaration(top) ? top.name?.text : ts.isVariableDeclaration(top.parent) && ts.isIdentifier(top.parent.name) ? top.parent.name.text : null;
    const isDefault = ts.isFunctionDeclaration(top) && top.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    return (name && /^[A-Z]/.test(name)) || isDefault ? top : null;
  };
  const add = (node, start, end, text) => { const o = ownerOf(node); if (!o) return; owners.add(o); edits.push({ start, end, text }); };

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const raw = node.getFullText();
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
      const core = decode(m[2].replace(/\s*\n\s*/g, " "));
      if (/[A-Za-zÀ-ÿ]{2}/.test(core)) {
        const lead = m[1].includes("\n") ? "" : m[1] ? " " : "", trail = m[3].includes("\n") ? "" : m[3] ? " " : "";
        keys.add(core);
        add(node, node.getFullStart() + (m[1].includes("\n") ? m[1].length : 0), node.getEnd() - (m[3].includes("\n") ? m[3].length : 0), `{t(${JSON.stringify(lead + core + trail)})}`);
      }
    } else if (ts.isJsxAttribute(node) && ATTRS.has(node.name.getText()) && node.initializer && ts.isStringLiteral(node.initializer) && /[A-Za-z]{2}/.test(node.initializer.text)) {
      keys.add(decode(node.initializer.text));
      add(node, node.initializer.getStart(), node.initializer.getEnd(), `{t(${JSON.stringify(decode(node.initializer.text))})}`);
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (LABELS.has(name)) { add(node, node.getStart(), node.getStart(), "t("); add(node, node.getEnd(), node.getEnd(), ")"); }
      if (WITH_LANG.has(name)) add(node, node.getEnd() - 1, node.getEnd() - 1, ", t.lang");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!edits.length) continue;

  for (const fn of owners) {
    const isAsync = fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    const decl = client ? "const t = useT();" : isAsync ? "const t = await getT();" : "const t = use(getT());";
    if (ts.isBlock(fn.body)) edits.push({ start: fn.body.getStart() + 1, end: fn.body.getStart() + 1, text: `\n  ${decl}` });
    else { edits.push({ start: fn.body.getFullStart(), end: fn.body.getFullStart(), text: ` {\n  ${decl}\n  return` }); edits.push({ start: fn.body.getEnd(), end: fn.body.getEnd(), text: ";\n}" }); }
  }
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = source;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  const usesUse = out.includes("use(getT())");
  const imports = client ? 'import { useT } from "@/lib/i18n/client";\n' : `import { getT } from "@/lib/i18n/server";\n${usesUse ? 'import { use } from "react";\n' : ""}`;
  const firstImport = out.search(/^import /m);
  out = out.slice(0, firstImport) + imports + out.slice(firstImport);
  writeFileSync(file, out);
}
console.log(JSON.stringify([...keys], null, 1));
