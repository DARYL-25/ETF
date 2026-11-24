import type { EtfRow } from "./queries";
import type { Point } from "./assess";
import { fundDomicile } from "@/lib/tax/drag";
import { isEea } from "@/lib/lens";
import { ASIA_PACIFIC } from "@/lib/settings";

/**
 * Whether a private investor in a given country can usually buy a fund, and what to watch, judged from where the
 * fund is domiciled. These are general rules about brokers and tax, read from official sources on the date below.
 * A broker can be stricter, a professional client can be allowed more, and none of this is advice. Funds are always
 * still shown: the reader decides.
 */
export type FitLevel = "ok" | "caution" | "poor" | "unavailable";
export type Source = { label: string; url: string };
export type Fit = { level: FitLevel; points: Point[]; sources: Source[] };

export const SUITABILITY_READ_ON = "2026-11-24";

const SOURCES = {
  priips: { label: "PRIIPs Regulation (EU) No 1286/2014", url: "https://eur-lex.europa.eu/eli/reg/2014/1286/oj" },
  amf: { label: "AMF ombudsman: US funds and the PRIIPs KID", url: "https://www.amf-france.org/en/amf-ombudsman/ombudsman-online-diary/latest/application-priips-regulation-what-happens-us-packaged-products-subscribed-regulation-came-force" },
  fca: { label: "FCA PS25/20: Consumer Composite Investments", url: "https://www.fca.org.uk/publications/policy-statements/ps25-20-supporting-informed-decision-making-final-rules-consumer-composite-investments" },
  estate: { label: "IRS: estate tax for nonresidents", url: "https://www.irs.gov/businesses/small-businesses-self-employed/estate-tax-for-nonresidents-not-citizens-of-the-united-states" },
  pfic: { label: "IRS: Form 8621 for PFIC shareholders", url: "https://www.irs.gov/forms-pubs/about-form-8621" },
} satisfies Record<string, Source>;

const RANK: Record<FitLevel, number> = { ok: 0, caution: 1, poor: 2, unavailable: 3 };

/** Domiciles whose funds normally have no EU or UK key information document. */
const farAway = (dom: string) => dom === "US" || dom === "CA" || ASIA_PACIFIC.includes(dom);

export function suitability(row: Pick<EtfRow, "isin" | "domicile">, country: string | null | undefined): Fit {
  const investor = (country ?? "").toUpperCase();
  const out: Fit = { level: "ok", points: [], sources: [] };
  if (!investor) return out;
  const raise = (level: FitLevel) => { if (RANK[level] > RANK[out.level]) out.level = level; };
  const cite = (...s: Source[]) => { for (const x of s) if (!out.sources.includes(x)) out.sources.push(x); };
  const dom = (fundDomicile(row) ?? "").toUpperCase();

  if (!dom) {
    out.points.push({ text: "Its domicile is not on file, so we cannot tell whether it is sold to private investors where you live.", vars: {} });
    return out;
  }

  if (isEea(investor)) {
    if (dom === "US") {
      raise("unavailable");
      out.points.push({ text: "US-domiciled funds publish no PRIIPs key information document (KID), so brokers in the EU generally refuse to sell them to private investors. You can usually keep or sell units you already hold, and professional clients may be allowed to buy.", vars: {} });
      cite(SOURCES.priips, SOURCES.amf);
    } else if (farAway(dom)) {
      raise("unavailable");
      out.points.push({ text: "Domiciled outside Europe, in {domicile}: such funds rarely publish a PRIIPs KID, so brokers in the EU generally cannot sell them to private investors.", vars: { domicile: dom } });
      cite(SOURCES.priips);
    } else if (!isEea(dom)) {
      raise("caution");
      out.points.push({ text: "Domiciled outside the EU, in {domicile}: check that your broker offers it, because it may have no PRIIPs KID.", vars: { domicile: dom } });
      cite(SOURCES.priips);
    }
  } else if (investor === "GB") {
    if (dom === "US" || farAway(dom)) {
      raise("unavailable");
      out.points.push({ text: "UK platforms generally do not sell funds from {domicile} to private investors, because their issuers rarely publish the product information UK rules require: the PRIIPs KID until April 2026, the CCI product summary since. Elective professional clients may be allowed to buy.", vars: { domicile: dom } });
      cite(SOURCES.fca);
    } else if (dom !== "GB" && !isEea(dom)) {
      raise("caution");
      out.points.push({ text: "Domiciled in {domicile}: check that your platform offers it and that it has UK reporting fund status.", vars: { domicile: dom } });
    }
  } else if (investor === "CH") {
    if (dom === "US") {
      raise("caution");
      out.points.push({ text: "Many Swiss brokers sell US-domiciled ETFs on an execution-only basis, without advice. Check that yours does.", vars: {} });
    }
  } else if (investor === "US") {
    if (dom !== "US") {
      raise("poor");
      out.points.push({ text: "For a US taxpayer, a fund domiciled outside the US is very likely a PFIC: gains are taxed harshly unless an election is made, and Form 8621 is usually due each year. US brokers also rarely offer such funds.", vars: {} });
      cite(SOURCES.pfic);
    }
  } else if (investor === "MA") {
    out.points.push({ text: "We do not cover the rules for investors in Morocco yet, including exchange controls that can limit investing abroad. Check with your bank before buying.", vars: {} });
  }

  if (dom === "US" && investor !== "US") {
    raise("caution");
    out.points.push({ text: "US estate tax: for someone neither a US citizen nor resident, shares of a US fund are US assets. Above $60,000 of them, the estate must file a US return and can owe tax of up to 40%. A tax treaty can change this.", vars: {} });
    cite(SOURCES.estate);
  }
  return out;
}

/** Short label for lists. Caution stays off the lists, so badges only flag the funds that matter. */
export const fitBadge = (level: FitLevel) => (level === "unavailable" ? "Usually unavailable to you" : level === "poor" ? "Usually a poor fit for you" : null);
