import Link from "next/link";
import { getTape } from "@/lib/etfs/queries";
import { getT } from "@/lib/i18n/server";

const SYMBOL: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", JPY: "¥", CHF: "CHF " };

/** A slow ticker of the largest ETFs' latest closing prices. Pauses under the pointer, still when motion is reduced. */
export async function PriceTape() {
  const t = await getT();
  let items: Awaited<ReturnType<typeof getTape>> = [];
  try { items = await getTape(16); } catch { items = []; }
  if (items.length < 4) return null;
  const locale = t.lang === "fr" ? "fr-FR" : "en-GB";
  const row = (hidden: boolean) => items.map((x) => (
    <Link key={`${hidden}-${x.etf_key}`} href={`/etfs/${x.etf_key}`} tabIndex={hidden ? -1 : undefined} className="inline-flex items-baseline gap-2 no-underline">
      <b className="font-display font-bold text-ink">{x.ticker}</b>
      <span className="data text-muted">{SYMBOL[x.currency ?? ""] ?? (x.currency ? `${x.currency} ` : "")}{x.px.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      <span className={`data font-semibold ${x.chg >= 0 ? "text-up" : "text-down"}`}>{x.chg >= 0 ? "+" : "−"}{Math.abs(x.chg).toFixed(2)}%</span>
    </Link>
  ));
  return (
    <div className="tape overflow-hidden border-t border-line bg-cloud" aria-label={t("Latest closing prices")}>
      <div className="tape-track py-2 text-[0.8rem] whitespace-nowrap">
        {row(false)}
        <span aria-hidden className="contents">{row(true)}</span>
      </div>
    </div>
  );
}
