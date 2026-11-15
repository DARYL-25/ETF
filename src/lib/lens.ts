/** The investor lens: where the reader lives. Chosen by the reader, never guessed from location. */
export type LensCountry = { code: string; name: string; adjective: string; currency: string; tax: boolean };

export const LENS_COUNTRIES: LensCountry[] = [
  { code: "CH", name: "Switzerland", adjective: "Swiss", currency: "CHF", tax: true },
  { code: "FR", name: "France", adjective: "French", currency: "EUR", tax: true },
  { code: "DE", name: "Germany", adjective: "German", currency: "EUR", tax: false },
  { code: "GB", name: "United Kingdom", adjective: "British", currency: "GBP", tax: false },
  { code: "BE", name: "Belgium", adjective: "Belgian", currency: "EUR", tax: false },
  { code: "NL", name: "Netherlands", adjective: "Dutch", currency: "EUR", tax: false },
  { code: "IT", name: "Italy", adjective: "Italian", currency: "EUR", tax: false },
  { code: "ES", name: "Spain", adjective: "Spanish", currency: "EUR", tax: false },
  { code: "LU", name: "Luxembourg", adjective: "Luxembourg", currency: "EUR", tax: false },
  { code: "AT", name: "Austria", adjective: "Austrian", currency: "EUR", tax: false },
  { code: "IE", name: "Ireland", adjective: "Irish", currency: "EUR", tax: false },
  { code: "PT", name: "Portugal", adjective: "Portuguese", currency: "EUR", tax: false },
  { code: "US", name: "United States", adjective: "US", currency: "USD", tax: false },
];

export const LENS_COOKIE = "lens";
export const lensCountry = (code: string | null | undefined) => LENS_COUNTRIES.find((c) => c.code === (code ?? "").toUpperCase()) ?? null;
