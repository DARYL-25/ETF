import { describe, expect, it } from "vitest";
import { currencyAdjustedReturn, feeImpact, futureValue, reinvestment } from "@/lib/academy/calc";
import { GLOSSARY, LESSONS, PATHS } from "@/lib/academy/content";

describe("calculators", () => {
  it("compounds a lump sum", () => expect(futureValue(1000, 0, 10, 2)).toBeCloseTo(1210, 6));
  it("adds contributions", () => expect(futureValue(0, 100, 0, 1)).toBeCloseTo(1200, 6));
  it("costs more with a higher fee", () => {
    const r = feeImpact(10000, 0, 7, 0.5, 30);
    expect(r.withFee).toBeCloseTo(10000 * 1.065 ** 30, 4);
    expect(r.cost).toBeGreaterThan(0);
  });
  it("adjusts for currency", () => expect(currencyAdjustedReturn(10, -5)).toBeCloseTo(4.5, 6));
  it("shows reinvesting beats a zero-return cash pile", () => {
    const r = reinvestment(1000, 4, 2, 20);
    expect(r.reinvested).toBeGreaterThan(r.notReinvested + r.cash);
  });
});

describe("academy content", () => {
  it("has valid quizzes and path links", () => {
    for (const l of LESSONS) for (const q of l.quiz) expect(q.answer).toBeLessThan(q.options.length);
    const slugs = new Set(LESSONS.map((l) => l.slug));
    for (const p of PATHS) for (const s of p.lessons) expect(slugs.has(s), s).toBe(true);
    expect(GLOSSARY.length).toBeGreaterThan(25);
  });
});
