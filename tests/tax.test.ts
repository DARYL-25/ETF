import { describe, expect, it } from "vitest";
import { TAX_COUNTRIES, taxNotes } from "@/lib/tax/content";
import { DATASETS, getFreshness } from "@/lib/data/policy";

const base: Parameters<typeof taxNotes>[0] = { name: "Example UCITS ETF", domicile: "IE", distribution_policy: "accumulating", replication: "physical", ucits: true, isin: "IE00B5BMR087", listed_on_six: true, fund_key: "x" };

describe("tax notes", () => {
  it("gives every rule an official source", () => {
    for (const c of TAX_COUNTRIES) {
      for (const r of [...c.rules, ...c.wrappers]) {
        expect(r.sources.length, `${c.name}: ${"title" in r ? r.title : r.name}`).toBeGreaterThan(0);
        for (const s of r.sources) expect(s.url).toMatch(/^https:\/\/([a-z0-9-]+\.)*(admin\.ch|gouv\.fr)\//);
      }
    }
  });

  it("tells a Swiss investor that an accumulating fund's income is still taxed", () => {
    const notes = taxNotes(base, "CH").map((n) => n.text).join(" ");
    expect(notes).toMatch(/keeps its income, and that income is still taxable/);
    expect(notes).toMatch(/3 per mille/);
    expect(notes).toMatch(/ICTax/);
  });

  it("uses the Swiss rates for a Swiss fund and never guesses income treatment", () => {
    const notes = taxNotes({ ...base, domicile: "CH", isin: "CH0008899764", distribution_policy: null as unknown as string }, "CH");
    expect(notes.map((n) => n.text).join(" ")).toMatch(/35% withholding tax.*1\.5 per mille/);
    expect(notes.find((n) => /do not know whether/.test(n.text))?.kind).toBe("check");
  });

  it("does not claim PEA eligibility unless the fund's name says so", () => {
    expect(taxNotes(base, "FR")[0]).toMatchObject({ kind: "check" });
    expect(taxNotes({ ...base, name: "Amundi PEA Monde UCITS ETF" }, "FR")[0]).toMatchObject({ kind: "fact" });
  });

  it("has nothing to say for a country without written rules", () => {
    expect(taxNotes(base, "DE")).toEqual([]);
  });
});

describe("update policy", () => {
  it("covers every kind of data with a cadence, a job and at least one source", () => {
    expect(DATASETS.map((d) => d.id)).toEqual(["list", "facts", "size", "prices", "holdings", "fx", "tax"]);
    for (const d of DATASETS) { expect(d.cadence).toBeTruthy(); expect(d.sources.length).toBeGreaterThan(0); }
    expect(DATASETS.find((d) => d.id === "prices")!.cadence).toBe("Daily");
  });

  it("reads the last run of each job from its report", () => {
    const fresh = getFreshness();
    expect(fresh.find((f) => f.id === "prices")!.lastRun).toMatch(/^\d{4}-\d\d-\d\d$/);
    expect(fresh.find((f) => f.id === "list")!.lastRun).toMatch(/^\d{4}-\d\d-\d\d$/);
  });
});
