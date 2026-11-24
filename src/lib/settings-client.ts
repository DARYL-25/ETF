"use client";

import { LANG_COOKIE } from "@/lib/i18n";
import { LENS_COOKIE } from "@/lib/lens";
import { COOKIE_MAX_AGE, MARKET_COOKIE, WELCOMED_COOKIE, type Settings } from "@/lib/settings";

const setCookie = (name: string, value: string | null | undefined) => {
  document.cookie = value ? `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax` : `${name}=; path=/; max-age=0`;
};

export const readCookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;

/** Supabase keeps its session in a readable cookie, so the browser can tell whether to sync with the account. */
export const looksSignedIn = () => document.cookie.split("; ").some((c) => c.startsWith("sb-") && c.includes("auth-token"));

/** Writes settings to this device's cookies only. */
export function applySettings(s: Settings) {
  if (s.lang) setCookie(LANG_COOKIE, s.lang);
  if (s.country !== undefined) setCookie(LENS_COOKIE, s.country);
  if (s.market) setCookie(MARKET_COOKIE, s.market === "all" ? null : s.market);
  setCookie(WELCOMED_COOKIE, "1");
}

export const currentSettings = (): Settings => ({
  lang: (readCookie(LANG_COOKIE) as Settings["lang"]) ?? undefined,
  country: readCookie(LENS_COOKIE),
  market: (readCookie(MARKET_COOKIE) as Settings["market"]) ?? "all",
});

/** Saves on this device, and in the account when signed in. A failed account save leaves the device copy in place. */
export async function saveSettings(change: Settings) {
  applySettings(change);
  if (!looksSignedIn()) return;
  try {
    await fetch("/api/v1/me/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...currentSettings(), ...change }) });
  } catch { /* The cookies already hold the choice. */ }
}
