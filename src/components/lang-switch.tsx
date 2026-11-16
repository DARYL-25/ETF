"use client";

import { useRouter } from "next/navigation";
import { LANGS, LANG_COOKIE } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

/** Switches the site's language. The choice is kept in a cookie for a year. */
export function LangSwitch() {
  const router = useRouter();
  const t = useT();
  const other = LANGS.find((l) => l.code !== t.lang)!;
  return (
    <button type="button" className="chip" lang={other.code} aria-label={other.code === "fr" ? "Passer en français" : "Switch to English"}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${other.code}; path=/; max-age=31536000; samesite=lax`;
        // A French address always shows French, so leaving French also means leaving that address.
        const { pathname, search } = window.location;
        if (pathname === "/fr" || pathname.startsWith("/fr/")) window.location.assign((pathname.slice(3) || "/") + search);
        else router.refresh();
      }}>
      {other.code.toUpperCase()}
    </button>
  );
}
