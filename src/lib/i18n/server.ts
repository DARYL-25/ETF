import { cache } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { LANG_COOKIE, asLang, makeT, pickLang } from "./index";

/**
 * The request's translator. Cached, so every server component in one request shares it.
 * A French address (/fr/...) decides the language; otherwise the reader's saved choice, then their browser.
 */
export const getT = cache(async () => {
  const h = await headers();
  return makeT(asLang(h.get("x-lang")) ?? pickLang((await cookies()).get(LANG_COOKIE)?.value, h.get("accept-language")));
});

/** Tells search engines that a page exists in both languages, and which address is the one being shown. */
export async function alternatesFor(path?: string): Promise<NonNullable<Metadata["alternates"]>> {
  const h = await headers();
  const p = path ?? h.get("x-path") ?? "/";
  const fr = p === "/" ? "/fr" : `/fr${p}`;
  return { canonical: h.get("x-lang") === "fr" ? fr : p, languages: { en: p, fr, "x-default": p } };
}
