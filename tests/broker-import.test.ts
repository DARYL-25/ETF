import { describe, expect, it } from "vitest";
import { columnsOf, fieldOf, parsePositions } from "@/lib/portfolio/import";

/** Header rows and one data row as each broker's export writes them. */
const SAMPLES: [string, string, { id: string; qty: number; price?: number | null; date?: string | null; side?: "buy" | "sell" }][] = [
  ["Degiro portfolio (EN)", "Product,Symbol/ISIN,Quantity,Closing,Local value,,Value in EUR\nVANGUARD FTSE AW USDA,IE00BK5BQT80,12,128.10,EUR 1537.20,,\"1537,20\"", { id: "IE00BK5BQT80", qty: 12, price: 128.1 }],
  ["Degiro portfolio (FR)", "Produit,Symbole/ISIN,Quantité,Clôture,Devise locale,,Valeur en EUR\nISHARES CORE MSCI WORLD,IE00B4L5Y983,30,\"98,40\",EUR 2952,,\"2952,00\"", { id: "IE00B4L5Y983", qty: 30, price: 98.4 }],
  ["Degiro transactions (FR)", "Date,Heure,Produit,Code ISIN,Place boursière,Lieu d'exécution,Quantité,Cours,,Valeur locale,,Valeur,,Taux de change,Frais de courtage,,Total,\n15-03-2026,09:04,ISHARES CORE MSCI WORLD,IE00B4L5Y983,EAM,XAMS,10,\"98,40\",EUR,\"-984,00\",EUR,\"-984,00\",EUR,,\"-1,00\",EUR,\"-985,00\",EUR", { id: "IE00B4L5Y983", qty: 10, price: 98.4, date: "2026-03-15" }],
  ["Scalable Capital", "date;time;status;reference;description;assetType;type;isin;shares;price;amount;fee;tax;currency\n2026-04-02;10:11:12;Executed;SCAL123;Vanguard FTSE All-World;Security;Buy;IE00BK5BQT80;8,5;128,10;-1088,85;0,99;0;EUR", { id: "IE00BK5BQT80", qty: 8.5, price: 128.1, date: "2026-04-02", side: "buy" }],
  ["Revolut", "Date,Ticker,Type,Quantity,Price per share,Total Amount,Currency,FX Rate\n2026-05-04T13:20:01.123Z,VUAA,BUY - MARKET,3,USD 101.20,USD 303.60,USD,1.08", { id: "VUAA", qty: 3, price: 101.2, side: "buy" }],
  ["Boursorama", "Libellé;Code ISIN;Quantité;PRU;Cours;Valorisation;+/- value\nAMUNDI MSCI WORLD;LU1681043599;5;450,20;512,30;2561,50;310,50", { id: "LU1681043599", qty: 5, price: 450.2 }],
  ["Interactive Brokers", "Open Positions,Header,DataDiscriminator,Asset Category,Currency,Symbol,Quantity,Mult,Cost Price,Cost Basis,Close Price,Value,Unrealized P/L,Code\nOpen Positions,Data,Summary,Stocks,USD,VWRA,40,1,118.5,4740,131.2,5248,508,", { id: "VWRA", qty: 40, price: 118.5 }],
  ["Swissquote", "Symbol,Name,ISIN,Quantity,Unit cost,Last price,Currency\nCHSPI,iShares Core SPI,CH0237935652,20,140.00,155.10,CHF", { id: "CH0237935652", qty: 20, price: 140 }],
  ["Our template (EN)", "ISIN\tName (optional)\tQuantity\tPurchase price\tPurchase date\tCurrency\tFees\tBroker (optional)\nIE00B4L5Y983\tiShares Core MSCI World\t12\t98.4\t2026-03-15\tEUR\t1\tDegiro", { id: "IE00B4L5Y983", qty: 12, price: 98.4, date: "2026-03-15" }],
  ["Our template (FR)", "ISIN\tNom (facultatif)\tQuantité\tPrix d'achat\tDate d'achat\tDevise\tFrais\tCourtier (facultatif)\nIE00BK5BQT80\tVanguard\t8,5\t128,10\t02/04/2026\tEUR\t0\tTrade Republic", { id: "IE00BK5BQT80", qty: 8.5, price: 128.1, date: "2026-04-02" }],
];

describe("broker exports", () => {
  for (const [label, text, want] of SAMPLES) {
    it(label, () => {
      const r = parsePositions(text);
      expect(r.skipped).toEqual([]);
      expect(r.rows).toHaveLength(1);
      const row = r.rows[0];
      expect(row.identifier).toBe(want.id);
      expect(row.quantity).toBe(want.qty);
      if (want.price !== undefined) expect(row.price).toBeCloseTo(want.price!, 4);
      if (want.date !== undefined) expect(row.date).toBe(want.date);
      if (want.side) expect(row.side).toBe(want.side);
    });
  }
  it("reads headers by meaning", () => {
    expect(fieldOf("Price per share")).toBe("price");
    expect(fieldOf("Position value")).toBe(null);
    expect(fieldOf("Nombre de parts")).toBe("quantity");
    expect(columnsOf(["Produit", "Symbol/ISIN", "Quantity", "Closing"]).identifier).toBe(1);
  });
});
