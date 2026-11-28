import { describe, expect, it } from "vitest";
import { finish } from "@/lib/assistant/advisor";
import { gatewayOptions, GATEWAY_URL, DEFAULT_OPEN_MODEL, DEFAULT_FALLBACK_MODEL } from "@/lib/ai/provider";
import type { Ranked } from "@/lib/assistant/rank";

const row = (etf_key: string, isin: string, name: string) => ({ etf_key, isin, name }) as unknown as Ranked["row"];

describe("copilot answers", () => {
  const seen = new Map([["IE00BK5BQT80", row("IE00BK5BQT80", "IE00BK5BQT80", "Vanguard FTSE All-World")], ["XNAS-SCHD", row("XNAS-SCHD", "US8085247976", "Schwab US Dividend Equity")]]);
  it("keeps only suggested funds a tool returned, and drops the SUGGESTED line", () => {
    const a = finish("One option is Vanguard FTSE All-World (IE00BK5BQT80).\nSUGGESTED: IE00BK5BQT80, XNAS-SCHD, IE00FAKE0001", seen, new Set(["IE00BK5BQT80"]));
    expect(a.suggested.map((r) => r.name)).toEqual(["Vanguard FTSE All-World", "Schwab US Dividend Equity"]);
    expect(a.text).not.toMatch(/SUGGESTED/);
  });
  it("removes ISINs no tool returned", () => {
    const a = finish("You could consider IE00B3XXRP09 or IE00BK5BQT80.\nSUGGESTED: none", seen, new Set(["IE00BK5BQT80"]));
    expect(a.text).toContain("IE00BK5BQT80");
    expect(a.text).not.toContain("IE00B3XXRP09");
    expect(a.suggested).toEqual([]);
  });
});

describe("AI Gateway routing", () => {
  it("asks for zero data retention and the fallback model on the gateway only", () => {
    const gw = gatewayOptions({ provider: "openai", model: DEFAULT_OPEN_MODEL, baseUrl: GATEWAY_URL, key: "k", fallbacks: [DEFAULT_FALLBACK_MODEL], zdr: true });
    expect(gw).toMatchObject({ providerOptions: { gateway: { zeroDataRetention: true, models: [DEFAULT_FALLBACK_MODEL] } } });
    expect(gatewayOptions({ provider: "openai", model: "llama", baseUrl: "http://localhost:11434/v1", key: null })).toEqual({});
  });
});
