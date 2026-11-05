import { describe, expect, it } from "vitest";
import { parseYahooChart, yahooSymbol } from "@/lib/etfs/yahoo";

// Hand-written to match the documented shape. Not a recorded reply: the build environment cannot reach Yahoo.
const reply = (currency: string, instrumentType = "ETF") => ({
  chart: { result: [{ meta: { symbol: "X.L", currency, instrumentType }, timestamp: [1793404800, 1793491200], indicators: { quote: [{ close: [100, null] }] } }] },
});

describe("Yahoo parser", () => {
  it("maps exchanges to symbols", () => {
    expect(yahooSymbol("XETR", "SXR8")).toBe("SXR8.DE");
    expect(yahooSymbol("XNYS", "SPY")).toBeNull();
  });
  it("skips empty closes", () => expect(parseYahooChart(reply("USD"), "USD").points).toHaveLength(1));
  it("converts pence to pounds", () => expect(parseYahooChart(reply("GBp"), "GBP").points[0].close).toBe(1));
  it("refuses a non-ETF, which suggests a ticker collision", () => expect(() => parseYahooChart(reply("USD", "EQUITY"), "USD")).toThrow(/not an ETF/));
  it("refuses the wrong currency", () => expect(() => parseYahooChart(reply("EUR"), "USD")).toThrow(/expected USD/));
});
