import { describe, expect, it } from "vitest";
import { inferCategories } from "@/lib/etfs/infer";
import { THEMES, inferThemes } from "@/lib/etfs/themes";

describe("themes from fund names", () => {
  const has = (name: string, slug: string, source?: string) => expect(inferThemes(name, source), name).toContain(slug);
  const lacks = (name: string, slug: string, source?: string) => expect(inferThemes(name, source), name).not.toContain(slug);

  it("files well-known theme funds", () => {
    has("iShares Semiconductor ETF", "semiconductors");
    has("VanEck Semiconductor UCITS ETF", "semiconductors");
    has("Global X Artificial Intelligence & Technology ETF", "ai");
    has("Xtrackers AI & Big Data UCITS ETF", "ai");
    has("iShares U.S. Aerospace & Defense ETF", "defense");
    has("VanEck Defence UCITS ETF", "defense");
    has("KraneShares CSI China Internet ETF", "china-tech");
    has("iShares Hang Seng TECH ETF", "china-tech");
    has("iShares MSCI World Islamic UCITS ETF", "shariah");
    has("SP Funds S&P 500 Sharia Industry Exclusions ETF", "shariah");
    has("Wahed FTSE USA Shariah ETF", "shariah");
    has("Global X Uranium ETF", "nuclear-uranium");
    has("Global X Cybersecurity ETF", "cybersecurity");
    has("Defiance Quantum ETF", "quantum");
  });

  it("reads Chinese, Japanese and Korean names", () => {
    has("科创芯片ETF汇添富", "semiconductors", "china_sh");
    has("科创芯片ETF汇添富", "china-tech", "china_sh");
    has("军工ETF广发", "defense", "china_sh");
    has("ＮＥＸＴ　ＦＵＮＤＳ　Ｓ＆Ｐ　５００　半導体", "semiconductors");
    has("グローバルＸ　防衛テック－日本株式　ＥＴＦ", "defense");
    has("TIGER 미국필라델피아반도체나스닥", "semiconductors");
    has("ACE K방산TOP5+", "defense");
    has("KODEX 차이나휴머노이드로봇", "robotics");
    has("Won 반도체밸류체인액티브", "active");
  });

  it("marks active funds by name or by an all-active issuer", () => {
    has("JPMorgan Global Select Equity Active ETF", "active");
    has("ARK Innovation ETF", "active");
    has("Dimensional U.S. Core Equity 2 ETF", "active");
    has("Avantis U.S. Small Cap Value ETF", "active");
    lacks("ARK Israel Innovative Technology ETF", "active");
    lacks("iShares Core S&P 500 ETF", "active");
    lacks("Interactive Brokers ETF", "active");
  });

  it("does not misfile look-alike names", () => {
    lacks("SPDR Blue Chip ETF", "semiconductors");
    lacks("Russell Investments Australian Semi-Government Bond ETF", "semiconductors");
    lacks("Kiwoom 미국방어배당성장나스닥", "defense");
    lacks("iShares Defensive Equity ETF", "defense");
    lacks("WisdomTree U.S. AI Enhanced Value Fund", "ai");
    lacks("iShares € Corp Bond ex-Financials UCITS ETF", "financials");
    lacks("iShares Short Treasury Bond ETF", "leveraged-inverse");
    lacks("Vanguard Ultra-Short Bond ETF", "leveraged-inverse");
    lacks("Invesco BulletShares 2030 Corporate Bond ETF", "leveraged-inverse");
    lacks("Goldman Sachs ActiveBeta ETF", "gold");
  });

  it("keeps leveraged and inverse products out of the themes they name", () => {
    const soxs = inferThemes("Direxion Daily Semiconductors Bear 3X");
    expect(soxs).toContain("leveraged-inverse");
    expect(soxs).not.toContain("semiconductors");
    has("ProShares Short S&P500", "leveraged-inverse");
  });

  it("has a unique slug, a label and a description for every theme", () => {
    expect(new Set(THEMES.map((t) => t.slug)).size).toBe(THEMES.length);
    for (const t of THEMES) { expect(t.label.length, t.slug).toBeGreaterThan(2); expect(t.blurb.length, t.slug).toBeGreaterThan(10); }
  });

  it("still returns the basic regions alongside themes", () => {
    expect(inferCategories("iShares MSCI Europe Defence UCITS ETF")).toEqual(expect.arrayContaining(["europe", "defense"]));
  });
});
