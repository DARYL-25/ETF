import type { Lang } from "@/lib/i18n";
import type { AssistantReply } from "./agent";

/** French for the fixed sentences the ranking produces. Each entry is the English pattern and its French form. */
const EXACT: Record<string, string> = {
  "No fee on file": "Frais inconnus",
  "No size on file": "Encours inconnu",
  "Small: below about €100m, which can raise closure risk": "Petit : moins de 100 M€ environ, ce qui peut augmenter le risque de fermeture",
  "Large enough to reduce closure risk": "Assez grand pour limiter le risque de fermeture",
  "UCITS": "UCITS",
  "Listed on SIX Swiss Exchange": "Coté à la SIX Swiss Exchange",
  "Hedged to a currency other than CHF": "Couvert dans une autre devise que le CHF",
  "Hedged to CHF": "Couvert en CHF",
  "Not marked UCITS: check that your broker can offer it to you": "Non signalé UCITS : vérifiez que votre courtier peut vous le proposer",
  "Accumulating": "Capitalisant",
  "Distributing": "Distribuant",
  "Synthetic: adds swap counterparty risk": "Synthétique : ajoute un risque de contrepartie sur le swap",
  "Follows the index you named": "Suit l'indice que vous avez nommé",
  "Asset class you named": "Classe d'actifs que vous avez nommée",
  "UCITS only": "UCITS uniquement",
  "Left out leveraged, inverse and option-income funds": "Fonds à effet de levier, inverses et à revenus d'options exclus",
  "UCITS only, because EU retail investors generally need a KID, which many US funds lack": "UCITS uniquement, car les particuliers de l'UE ont en général besoin d'un DIC, que beaucoup de fonds américains n'ont pas",
  "Accumulating, or income treatment unknown": "Capitalisant, ou traitement des revenus inconnu",
  "Distributing, or income treatment unknown": "Distribuant, ou traitement des revenus inconnu",
  "Currency hedged": "Couvert contre le change",
  "Not currency hedged": "Non couvert contre le change",
  "Synthetic": "Synthétique",
  "Not synthetic": "Non synthétique",
  "Figures are read automatically from issuers and official lists, and a person has not checked them yet.": "Les chiffres sont lus automatiquement chez les émetteurs et dans des listes officielles ; personne ne les a encore vérifiés.",
  "Tracking difference, which needs index data we do not hold. It can matter more than the fee.": "L'écart de performance face à l'indice, qui demande des données d'indice que nous n'avons pas. Il peut compter plus que les frais.",
  "Bid-ask spread and your broker's costs and availability.": "L'écart achat-vente, ainsi que les frais et la disponibilité chez votre courtier.",
  "SIX listing comes from issuer files we hold, so a fund can be listed there without us showing it. Check SIX directly before ruling a fund out.": "La cotation à la SIX vient des fichiers d'émetteurs dont nous disposons : un fonds peut y être coté sans que nous l'affichions. Vérifiez auprès de la SIX avant d'écarter un fonds.",
  "The link to an index is inferred from the name for most funds.": "Pour la plupart des fonds, le lien avec un indice est déduit du nom.",
  "The AI could not finish this question. The list below still comes from the database.": "L'IA n'a pas pu terminer cette question. La liste ci-dessous vient toujours de la base.",
};
const COUNTRY: Record<string, string> = { Switzerland: "la Suisse", France: "la France" };
const PATTERNS: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^Fee (\d+\.\d+)%(, lowest in this group)?$/, (m) => `Frais ${m[1].replace(".", ",")} %${m[2] ? ", les plus bas du groupe" : ""}`],
  [/^Labels: (.*)$/, (m) => `Étiquettes : ${m[1]}`],
  [/^Issuer: (.*)$/, (m) => `Émetteur : ${m[1]}`],
  [/^Name contains: (.*)$/, (m) => `Le nom contient : ${m[1]}`],
  [/^Tax is not scored in this ranking\. Our (\w+) notes quote the official rules, and no tax adviser has reviewed them yet\.$/, (m) => `La fiscalité n'entre pas dans ce classement. Nos notes sur ${COUNTRY[m[1]] ?? m[1]} citent les règles officielles ; aucun conseiller fiscal ne les a encore relues.`],
  [/^Tax for a resident of (.*): country rules are not verified here yet, so no tax advantage is counted in this ranking\. Check with your tax authority or an adviser\.$/, (m) => `Fiscalité pour un résident de ce pays (${m[1]}) : les règles ne sont pas encore vérifiées ici, aucun avantage fiscal n'entre donc dans ce classement. Renseignez-vous auprès de votre administration fiscale ou d'un conseiller.`],
  [/^AI explanations are not switched on yet, so this list comes from the search rules alone\. Found (\d+) ETFs matching your request, ranked below by fee, size and data available\.$/, (m) => `Les explications par IA ne sont pas encore activées : cette liste vient des seules règles de recherche. ${m[1]} ETF correspondent à votre demande, classés ci-dessous selon les frais, l'encours et les données disponibles.`],
  [/^AI explanations are not switched on yet, so this list comes from the search rules alone\. No ETF matched\. Try naming an index, a region or an asset class\.$/, () => "Les explications par IA ne sont pas encore activées : cette liste vient des seules règles de recherche. Aucun ETF ne correspond. Essayez de nommer un indice, une région ou une classe d'actifs."],
  [/^The AI explanation is unavailable right now \(status (\d+)\)\. The list below still comes from the database\.$/, (m) => `L'explication par IA est indisponible pour l'instant (statut ${m[1]}). La liste ci-dessous vient toujours de la base.`],
];

export function localizeText(text: string, lang: Lang): string {
  if (lang !== "fr") return text;
  if (text in EXACT) return EXACT[text];
  for (const [pattern, render] of PATTERNS) { const m = pattern.exec(text); if (m) return render(m); }
  return text;
}

/** The reply in the reader's language. Text written by the AI model is left as the model wrote it. */
export function localizeReply(reply: AssistantReply, lang: Lang): AssistantReply {
  if (lang !== "fr") return reply;
  const tr = (s: string) => localizeText(s, lang);
  return {
    ...reply,
    text: reply.aiUsed ? reply.text : tr(reply.text),
    applied: reply.applied.map(tr),
    notChecked: reply.notChecked.map(tr),
    etfs: reply.etfs.map((e) => ({ ...e, reasons: e.reasons.map(tr), cautions: e.cautions.map(tr) })),
  };
}
