import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Check, Info, Minus } from "lucide-react";
import type { Assessment } from "@/lib/etfs/assess";
import type { PeerPosition } from "@/lib/etfs/stats";
import type { Advice } from "@/lib/tax/replication";
import { countryName } from "@/lib/format";

/** Country codes in a point read as names in the reader's language. */
const named = (vars: Record<string, string>, lang: "en" | "fr") => (vars.domicile ? { ...vars, domicile: countryName(vars.domicile, lang) } : vars);

/** Strengths, weaknesses and notes for one ETF against its peers, with the peer group's fees and replication guidance. */
export async function ProsCons({ assessment, peers, replication }: { assessment: Assessment; peers: PeerPosition | null; replication: Advice | null }) {
  const t = await getT();
  const g = peers?.group;
  return (
    <div className="flex flex-col gap-3">
      {g && g.avg !== null ? (
        <p className="text-muted">{t("Across the {n} funds on {group} with a fee on file: average {avg}%, median {median}%, from {min}% to {max}%.", { n: g.withFee, group: g.label, avg: g.avg.toFixed(2), median: g.median!.toFixed(2), min: g.min!.toFixed(2), max: g.max!.toFixed(2) })} <Link className="prose-link" href={`/fees#${g.kind}-${g.slug}`}>{t("Fees by index and theme")}</Link></p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="panel p-4">
          <h3 className="font-semibold text-up">{t("Strengths")}</h3>
          {assessment.pros.length ? <ul className="mt-2 space-y-1.5">{assessment.pros.map((p) => <li key={p.text} className="flex gap-2"><Check size={16} className="mt-1 flex-none text-up" aria-hidden /><span>{t(p.text, p.vars)}</span></li>)}</ul> : <p className="mt-2 text-muted">{t("None stands out from the data we hold.")}</p>}
        </div>
        <div className="panel p-4">
          <h3 className="font-semibold text-down">{t("Weaknesses")}</h3>
          {assessment.cons.length ? <ul className="mt-2 space-y-1.5">{assessment.cons.map((p) => <li key={p.text} className="flex gap-2"><Minus size={16} className="mt-1 flex-none text-down" aria-hidden /><span>{t(p.text, named(p.vars, t.lang))}</span></li>)}</ul> : <p className="mt-2 text-muted">{t("None stands out from the data we hold.")}</p>}
        </div>
      </div>
      {assessment.notes.length ? <ul className="space-y-1">{assessment.notes.map((p) => <li key={p.text} className="flex gap-2 text-[0.92rem] text-muted"><Info size={15} className="mt-1 flex-none" aria-hidden /><span>{t(p.text, named(p.vars, t.lang))}</span></li>)}</ul> : null}
      {replication ? (
        <div className="rounded-xl bg-sunken p-3.5">
          <p className="font-semibold">{t("Physical or synthetic for this index?")} <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-[0.8rem]">{replication.verdict === "synthetic" ? t("Synthetic has the edge") : replication.verdict === "physical" ? t("Physical is usually simpler") : t("Either can suit")}</span></p>
          <ul className="mt-1.5 space-y-1">{replication.points.map((p) => <li key={p.text}>{t(p.text, p.vars)}</li>)}</ul>
          {replication.source ? <p className="mt-1 text-[0.82rem] text-muted"><a className="prose-link" href={replication.source.url} target="_blank" rel="noreferrer">{replication.source.label}</a></p> : null}
        </div>
      ) : null}
      <p className="text-[0.82rem] text-muted">{t("Compared with funds on the same index, or the same theme when there is no index. Fees above 3% are left out as likely errors. Choose your country at the top for points about your tax situation.")}</p>
    </div>
  );
}
