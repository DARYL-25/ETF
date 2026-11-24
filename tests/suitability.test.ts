import { describe, expect, it } from "vitest";
import { fitBadge, suitability } from "@/lib/etfs/suitability";
import { buildScreenerWhere, parseScreenerParams } from "@/lib/etfs/screener-params";
import { settingsSchema } from "@/lib/settings";

const us = { isin: "US78462F1030", domicile: "US" };
const ie = { isin: "IE00B5BMR087", domicile: "IE" };
const ca = { isin: "CA46434V1094", domicile: "CA" };
const ch = { isin: "CH0017142719", domicile: "CH" };

describe("Whether a fund suits the reader's country", () => {
  it("says nothing until the reader chooses a country", () => {
    expect(suitability(us, null)).toEqual({ level: "ok", points: [], sources: [] });
  });

  it("flags US funds as usually unavailable in the EU and the UK, with sources", () => {
    for (const country of ["FR", "DE", "BE", "GB"]) {
      const fit = suitability(us, country);
      expect(fit.level, country).toBe("unavailable");
      expect(fit.sources.length).toBeGreaterThan(0);
      expect(fit.points.some((p) => p.text.startsWith("US estate tax"))).toBe(true);
    }
    expect(fitBadge("unavailable")).toBeTruthy();
  });

  it("treats Irish UCITS funds as fine in Europe but a poor fit for a US taxpayer", () => {
    expect(suitability(ie, "FR").level).toBe("ok");
    expect(suitability(ie, "GB").level).toBe("ok");
    expect(suitability(ie, "US").level).toBe("poor");
    expect(suitability(us, "US").level).toBe("ok");
  });

  it("only cautions a Swiss investor about US funds", () => {
    const fit = suitability(us, "CH");
    expect(fit.level).toBe("caution");
    expect(fitBadge(fit.level)).toBeNull();
  });

  it("uses the ISIN prefix as the domicile, and handles other far-away and nearby domiciles", () => {
    expect(suitability(ca, "FR").level).toBe("unavailable");
    expect(suitability(ch, "FR").level).toBe("caution");
    expect(suitability({ isin: null, domicile: null }, "FR").points).toHaveLength(1);
  });
});

describe("Domicile filter", () => {
  const where = (raw: Record<string, string>, ctx = {}) => buildScreenerWhere(parseScreenerParams(raw), ctx);

  it("shows everything by default and filters by market when asked", () => {
    expect(where({}).where).toBe("");
    const eu = where({ market: "eu" });
    expect(eu.where).toContain("= any(");
    expect(eu.values[0]).toContain("IE");
    expect(where({ market: "us" }).values[0]).toEqual(["US"]);
  });

  it("uses the saved default when the address has none, and the address when it has one", () => {
    expect(where({}, { market: "us" }).values[0]).toEqual(["US"]);
    expect(where({ market: "all" }, { market: "us" }).where).toBe("");
  });

  it("keeps only funds usually available to the reader", () => {
    const fr = where({ market: "fit" }, { country: "FR" });
    expect(fr.where).toContain("not (");
    expect(fr.values[0]).toContain("US");
    expect(where({ market: "fit" }, { country: "US" }).where).toContain("= 'US'");
    expect(where({ market: "fit" }, { country: "CH" }).where).toBe("");
    expect(where({ market: "fit" }).where).toBe("");
  });

  it("ignores unknown markets", () => {
    expect(parseScreenerParams({ market: "mars" }).market).toBe("");
  });
});

describe("Settings", () => {
  it("accepts a language, a country code and a market, and nothing else", () => {
    expect(settingsSchema.safeParse({ lang: "fr", country: "CH", market: "fit" }).success).toBe(true);
    expect(settingsSchema.safeParse({ lang: "de" }).success).toBe(false);
    expect(settingsSchema.safeParse({ country: "<script>" }).success).toBe(false);
  });
});
