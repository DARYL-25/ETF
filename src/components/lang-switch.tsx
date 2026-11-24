"use client";

import { useRouter } from "next/navigation";
import { LANGS, type Lang } from "@/lib/i18n";
import { saveSettings } from "@/lib/settings-client";
import { useT } from "@/lib/i18n/client";

/** EN · FR pill. The choice is kept in a cookie for a year. */
export function LangSwitch() {
  const router = useRouter();
  const t = useT();
  const pick = async (code: Lang) => {
    if (code === t.lang) return;
    await saveSettings({ lang: code });
    // A French address always shows French, so leaving French also means leaving that address.
    const { pathname, search } = window.location;
    if (pathname === "/fr" || pathname.startsWith("/fr/")) window.location.assign((pathname.slice(3) || "/") + search);
    else router.refresh();
  };
  return (
    <div role="group" aria-label={t("Language")} className="flex rounded-full bg-sunken p-[3px]">
      {LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} aria-pressed={l.code === t.lang} onClick={() => pick(l.code)}
          aria-label={l.code === "fr" ? "Passer en français" : "Switch to English"}
          className="cursor-pointer rounded-full px-2.5 py-1 text-[0.8rem] font-semibold text-ink transition-colors aria-pressed:bg-navy aria-pressed:text-navy-ink">
          {l.code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
