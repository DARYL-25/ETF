export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Squarified treemap: lays values out as rectangles whose areas match the values and whose shapes stay
 * close to squares. Values must be positive and sorted largest first. Coordinates fill width by height.
 */
export function squarify(values: number[], width: number, height: number): Rect[] {
  const total = values.reduce((s, v) => s + v, 0);
  if (!total || !values.length) return [];
  const areas = values.map((v) => (v / total) * width * height);
  const out: Rect[] = [];
  let x = 0, y = 0, w = width, h = height, i = 0;
  const worst = (row: number[], side: number) => {
    const sum = row.reduce((s, v) => s + v, 0);
    return Math.max((side * side * Math.max(...row)) / (sum * sum), (sum * sum) / (side * side * Math.min(...row)));
  };
  while (i < areas.length) {
    const side = Math.min(w, h);
    const row = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worst([...row, areas[j]], side) <= worst(row, side)) row.push(areas[j++]);
    const sum = row.reduce((s, v) => s + v, 0);
    const thick = sum / side;
    let offset = 0;
    for (const a of row) {
      const len = a / thick;
      out.push(w >= h ? { x, y: y + offset, w: thick, h: len } : { x: x + offset, y, w: len, h: thick });
      offset += len;
    }
    if (w >= h) { x += thick; w -= thick; } else { y += thick; h -= thick; }
    i = j;
  }
  return out;
}

/** "Apple Inc." to "Apple": the short form that fits on a tile. */
export const shortName = (name: string) =>
  name.replace(/\s+(Inc\.?|Incorporated|Corp\.?|Corporation|Co\.?|Company|PLC|plc|Ltd\.?|Limited|S\.?A\.?|AG|N\.?V\.?|SE|Holdings?|Group)\b\.?/gi, "").replace(/\s+(Class|CL)\s+([A-C])\b/i, " $2").replace(/\s+/g, " ").trim()
    .replace(/^([A-Z0-9&.' -]+)$/, (s) => s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase()));
