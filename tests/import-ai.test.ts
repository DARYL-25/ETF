import { afterEach, describe, expect, it, vi } from "vitest";
import { aiLayout, aiRows } from "@/lib/portfolio/import-ai";
import { parsePositions, tableOf } from "@/lib/portfolio/import";

const config = { provider: "openai" as const, model: "test", baseUrl: "https://model.test/v1", key: "k" };
const answer = (content: string) => vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }));
afterEach(() => vi.restoreAllMocks());

describe("AI layout for unknown exports", () => {
  const text = "Wertpapier;Kennung;Bestand;Einstand\nVanguard FTSE All-World;VWCE;8,5;128,10";
  it("reads the figures with our code once the model says where the columns are", async () => {
    expect(parsePositions(text).rows).toHaveLength(0);
    answer('{"header_row": 0, "identifier": 1, "quantity": 2, "price": 3, "date": null, "side": null, "fee": null}');
    const layout = await aiLayout(tableOf(text)!, config);
    const r = parsePositions(text, layout!);
    expect(r.rows[0]).toMatchObject({ identifier: "VWCE", quantity: 8.5, price: 128.1 });
  });
  it("refuses a layout that points outside the table", async () => {
    answer('{"header_row": 0, "identifier": 9, "quantity": 2}');
    expect(await aiLayout(tableOf(text)!, config)).toBeNull();
  });
});

describe("AI rows from statement text", () => {
  const lines = ["Relevé de portefeuille au 31/10/2026", "IE00B4L5Y983 iShares Core MSCI World Qté 12 Cours 98,40", "Espèces 250,00 EUR"];
  it("keeps only rows whose identifier and quantity appear in the statement", async () => {
    answer('{"rows": [{"identifier": "IE00B4L5Y983", "quantity": "12", "price": "98,40", "date": null}, {"identifier": "IE00BK5BQT80", "quantity": "5", "price": null}, {"identifier": "IE00B4L5Y983", "quantity": "13", "price": null}]}');
    const r = (await aiRows(lines, config))!;
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ identifier: "IE00B4L5Y983", quantity: 12, price: 98.4 });
    expect(r.skipped).toHaveLength(2);
  });
});
