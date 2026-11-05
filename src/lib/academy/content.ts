export type Lesson = {
  slug: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced" | "Tax";
  minutes: number;
  summary: string;
  sections: { heading: string; paragraphs: string[] }[];
  tryIt?: { label: string; href: string };
  quiz: { question: string; options: string[]; answer: number; why: string }[];
  references: { label: string; url: string }[];
};

export const LAST_UPDATED = "2026-11-05";
const UCITS = { label: "Directive 2009/65/EC on UCITS", url: "https://eur-lex.europa.eu/eli/dir/2009/65/oj" };
const PRIIPS = { label: "Regulation (EU) No 1286/2014 on PRIIPs key information documents", url: "https://eur-lex.europa.eu/eli/reg/2014/1286/oj" };
const SEC = { label: "US SEC investor bulletin on mutual funds and ETFs", url: "https://www.sec.gov/oiea/investor-alerts-and-bulletins/investor-bulletin-characteristics-mutual-funds-and-exchange" };
const PREMIUM = { label: "Vanguard: ETF premiums and discounts explained", url: "https://corporate.vanguard.com/content/corporatesite/us/en/corp/articles/etf-premiums-and-discounts-explained.html" };

export const LESSONS: Lesson[] = [
  {
    slug: "what-is-an-etf", title: "What is an ETF?", level: "Beginner", minutes: 5,
    summary: "A fund that trades on an exchange like a share, and usually follows an index.",
    sections: [
      { heading: "The short version", paragraphs: [
        "An exchange-traded fund pools money from many investors and buys a basket of assets. One share of the fund gives you a small slice of the whole basket, so a single purchase can spread your money across hundreds or thousands of companies.",
        "Most ETFs are passive: instead of a manager choosing investments, the fund follows the rules of an index such as the MSCI World. Some are actively managed.",
      ] },
      { heading: "ETF, mutual fund or single share?", paragraphs: [
        "A traditional mutual fund is also a pooled basket, but you usually buy and sell it directly with the fund at a price set once a day. An ETF trades on an exchange during market hours through a broker.",
        "A single share is one company. If that company fails, you can lose everything you put into it. An ETF spreads that risk, but it still falls when its whole market falls.",
      ] },
      { heading: "How the supply of shares adjusts", paragraphs: [
        "Large market participants can create new ETF shares or redeem existing ones with the fund. When demand rises, more shares are created. This mechanism helps keep the market price close to the value of what the fund holds.",
      ] },
    ],
    tryIt: { label: "See how many ETFs follow the S&P 500", href: "/indices/sp-500" },
    quiz: [
      { question: "What does one ETF share represent?", options: ["One company", "A slice of the fund's basket", "A loan to the issuer"], answer: 1, why: "The fund holds the assets, and each share is a proportional claim on the fund." },
      { question: "Can an ETF lose value?", options: ["No, diversification prevents losses", "Yes, when what it holds falls", "Only if the issuer goes bankrupt"], answer: 1, why: "Diversification reduces the risk of one company, not the risk of the whole market." },
    ],
    references: [SEC],
  },
  {
    slug: "nav-and-market-price", title: "NAV and market price", level: "Beginner", minutes: 4,
    summary: "Why an ETF has two prices, and why the gap between them matters.",
    sections: [
      { heading: "Two different numbers", paragraphs: [
        "Net asset value, or NAV, is the value of everything the fund owns, minus its liabilities, divided by the number of shares. It is usually calculated once a day.",
        "Market price is what buyers and sellers agree on the exchange at that moment. It is what you actually pay.",
      ] },
      { heading: "Premiums and discounts", paragraphs: [
        "When the market price is above NAV, the ETF trades at a premium. Below NAV, it trades at a discount. In liquid funds the gap is usually small, but it can widen in stressed markets, or when the underlying markets are closed while the ETF still trades.",
      ] },
      { heading: "Why this site shows NAV", paragraphs: [
        "NAV returns with income reinvested show how the fund itself performed, which is what you want when comparing funds. Market price tells you what a trade costs today.",
      ] },
    ],
    quiz: [
      { question: "An ETF's NAV is 100 and it trades at 100.50. What is that called?", options: ["A premium", "A discount", "A dividend"], answer: 0, why: "Price above NAV is a premium." },
      { question: "Which is usually calculated once a day?", options: ["Market price", "NAV", "The bid-ask spread"], answer: 1, why: "NAV is typically struck daily, while market prices move throughout trading." },
    ],
    references: [PREMIUM, SEC],
  },
  {
    slug: "what-is-an-index", title: "What is an index?", level: "Beginner", minutes: 5,
    summary: "The rulebook that decides what a passive ETF owns.",
    sections: [
      { heading: "A list with rules", paragraphs: [
        "An index is a rules-based list of securities, published by a provider such as MSCI, S&P, FTSE Russell or STOXX. You cannot buy an index directly. You buy a fund that follows it.",
        "Choosing the index is the biggest decision you make, because it decides what you own. Two funds on the same index should behave alike, while two world indices can differ.",
      ] },
      { heading: "Similar names, different contents", paragraphs: [
        "MSCI World covers developed markets only. MSCI ACWI and FTSE All-World also include emerging markets. Most large indices weight companies by market value, so the biggest companies have the most influence.",
      ] },
    ],
    tryIt: { label: "Browse the index database", href: "/indices" },
    quiz: [
      { question: "Does MSCI World include emerging markets?", options: ["Yes", "No"], answer: 1, why: "MSCI World covers developed markets. MSCI ACWI adds emerging markets." },
      { question: "In a market-value weighted index, which companies count most?", options: ["The largest", "The oldest", "All equally"], answer: 0, why: "Weight follows company size." },
    ],
    references: [],
  },
  {
    slug: "isin-ticker-listing", title: "ISIN, ticker and listing", level: "Beginner", minutes: 4,
    summary: "How to be certain you are buying the fund you researched.",
    sections: [
      { heading: "Identifiers", paragraphs: [
        "An ISIN is a 12-character code that identifies one share class of a fund. A ticker is a short code used on one exchange. The same share class can have different tickers on different exchanges: iShares Core S&P 500 is CSPX in London and SXR8 on Xetra, with one ISIN.",
      ] },
      { heading: "Fund, share class, listing", paragraphs: [
        "A fund is the portfolio. A share class is a version of it, for example accumulating or distributing, or in another currency. A listing is where that class trades. When placing an order, check the ISIN first, then choose the exchange and trading currency.",
      ] },
    ],
    tryIt: { label: "Search SXR8 and see where it trades", href: "/screener?q=SXR8" },
    quiz: [
      { question: "Which code identifies a share class across exchanges?", options: ["Ticker", "ISIN"], answer: 1, why: "The ISIN stays the same, while tickers vary by exchange." },
      { question: "Are two listings of one share class different ETFs?", options: ["Yes", "No"], answer: 1, why: "They are the same share class, traded in different places." },
    ],
    references: [],
  },
  {
    slug: "fees-ter-ocf", title: "Fees: TER, OCF and what they leave out", level: "Intermediate", minutes: 6,
    summary: "The published fee is important, but it is not the whole cost.",
    sections: [
      { heading: "What the numbers mean", paragraphs: [
        "The total expense ratio, TER, and the ongoing charges figure, OCF, both express a fund's yearly running costs as a percentage of its assets. They are taken from inside the fund, so you never see a bill. They are not always calculated the same way, which is why this site labels each one.",
      ] },
      { heading: "What they leave out", paragraphs: [
        "Neither normally includes the fund's own trading costs. You also pay the bid-ask spread and any broker commission when you buy and sell. And securities lending income can offset part of the cost.",
      ] },
      { heading: "Small fees compound", paragraphs: [
        "A fee is charged every year on a growing amount, so the difference between two fees grows over time. Use the fee calculator to see this with your own numbers.",
      ] },
    ],
    tryIt: { label: "Open the fee calculator", href: "/academy/calculators" },
    quiz: [
      { question: "How is TER paid?", options: ["By a yearly invoice", "From inside the fund", "To your broker"], answer: 1, why: "It is deducted from fund assets, and you see it only through lower returns." },
      { question: "Does TER normally include the bid-ask spread you pay?", options: ["Yes", "No"], answer: 1, why: "The spread is a trading cost you pay when buying and selling." },
    ],
    references: [PRIIPS],
  },
  {
    slug: "tracking-difference", title: "Tracking difference and tracking error", level: "Intermediate", minutes: 5,
    summary: "How closely a fund actually delivers its index, which matters more than the fee alone.",
    sections: [
      { heading: "Two measures", paragraphs: [
        "Tracking difference is the fund's return minus the index's return over a period. It tells you how much you gained or lost compared with the index. Tracking error measures how much that difference varies over time, so it tells you about consistency.",
      ] },
      { heading: "Why the lowest fee is not always best", paragraphs: [
        "Fees pull a fund below its index, while securities lending income and tax treatment can push it back up. A fund with a higher fee can therefore track better than a cheaper one. Compare the difference over several years, not one.",
      ] },
    ],
    quiz: [
      { question: "A fund returned 9.8% and its index 10.0%. What is the tracking difference?", options: ["-0.2%", "+0.2%", "9.8%"], answer: 0, why: "Fund return minus index return." },
      { question: "What does tracking error describe?", options: ["The average gap", "How much the gap varies", "The fee"], answer: 1, why: "It measures variability, not the size of the average shortfall." },
    ],
    references: [],
  },
  {
    slug: "replication", title: "Physical and synthetic replication", level: "Intermediate", minutes: 6,
    summary: "How a fund gets its exposure, and what risks come with each method.",
    sections: [
      { heading: "Physical", paragraphs: [
        "A physical ETF buys the securities. Full replication buys everything in the index. Sampling buys a representative part, which is common for indices with thousands of holdings.",
      ] },
      { heading: "Synthetic", paragraphs: [
        "A synthetic ETF holds other assets and uses a swap, in which a bank agrees to pay the index return. This can suit markets that are hard to access or expensive to hold. It adds counterparty risk, which UCITS rules limit and which funds manage with collateral.",
      ] },
      { heading: "Neither is automatically better", paragraphs: [
        "Compare costs, tracking and risks fund by fund. Physical funds can also lend securities, which brings its own, smaller, counterparty risk.",
      ] },
    ],
    tryIt: { label: "Compare physical and synthetic S&P 500 ETFs", href: "/compare?isins=IE00B5BMR087,IE00BFMXXD54,IE00B3YCGJ38" },
    quiz: [
      { question: "What extra risk does a swap add?", options: ["Counterparty risk", "No risk at all", "Currency risk only"], answer: 0, why: "The bank on the other side of the swap has to pay." },
      { question: "What does sampling mean?", options: ["Buying every index member", "Buying a representative part", "Using a swap"], answer: 1, why: "It aims to match the index without holding everything." },
    ],
    references: [UCITS],
  },
  {
    slug: "accumulating-distributing", title: "Accumulating or distributing", level: "Intermediate", minutes: 4,
    summary: "What the fund does with dividends, and how that changes your experience.",
    sections: [
      { heading: "The difference", paragraphs: [
        "A distributing share class pays income to you in cash. An accumulating class reinvests it inside the fund, so you receive no cash but the share price reflects the income. The underlying portfolio can be the same.",
      ] },
      { heading: "How to choose", paragraphs: [
        "If you want regular income, distributing does that automatically. If you are building wealth, accumulating avoids the small costs and effort of reinvesting yourself. Tax treatment differs by country and can decide the question, so check the rules where you are resident.",
      ] },
    ],
    tryIt: { label: "Compare both classes of one fund", href: "/compare?isins=IE00BK5BQT80,IE00B3RBWM25" },
    quiz: [
      { question: "An accumulating fund's dividends are:", options: ["Paid in cash", "Reinvested in the fund", "Kept by the issuer"], answer: 1, why: "They stay in the fund and raise the value of each share." },
      { question: "Is an accumulating fund always better for tax?", options: ["Yes, everywhere", "No, it depends on your country"], answer: 1, why: "Some countries tax accumulated income too." },
    ],
    references: [],
  },
  {
    slug: "currency-and-hedging", title: "Currency risk and hedging", level: "Intermediate", minutes: 5,
    summary: "A fund's trading currency is not your currency risk.",
    sections: [
      { heading: "The common mistake", paragraphs: [
        "Buying a world ETF in euros does not remove dollar risk. Your risk comes from the currencies of what the fund holds. If US shares are a large part of the fund and the dollar falls against the euro, your euro return falls too, whichever listing you bought.",
      ] },
      { heading: "Hedged share classes", paragraphs: [
        "A hedged class uses currency contracts to reduce those swings. It usually has a higher fee and its own costs, which depend partly on the interest rate gap between currencies. Hedging is common for bonds, where currency moves can swamp the return.",
      ] },
    ],
    tryIt: { label: "Open the currency calculator", href: "/academy/calculators" },
    quiz: [
      { question: "You buy a US share ETF in euros on Xetra. Do you have dollar exposure?", options: ["No, I paid in euros", "Yes, through the holdings"], answer: 1, why: "The trading currency does not change what the fund owns." },
      { question: "Fund +10%, currency -5%. Roughly what is your return?", options: ["+15%", "+4.5%", "+10%"], answer: 1, why: "1.10 × 0.95 = 1.045." },
    ],
    references: [],
  },
  {
    slug: "domicile-and-ucits", title: "Fund domicile, UCITS and the KID", level: "Intermediate", minutes: 6,
    summary: "Where a fund is based, what UCITS means, and what you must read before investing.",
    sections: [
      { heading: "Domicile", paragraphs: [
        "A fund's domicile is the country where it is legally based. Many European ETFs are based in Ireland or Luxembourg. Domicile can influence withholding tax on dividends the fund receives, because tax treaties differ, but no domicile is best for everyone.",
      ] },
      { heading: "UCITS", paragraphs: [
        "UCITS is the EU framework for funds sold to the public. It sets rules on diversification, permitted assets, independent custody of assets and disclosure. It reduces certain risks, but it does not protect you from market losses.",
      ] },
      { heading: "The KID", paragraphs: [
        "Under the PRIIPs rules, products sold to EU retail investors must provide a key information document, with risks and costs in a standard format. Read it before you invest. Many US-domiciled ETFs do not offer one, which often limits access for EU retail investors.",
      ] },
    ],
    tryIt: { label: "Filter ETFs by domicile", href: "/screener?domicile=IE,LU" },
    quiz: [
      { question: "Does UCITS protect you from market losses?", options: ["Yes", "No"], answer: 1, why: "It regulates the fund's structure and disclosure, not market outcomes." },
      { question: "Which document gives standard risk and cost information?", options: ["The KID", "The ticker", "The ISIN"], answer: 0, why: "The key information document exists for exactly this." },
    ],
    references: [UCITS, PRIIPS],
  },
  {
    slug: "bond-etfs", title: "Understanding bond ETFs", level: "Advanced", minutes: 6,
    summary: "Duration, credit quality and yield, in plain terms.",
    sections: [
      { heading: "Duration", paragraphs: [
        "Duration estimates how sensitive a bond fund is to interest rates. As a rule of thumb, a duration of 6 means the fund's price falls about 6% if rates rise by one percentage point, and rises about 6% if they fall by one.",
      ] },
      { heading: "Credit quality", paragraphs: [
        "Investment grade bonds are issued by borrowers considered lower risk. High yield bonds pay more because the risk of default is higher, and they tend to behave more like shares in a crisis.",
      ] },
      { heading: "Yield to maturity", paragraphs: [
        "This estimates the return from holding the fund's bonds to maturity if nothing defaults, before fees. Unlike a single bond, most bond ETFs never mature, because they keep replacing bonds to stay in their index.",
      ] },
    ],
    tryIt: { label: "See a bond ETF's duration and yield", href: "/etfs/IE00B4WXJJ64" },
    quiz: [
      { question: "A fund has a duration of 5 and rates rise 1 point. Its price moves about:", options: ["+5%", "-5%", "-1%"], answer: 1, why: "Prices fall when rates rise, by roughly the duration." },
      { question: "Why does high yield pay more?", options: ["Higher default risk", "Lower fees", "It is guaranteed"], answer: 0, why: "The extra yield compensates for extra risk." },
    ],
    references: [],
  },
  {
    slug: "diversification-and-risk", title: "Diversification, drawdowns and rebalancing", level: "Advanced", minutes: 7,
    summary: "How to think about risk across a portfolio of ETFs.",
    sections: [
      { heading: "Check what you actually own", paragraphs: [
        "Owning several ETFs does not guarantee diversification. A world ETF and an S&P 500 ETF overlap heavily, because US companies make up a large share of world indices. Market-value weighting can also concentrate a fund in a few large companies.",
      ] },
      { heading: "Measures of risk", paragraphs: [
        "Volatility measures how much returns move around. Maximum drawdown is the largest fall from a peak to a low. The Sharpe ratio compares return above a low-risk rate with volatility. All of them look backwards and cannot predict the future.",
      ] },
      { heading: "Rebalancing", paragraphs: [
        "Over time, winners grow to a larger share of a portfolio, which changes its risk. Rebalancing brings it back to your target mix. Costs and taxes matter, so many investors direct new contributions towards what is underweight.",
      ] },
    ],
    quiz: [
      { question: "Do a world ETF and an S&P 500 ETF overlap?", options: ["No", "Yes, heavily"], answer: 1, why: "US companies make up a large part of world indices." },
      { question: "A fund falls from 100 to 70, then recovers to 90. What is the maximum drawdown?", options: ["-10%", "-30%", "-20%"], answer: 1, why: "It is measured from peak to low: 100 to 70." },
    ],
    references: [],
  },
  {
    slug: "etf-tax-layers", title: "The layers of ETF taxation", level: "Tax", minutes: 6,
    summary: "A map of where tax can apply. Educational, with no rates and no advice.",
    sections: [
      { heading: "Tax happens in layers", paragraphs: [
        "Asking what tax an ETF pays mixes several separate questions: taxes inside the fund, withholding tax on dividends it receives, tax you may owe on distributions, tax you may owe on accumulated income, and tax when you sell.",
      ] },
      { heading: "Residence and domicile are different", paragraphs: [
        "Your tax residence is where you are taxed as an investor. The fund's domicile is where the fund is based. Both can matter, in different layers. Where you physically are does not by itself determine your tax residence.",
      ] },
      { heading: "What to do next", paragraphs: [
        "Rules differ by country and change over time. Check your tax authority's guidance, and ask a qualified adviser about your situation. This site will add country rules only after they have been checked against official sources.",
      ] },
    ],
    quiz: [
      { question: "Is there one tax rate for an ETF?", options: ["Yes", "No, there are several layers"], answer: 1, why: "Fund-level, withholding and investor-level taxes are separate." },
      { question: "Is fund domicile the same as your tax residence?", options: ["Yes", "No"], answer: 1, why: "One describes the fund and the other describes you." },
    ],
    references: [],
  },
];

export const PATHS: { slug: string; title: string; description: string; lessons: string[] }[] = [
  { slug: "beginner", title: "ETF Beginner", description: "Understand what you are buying.", lessons: ["what-is-an-etf", "nav-and-market-price", "what-is-an-index", "isin-ticker-listing"] },
  { slug: "investor", title: "ETF Investor", description: "Compare funds on what really matters.", lessons: ["fees-ter-ocf", "tracking-difference", "replication", "accumulating-distributing", "currency-and-hedging", "domicile-and-ucits"] },
  { slug: "analyst", title: "Advanced ETF Analyst", description: "Read bond funds and portfolio risk.", lessons: ["tracking-difference", "bond-etfs", "diversification-and-risk"] },
  { slug: "portfolio", title: "ETF Portfolio Builder", description: "Go from one fund to a sensible mix.", lessons: ["what-is-an-index", "currency-and-hedging", "diversification-and-risk"] },
  { slug: "tax", title: "ETF Tax Fundamentals", description: "Learn the questions to ask.", lessons: ["accumulating-distributing", "domicile-and-ucits", "etf-tax-layers"] },
];

export const GLOSSARY: [string, string][] = [
  ["Accumulating", "A share class that reinvests income inside the fund instead of paying it out."],
  ["AUM", "Assets under management: the total value of a fund's holdings."],
  ["Authorised participant", "A large firm that can create and redeem ETF shares directly with the fund."],
  ["Benchmark", "The index a fund follows or is measured against."],
  ["Bid-ask spread", "The gap between the highest price buyers offer and the lowest price sellers ask."],
  ["Counterparty risk", "The risk that the other side of a contract, such as a swap, fails to pay."],
  ["Distributing", "A share class that pays income to investors in cash."],
  ["Domicile", "The country where a fund is legally based."],
  ["Drawdown", "A fall from a peak to a later low."],
  ["Duration", "An estimate of how sensitive a bond fund's price is to interest rates."],
  ["ETC", "Exchange-traded commodity: a debt security tracking a commodity, such as physical gold. It is not a fund."],
  ["Hedged", "A share class using currency contracts to reduce currency swings."],
  ["Index", "A rules-based list of securities that a passive fund follows."],
  ["ISIN", "A 12-character code identifying a security, here one share class."],
  ["KID", "Key information document: a standard summary of risks and costs for EU retail products."],
  ["Listing", "A place where a share class trades, with its own ticker and trading currency."],
  ["NAV", "Net asset value: a fund's assets minus liabilities, per share."],
  ["OCF", "Ongoing charges figure: a measure of a fund's yearly running costs."],
  ["Premium and discount", "How far the market price sits above or below NAV."],
  ["Replication", "How a fund gets its exposure: physical or synthetic."],
  ["Securities lending", "Lending fund holdings to other institutions for a fee."],
  ["Share class", "A version of a fund, for example by currency or income treatment."],
  ["Sharpe ratio", "Return above a low-risk rate, divided by volatility."],
  ["Swap", "A contract in which a bank agrees to pay a return, such as an index's."],
  ["TER", "Total expense ratio: a measure of a fund's yearly costs."],
  ["Ticker", "A short trading code on one exchange."],
  ["Tracking difference", "A fund's return minus its index's return."],
  ["Tracking error", "How much the tracking difference varies over time."],
  ["UCITS", "The EU framework for funds sold to the public."],
  ["Volatility", "How much returns move around their average."],
  ["Withholding tax", "Tax deducted at source on dividends or interest."],
  ["Yield to maturity", "Estimated return from holding bonds until they mature, if none default."],
];
