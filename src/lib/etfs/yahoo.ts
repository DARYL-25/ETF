/** Yahoo Finance's unofficial chart endpoint. There is no contract, so replies are checked before storing. */
const SUFFIX: Record<string, string> = { XLON: ".L", XETR: ".DE", XAMS: ".AS", XPAR: ".PA", XMIL: ".MI", XSWX: ".SW" };

export const yahooSymbol = (mic: string, ticker: string): string | null => (SUFFIX[mic] ? `${ticker}${SUFFIX[mic]}` : null);

export type YahooSeries = { symbol: string; currency: string; points: { date: string; close: number }[] };

type Reply = {
  chart?: {
    error?: { description?: string } | null;
    result?: {
      meta: { symbol: string; currency: string; instrumentType?: string };
      timestamp?: number[];
      indicators: { quote: { close: (number | null)[] }[] };
    }[] | null;
  };
};

/** Throws on anything but an ETF. Tickers can collide across exchanges, and a wrong fund's price is worse than none. */
export function parseYahooChart(reply: Reply, expectedCurrency: string | null): YahooSeries {
  const result = reply.chart?.result?.[0];
  if (!result) throw new Error(`No data from Yahoo: ${reply.chart?.error?.description ?? "empty reply"}`);
  const { symbol, currency, instrumentType } = result.meta;
  if (instrumentType !== "ETF") throw new Error(`${symbol} is ${instrumentType ?? "unknown"}, not an ETF`);
  // London prices can arrive in pence.
  const pence = currency === "GBp" || currency === "GBX";
  const unit = pence ? "GBP" : currency;
  if (expectedCurrency && unit !== expectedCurrency) throw new Error(`${symbol} is in ${unit}, expected ${expectedCurrency}`);
  const closes = result.indicators.quote[0]?.close ?? [];
  const points = (result.timestamp ?? []).flatMap((t, i) => {
    const close = closes[i];
    if (close === null || close === undefined || !(close > 0)) return [];
    return [{ date: new Date(t * 1000).toISOString().slice(0, 10), close: pence ? close / 100 : close }];
  });
  return { symbol, currency: unit, points };
}
