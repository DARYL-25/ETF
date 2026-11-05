/** Classification of basic records from fund names. Inferred, labelled as such, and deliberately cautious. */

const KEEP = new Set(["ETF", "ETFS", "UCITS", "MSCI", "FTSE", "S&P", "USD", "EUR", "GBP", "CHF", "JPY", "PLC", "ESG", "SRI", "EM", "US", "UK", "EU", "II", "III", "IV", "VI", "VII", "SICAV", "AG", "SA", "UBS", "HSBC", "BNP", "DAX", "CAC", "SMI", "NYSE", "REIT", "TIPS", "ACWI", "IMI", "AI", "SPDR", "DR", "PEA", "ARK", "JPM", "PIMCO", "CLO", "AAA", "ADR", "ETC", "ETN", "1C", "1D", "2C", "2D", "ACC", "DIST", "HD", "ISHARES"]);
const SPECIAL: Record<string, string> = { ISHARES: "iShares", ACC: "Acc", DIST: "Dist", ETFS: "ETF", HD: "Hdg" };

/** Registers often shout. Only fully upper-case names are changed. */
export function prettyName(raw: string): string {
  const name = raw.replace(/\(Accu\)/g, "(Acc)").replace(/\(No I\)/g, "(No Income)").replace(/ - (USD|EUR|GBP|CHF|JPY) \(/g, " $1 (").replace(/\s+/g, " ").trim();
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return name;
  return name.split(" ").map((word) => {
    const bare = word.replace(/[(),.]/g, "");
    if (SPECIAL[bare]) return word.replace(bare, SPECIAL[bare]);
    if (KEEP.has(bare) || /\d/.test(bare) || bare.length <= 1) return word;
    return word.charAt(0) + word.slice(1).toLowerCase();
  }).join(" ");
}

const RULES: [string, RegExp][] = [
  ["us", /\b(S&P 500|Nasdaq|Russell|Dow Jones|U\.?S\.?A?\b|United States|American?|Treasur)/i],
  ["europe", /\b(Europe|European|Euro Stoxx|Stoxx Europe|EMU|Eurozone)\b/i],
  ["emerging", /\b(Emerging|EM IMI|\bEM\b)/i],
  ["global", /\b(World|Global|All[- ]Country|ACWI|All-World)\b/i],
  ["uk", /\b(FTSE 100|FTSE 250|UK\b|United Kingdom|Gilt)/i],
  ["germany", /\b(DAX|Germany|German|MDAX)\b/i],
  ["france", /\b(CAC 40|France|French)\b/i],
  ["switzerland", /\b(SMI|Switzerland|Swiss)\b/i],
  ["small-cap", /\b(Small[- ]?Cap|Russell 2000)\b/i],
  ["value", /\bValue\b/i],
  ["quality", /\bQuality\b/i],
  ["momentum", /\bMomentum\b/i],
  ["min-vol", /\b(Min(imum)? Vol|Low Vol)/i],
  ["high-dividend", /\b(Dividend|High Income)\b/i],
  ["shariah", /\b(Islamic|Shariah|Sharia)\b/i],
  ["technology", /\b(Technology|Tech\b|Information Tech|Nasdaq|Digital|Software|Cyber|Artificial Intelligence)/i],
  ["semiconductors", /\bSemiconductor/i],
  ["healthcare", /\b(Health ?Care|Biotech|Pharma)/i],
  ["clean-energy", /\b(Clean Energy|Renewable|Solar|Hydrogen)\b/i],
  ["robotics", /\b(Robotics|Automation)\b/i],
  ["gold", /\bGold\b/i],
  ["government-bonds", /\b(Govt|Government|Treasur|Sovereign|Gilt)/i],
  ["corporate-bonds", /\b(Corp(orate)?( Bond)?)\b.*\b(Bond|Bd|Debt)|Corporate Bond/i],
  ["aggregate-bonds", /\bAggregate\b/i],
];

export const inferCategories = (name: string): string[] => RULES.filter(([, re]) => re.test(name)).map(([slug]) => slug);

/** Only flagship indices, and never a narrower variant of one, so a sector or factor fund is not misfiled. */
const VARIANT = "(?!.*\\b(Small|Mid|Value|Growth|Quality|Momentum|Min|Low|Equal|Dividend|Climate|ESG|SRI|Screened|Paris|PAB|Leveraged|Short|Inverse|2x|3x|Sector|Financials|Energy|Health|Technology|Utilities|Materials|Industrials|Consumer|Communication|Top|Buffer|Covered|Income|Hedged Equity|ex\\b))";
const INDEX_RULES: [string, RegExp][] = [
  ["msci-world", new RegExp(`\\bMSCI World\\b${VARIANT}`, "i")],
  ["msci-acwi", new RegExp(`\\bMSCI (ACWI|All Country World)\\b${VARIANT}`, "i")],
  ["msci-emerging-markets", new RegExp(`\\bMSCI (EM|Emerging Markets)\\b(?! IMI)${VARIANT}`, "i")],
  ["msci-europe", new RegExp(`\\bMSCI Europe\\b${VARIANT}`, "i")],
  ["sp-500", new RegExp(`\\bS&P ?500\\b${VARIANT}`, "i")],
  ["nasdaq-100", new RegExp(`\\b(Nasdaq|NASDAQ)[- ]?100\\b${VARIANT}`, "i")],
  ["ftse-all-world", new RegExp(`\\bFTSE All[- ]World\\b${VARIANT}`, "i")],
  ["ftse-100", new RegExp(`\\bFTSE 100\\b${VARIANT}`, "i")],
  ["stoxx-europe-600", new RegExp(`\\bStoxx (Europe )?600\\b${VARIANT}`, "i")],
  ["euro-stoxx-50", new RegExp(`\\bEuro Stoxx 50\\b${VARIANT}`, "i")],
  ["dax", new RegExp(`\\bDAX\\b${VARIANT}`, "i")],
  ["cac-40", new RegExp(`\\bCAC 40\\b${VARIANT}`, "i")],
  ["smi", new RegExp(`\\bSMI\\b${VARIANT}`, "i")],
  ["russell-2000", new RegExp(`\\bRussell 2000\\b${VARIANT.replace("Small|", "")}`, "i")],
];

export const inferIndex = (name: string): string | null => INDEX_RULES.find(([, re]) => re.test(name))?.[0] ?? null;
