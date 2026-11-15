import type { EtfRow } from "@/lib/etfs/queries";

/**
 * Tax notes for private investors. Every rule quotes an official source and the day we read it.
 * Nothing here has been reviewed by a qualified tax adviser, and the site says so wherever it shows.
 * There are no personal calculations: a rule is stated, never applied to someone's figures.
 */
export const TAX_CHECKED_ON = "2026-11-14";

export type Source = { label: string; url: string };
export type Rule = { title: string; body: string; why: string; sources: Source[] };
export type Wrapper = { name: string; body: string; sources: Source[] };
export type TaxCountry = {
  code: string; slug: string; name: string; adjective: string; authority: string;
  summary: string; rules: Rule[]; wrappers: Wrapper[]; compare: { fact: string; matters: string }[]; open: string[];
};

const ESTV_TAXES: Source = { label: "Federal Tax Administration, taxes in force, law as of 1 January 2026", url: "https://www.estv2.admin.ch/stp/ds/c-geltende-steuern-de.pdf" };
const ESTV_KS25: Source = { label: "Federal Tax Administration, Circular 25 on collective investment schemes, 23 February 2018", url: "https://www.estv2.admin.ch/dvs/kreisschreiben/dbst-ks-2018-1-025-d-de.pdf" };
const ICTAX: Source = { label: "ICTax, the Federal Tax Administration's price list", url: "https://www.ictax.admin.ch/extern/de.html" };
const FR_PV: Source = { label: "impots.gouv.fr, how a gain on securities is taxed", url: "https://www.impots.gouv.fr/particulier/questions/jai-realise-une-plus-value-mobiliere-comment-est-elle-imposee" };
const FR_SP: Source = { label: "service-public.gouv.fr, income tax on savings and investment income, verified 12 March 2026", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2613" };
const FR_PEA: Source = { label: "service-public.gouv.fr, plan d'épargne en actions, verified 22 May 2026", url: "https://www.service-public.gouv.fr/particuliers/vosdroits/F2385" };
const FR_PEA_ECO: Source = { label: "economie.gouv.fr, what is a PEA", url: "https://www.economie.gouv.fr/particuliers/plan-epargne-actions-pea" };

export const TAX_COUNTRIES: TaxCountry[] = [
  {
    code: "CH", slug: "switzerland", name: "Switzerland", adjective: "Swiss", authority: "Federal Tax Administration (ESTV) and your canton",
    summary: "For a private investor, price gains are generally tax-free, while the income a fund earns is taxed every year, whether the fund pays it out or keeps it. Wealth is taxed by the canton and commune.",
    rules: [
      { title: "Gains from selling are tax-free for private investors", body: "Capital gains on movable private assets, which include securities, are exempt at federal and cantonal level.", why: "An ETF's price growth is not taxed when you sell, as long as you invest as a private person and not as a professional trader. Your canton decides that status.", sources: [ESTV_TAXES] },
      { title: "Fund income is taxed every year, paid out or not", body: "Investors must declare all income from fund units. Distributions are taxable when due. Income an accumulating fund keeps is taxed when it is credited inside the fund. Capital gains inside the fund stay tax-free when the fund reports them separately.", why: "An accumulating ETF does not defer income tax in Switzerland. The taxable amount per share comes from the fund's reporting, which is why Swiss tax reporting matters when you choose a fund.", sources: [ESTV_KS25] },
      { title: "The taxable income and year-end value come from ICTax", body: "The Federal Tax Administration publishes a price list with year-end tax values and taxable income for securities, including funds. Foreign funds are treated like Swiss funds for these rules.", why: "Look up the ISIN in ICTax before buying. If a fund is listed there with its income, your tax return is straightforward.", sources: [ICTAX, ESTV_KS25] },
      { title: "Wealth tax applies to the year-end value", body: "Cantons and communes tax the net wealth of individuals, measured on a fixed day. The Confederation levies no wealth tax.", why: "Every ETF you hold counts toward wealth tax at its year-end tax value, whatever its domicile.", sources: [ESTV_TAXES] },
      { title: "Stamp duty on trades through a Swiss dealer", body: "The federal transfer stamp duty is 1.5 per mille for Swiss securities and 3 per mille for foreign securities, on trades that involve a Swiss securities dealer. Fund units are within its scope.", why: "A fund domiciled abroad, such as in Ireland or Luxembourg, falls in the foreign rate when you trade it through a Swiss bank or broker. Ask your broker what it charges you, since the duty is shared between the parties.", sources: [ESTV_TAXES] },
      { title: "35% withholding tax on Swiss investment income", body: "Switzerland levies a 35% withholding tax on income from movable capital paid by Swiss payers.", why: "A Swiss-domiciled fund's income arrives after this deduction. Swiss residents who declare the income reclaim it through their tax return.", sources: [ESTV_TAXES] },
    ],
    wrappers: [],
    compare: [
      { fact: "Income treatment", matters: "Accumulating and distributing funds are taxed alike on income, so choose on convenience, not on tax deferral." },
      { fact: "Fund domicile", matters: "It sets the stamp duty rate at a Swiss dealer and whether Swiss withholding tax applies to the fund's payments." },
      { fact: "Listed in ICTax", matters: "A fund with reported income in ICTax avoids estimated taxation. We do not hold ICTax data, so check the ISIN there." },
      { fact: "Listed on SIX", matters: "Trading in Switzerland, often in CHF. Not a tax point, but it affects your costs." },
    ],
    open: ["Withholding tax on dividends inside the fund, which depends on the fund's domicile and the treaties it can use.", "Whether your canton treats you as a private investor.", "US estate tax questions for funds domiciled in the United States."],
  },
  {
    code: "FR", slug: "france", name: "France", adjective: "French", authority: "Direction générale des Finances publiques",
    summary: "In an ordinary securities account, dividends and gains are taxed at a flat rate unless you opt for the income tax scale. A PEA can remove income tax on gains after five years, but only some ETFs can be held in one.",
    rules: [
      { title: "The flat tax on gains is 31.4% for 2026 income", body: "Gains on securities are subject to the single flat-rate levy: 12.8% income tax plus 18.6% social levies, 31.4% in total. The social levies rate on investment income rose to 18.6% on 1 January 2026.", why: "This is the default in a compte-titres ordinaire. The gain is taxed when you sell, so a fund that reinvests its income pays you nothing to tax along the way.", sources: [FR_PV, FR_SP] },
      { title: "Dividends follow the same flat tax", body: "The flat-rate levy on dividends is made of 12.8% income tax plus social levies, which are 18.6% from 1 January 2026.", why: "A distributing ETF creates a tax event each time it pays. An accumulating one does not pay out, which is why many French investors prefer accumulating funds outside a PEA.", sources: [FR_SP] },
      { title: "You can opt for the income tax scale", body: "The option is made in the income tax return by ticking box 2OP, and it applies to all your investment income and gains for the year. It gives access to the 40% allowance on eligible dividends, which the flat tax does not.", why: "The option can help households in low tax brackets. It is all or nothing for the year.", sources: [FR_PV, FR_SP] },
    ],
    wrappers: [
      { name: "PEA", body: "Deposits are capped at €150,000. It holds European company shares, and funds that keep at least 75% in eligible European securities. After five years, gains are exempt from income tax. Social levies apply whatever the withdrawal date. A withdrawal before five years normally closes the plan, and the net gain is then taxed at 12.8% unless you opt for the scale.", sources: [FR_PEA, FR_PEA_ECO] },
      { name: "Compte-titres ordinaire", body: "No limit on deposits or on which ETFs you can hold. Dividends and gains follow the flat tax or, on option, the income tax scale.", sources: [FR_PV, FR_SP] },
    ],
    compare: [
      { fact: "PEA eligibility", matters: "Decided fund by fund and published by the issuer. Some ETFs on world or US indices qualify because they hold European shares and swap the performance." },
      { fact: "Income treatment", matters: "In a compte-titres, an accumulating fund has no dividend to tax each year. In a PEA the difference matters little." },
      { fact: "Replication", matters: "ETFs on non-European indices that qualify for a PEA typically use synthetic replication, which adds swap counterparty risk." },
    ],
    open: ["Assurance-vie, which has its own rules and is not covered yet.", "Reporting duties for accounts held with brokers outside France.", "Withholding tax on dividends inside the fund."],
  },
];

export const taxCountry = (codeOrSlug: string | null | undefined) =>
  TAX_COUNTRIES.find((c) => c.code === (codeOrSlug ?? "").toUpperCase() || c.slug === (codeOrSlug ?? "").toLowerCase()) ?? null;

export type TaxNote = { text: string; source?: Source; kind: "fact" | "check" };

/** Notes for one ETF and one country of residence, built only from structural facts we hold. */
export function taxNotes(row: Pick<EtfRow, "name" | "domicile" | "distribution_policy" | "replication" | "ucits" | "isin" | "listed_on_six" | "fund_key" | "pea_eligible">, code: string): TaxNote[] {
  const notes: TaxNote[] = [];
  const policy = row.distribution_policy;
  // On basic records the domicile field is the issuer's registered country, so use the ISIN prefix as a hint only when it is a fund domicile we can trust.
  const domicile = row.fund_key ? row.domicile : row.isin?.slice(0, 2) ?? null;
  if (code === "CH") {
    notes.push({ kind: "fact", text: "Price gains are tax-free for a private investor when you sell.", source: ESTV_TAXES });
    if (policy === "accumulating") notes.push({ kind: "fact", text: "This fund keeps its income, and that income is still taxable each year.", source: ESTV_KS25 });
    else if (policy === "distributing") notes.push({ kind: "fact", text: "This fund pays out its income, which is taxable when due.", source: ESTV_KS25 });
    else notes.push({ kind: "check", text: "We do not know whether this fund pays out or keeps its income. Either way the income is taxable each year.", source: ESTV_KS25 });
    if (domicile === "CH") notes.push({ kind: "fact", text: "Swiss fund: 35% withholding tax on its income, reclaimed through your tax return, and the 1.5 per mille stamp duty rate at a Swiss dealer.", source: ESTV_TAXES });
    else if (domicile) notes.push({ kind: "fact", text: "Foreign fund: the 3 per mille stamp duty rate applies to trades through a Swiss dealer.", source: ESTV_TAXES });
    if (row.listed_on_six) notes.push({ kind: "fact", text: "Listed on SIX Swiss Exchange, according to the issuer." });
    notes.push({ kind: "check", text: `Look up ${row.isin ?? "the ISIN"} in ICTax to see its taxable income and year-end value.`, source: ICTAX });
  }
  if (code === "FR") {
    if (row.pea_eligible === true) notes.push({ kind: "fact", text: "The issuer lists this fund as eligible for a PEA.", source: FR_PEA });
    else if (row.pea_eligible === false) notes.push({ kind: "fact", text: "The issuer lists this fund as not eligible for a PEA, so it belongs in a compte-titres.", source: FR_PEA });
    else if (/\bPEA\b/.test(row.name)) notes.push({ kind: "fact", text: "The fund's name says PEA, so the issuer presents it as eligible. Confirm in its KID.", source: FR_PEA });
    else notes.push({ kind: "check", text: "PEA eligibility is decided fund by fund. We do not hold it yet, so check the issuer's page.", source: FR_PEA });
    if (policy === "accumulating") notes.push({ kind: "fact", text: "It reinvests its income, so in a compte-titres there is no dividend to tax each year. The gain is taxed when you sell.", source: FR_PV });
    else if (policy === "distributing") notes.push({ kind: "fact", text: "It pays out its income, and in a compte-titres each payment is taxed.", source: FR_SP });
    notes.push({ kind: "fact", text: "In a compte-titres, the flat tax on gains is 31.4% for 2026 income, unless you opt for the income tax scale.", source: FR_PV });
    if (row.replication === "synthetic_swap") notes.push({ kind: "fact", text: "Synthetic replication, which is typically how ETFs on non-European indices qualify for a PEA." });
  }
  return notes;
}
