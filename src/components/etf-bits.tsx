import Link from "next/link";
import type { EtfRow } from "@/lib/etfs/queries";
import { MISSING, formatDate, formatPct, formatSignedPct, isStale } from "@/lib/format";

const FEE_LABEL: Record<string, string> = { ter: "TER", ocf: "OCF", ger: "Gross", ongoing: "Ongoing", net: "Net", gross_sec: "Gross" };

/** A fee always carries its type. TER and OCF are not interchangeable. */
export function Fee({ row }: { row: Pick<EtfRow, "headline_fee_pct" | "headline_fee_type"> }) {
  if (row.headline_fee_pct === null) return <span className="text-muted" title="No fee on file for this ETF yet">{MISSING}</span>;
  return (
    <span className="whitespace-nowrap">
      {formatPct(row.headline_fee_pct)}
      <span className="ml-1 text-[0.75rem] text-muted">{FEE_LABEL[row.headline_fee_type ?? ""] ?? row.headline_fee_type}</span>
    </span>
  );
}

export function Change({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-muted">{MISSING}</span>;
  return <span className={value >= 0 ? "text-up" : "text-down"}>{formatSignedPct(value)}</span>;
}

export function EtfName({ row }: { row: Pick<EtfRow, "etf_key" | "isin" | "name" | "ticker"> }) {
  return (
    <>
      <Link href={`/etfs/${row.etf_key ?? row.isin}`} className="font-medium no-underline hover:underline">{row.name}</Link>
      <span className="data block text-[0.85rem] text-muted">{[row.ticker, row.isin].filter(Boolean).join(", ") || MISSING}</span>
    </>
  );
}

/** States when a fact dates from. When the source gave no date, says that rather than guessing. */
export function AsOf({ date, retrieved }: { date: string | null | undefined; retrieved?: string | null }) {
  if (!date) {
    return <span className="text-[0.85rem] text-muted">{retrieved ? `Date not published, read ${formatDate(retrieved)}` : "Date not published"}</span>;
  }
  return (
    <span className="text-[0.85rem] text-muted">
      As of {formatDate(date)}
      {isStale(date) ? <span className="ml-1.5 rounded bg-warn-bg px-1.5 py-0.5 text-warn-ink">Out of date</span> : null}
    </span>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 max-w-[72ch]">
      <h1 className="text-[clamp(1.9rem,3.2vw,2.6rem)]">{title}</h1>
      {children ? <div className="mt-2 text-muted">{children}</div> : null}
    </div>
  );
}
