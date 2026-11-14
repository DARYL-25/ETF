import { describe, expect, it } from "vitest";
import { inferCategories, inferIndex, prettyName } from "@/lib/etfs/infer";

describe("name inference", () => {
  it("tidies shouting names only", () => {
    expect(prettyName("ISHARES CORE MSCI WORLD UCITS ETF")).toBe("iShares Core MSCI World UCITS ETF");
    expect(prettyName("Vanguard FTSE All-World UCITS ETF")).toBe("Vanguard FTSE All-World UCITS ETF");
    expect(prettyName("iShares Core S&P 500 UCITS ETF - USD (Accu)")).toBe("iShares Core S&P 500 UCITS ETF USD (Acc)");
  });
  it("files flagship funds under their index", () => {
    expect(inferIndex("Xtrackers MSCI World UCITS ETF 1C")).toBe("msci-world");
    expect(inferIndex("Vanguard S&P 500 ETF")).toBe("sp-500");
  });
  it("does not file narrower funds under the flagship", () => {
    expect(inferIndex("iShares MSCI World Small Cap UCITS ETF")).toBeNull();
    expect(inferIndex("SPDR S&P 500 ESG Leaders ETF")).toBeNull();
    expect(inferIndex("ProShares Ultra S&P 500 Short")).toBeNull();
  });
  it("combines region and theme", () => {
    expect(inferCategories("iShares S&P 500 Health Care Sector UCITS ETF")).toEqual(expect.arrayContaining(["us", "healthcare"]));
    expect(inferCategories("Amundi MSCI Europe")).toContain("europe");
  });
});

import { cleanName, inferEquity } from "@/lib/etfs/infer";

describe("register boilerplate", () => {
  it("removes umbrella and share-class wording, and keeps the fund's own name", () => {
    expect(cleanName("Multi Units Luxembourg - Amundi NASDAQ-100 II Cmn Class ETF ETF On Lyxor NASDAQ-100 UCITS ETF")).toBe("Amundi NASDAQ-100 II ETF");
    expect(cleanName("Amundi ETF Icav - Amundi Core S&P 500 UCITS ETF Cmn Class ETF Series ETF")).toBe("Amundi Core S&P 500 UCITS ETF");
    expect(cleanName("iShares Core S&P 500 UCITS ETF USD (Acc)")).toBe("iShares Core S&P 500 UCITS ETF USD (Acc)");
  });
  it("calls a fund equity only when its name points to shares", () => {
    expect(inferEquity("Vanguard S&P 500 ETF")).toBe(true);
    expect(inferEquity("iShares MSCI World Corporate Bond ETF")).toBe(false);
    expect(inferEquity("Harbor Active Commodity ETF")).toBe(false);
    expect(inferEquity("Absolute Select ETF")).toBe(false);
  });
});
