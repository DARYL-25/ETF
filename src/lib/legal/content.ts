/**
 * Terms, privacy and legal notice. Written to describe what the site actually does, in plain words.
 * These are drafts: a lawyer has to review them before the service opens to the public, and the pages say so.
 */
export type LegalPage = { slug: string; title: string; summary: string; sections: { heading: string; paragraphs: string[] }[] };

export const LEGAL_UPDATED = "2026-11-16";

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "terms", title: "Terms of use", summary: "What this service is, what it is not, and the rules for using it.",
    sections: [
      { heading: "What the service is", paragraphs: [
        "ETF Intelligence is a research tool. It gathers published information about exchange-traded funds and lets you search, compare and learn about them.",
        "It is not investment advice, tax advice or a recommendation to buy or sell anything. It does not know your situation. It does not execute orders and never holds your money.",
      ] },
      { heading: "The data", paragraphs: [
        "Figures come from fund issuers, regulators and exchanges, and each one is shown with its source and date. They can be late, incomplete or wrong, and some labels are inferred from a fund's name.",
        "Prices are end-of-day values, never real time. Before you act on anything, check the fund's own documents, in particular its key information document and prospectus.",
        "Past performance does not predict future returns. The value of an investment can fall as well as rise, and you can lose money.",
      ] },
      { heading: "Accounts", paragraphs: [
        "Most of the site works without an account. If you create one, keep your sign-in details to yourself and tell us if you think someone else has used your account.",
        "You can ask us to delete your account at any time.",
      ] },
      { heading: "Paid plan", paragraphs: [
        "Some features need a paid plan. The price and what it includes are shown on the pricing page before you pay. Payment is handled by Stripe.",
        "The plan renews until you cancel it, which you can do at any time from your account. Cancelling stops the next renewal. The rights the law gives you as a consumer, including any right to withdraw, are not reduced by these terms.",
      ] },
      { heading: "Fair use", paragraphs: [
        "You may use the site and its exports for your own research. Do not copy the database in bulk, resell it, or load the site with automated requests.",
        "Fund names, index names and logos belong to their owners. Showing them here does not mean their owners endorse this service.",
      ] },
      { heading: "Our responsibility", paragraphs: [
        "We work to keep the information accurate and the site available, but we do not promise that either is free of errors or interruptions.",
        "To the extent the law allows, we are not liable for losses that result from decisions made using the site. Nothing here limits liability that the law does not allow to be limited.",
      ] },
      { heading: "Changes", paragraphs: [
        "We may change the service and these terms. When a change matters, we say so on the site before it applies. The law that applies and the competent courts are stated in the legal notice.",
      ] },
    ],
  },
  {
    slug: "privacy", title: "Privacy", summary: "What we store about you, why, and what stays on your device.",
    sections: [
      { heading: "In short", paragraphs: [
        "You can use most of the site without telling us who you are. We do not show advertising, we do not use tracking or analytics cookies, and we do not sell personal data.",
      ] },
      { heading: "Without an account", paragraphs: [
        "Four small cookies remember the settings you choose: your language, the country you invest from, which funds lists show by default, and that you have seen the settings window. They hold nothing else and last one year.",
        "Your watchlists, practice portfolios, comparison list, lesson progress and light or dark appearance are kept in your browser's storage. They stay on your device and are not sent to us.",
        "Like any website, our hosting provider records technical logs, such as the address a request came from and the page requested, to keep the service running and secure.",
      ] },
      { heading: "With an account", paragraphs: [
        "We store your email address and the sign-in data needed to recognise you. Cookies keep you signed in.",
        "Your watchlists, practice portfolios and settings (language, country and default list view) are then saved to your account, so you find them on every device. Only you can read them.",
      ] },
      { heading: "Payments", paragraphs: [
        "Stripe handles payments. We never see or store your card number. We store which plan you have, its status, and the identifiers Stripe gives us for your customer record and subscription.",
      ] },
      { heading: "The assistant", paragraphs: [
        "When you ask the assistant a question, the text of your question, and the country you selected if any, are sent to Anthropic, the company whose AI model writes the answer. Do not put personal information in a question.",
      ] },
      { heading: "Who else handles data", paragraphs: [
        "We rely on a few providers to run the service: a hosting provider for the site, Supabase for accounts and the database, Stripe for payments and Anthropic for the assistant. Each handles data only to provide that service.",
      ] },
      { heading: "Your rights", paragraphs: [
        "You can ask for a copy of the data we hold about you, ask us to correct or delete it, and object to how we use it. Write to the contact address in the legal notice. You can also complain to the data protection authority of your country.",
        "We keep account data for as long as the account exists, and delete it when you ask us to, except what the law requires us to keep, such as payment records.",
      ] },
      { heading: "Age", paragraphs: [
        "The service is meant for adults. It is not directed at anyone under 18.",
      ] },
    ],
  },
  {
    slug: "notice", title: "Legal notice", summary: "Who runs this service and how to reach them.",
    sections: [
      { heading: "Not a regulated financial service", paragraphs: [
        "ETF Intelligence provides general information and education. It is not a bank, broker, investment adviser or tax adviser, and it is not authorised or supervised as one.",
      ] },
      { heading: "Sources and trademarks", paragraphs: [
        "The data page lists every source the figures come from and when each was last read. Names and logos of funds, issuers and indices are the property of their owners.",
      ] },
    ],
  },
];

export const legalBySlug = (slug: string) => LEGAL_PAGES.find((p) => p.slug === slug);

/** The operator's details come from the environment, so they are set once at hosting and never invented here. */
export const operator = () => ({
  name: process.env.LEGAL_OPERATOR_NAME?.trim() || null,
  address: process.env.LEGAL_OPERATOR_ADDRESS?.trim() || null,
  email: process.env.LEGAL_CONTACT_EMAIL?.trim() || null,
  law: process.env.LEGAL_GOVERNING_LAW?.trim() || null,
});
