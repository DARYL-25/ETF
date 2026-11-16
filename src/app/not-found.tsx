import { getT } from "@/lib/i18n/server";
import { use } from "react";
import Link from "next/link";

export default function NotFound() {
  const t = use(getT());
  return (
    <div className="max-w-[60ch]">
      <h1 className="text-[2rem]">{t("Page not found")}</h1>
      <p className="mt-2 text-muted">{t("If you followed a link to an ETF, it is not in the database yet. Try the search box, or browse the ")}<Link href="/screener" className="prose-link">{t("screener")}</Link>.</p>
    </div>
  );
}
