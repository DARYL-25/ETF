import { describe, expect, it } from "vitest";
import { makeT, pickLang } from "@/lib/i18n";
import { FR } from "@/lib/i18n/fr";
import { collectKeys } from "@/lib/i18n/keys";
import { localizeText } from "@/lib/assistant/localize";
import { parseIntent } from "@/lib/assistant/intent";
import { formatDate, formatMoney, countryName } from "@/lib/format";

describe("French", () => {
  it("has a translation for every string the interface can show", () => {
    const missing = collectKeys(process.cwd()).filter((k) => !(k in FR));
    expect(missing).toEqual([]);
  });

  it("keeps every placeholder in its translation", () => {
    for (const [en, fr] of Object.entries(FR)) {
      const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(names(fr), en).toEqual(names(en));
    }
  });

  it("falls back to English for unknown text and keeps outer spaces", () => {
    const fr = makeT("fr"), en = makeT("en");
    expect(fr("Zebra crossing")).toBe("Zebra crossing");
    expect(fr(" Yearly fee ")).toBe(" Frais annuels ");
    expect(en("{n} ETFs", { n: 3 })).toBe("3 ETFs");
    expect(fr("{n} ETFs", { n: 3 })).toBe("3 ETF");
  });

  it("uses the reader's choice first, then the browser's language", () => {
    expect(pickLang("en", "fr-CH,fr;q=0.9")).toBe("en");
    expect(pickLang(undefined, "fr-CH,fr;q=0.9,en;q=0.8")).toBe("fr");
    expect(pickLang(undefined, "de-CH,fr;q=0.9")).toBe("en");
    expect(pickLang("xx", null)).toBe("en");
  });

  it("formats dates, money and countries the French way", () => {
    expect(formatDate("2026-11-13", "fr")).toMatch(/^13 nov\.? 2026$/);
    expect(formatMoney(29_800_000_000, "USD", "fr")).toBe("29,8 Md $");
    expect(formatMoney(29_800_000_000, "USD")).toBe("$29.8bn");
    expect(countryName("CH", "fr")).toBe("Suisse");
  });

  it("translates the ranking's sentences, including ones with numbers", () => {
    expect(localizeText("Fee 0.20%, lowest in this group", "fr")).toBe("Frais 0,20 %, les plus bas du groupe");
    expect(localizeText("Listed on SIX Swiss Exchange", "fr")).toBe("Coté à la SIX Swiss Exchange");
    expect(localizeText("Fee 0.20%", "en")).toBe("Fee 0.20%");
  });

  it("understands the French example questions", () => {
    const swiss = parseIntent(FR["Nasdaq-100 ETF for a Swiss investor"]);
    expect(swiss).toMatchObject({ index: "nasdaq-100", investorCountry: "Switzerland" });
    expect(parseIntent(FR["Cheapest accumulating MSCI World UCITS ETF"])).toMatchObject({ index: "msci-world", distribution: "accumulating", ucitsOnly: true });
    expect(parseIntent(FR["Physical S&P 500 ETF for a French resident"])).toMatchObject({ index: "sp-500", investorCountry: "France", replication: "physical" });
  });
});
