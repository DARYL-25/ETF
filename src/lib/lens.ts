/** The investor lens: where the reader lives. Chosen by the reader, never guessed from location. */
export type LensCountry = { code: string; name: string; adjective: string; currency: string; tax: boolean };

export const LENS_COUNTRIES: LensCountry[] = [
  { code: "CH", name: "Switzerland", adjective: "Swiss", currency: "CHF", tax: true },
  { code: "FR", name: "France", adjective: "French", currency: "EUR", tax: true },
  { code: "DE", name: "Germany", adjective: "German", currency: "EUR", tax: true },
  { code: "GB", name: "United Kingdom", adjective: "British", currency: "GBP", tax: true },
  { code: "BE", name: "Belgium", adjective: "Belgian", currency: "EUR", tax: true },
  { code: "NL", name: "Netherlands", adjective: "Dutch", currency: "EUR", tax: true },
  { code: "IT", name: "Italy", adjective: "Italian", currency: "EUR", tax: true },
  { code: "ES", name: "Spain", adjective: "Spanish", currency: "EUR", tax: true },
  { code: "LU", name: "Luxembourg", adjective: "Luxembourg", currency: "EUR", tax: true },
  { code: "AT", name: "Austria", adjective: "Austrian", currency: "EUR", tax: true },
  { code: "IE", name: "Ireland", adjective: "Irish", currency: "EUR", tax: true },
  { code: "PT", name: "Portugal", adjective: "Portuguese", currency: "EUR", tax: false },
  { code: "US", name: "United States", adjective: "US", currency: "USD", tax: false },
  { code: "MA", name: "Morocco", adjective: "Moroccan", currency: "MAD", tax: false },
];

export const LENS_COOKIE = "lens";
export const lensCountry = (code: string | null | undefined) => LENS_COUNTRIES.find((c) => c.code === (code ?? "").toUpperCase()) ?? null;

/** EU member states plus Iceland, Liechtenstein and Norway: where PRIIPs applies and UCITS funds are domiciled. */
export const EEA = ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO"];
export const isEea = (code: string | null | undefined) => EEA.includes((code ?? "").toUpperCase());
