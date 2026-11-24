import { z } from "zod";
import { EEA } from "./lens";

/**
 * A reader's settings: language, the country they invest from, and which funds lists show by default.
 * Kept in cookies so the server renders the right page, and in the account when the reader is signed in.
 */
export const MARKET_COOKIE = "market";
export const WELCOMED_COOKIE = "welcomed";
export const COOKIE_MAX_AGE = 31_536_000;

/** Where a fund is domiciled, as a list filter. "fit" keeps only the funds a private investor in the reader's country can usually buy. */
export const MARKETS = [
  { value: "all", label: "All countries" },
  { value: "fit", label: "Available to me" },
  { value: "eu", label: "EU and EEA" },
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ch", label: "Switzerland" },
  { value: "ca", label: "Canada" },
  { value: "asia", label: "Asia-Pacific" },
  { value: "other", label: "Elsewhere" },
] as const;
export type Market = (typeof MARKETS)[number]["value"];
export const asMarket = (v: string | null | undefined): Market | null => (MARKETS.some((m) => m.value === v) ? (v as Market) : null);

export const ASIA_PACIFIC = ["JP", "HK", "CN", "KR", "TW", "IN", "SG", "AU", "NZ", "MY", "TH", "ID", "PH", "VN"];

/** Domicile countries per market. "other" is everything not named here. */
export const MARKET_DOMICILES: Record<Exclude<Market, "all" | "fit" | "other">, string[]> = {
  eu: EEA, us: ["US"], uk: ["GB"], ch: ["CH"], ca: ["CA"], asia: ASIA_PACIFIC,
};

export const settingsSchema = z.object({
  lang: z.enum(["en", "fr"]).optional(),
  country: z.string().regex(/^[A-Z]{2}$/).nullable().optional(),
  market: z.enum(MARKETS.map((m) => m.value) as [Market, ...Market[]]).optional(),
});
export type Settings = z.infer<typeof settingsSchema>;
