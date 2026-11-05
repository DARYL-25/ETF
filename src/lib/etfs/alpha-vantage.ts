export type MonthlyPoint = { date: string; close: number };

/**
 * Reads Alpha Vantage's monthly CSV. Keeps only the close, because highs and lows on this feed
 * contain bad ticks. Throws on an error or rate-limit reply, which arrives as JSON with status 200.
 */
export function parseMonthlyCsv(csv: string): MonthlyPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0]?.split(",") ?? [];
  const dateCol = header.indexOf("timestamp");
  const closeCol = header.indexOf("close");
  if (dateCol < 0 || closeCol < 0) throw new Error(`Unexpected reply from Alpha Vantage: ${csv.slice(0, 200)}`);
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const close = Number(cells[closeCol]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cells[dateCol]) || !(close > 0)) throw new Error(`Bad row from Alpha Vantage: ${line}`);
    return { date: cells[dateCol], close };
  });
}
