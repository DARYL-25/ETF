import type { Source, TaxCountry } from "./content";

/**
 * Tax notes for more countries of residence, read on 17 November 2026. The same rules apply as for France and
 * Switzerland: each rule quotes an official or regulator source, nothing is applied to a person's own figures,
 * and no tax adviser has reviewed the text. Points we could not source officially are listed as open questions.
 */
export const MORE_READ_ON = "2026-11-17";

const UK_ISA: Source = { label: "GOV.UK, Individual Savings Accounts: how ISAs work", url: "https://www.gov.uk/individual-savings-accounts/how-isas-work" };
const UK_CGT: Source = { label: "GOV.UK, Capital Gains Tax rates and allowances", url: "https://www.gov.uk/guidance/capital-gains-tax-rates-and-allowances" };
const UK_HS265: Source = { label: "HMRC, HS265 Offshore funds", url: "https://www.gov.uk/government/publications/offshore-funds-self-assessment-helpsheet-hs265/hs265-offshore-funds" };
const UK_IFM: Source = { label: "HMRC Investment Funds Manual, IFM13100", url: "https://www.gov.uk/hmrc-internal-manuals/investment-funds/ifm13100" };
const DE_NRW: Source = { label: "Finanzverwaltung NRW, Erträge aus Investmentfonds", url: "https://www.finanzamt.nrw.de/steuerinfos/privatpersonen/einkuenfte-aus-kapitalvermoegen/ertraege-aus-investmentfonds" };
const DE_INVSTG: Source = { label: "Investmentsteuergesetz (InvStG), gesetze-im-internet.de", url: "https://www.gesetze-im-internet.de/invstg_2018/BJNR173010016.html" };
const IE_EBRIEF: Source = { label: "Revenue eBrief No. 016/26, Investment Undertaking Tax rate change, 22 January 2026", url: "https://www.revenue.ie/en/tax-professionals/ebrief/2026/no-0162026.aspx" };
const BE_TOB: Source = { label: "SPF Finances, taxe sur les opérations de bourse", url: "https://fin.belgium.be/fr/particuliers/international/revenus-comptes-etrangers/taxe-operations-bourse" };
const BE_WIKIFIN: Source = { label: "Wikifin (FSMA), la fiscalité de l'épargne et des placements", url: "https://www.wikifin.be/fr/thematiques/epargner-et-investir/questions-cles/la-fiscalite-de-lepargne-et-des-placements" };
const BE_CGT: Source = { label: "news.belgium.be, Council of Ministers: tax on capital gains on financial assets", url: "https://news.belgium.be/fr/node/41460/pdf" };
const ES_CNMV: Source = { label: "CNMV, Guía de fiscalidad de los fondos de inversión, January 2026", url: "https://internet.cnmv.es/DocPortal/Publicaciones/Guias/GuiaFiscalidadFondosInversion2026.pdf" };
const IT_19E: Source = { label: "Agenzia delle Entrate, Circolare 19/E of 27 June 2014 (26% rate on financial income)", url: "https://agenziaentrate.gov.it/portale/documents/20143/298850/Circolare+n19E+del+27+giugno+2014_Cir19e+del+27+06+14.pdf/429c76f6-6236-4071-79ae-65af4aadd134" };
const AT_INVFR: Source = { label: "BMF Findok, Investmentfondsrichtlinien", url: "https://findok.bmf.gv.at/findok/resources/pdf/595910a5-12d3-4079-8460-d5cbbf0c3ee6/37454.1.-1.X.pdf" };
const AT_USP: Source = { label: "Unternehmensserviceportal (BMF), Kapitalertragsteuer", url: "https://www.usp.gv.at/steuern-finanzen/einkommensteuer-ueberblick/weitere-informationen-est/kapitalertragsteueranmeldung.html" };

const LU_GAINS: Source = { label: "Guichet.lu, income from the purchase or sale of shares or other securities", url: "https://guichet.public.lu/en/citoyens/fiscalite/declaration-impot-decompte/capitaux-mobiliers/banque-dividende-interets/achat-vente-actions.html" };
const NL_BOX3: Source = { label: "Belastingdienst, how box 3 income is calculated for 2026", url: "https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/belastingberekening" };
const NL_ALLOWANCE: Source = { label: "Belastingdienst, tax-free allowance (heffingsvrij vermogen)", url: "https://www.belastingdienst.nl/wps/wcm/connect/nl/box-3/content/heffingsvrij-vermogen" };
const NL_RATE: Source = { label: "Rijksoverheid, types of income tax: box 3", url: "https://www.rijksoverheid.nl/themas/werk/inkomstenbelasting/soorten-inkomstenbelasting" };

export const MORE_SOURCES = { UK_HS265, UK_ISA, DE_NRW, DE_INVSTG, IE_EBRIEF, BE_WIKIFIN, ES_CNMV, IT_19E, AT_INVFR };

export const MORE_COUNTRIES: TaxCountry[] = [
  {
    code: "GB", slug: "united-kingdom", name: "United Kingdom", adjective: "British", authority: "HM Revenue & Customs (HMRC)", readOn: MORE_READ_ON,
    summary: "Inside a stocks and shares ISA, gains and dividends are free of UK tax. Outside it, gains on a fund domiciled abroad are taxed as capital gains only if the fund has reporting fund status; otherwise they are taxed as income.",
    rules: [
      { title: "Check reporting fund status before buying a fund domiciled abroad", body: "Gains on disposals of an offshore fund with reporting status are subject to capital gains tax. Gains on a non-reporting fund are offshore income gains, taxed as income.", why: "Most European ETFs are offshore funds for UK purposes. HMRC publishes the list of reporting funds every month, so check the share class there.", sources: [UK_HS265, UK_IFM] },
      { title: "Capital gains above the annual exempt amount are taxed", body: "You only pay capital gains tax when your overall gains for the tax year, after losses and reliefs, are above the annual exempt amount.", why: "Outside an ISA, selling a reporting fund at a gain uses this allowance first.", sources: [UK_CGT] },
      { title: "Income from distributing funds is taxed in the year it is paid", body: "UK investors in offshore funds are chargeable to income tax on the distributions the fund actually makes to them. Reporting funds also report income they keep, which is taxable even when not paid out.", why: "An accumulating reporting fund still creates taxable income each year outside an ISA, so keep its reports.", sources: [UK_IFM, UK_HS265] },
    ],
    wrappers: [
      { name: "Stocks and shares ISA", body: "Stocks and shares ISAs can hold shares, funds and bonds. You do not pay UK tax on the income or gains inside. The overall ISA allowance is £20,000 a tax year, across all ISA types.", sources: [UK_ISA], holding: { years: 0, effect: "No minimum holding period: gains and income inside are free of UK tax whenever you sell." } },
      { name: "General investment account", body: "No limit and any fund your broker offers. Gains follow capital gains tax for reporting funds, or income tax for non-reporting ones; distributions are taxed as income.", sources: [UK_CGT, UK_HS265] },
    ],
    compare: [
      { fact: "Reporting fund status", matters: "Decides whether a gain is a capital gain or income. Check the share class on HMRC's list." },
      { fact: "Account", matters: "Inside an ISA the fund's tax status no longer matters for UK tax." },
      { fact: "Income treatment", matters: "Accumulating reporting funds still report taxable income each year outside an ISA." },
    ],
    open: ["Dividend tax rates and the dividend allowance for your tax band.", "Pension wrappers (SIPP), which are not covered here.", "Whether a specific ETF share class is on HMRC's reporting fund list this month."],
  },
  {
    code: "DE", slug: "germany", name: "Germany", adjective: "German", authority: "Bundeszentralamt für Steuern and your Finanzamt", readOn: MORE_READ_ON,
    summary: "Fund income and gains are taxed at the flat withholding rate, but part is exempt depending on the fund type: 30% for equity funds. Accumulating funds also pay a small yearly tax on a notional return, the Vorabpauschale.",
    rules: [
      { title: "Part of an equity fund's returns is exempt", body: "A fund that continuously invests more than 50% in equities is an equity fund. A private investor then receives 30% of its income tax-free; mixed funds with at least 25% equities get 15%.", why: "Check the fund's equity ratio: a world equity ETF usually qualifies for the 30% exemption, a bond ETF gets none.", sources: [DE_NRW, DE_INVSTG] },
      { title: "Accumulating funds are taxed on a yearly notional return", body: "The Vorabpauschale is based on the fund's value at the start of the year multiplied by 70% of the Bundesbank's base rate, capped at the fund's actual gain, and is taxed as if received on the first working day of the next year.", why: "An accumulating ETF in Germany still causes a small tax bill each year, credited against the tax when you sell.", sources: [DE_INVSTG] },
    ],
    wrappers: [
      { name: "Securities account (Depot)", body: "Income, the Vorabpauschale and gains are taxed at the flat withholding rate after the partial exemption for the fund type.", sources: [DE_NRW, DE_INVSTG] },
    ],
    compare: [
      { fact: "Fund type", matters: "Equity funds get 30% of income exempt, mixed funds 15%, other funds none." },
      { fact: "Income treatment", matters: "Accumulating funds pay the Vorabpauschale; distributing funds are taxed on payouts. The difference is small for equity funds." },
    ],
    open: ["The yearly saver's allowance and how to file an exemption order with your bank.", "Church tax and the solidarity surcharge for your situation.", "The base rate published for the coming year, which sets the Vorabpauschale."],
  },
  {
    code: "IE", slug: "ireland", name: "Ireland", adjective: "Irish", authority: "Revenue", readOn: MORE_READ_ON,
    summary: "Most ETFs are taxed under the exit tax regime: 38% on gains and distributions for individuals since 1 January 2026, with a deemed sale every eight years even if you do not sell.",
    rules: [
      { title: "Exit tax of 38% for individuals since 1 January 2026", body: "The Investment Undertaking Tax rate for individuals was reduced from 41% to 38%. Revenue treats an ETF held for eight years as sold on its eighth anniversary and charges exit tax on the gain, with the tax credited when you finally sell.", why: "Long-term holdings face a tax bill every eight years, so plan the cash, and keep the purchase date of every lot.", sources: [IE_EBRIEF] },
    ],
    wrappers: [
      { name: "Broker account", body: "Gains, distributions and eight-year deemed disposals of EU UCITS ETFs are taxed at the exit tax rate.", sources: [IE_EBRIEF], holding: { years: 8, effect: "Every eight years of holding counts as a sale for tax: exit tax is due on the gain so far." } },
    ],
    compare: [
      { fact: "Income treatment", matters: "Distributing ETFs trigger exit tax on every payout; accumulating ones defer it to a sale or the eight-year deemed disposal." },
      { fact: "Purchase dates", matters: "Each purchase starts its own eight-year clock, so many small purchases mean many deemed disposals." },
    ],
    open: ["The announced cut of the exit tax to 35% from 1 January 2027 and the new Investment Account.", "Whether losses on ETFs can be offset, which they generally cannot under exit tax.", "Funds domiciled outside the EU, which can follow different rules."],
  },
  {
    code: "BE", slug: "belgium", name: "Belgium", adjective: "Belgian", authority: "SPF Finances", readOn: MORE_READ_ON,
    summary: "Every ETF purchase and sale pays the stock exchange tax, at a rate that depends on the fund. Bond funds pay 30% on the bond part of a gain, and a new tax on capital gains applies from 1 January 2026.",
    rules: [
      { title: "Stock exchange tax on each purchase and sale", body: "There are three rates of the tax on stock exchange transactions, 0.12%, 0.35% and 1.32%, with caps. For listed funds the rate depends on the share class's registration and on whether it distributes or accumulates.", why: "An accumulating ETF on the FSMA list can cost 1.32% on each purchase and sale, against 0.12% for a distributing one, so check the rate before choosing.", sources: [BE_WIKIFIN, BE_TOB] },
      { title: "30% on the bond part of a fund's gain", body: "Your bank withholds 30% on the gains that come from the bond component of a fund.", why: "Bond ETFs and mixed ETFs are taxed on part of their gain when sold; equity ETFs are not affected by this rule.", sources: [BE_WIKIFIN] },
      { title: "A tax on capital gains on financial assets", body: "A tax on capital gains on financial assets, including funds and ETFs, was introduced with effect from 1 January 2026.", why: "Gains realised on ETFs from 2026 can now be taxable. The rate and the yearly exemption depend on the law and your situation.", sources: [BE_CGT] },
    ],
    wrappers: [
      { name: "Securities account", body: "The stock exchange tax applies to each trade. A foreign broker may leave you to declare and pay it yourself.", sources: [BE_TOB] },
    ],
    compare: [
      { fact: "Registration and income treatment", matters: "Set the stock exchange tax rate of each purchase and sale." },
      { fact: "Bond share", matters: "Sets how much of a gain falls under the 30% bond rule." },
    ],
    open: ["The rate, yearly exemption and reporting of the new capital gains tax for your situation.", "Withholding tax on distributions, and declaring an account held abroad."],
  },
  {
    code: "ES", slug: "spain", name: "Spain", adjective: "Spanish", authority: "Agencia Tributaria", readOn: MORE_READ_ON,
    summary: "Gains on ETFs are taxed in the savings base when you sell. Unlike ordinary investment funds, ETFs cannot be switched without tax through a traspaso.",
    rules: [
      { title: "Gains are taxed in the savings base when you sell", body: "Gains and losses from selling funds are included in the savings tax base, taxed at progressive savings rates.", why: "Selling to switch from one ETF to another realises the gain and its tax in that year.", sources: [ES_CNMV] },
      { title: "No tax-free switching for ETFs", body: "The deferral that lets investors move money between investment funds without tax does not apply to listed funds such as ETFs.", why: "Index funds that are not listed can be switched without tax; ETFs cannot, which matters if you plan to change funds over time.", sources: [ES_CNMV] },
    ],
    wrappers: [
      { name: "Securities account", body: "Dividends and gains go into the savings tax base.", sources: [ES_CNMV] },
    ],
    compare: [
      { fact: "ETF or index fund", matters: "An unlisted index fund on the same index can be switched without tax; an ETF cannot." },
      { fact: "Income treatment", matters: "Distributions are taxed every year; accumulating ETFs defer tax to the sale." },
    ],
    open: ["The savings tax bands for the current year.", "The two-month rule that defers losses when you buy back the same security.", "Declaring foreign accounts (modelo 720) above the thresholds."],
  },
  {
    code: "IT", slug: "italy", name: "Italy", adjective: "Italian", authority: "Agenzia delle Entrate", readOn: MORE_READ_ON,
    summary: "Income from funds, including gains on harmonised ETFs, is taxed at 26%. Part linked to government bonds can be taxed at 12.5%.",
    rules: [
      { title: "26% on financial income", body: "Since 1 July 2014 the rate on financial income is 26%, with lower rates kept for some cases such as government bonds.", why: "Gains and distributions on harmonised (UCITS) ETFs are taxed at this rate, usually withheld by an Italian intermediary.", sources: [IT_19E] },
    ],
    wrappers: [
      { name: "Securities account (regime amministrato)", body: "An Italian intermediary withholds the tax for you. With a foreign broker you declare the income yourself.", sources: [IT_19E] },
    ],
    compare: [
      { fact: "Harmonised or not", matters: "Non-harmonised funds follow different rules, so prefer UCITS share classes." },
      { fact: "Government bond share", matters: "The part of income from government bonds can be taxed at 12.5% instead of 26%." },
    ],
    open: ["Gains on harmonised ETFs count as capital income while losses count as other income, so they generally cannot offset each other: confirm with your intermediary.", "Stamp duty and IVAFE on accounts held at home or abroad."],
  },
  {
    code: "AT", slug: "austria", name: "Austria", adjective: "Austrian", authority: "Bundesministerium für Finanzen (BMF)", readOn: MORE_READ_ON,
    summary: "Fund income and gains are taxed at 27.5%, and accumulating funds are taxed every year on the income they keep. Funds that report to Austria are taxed on actual figures; others on flat estimates.",
    rules: [
      { title: "27.5% on income and gains, every year for retained income", body: "Funds pass their income through to investors: distributions and the income an accumulating fund keeps (ausschüttungsgleiche Erträge) are both taxed, and the investor's cost is raised by the taxed amount.", why: "An accumulating ETF does not defer income tax in Austria.", sources: [AT_INVFR, AT_USP] },
      { title: "Prefer reporting funds (Meldefonds)", body: "A reporting fund has a tax representative who reports its taxable income to the Oesterreichische Kontrollbank. For a non-reporting fund, the taxable income is estimated on a flat basis.", why: "The flat estimate for non-reporting funds can tax you even in a year the fund lost money. Check the status on my.oekb.at before buying.", sources: [AT_INVFR] },
    ],
    wrappers: [
      { name: "Securities account", body: "An Austrian broker withholds the tax; with a foreign broker you declare it yourself.", sources: [AT_USP] },
    ],
    compare: [
      { fact: "Reporting fund status", matters: "Decides whether tax follows the fund's real income or a flat estimate." },
      { fact: "Income treatment", matters: "Matters little: retained income is taxed every year either way." },
    ],
    open: ["The exact flat estimate applied to non-reporting funds.", "Offsetting losses across your accounts in the tax return."],
  },
  {
    code: "LU", slug: "luxembourg", name: "Luxembourg", adjective: "Luxembourg", authority: "Administration des contributions directes (ACD)", readOn: "2026-11-22",
    summary: "For a private investor holding less than 10% of a company, gains on securities held for more than six months are exempt. Sold within six months, they are taxed at the progressive income tax rates. A budget bill would lengthen that period to twelve months from 2027.",
    rules: [
      { title: "Gains after six months are exempt", body: "Gains on a holding below 10% of a company's capital, sold more than six months after purchase, are exempt. Sold within six months, they are taxed at the ordinary progressive rates, up to 42.80% or 43.60%.", why: "Each purchase starts its own six-month clock. Selling units bought recently can make that part of the gain taxable, so sell older units first where your broker allows it.", sources: [LU_GAINS] },
      { title: "Small gains are not taxed", body: "Capital gains realised during a calendar year in an amount below €500 are not taxable.", why: "Below the threshold you have nothing to declare. Above it, the whole gain becomes taxable, not just the part above €500.", sources: [LU_GAINS] },
      { title: "Losses offset gains of the same year only", body: "Capital losses can be set against capital gains, but not against other income, and they cannot be carried forward to later years.", why: "A loss realised in a year without taxable gains is lost for tax purposes.", sources: [LU_GAINS] },
    ],
    wrappers: [
      { name: "Securities account", body: "Gains follow the six-month rule above. Fund payouts are declared as investment income.", sources: [LU_GAINS], holding: { years: 0, effect: "Each purchase becomes exempt six months after it was made." } },
    ],
    compare: [
      { fact: "Income treatment", matters: "An accumulating fund pays out nothing to declare each year; gains after six months stay exempt." },
      { fact: "Fund domicile", matters: "Luxembourg-domiciled funds are common and pay no withholding tax to their investors." },
    ],
    open: ["How the six-month rule applies to fund units and ETFs: the official page speaks of shares and other securities, so confirm with the ACD.", "Budget bill 8800, which would raise the period from six to twelve months from 2027, if passed.", "Tax on fund payouts, and the subscription tax paid inside funds."],
  },
  {
    code: "NL", slug: "netherlands", name: "Netherlands", adjective: "Dutch", authority: "Belastingdienst", readOn: "2026-11-22",
    summary: "ETFs fall in box 3: you are taxed on an assumed return on your investments above a tax-free amount, whether you sell or not. Selling, the holding period and accumulating or distributing make no difference to that tax.",
    rules: [
      { title: "Box 3 taxes an assumed return, not your gains", body: "For 2026, investments count at an assumed return of 6% a year. The rate on that return is 36%.", why: "There is no holding period to wait for and no tax event when you sell: the tax depends on what you own, not on when you sell it.", sources: [NL_BOX3, NL_RATE] },
      { title: "A tax-free amount per person", body: "The tax-free amount in box 3 is €59,357 in 2026, or €118,714 for tax partners.", why: "Below that amount of net savings and investments you pay no box 3 tax at all.", sources: [NL_ALLOWANCE] },
      { title: "A lower actual return can be claimed", body: "If your actual return turns out lower than the assumed return, your box 3 income is adjusted to the actual return in your tax return.", why: "In a bad year for markets, keep the figures to claim the lower actual return.", sources: [NL_BOX3] },
    ],
    wrappers: [
      { name: "Securities account", body: "Everything held counts in box 3 at the assumed return.", sources: [NL_BOX3], holding: { years: 0, effect: "No holding period: the tax is the same whenever you sell." } },
    ],
    compare: [
      { fact: "Income treatment", matters: "Matters little in box 3, since the tax is on the assumed return." },
      { fact: "Fund domicile", matters: "It decides how dividends are taxed inside the fund before they reach it." },
    ],
    open: ["The planned switch to taxing actual returns in box 3, which changes these rules once it takes effect.", "Dividend tax withheld by Dutch funds and how it is credited.", "The provisional assessment uses assumed returns: the final figures come with your tax return."],
  },
];
