import type { Metadata } from "next";
import { PlannedPage } from "@/components/planned-page";

export const metadata: Metadata = { title: "Tax Intelligence" };

export default function Page() {
  return (
    <PlannedPage
      title="Tax Intelligence"
      intro="Understand how tax may differ between ETFs for your country of residence. You will choose your residence yourself; it is never guessed from your location."
      phase="phase 5, starting with Switzerland and France"
      plans={[
        "Country rules checked against official sources, each with a last-checked date",
        "Tax kept in separate layers: inside the fund, withholding on dividends, on distributions and on sale",
        "A comparison of two ETFs for your residence, and an educational simulator",
      ]}
      now={{ href: "/screener?domicile=IE,DE,FR,CH", label: "Filter ETFs by domicile" }}
    />
  );
}
