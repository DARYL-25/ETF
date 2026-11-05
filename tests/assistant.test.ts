import { afterEach, describe, expect, it, vi } from "vitest";
import { parseIntent } from "@/lib/assistant/intent";
import { findBestEtfs } from "@/lib/assistant/rank";
import { answer } from "@/lib/assistant/agent";

describe("reading a request", () => {
  it("understands a Swiss Nasdaq-100 request", () => {
    const i = parseIntent("Nasdaq-100 tracking ETF as a Swiss investor");
    expect(i.index).toBe("nasdaq-100");
    expect(i.investorCountry).toBe("Switzerland");
  });
  it("reads French", () => {
    const i = parseIntent("Je cherche un ETF S&P 500 capitalisant pour un résident français");
    expect(i.index).toBe("sp-500");
    expect(i.distribution).toBe("accumulating");
    expect(i.investorCountry).toBe("France");
  });
  it("does not treat the investor's country as a market", () => {
    expect(parseIntent("Technology ETF for a Swiss investor").categories).not.toContain("switzerland");
  });
});

describe("ranking", () => {
  it("finds Nasdaq-100 funds for a Swiss investor without inventing tax", async () => {
    const out = await findBestEtfs(parseIntent("Nasdaq-100 ETF as a Swiss investor"));
    expect(out.results.length).toBeGreaterThan(2);
    for (const r of out.results) expect(r.row.index_slug).toBe("nasdaq-100");
    expect(out.notChecked[0]).toMatch(/not verified/);
    expect(out.results.some((r) => r.onSix)).toBe(true);
    const scores = out.results.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });
  it("leaves out leveraged funds", async () => {
    const out = await findBestEtfs(parseIntent("Nasdaq-100 ETF"));
    for (const r of out.results) expect(r.row.name).not.toMatch(/\b(2x|3x|ultra|short|leveraged)\b/i);
  });
  it("keeps EU investors to UCITS funds", async () => {
    const out = await findBestEtfs(parseIntent("S&P 500 ETF for a French resident"));
    for (const r of out.results) expect(r.row.ucits).toBe(true);
  });
  it("honours accumulating", async () => {
    const out = await findBestEtfs(parseIntent("accumulating MSCI World UCITS ETF"));
    for (const r of out.results) expect(r.row.distribution_policy === "distributing").toBe(false);
  });
});

describe("assistant", () => {
  afterEach(() => { delete process.env.ANTHROPIC_API_KEY; vi.restoreAllMocks(); });

  it("still answers from the database with no AI key", async () => {
    const r = await answer([{ role: "user", content: "Nasdaq-100 ETF" }]);
    expect(r.aiUsed).toBe(false);
    expect(r.etfs.length).toBeGreaterThan(0);
  });

  it("runs the tool loop and passes database facts to the model", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    const calls: { messages: { role: string; content: unknown }[]; system: string }[] = [];
    const fake = vi.fn(async (_: unknown, init: { body: string }) => {
      calls.push(JSON.parse(init.body));
      const reply = calls.length === 1
        ? { stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "search_etfs", input: { request: "Nasdaq-100 ETF Swiss investor" } }] }
        : { stop_reason: "end_turn", content: [{ type: "text", text: "Here are the closest matches." }] };
      return new Response(JSON.stringify(reply), { status: 200 });
    });
    const r = await answer([{ role: "user", content: "Nasdaq-100 for a Swiss investor" }], fake as unknown as typeof fetch);
    expect(r.aiUsed).toBe(true);
    expect(r.text).toBe("Here are the closest matches.");
    expect(JSON.stringify(calls[1].messages)).toContain("nasdaq");
    expect(calls[0].system).toMatch(/Never state a tax rate/);
  });

  it("falls back to the database list when the AI call fails", async () => {
    process.env.ANTHROPIC_API_KEY = "test";
    const fake = vi.fn(async () => new Response("{}", { status: 500 }));
    const r = await answer([{ role: "user", content: "S&P 500 ETF" }], fake as unknown as typeof fetch);
    expect(r.aiUsed).toBe(false);
    expect(r.etfs.length).toBeGreaterThan(0);
  });
});
