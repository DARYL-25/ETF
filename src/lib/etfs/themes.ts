/**
 * Themes, regions and styles an ETF can be filed under, decided from the words in its name.
 * Names come in English, Chinese, Japanese and Korean, so each rule lists the words used in each.
 * This is inference, shown as such: a fund is listed where its name points, never where we guess.
 */
export type Theme = {
  slug: string;
  kind: "theme" | "region" | "style";
  label: string;
  /** One or two plain sentences on what funds in this group hold. */
  blurb: string;
  re: RegExp;
  /** Names that match `re` but do not belong. */
  not?: RegExp;
  /** A caution shown on the theme's page. */
  caution?: string;
  /** Groups shown first on the themes page. */
  featured?: boolean;
};

const CHINA = /\b(China|Chinese|Hang Seng|HSCEI|CSI ?\d|SSE|STAR ?50|ChiNext|A[- ]?Shares?|MSCI China|FTSE China|Greater China)\b|中国|中國|中证|中證|沪深|上证|科创|创业板|恒生|港股|中概|차이나|중국|항셍|中華/i;
const TECH = /\b(Tech|Technology|Internet|Semiconductors?|Chips?|Software|Cloud|A\.?I\.?|Artificial Intelligence|Robot\w*|E-?commerce|Innovation|Digital|EV|Electric Vehicles?|Biotech)\b|科技|互联网|芯片|半导体|人工智能|机器人|软件|云计算|通信|电子|计算机|数字|信息技术|新能源车|테크|반도체|인공지능|로봇|전기차|2차전지|인터넷|テック|半導体/i;

export const THEMES: Theme[] = [
  // Trending themes first.
  { slug: "ai", kind: "theme", featured: true, label: "Artificial intelligence",
    blurb: "Companies that build or depend on artificial intelligence: chip makers, cloud providers, software and data firms. Funds define the theme very differently, so compare their holdings.",
    re: /\b(Artificial Intelligence|Intelligence Artificielle|AI|Machine Learning|Generative|Intelligent Machines)\b|人工智能|인공지능/, not: /\bAI[- ](Enhanced|Powered|Driven|Fixed)\b/ },
  { slug: "semiconductors", kind: "theme", featured: true, label: "Semiconductors",
    blurb: "Companies that design, make or equip the making of chips. A concentrated sector: a few very large companies often carry most of the weight.",
    re: /\b(Semiconductors?|Semi-?conducteurs?|Semis?|SOX|Chips?|Microchips?)\b|半导体|芯片|集成电路|半導体|반도체/i, not: /\bBlue[- ]?Chips?\b|Semi[- ]?(Annual|Transparent|Government)/i },
  { slug: "defense", kind: "theme", featured: true, label: "Defence and aerospace",
    blurb: "Makers of military equipment, aircraft and related technology. Some funds cover only one region, such as Europe or the United States.",
    re: /\b(Defen[cs]e|Défense|Aerospace|Military|NATO|Armament|Security & Defen[cs]e)\b|军工|国防|防衛|방산|航空航天|우주항공/i, not: /\bDefensive\b|Defen[cs]e of|Defined/i },
  { slug: "china-tech", kind: "theme", featured: true, label: "Chinese technology",
    blurb: "Technology companies from mainland China and Hong Kong: internet platforms, chip makers, electric vehicles and the Shanghai STAR market. Includes funds listed in Shanghai, Hong Kong, Europe and the US.",
    re: /^$/ },
  { slug: "shariah", kind: "theme", featured: true, label: "Halal (Shariah-compliant)",
    blurb: "Funds whose name says they follow Islamic investment principles. They leave out sectors such as conventional banking, alcohol and gambling, and companies with high debt.",
    caution: "We list funds that describe themselves as Islamic or Shariah-compliant. Compliance is certified by each fund's own Shariah board, not by us, and standards differ between boards. Read the fund's documents and ask a scholar you trust.",
    re: /\b(Islamic|Shariah?|Syariah|Halal|Sukuk)\b|샤리아|伊斯兰/i },
  { slug: "active", kind: "style", featured: true, label: "Actively managed",
    blurb: "Funds where a manager, not an index, chooses what to hold. They usually cost more than index funds, and their results depend on the manager's choices.",
    caution: "This list is built from fund names and a few issuers whose ETFs are all active, so it is incomplete: an active fund whose name does not say so is missing.",
    re: /\b(Active(ly)?( Managed)?|Actif|Aktiv|Research Enhanced|Premium Income|Enhanced Income)\b|^(Dimensional|Avantis|Capital Group|T\.? ?Rowe Price|ARK (?!Israel))|アクティブ|액티브|主动/i, not: /Interactive|\bActive ?Share\b|3D Printing/i },
  { slug: "robotics", kind: "theme", featured: true, label: "Robotics and automation",
    blurb: "Makers of industrial robots, automation equipment and, more recently, humanoid robots.",
    re: /\b(Robot\w*|Automation|Humanoids?)\b|Robotique|机器人|ロボ|로봇|휴머노이드/i },
  { slug: "cybersecurity", kind: "theme", featured: true, label: "Cybersecurity",
    blurb: "Companies that protect networks, devices and data.",
    re: /\bCyber\w*|사이버|网络安全|サイバー/i },
  { slug: "nuclear-uranium", kind: "theme", featured: true, label: "Nuclear and uranium",
    blurb: "Uranium miners, reactor builders and nuclear power operators.",
    re: /\b(Uranium|Nuclear|Nucléaire|Atomic)\b|核电|核能|원자력|原子力/i },
  { slug: "crypto", kind: "theme", featured: true, label: "Bitcoin and crypto",
    blurb: "Products that hold bitcoin, ether or other crypto assets, and funds that own blockchain companies. Many are not funds but exchange-traded notes, and prices move sharply.",
    re: /\b(Bitcoin|BTC|Ether|Ethereum|Crypto\w*|Blockchain|Solana|XRP|Digital Assets?)\b|비트코인|比特币|区块链|ビットコイン/i },
  { slug: "clean-energy", kind: "theme", featured: true, label: "Clean energy",
    blurb: "Solar, wind, hydrogen and other renewable energy companies.",
    re: /\b(Clean Energy|Renewables?|Solar|Wind|Hydrogen|New Energy|Energy Transition|Clean ?Tech)\b|光伏|新能源(?!车|汽车)|太阳能|风电|신재생|태양광|수소|クリーン/i, not: /Windsor|Tailwind/i },
  { slug: "ev-batteries", kind: "theme", featured: true, label: "Electric vehicles and batteries",
    blurb: "Electric car makers, battery producers and the lithium and other materials they need.",
    re: /\b(Electric Vehicles?|EVs?|Batter\w+|Lithium|Autonomous|Future Mobility|Smart Mobility|E-?Mobility)\b|新能源车|新能源汽车|电池|电动|智能汽车|2차전지|전기차|배터리|バッテリー|電池/i },
  { slug: "big-tech", kind: "theme", featured: true, label: "Big tech",
    blurb: "A handful of the largest technology companies, often the same ten or fewer names. Very concentrated.",
    re: /\b(FANG\+?|FAANG|Magnificent ?(7|Seven)|Mag ?7|Mega ?Cap|Big ?Tech|Top ?\d+ (US )?Tech|Tech (Top|Giants|Leaders|Titans))\b|빅테크|ビッグテック/i },
  { slug: "quantum", kind: "theme", featured: true, label: "Quantum computing",
    blurb: "Companies working on quantum computers and related technology. A young theme with few pure companies, so funds also hold large technology firms.",
    re: /\bQuantum\b|量子|양자/i },
  { slug: "data-centers", kind: "theme", label: "Data centres and digital infrastructure",
    blurb: "Owners and suppliers of data centres, towers and networks.",
    re: /\b(Data ?Cent(er|re)s?|Digital Infrastructure|Cell Towers?|5G|Connectivity)\b|데이터센터|数据中心|通信设备|データセンター/i },
  { slug: "electrification", kind: "theme", label: "Power grid and electrification",
    blurb: "Companies that build and equip electricity networks, a theme tied to the power needs of data centres.",
    re: /\b(Electrification|Power Grid|Smart Grid|Grid Infrastructure|Power Infrastructure|Electric(al)? Infrastructure)\b|电力|电网|전력|電力/i },
  { slug: "cloud-software", kind: "theme", label: "Cloud and software",
    blurb: "Software companies and cloud computing providers.",
    re: /\b(Cloud|Software|SaaS|Big Data)\b|云计算|软件|大数据|클라우드|소프트웨어|クラウド/i },
  { slug: "technology", kind: "theme", label: "Technology",
    blurb: "Broad technology funds: hardware, software, internet and chip companies together.",
    re: /\b(Technology|Technologie|Tech|Information Tech\w*|Nasdaq|Digital|Internet)\b|科技|信息技术|互联网|테크|テック|テクノロジー/i },
  { slug: "space", kind: "theme", label: "Space",
    blurb: "Satellite operators, launch companies and their suppliers.",
    re: /\bSpace\b|航天|卫星|宇宙|우주/i },
  { slug: "fintech", kind: "theme", label: "Fintech",
    blurb: "Payment, digital banking and financial technology companies.",
    re: /\b(Fin ?Tech|Digital Payments?|Mobile Payments?|Payments?)\b|金融科技|핀테크/i },
  { slug: "gaming", kind: "theme", label: "Video games and metaverse",
    blurb: "Game publishers, e-sports and virtual-world companies.",
    re: /\b(Video ?Gam\w+|Gaming|E-?sports|Metaverse)\b|游戏|动漫|게임|메타버스|ゲーム/i },
  { slug: "biotech", kind: "theme", label: "Biotech and genomics",
    blurb: "Drug developers and companies working on genetic medicine.",
    re: /\b(Biotech\w*|Genomic\w*|Gene\w* Revolution|Life Sciences)\b|生物医药|生物科技|创新药|바이오|バイオ/i },
  { slug: "healthcare", kind: "theme", label: "Healthcare",
    blurb: "Drug makers, medical equipment and health services.",
    re: /\b(Health ?Care|Healthcare|Santé|Pharma\w*|Medical|Med ?Tech)\b|医药|医疗|헬스케어|ヘルスケア|医薬/i },
  { slug: "financials", kind: "theme", label: "Banks and financials",
    blurb: "Banks, insurers and other financial companies.",
    re: /\b(Banks?|Banking|Financials?|Insurance)\b|银行|券商|证券ETF|金融|은행|금융|銀行/i, not: /Fin ?Tech|金融科技|Bank of |Deutsche Bank|Commerzbank|Bank ETN|ex[- ]Financials|Non-?financials|Bank Bonds?|Linked Bank|Development Bank/i },
  { slug: "energy", kind: "theme", label: "Oil, gas and energy",
    blurb: "Oil and gas producers and energy companies, and products that follow oil or gas prices.",
    re: /\b(Oil|Crude|Natural Gas|Energy|MLP|Pipelines?)\b|石油|能源|原油|에너지/i, not: /Clean Energy|New Energy|Energy Transition|Renewable|新能源/i },
  { slug: "real-estate", kind: "theme", label: "Real estate",
    blurb: "Listed property companies and real estate investment trusts.",
    re: /\b(Real Estate|REITs?|Property)\b|房地产|地产|리츠|부동산|リート|不動産/i },
  { slug: "infrastructure", kind: "theme", label: "Infrastructure",
    blurb: "Owners and builders of roads, airports, pipelines and utilities.",
    re: /\bInfrastructure\b|基建|인프라|インフラ/i, not: /Digital Infrastructure|Power Infrastructure|Grid Infrastructure/i },
  { slug: "water", kind: "theme", label: "Water",
    blurb: "Water utilities and makers of water treatment equipment.",
    re: /\bWater\b|水务/i },
  { slug: "agriculture", kind: "theme", label: "Food and agriculture",
    blurb: "Farm, food and agricultural commodity products.",
    re: /\b(Agricultur\w+|Agri\w*|Food|Farming|Wheat|Corn|Soybeans?|Grains?)\b|农业|粮食|畜牧|농업/i },
  { slug: "metals-mining", kind: "theme", label: "Metals and mining",
    blurb: "Miners and the metals themselves: copper, rare earths, steel, silver and others.",
    re: /\b(Min(ers|ing)|Metals?|Copper|Rare Earths?|Steel|Silver|Platinum|Palladium|Critical Minerals?|Lithium)\b|有色|稀土|钢铁|矿业|白银|희토류|구리|은현물/i },
  { slug: "gold", kind: "theme", label: "Gold",
    blurb: "Products that hold physical gold, and funds that own gold miners.",
    re: /\bGold\b|黄金|골드|금현물|金価格|純金/i, not: /Golden|Goldman/i },
  { slug: "consumer-luxury", kind: "theme", label: "Consumer and luxury",
    blurb: "Consumer brands, retailers and luxury goods companies.",
    re: /\b(Consumer|Luxury|Retail|E-?commerce|Travel|Leisure)\b|消费|白酒|食品饮料|소비|명품/i },
  { slug: "esg", kind: "theme", label: "ESG and climate",
    blurb: "Funds that screen or weight companies on environmental, social and governance criteria or on carbon emissions. Rules differ widely between funds.",
    re: /\b(ESG|SRI|Sustainab\w+|Climate|Paris[- ]Aligned|PAB|CTB|Low Carbon|Net Zero|Screened|Responsible|Socially)\b|碳中和|低碳|ＥＳＧ/i },
  { slug: "covered-call", kind: "style", label: "Covered call and option income",
    blurb: "Funds that sell options on what they hold to pay a higher income, giving up part of the gains in rising markets.",
    re: /\b(Covered Call|Buy[- ]?Write|Option Income|Premium Income|Enhanced Income|Yield ?Max|Autocallable|0DTE)\b|커버드콜|カバードコール/i },
  { slug: "leveraged-inverse", kind: "style", label: "Leveraged and inverse",
    blurb: "Products that multiply a market's daily move, or move against it. Built for short holding periods: over weeks or months their result can differ sharply from the multiple in their name.",
    caution: "These products reset every day. Held for longer, they can lose money even when the market ends up where they needed it to.",
    re: /\b(Leveraged?|Inverse|Short (S&P|Nasdaq|QQQ|Dow|Russell|MSCI|DAX|FTSE|CAC|Euro ?Stoxx|Bitcoin|Ether|VIX|Daily|[1-5]x)|Daily Short|ShortDAX|UltraPro|UltraShort|Ultra (S&P|QQQ|Dow|Russell|Bitcoin)|ProShares (Short|Ultra)|Bear|Bull|Direxion Daily|Leverage Shares|MicroSectors|Daily Target|[-+]?[1-5](\.\d)?[xX]|[1-5]x (Long|Short)|Daily (Long|Short|[1-5]x))\b|레버리지|인버스|レバレッジ|インバース|ベア|ブル|杠杆|反向|两倍|2倍|正2|反1/i, not: /Short[- ](Term|Duration|Dated|Maturity)|Ultra[- ]?Short (Bond|Term|Duration|Income|Treasury)|Bull(et|ion)/i },
  // Regions beyond the ones the basic rules already cover.
  { slug: "china", kind: "region", label: "China", blurb: "Companies from mainland China and Hong Kong.", re: CHINA },
  { slug: "india", kind: "region", label: "India", blurb: "Indian companies.", re: /\b(India|Indian|Nifty|Sensex)\b|인도|インド|印度/i, not: /Indiana/i },
  { slug: "japan", kind: "region", label: "Japan", blurb: "Japanese companies.", re: /\b(Japan|Japanese|Nikkei|TOPIX|JPX)\b|日経|日本株|일본/i },
  { slug: "korea", kind: "region", label: "South Korea", blurb: "South Korean companies.", re: /\b(Korea|Korean|KOSPI|KOSDAQ)\b|코스피|코스닥|코리아|韓国/i },
  { slug: "taiwan", kind: "region", label: "Taiwan", blurb: "Taiwanese companies.", re: /\b(Taiwan|Taiwanese|TAIEX)\b|대만|台湾|台灣/i },
  { slug: "latin-america", kind: "region", label: "Latin America", blurb: "Companies from Brazil, Mexico and their neighbours.", re: /\b(Latin America|LatAm|Brazil|Mexico|Argentina|Chile)\b|브라질|ブラジル/i },
  { slug: "middle-east", kind: "region", label: "Middle East and Gulf", blurb: "Companies from Saudi Arabia, the Emirates and the wider Gulf.", re: /\b(Saudi|Arabia|UAE|Emirates|Qatar|Kuwait|GCC|Gulf|Middle East|Israel|Turkey|Türkiye)\b|사우디|サウジ|沙特/i },
  { slug: "africa", kind: "region", label: "Africa", blurb: "African companies, most often from South Africa, Egypt and Nigeria.", re: /\b(Africa|African|Nigeria|Egypt|Morocco)\b/i },
  { slug: "asia-pacific", kind: "region", label: "Asia-Pacific", blurb: "Companies from across Asia and the Pacific.", re: /\b(Asia|Asian|Pacific|APAC|ASEAN|Vietnam|Indonesia|Thailand|Singapore|Australia)\b|아시아|베트남|アジア|东南亚/i },
];

const BY_SLUG = new Map(THEMES.map((t) => [t.slug, t]));
export const themeBySlug = (slug: string) => BY_SLUG.get(slug);

/** Markets where every listed fund is a mainland Chinese fund, whatever its name says. */
const CHINA_SOURCES = new Set(["china_sh", "china_sz"]);

/** The groups a name belongs to. `source` is the register the fund came from, when known. */
export function inferThemes(rawName: string, source?: string): string[] {
  // Japanese registers write Latin letters in full width: fold them so "ＡＩ" reads as "AI".
  const name = rawName.normalize("NFKC");
  const out = THEMES.filter((t) => t.re.test(name) && !(t.not && t.not.test(name))).map((t) => t.slug);
  const chinese = CHINA.test(name) || (source !== undefined && CHINA_SOURCES.has(source));
  if (chinese && !out.includes("china")) out.push("china");
  if (chinese && TECH.test(name)) out.push("china-tech");
  // A leveraged or inverse product is not a way to hold a theme: keep it out of the themes it names.
  return out.includes("leveraged-inverse") ? out.filter((s) => BY_SLUG.get(s)?.kind !== "theme" || s === "crypto") : out;
}
