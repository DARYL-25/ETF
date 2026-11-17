import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import type { GroupStats } from "@/lib/etfs/stats";

/** One line with a group's typical fee, so every fund in it can be judged against its peers. */
export async function GroupFeeLine({ stats, find }: { stats: GroupStats; find: string }) {
  const t = await getT();
  if (stats.avg === null || stats.withFee < 3) return null;
  return (
    <p className="mb-5 max-w-[80ch] rounded-xl bg-sunken px-3.5 py-2.5">
      {t("Typical fee here: median {median}%, average {avg}%, from {min}% to {max}% across {n} funds.", { median: stats.median!.toFixed(2), avg: stats.avg.toFixed(2), min: stats.min!.toFixed(2), max: stats.max!.toFixed(2), n: stats.withFee })}{" "}
      {stats.cheapest ? <>{t("Cheapest:")} <Link className="prose-link" href={`/etfs/${stats.cheapest.key}`}>{stats.cheapest.name}</Link>.</> : null}{" "}
      <Link className="prose-link" href={find}>{t("Find the right one for your country and account")}</Link>
    </p>
  );
}
