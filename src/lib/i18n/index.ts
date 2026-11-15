import { FR } from "./fr";

/**
 * Translation by English source text: the English string is the key, and a language's dictionary maps it
 * to its translation. A string with no entry stays in English, so a missing translation never breaks a page.
 */
export type Lang = "en" | "fr";
export const LANGS: { code: Lang; name: string }[] = [{ code: "en", name: "English" }, { code: "fr", name: "Français" }];
export const LANG_COOKIE = "lang";
const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, fr: FR };

export const asLang = (value: string | null | undefined): Lang | null => (value === "en" || value === "fr" ? value : null);

/** The language for a request: the reader's choice if they made one, otherwise their browser's first language. */
export function pickLang(cookie: string | null | undefined, acceptLanguage: string | null | undefined): Lang {
  return asLang(cookie) ?? (/^\s*fr\b/i.test(acceptLanguage ?? "") ? "fr" : "en");
}

export type T = ((text: string, vars?: Record<string, string | number>) => string) & { lang: Lang };

export function makeT(lang: Lang): T {
  const dictionary = DICTIONARIES[lang];
  const t = ((text: string, vars?: Record<string, string | number>) => {
    // Text around a translated phrase keeps its outer spaces, so "Fund size " and "Fund size" share one entry.
    const lead = /^\s*/.exec(text)![0], trail = /\s*$/.exec(text)![0];
    const core = text.slice(lead.length, text.length - trail.length || undefined);
    const found = dictionary[core] ?? core;
    const out = vars ? found.replace(/\{(\w+)\}/g, (whole, k) => (k in vars ? String(vars[k]) : whole)) : found;
    return lead + out + trail;
  }) as T;
  t.lang = lang;
  return t;
}
