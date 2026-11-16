import { describe, expect, it } from "vitest";
import { shortName, squarify } from "@/lib/etfs/treemap";

describe("treemap", () => {
  it("fills the whole area with rectangles in proportion to the values", () => {
    const values = [40, 25, 15, 10, 6, 4];
    const rects = squarify(values, 100, 50);
    expect(rects).toHaveLength(values.length);
    const area = rects.reduce((s, r) => s + r.w * r.h, 0);
    expect(area).toBeCloseTo(5000, 3);
    rects.forEach((r, i) => {
      expect(r.w * r.h).toBeCloseTo((values[i] / 100) * 5000, 3);
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(100 + 1e-6);
      expect(r.y + r.h).toBeLessThanOrEqual(50 + 1e-6);
    });
  });
  it("returns nothing for no values", () => expect(squarify([], 10, 10)).toEqual([]));
  it("shortens company names for tiles", () => {
    expect(shortName("Apple Inc.")).toBe("Apple");
    expect(shortName("MICROSOFT CORP")).toBe("Microsoft");
    expect(shortName("Alphabet Inc. Class A")).toBe("Alphabet A");
  });
});
