"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, X } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { LANGS, makeT, type Lang } from "@/lib/i18n";
import { LENS_COUNTRIES } from "@/lib/lens";
import { MARKETS, WELCOMED_COOKIE, type Market, type Settings } from "@/lib/settings";
import { applySettings, currentSettings, looksSignedIn, readCookie, saveSettings } from "@/lib/settings-client";
import { countryName } from "@/lib/format";

const OPEN_EVENT = "etf:open-settings";

/** Any button that opens the settings window, for example next to the screener's domicile filter. */
export function OpenSettings({ className, children }: { className?: string; children: React.ReactNode }) {
  return <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>{children}</button>;
}

/** Reloads in a way that shows the new language: a /fr address always shows French, so leaving French leaves it. */
function reload(router: ReturnType<typeof useRouter>, lang: Lang | undefined) {
  const { pathname, search } = window.location;
  const onFr = pathname === "/fr" || pathname.startsWith("/fr/");
  if (lang === "en" && onFr) window.location.assign((pathname.slice(3) || "/") + search);
  else router.refresh();
}

/**
 * First visit: asks for the language, the country the reader invests from and which funds lists show by default.
 * Saved in cookies, and in the account when signed in. On sign-in, the account's settings are applied to this device.
 */
export function Welcome() {
  const ui = useT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [first, setFirst] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [lang, setLang] = useState<Lang>(ui.lang);
  // The window speaks the language being chosen, so a reader can read it before saving.
  const t = useMemo(() => makeT(lang), [lang]);
  const [country, setCountry] = useState<string>("");
  const [market, setMarket] = useState<Market>("all");

  const open = (isFirst: boolean) => {
    const now = currentSettings();
    setFirst(isFirst);
    setSignedIn(looksSignedIn());
    setLang(ui.lang);
    setCountry(now.country ?? "");
    setMarket(now.market ?? "all");
    if (!dialog.current?.open) dialog.current?.showModal();
  };

  useEffect(() => {
    const onOpen = () => open(false);
    window.addEventListener(OPEN_EVENT, onOpen);
    let cancelled = false;
    (async () => {
      const welcomed = readCookie(WELCOMED_COOKIE) === "1";
      if (looksSignedIn()) {
        try {
          const res = await fetch("/api/v1/me/settings", { cache: "no-store" });
          const body = (await res.json()) as { signed_in?: boolean; value?: Settings | null };
          if (cancelled) return;
          if (body.signed_in && body.value) {
            // The account is the reference once signed in.
            const now = currentSettings();
            const differs = (body.value.lang && body.value.lang !== ui.lang) || (body.value.country ?? null) !== (now.country ?? null) || (body.value.market ?? "all") !== (now.market ?? "all");
            applySettings(body.value);
            if (differs) reload(router, body.value.lang);
            return;
          }
          if (body.signed_in && welcomed) { await saveSettings({ ...currentSettings(), lang: ui.lang }); return; }
        } catch { /* Fall through to the device's own settings. */ }
      }
      if (!welcomed && !cancelled && !navigator.webdriver) open(true);
    })();
    return () => { cancelled = true; window.removeEventListener(OPEN_EVENT, onOpen); };
    // Runs once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => dialog.current?.close();
  const skip = () => { applySettings({}); close(); };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({ lang, country: country || null, market });
    close();
    reload(router, lang);
  };

  return (
    <dialog ref={dialog} className="welcome m-auto w-[min(34rem,calc(100vw-2rem))] rounded-[24px] border border-line bg-surface p-0 text-ink shadow-[0_30px_80px_-30px_rgb(10_42_94/45%)] backdrop:bg-[rgb(10_42_94/35%)] backdrop:backdrop-blur-sm" aria-labelledby="welcome-title" onCancel={() => applySettings({})}>
      <form onSubmit={save} className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow flex items-center gap-1.5"><Globe2 size={14} aria-hidden />{t("Your settings")}</p>
            <h2 id="welcome-title" className="font-display mt-1 text-[1.55rem] font-extrabold tracking-[-0.04em]">{first ? t("Welcome to ETF Intelligence") : t("Language, country and lists")}</h2>
            <p className="mt-1.5 text-muted">{t("Tell us where you invest from, and pages show what applies to you: which funds you can usually buy there, and what they mean for your tax.")}</p>
          </div>
          <button type="button" onClick={skip} className="chip flex-none" aria-label={t("Close")}><X size={15} aria-hidden /></button>
        </div>

        <div>
          <p className="font-semibold" id="welcome-lang">{t("Language")}</p>
          <div className="seg mt-1.5" role="group" aria-labelledby="welcome-lang">
            {LANGS.map((l) => <button key={l.code} type="button" lang={l.code} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>{l.name}</button>)}
          </div>
        </div>

        <label className="block font-semibold">{t("Country you invest from")}
          <select className="field mt-1.5 font-normal" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t("Not set, or another country")}</option>
            {[...LENS_COUNTRIES].sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang), lang)).map((c) => <option key={c.code} value={c.code}>{countryName(c.code, lang)}</option>)}
          </select>
          <span className="mt-1 block text-[0.85rem] font-normal text-muted">{t("Never guessed from your location. It decides the tax notes and the warnings on funds that are usually not sold to private investors where you live.")}</span>
        </label>

        <div>
          <p className="font-semibold" id="welcome-market">{t("Funds to show in lists by default")}</p>
          <div className="seg mt-1.5" role="group" aria-labelledby="welcome-market">
            <button type="button" aria-pressed={market === "all"} onClick={() => setMarket("all")}>{t("All funds")}</button>
            <button type="button" aria-pressed={market === "fit"} onClick={() => setMarket("fit")}>{t("Only those I can usually buy")}</button>
          </div>
          <label className="mt-2.5 block text-[0.9rem] text-muted">{t("Or only funds domiciled in")}
            <select className="field mt-1 text-ink" value={market === "all" || market === "fit" ? "" : market} onChange={(e) => setMarket((e.target.value || "all") as Market)}>
              <option value="">{t("Any country")}</option>
              {MARKETS.filter((m) => m.value !== "all" && m.value !== "fit").map((m) => <option key={m.value} value={m.value}>{t(m.label)}</option>)}
            </select>
          </label>
          <span className="mt-1.5 block text-[0.85rem] text-muted">{t("Funds you cannot usually buy stay one click away in the screener, with a warning.")}</span>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.8rem] text-muted">{signedIn ? t("Saved to your account and this device.") : t("Saved in cookies on this device. Sign in to keep them on every device.")}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-quiet whitespace-nowrap" onClick={skip}>{t("Not now")}</button>
            <button type="submit" className="btn btn-primary whitespace-nowrap">{t("Save")}</button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
