import type { Metadata } from "next";
import { Calculators } from "@/components/academy";
import { PageTitle } from "@/components/etf-bits";

export const metadata: Metadata = { title: "ETF Calculators" };

export default function CalculatorsPage() {
  return (
    <div>
      <PageTitle title="Calculators">Try your own numbers. Results use constant returns and ignore tax and trading costs, so they illustrate ideas and are not forecasts.</PageTitle>
      <Calculators />
    </div>
  );
}
