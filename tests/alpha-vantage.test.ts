import { describe, expect, it } from "vitest";
import { parseMonthlyCsv } from "@/lib/etfs/alpha-vantage";

// Format copied from a real response for CSPX.LON.
const sample = "timestamp,open,high,low,close,adjusted close,volume,dividend amount\r\n2026-10-30,830.1500,846.3500,819.4400,820.1700,820.1700,3595340,0.0000\r\n2026-09-30,828.8100,839.3300,816.9000,832.3900,832.3900,4890741,0.0000\r\n";

describe("Alpha Vantage parser", () => {
  it("reads date and close", () => {
    expect(parseMonthlyCsv(sample)).toEqual([{ date: "2026-10-30", close: 820.17 }, { date: "2026-09-30", close: 832.39 }]);
  });

  it("refuses a rate-limit reply instead of storing it", () => {
    expect(() => parseMonthlyCsv('{"Note": "Thank you for using Alpha Vantage!"}')).toThrow(/Unexpected reply/);
  });
});
