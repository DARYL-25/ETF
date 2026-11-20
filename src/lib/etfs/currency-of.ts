/**
 * The currency a company's shares are mostly priced in, from the country the issuer's file gives for it.
 * Used to show currency exposure underneath ETFs. A company's revenue can be in other currencies, so this
 * measures the currency of the share price, which is what moves an investor's value day to day.
 */
export const CURRENCY_OF: Record<string, string> = {
  "United States": "USD", "Canada": "CAD", "Mexico": "MXN", "Brazil": "BRL", "Chile": "CLP", "Colombia": "COP", "Peru": "PEN",
  "United Kingdom": "GBP", "Switzerland": "CHF", "Sweden": "SEK", "Norway": "NOK", "Denmark": "DKK", "Poland": "PLN", "Czech Republic": "CZK", "Hungary": "HUF", "Turkey": "TRY",
  "France": "EUR", "Germany": "EUR", "Netherlands": "EUR", "Italy": "EUR", "Spain": "EUR", "Belgium": "EUR", "Finland": "EUR", "Ireland": "EUR", "Austria": "EUR", "Portugal": "EUR", "Luxembourg": "EUR", "Greece": "EUR",
  "Japan": "JPY", "China": "CNY/HKD", "Hong Kong": "HKD", "Taiwan": "TWD", "South Korea": "KRW", "Korea": "KRW", "India": "INR", "Singapore": "SGD", "Australia": "AUD", "New Zealand": "NZD",
  "Malaysia": "MYR", "Thailand": "THB", "Indonesia": "IDR", "Philippines": "PHP", "Saudi Arabia": "SAR", "United Arab Emirates": "AED", "Qatar": "QAR", "Kuwait": "KWD", "Israel": "ILS", "South Africa": "ZAR",
};

