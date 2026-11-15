// One-off tool, second pass: wraps plain string literals that are shown to the reader but sit in expressions
// (conditionals, arrays, label properties), and lists template strings for a person to convert.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const ts = createRequire(import.meta.url)(process.env.TS5 ?? "typescript");
const SHOWN_ATTRS = new Set(["placeholder", "aria-label", "title", "alt", "label"]);
const SHOWN_PROPS = new Set(["label", "title", "detail", "note"]);
const looksLikeText = (s) => /^[A-Z][a-z]{2,}([ ,.]|$)/.test(s) || /[a-z]{2,} [a-z]{2,}/.test(s);
const looksLikeCode = (s) => /(^|\s)(text|bg|border|flex|grid|gap|px|py|mt|mb|font|rounded|hover|w|h|min|max)-[\w\[]/.test(s) || /^(select|insert|update|with) /i.test(s) || s.startsWith("/") || s.includes("=>");
const keys = new Set(), manual = [];

for (const file of process.argv.slice(2)) {
  const source = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const client = /^\s*["']use client["']/.test(source);
  const edits = [], owners = new Set();
  const ownerOf = (node) => {
    let top = null;
    for (let n = node.parent; n; n = n.parent) if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) top = n;
    if (!top) return null;
    const name = ts.isFunctionDeclaration(top) ? top.name?.text : ts.isVariableDeclaration(top.parent) && ts.isIdentifier(top.parent.name) ? top.parent.name.text : null;
    const isDefault = ts.isFunctionDeclaration(top) && top.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
    return (name && /^[A-Z]/.test(name)) || isDefault ? top : null;
  };
  const allowed = (node) => {
    const p = node.parent;
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) return false;
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(p.operatorToken.kind)) return false;
    if (ts.isPropertyAssignment(p) && (p.name === node || !SHOWN_PROPS.has(p.name.getText()))) return false;
    if (ts.isElementAccessExpression(p) || ts.isImportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isCaseClause(p) || ts.isJsxAttribute(p)) return ts.isJsxAttribute(p) && SHOWN_ATTRS.has(p.name.getText());
    for (let n = p; n; n = n.parent) {
      if (ts.isJsxAttribute(n)) return SHOWN_ATTRS.has(n.name.getText());
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "t") return false;
      if (ts.isTypeNode?.(n)) return false;
    }
    return true;
  };
  const visit = (node) => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && looksLikeText(node.text) && !looksLikeCode(node.text) && allowed(node)) {
      const o = ownerOf(node);
      if (o) { owners.add(o); keys.add(node.text); edits.push({ start: node.getStart(), end: node.getEnd(), text: ts.isJsxAttribute(node.parent) ? `{t(${JSON.stringify(node.text)})}` : `t(${JSON.stringify(node.text)})` }); }
    } else if (ts.isTemplateExpression(node) && looksLikeText(node.head.text + node.templateSpans.map((s) => s.literal.text).join(" x ")) && !looksLikeCode(node.getText()) && allowed(node) && ownerOf(node)) {
      manual.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${node.getText().slice(0, 150)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!edits.length) continue;
  for (const fn of owners) {
    if (/const t = (useT\(\)|await getT\(\)|use\(getT\(\)\))/.test(fn.getText().slice(0, 400)) || /^\s*\{\s*const t = /.test(fn.body.getText())) continue;
    const isAsync = fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
    const decl = client ? "const t = useT();" : isAsync ? "const t = await getT();" : "const t = use(getT());";
    if (ts.isBlock(fn.body)) edits.push({ start: fn.body.getStart() + 1, end: fn.body.getStart() + 1, text: `\n  ${decl}` });
    else { edits.push({ start: fn.body.getFullStart(), end: fn.body.getFullStart(), text: ` {\n  ${decl}\n  return` }); edits.push({ start: fn.body.getEnd(), end: fn.body.getEnd(), text: ";\n}" }); }
  }
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let out = source;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  if (!out.includes("i18n/")) {
    const imports = client ? 'import { useT } from "@/lib/i18n/client";\n' : `import { getT } from "@/lib/i18n/server";\n${out.includes("use(getT())") ? 'import { use } from "react";\n' : ""}`;
    const first = out.search(/^import /m);
    out = out.slice(0, first) + imports + out.slice(first);
  } else if (out.includes("use(getT())") && !/import \{[^}]*\buse\b[^}]*\} from "react"/.test(out)) out = out.replace(/^import /m, 'import { use } from "react";\nimport ');
  writeFileSync(file, out);
}
console.log(JSON.stringify({ keys: [...keys], manual }, null, 1));
