import { GLOSSARY, LESSONS, PATHS, type Lesson } from "./content";

/**
 * The lessons in French. Each entry mirrors its English lesson position by position: same sections,
 * same paragraphs, same quiz questions and options. A test checks that the shapes match.
 */
type LessonText = {
  title: string;
  summary: string;
  sections: { heading: string; paragraphs: string[] }[];
  tryIt?: string;
  quiz: { question: string; options: string[]; why: string }[];
};

export const LESSONS_FR: Record<string, LessonText> = {
  "what-is-an-etf": {
    title: "Qu'est-ce qu'un ETF ?",
    summary: "Un fonds qui se négocie en bourse comme une action et qui, le plus souvent, suit un indice.",
    sections: [
      { heading: "En bref", paragraphs: [
        "Un ETF, ou fonds coté en bourse, réunit l'argent de nombreux investisseurs pour acheter un panier d'actifs. Une part du fonds vous donne une petite fraction de tout le panier : un seul achat peut ainsi répartir votre argent sur des centaines ou des milliers de sociétés.",
        "La plupart des ETF sont passifs : au lieu qu'un gérant choisisse les investissements, le fonds suit les règles d'un indice comme le MSCI World. Certains sont gérés activement.",
      ] },
      { heading: "ETF, fonds classique ou action ?", paragraphs: [
        "Un fonds classique est aussi un panier commun, mais vous l'achetez et le vendez en général directement auprès du fonds, à un prix fixé une fois par jour. Un ETF se négocie en bourse pendant les heures de marché, par l'intermédiaire d'un courtier.",
        "Une action, c'est une seule société. Si elle fait faillite, vous pouvez perdre tout ce que vous y avez mis. Un ETF répartit ce risque, mais il baisse quand même lorsque l'ensemble de son marché baisse.",
      ] },
      { heading: "Comment le nombre de parts s'ajuste", paragraphs: [
        "De grands intervenants de marché peuvent créer de nouvelles parts d'ETF ou en faire racheter par le fonds. Quand la demande augmente, de nouvelles parts sont créées. Ce mécanisme aide à maintenir le prix de marché proche de la valeur de ce que détient le fonds.",
      ] },
    ],
    tryIt: "Voir combien d'ETF suivent le S&P 500",
    quiz: [
      { question: "Que représente une part d'ETF ?", options: ["Une société", "Une fraction du panier du fonds", "Un prêt à l'émetteur"], why: "Le fonds détient les actifs, et chaque part est un droit proportionnel sur le fonds." },
      { question: "Un ETF peut-il perdre de la valeur ?", options: ["Non, la diversification empêche les pertes", "Oui, quand ce qu'il détient baisse", "Seulement si l'émetteur fait faillite"], why: "La diversification réduit le risque lié à une société, pas le risque de l'ensemble du marché." },
    ],
  },
  "nav-and-market-price": {
    title: "Valeur liquidative et prix de marché",
    summary: "Pourquoi un ETF a deux prix, et pourquoi l'écart entre les deux compte.",
    sections: [
      { heading: "Deux chiffres différents", paragraphs: [
        "La valeur liquidative, ou VL (NAV en anglais), est la valeur de tout ce que possède le fonds, moins ses dettes, divisée par le nombre de parts. Elle est en général calculée une fois par jour.",
        "Le prix de marché est celui sur lequel acheteurs et vendeurs s'accordent en bourse à un instant donné. C'est ce que vous payez réellement.",
      ] },
      { heading: "Primes et décotes", paragraphs: [
        "Quand le prix de marché est au-dessus de la VL, l'ETF se négocie avec une prime. En dessous, avec une décote. Pour les fonds liquides, l'écart est en général faible, mais il peut se creuser quand les marchés sont sous tension, ou quand les marchés sous-jacents sont fermés alors que l'ETF continue de se négocier.",
      ] },
      { heading: "Pourquoi ce site affiche la VL", paragraphs: [
        "Les performances en VL, revenus réinvestis, montrent comment le fonds lui-même s'est comporté : c'est ce qu'il faut pour comparer des fonds. Le prix de marché vous dit ce que coûte une transaction aujourd'hui.",
      ] },
    ],
    quiz: [
      { question: "La VL d'un ETF est de 100 et il se négocie à 100,50. Comment appelle-t-on cela ?", options: ["Une prime", "Une décote", "Un dividende"], why: "Un prix au-dessus de la VL est une prime." },
      { question: "Lequel est en général calculé une fois par jour ?", options: ["Le prix de marché", "La VL", "La fourchette achat-vente"], why: "La VL est en général arrêtée chaque jour, alors que le prix de marché varie tout au long de la séance." },
    ],
  },
  "what-is-an-index": {
    title: "Qu'est-ce qu'un indice ?",
    summary: "Le règlement qui décide de ce que possède un ETF passif.",
    sections: [
      { heading: "Une liste avec des règles", paragraphs: [
        "Un indice est une liste de titres établie selon des règles et publiée par un fournisseur comme MSCI, S&P, FTSE Russell ou STOXX. On ne peut pas acheter un indice directement. On achète un fonds qui le suit.",
        "Le choix de l'indice est votre décision la plus importante, car il détermine ce que vous possédez. Deux fonds sur le même indice devraient se comporter de la même façon, alors que deux indices mondiaux peuvent différer.",
      ] },
      { heading: "Des noms proches, des contenus différents", paragraphs: [
        "Le MSCI World ne couvre que les marchés développés. Le MSCI ACWI et le FTSE All-World incluent aussi les marchés émergents. La plupart des grands indices pondèrent les sociétés selon leur valeur en bourse : les plus grandes ont donc le plus d'influence.",
      ] },
    ],
    tryIt: "Parcourir la base des indices",
    quiz: [
      { question: "Le MSCI World inclut-il les marchés émergents ?", options: ["Oui", "Non"], why: "Le MSCI World couvre les marchés développés. Le MSCI ACWI y ajoute les marchés émergents." },
      { question: "Dans un indice pondéré par la valeur en bourse, quelles sociétés pèsent le plus ?", options: ["Les plus grandes", "Les plus anciennes", "Toutes autant"], why: "Le poids suit la taille de la société." },
    ],
  },
  "isin-ticker-listing": {
    title: "ISIN, ticker et cotation",
    summary: "Comment être certain d'acheter le fonds que vous avez étudié.",
    sections: [
      { heading: "Les identifiants", paragraphs: [
        "Un ISIN est un code de 12 caractères qui identifie une classe de parts d'un fonds. Un ticker est un code court utilisé sur une bourse. La même classe de parts peut avoir des tickers différents selon les bourses : l'iShares Core S&P 500 s'appelle CSPX à Londres et SXR8 sur Xetra, avec un seul ISIN.",
      ] },
      { heading: "Fonds, classe de parts, cotation", paragraphs: [
        "Un fonds, c'est le portefeuille. Une classe de parts en est une version, par exemple capitalisante ou distribuante, ou dans une autre devise. Une cotation est l'endroit où cette classe se négocie. Au moment de passer un ordre, vérifiez d'abord l'ISIN, puis choisissez la bourse et la devise de négociation.",
      ] },
    ],
    tryIt: "Chercher SXR8 et voir où il se négocie",
    quiz: [
      { question: "Quel code identifie une classe de parts quelle que soit la bourse ?", options: ["Le ticker", "L'ISIN"], why: "L'ISIN reste le même, alors que les tickers varient selon la bourse." },
      { question: "Deux cotations d'une même classe de parts sont-elles deux ETF différents ?", options: ["Oui", "Non"], why: "C'est la même classe de parts, négociée à des endroits différents." },
    ],
  },
  "fees-ter-ocf": {
    title: "Frais : TER, OCF et ce qu'ils n'incluent pas",
    summary: "Les frais publiés comptent, mais ils ne représentent pas tout le coût.",
    sections: [
      { heading: "Ce que signifient ces chiffres", paragraphs: [
        "Le total des frais sur encours, TER, et les frais courants, OCF, expriment tous deux les frais de fonctionnement annuels d'un fonds en pourcentage de ses actifs. Ils sont prélevés à l'intérieur du fonds : vous ne recevez jamais de facture. Ils ne sont pas toujours calculés de la même façon, c'est pourquoi ce site précise lequel est affiché.",
      ] },
      { heading: "Ce qu'ils n'incluent pas", paragraphs: [
        "Aucun des deux n'inclut normalement les frais de transaction propres au fonds. Vous payez aussi la fourchette achat-vente et l'éventuelle commission du courtier quand vous achetez et vendez. Et les revenus du prêt de titres peuvent compenser une partie du coût.",
      ] },
      { heading: "Les petits frais se cumulent", paragraphs: [
        "Les frais sont prélevés chaque année sur un montant qui grandit : l'écart entre deux niveaux de frais se creuse donc avec le temps. Utilisez le calculateur de frais pour le voir avec vos propres chiffres.",
      ] },
    ],
    tryIt: "Ouvrir le calculateur de frais",
    quiz: [
      { question: "Comment le TER est-il payé ?", options: ["Par une facture annuelle", "À l'intérieur du fonds", "À votre courtier"], why: "Il est déduit des actifs du fonds, et vous ne le voyez qu'à travers une performance plus faible." },
      { question: "Le TER inclut-il normalement la fourchette achat-vente que vous payez ?", options: ["Oui", "Non"], why: "La fourchette est un coût de transaction que vous payez à l'achat et à la vente." },
    ],
  },
  "tracking-difference": {
    title: "Écart de performance et erreur de suivi",
    summary: "Avec quelle fidélité un fonds restitue réellement son indice, ce qui compte plus que les frais seuls.",
    sections: [
      { heading: "Deux mesures", paragraphs: [
        "L'écart de performance (tracking difference) est la performance du fonds moins celle de l'indice sur une période. Il vous dit combien vous avez gagné ou perdu par rapport à l'indice. L'erreur de suivi (tracking error) mesure à quel point cet écart varie dans le temps : elle renseigne sur la régularité.",
      ] },
      { heading: "Pourquoi les frais les plus bas ne sont pas toujours le meilleur choix", paragraphs: [
        "Les frais tirent un fonds sous son indice, tandis que les revenus du prêt de titres et le traitement fiscal peuvent le faire remonter. Un fonds aux frais plus élevés peut donc mieux suivre son indice qu'un fonds moins cher. Comparez l'écart sur plusieurs années, pas sur une seule.",
      ] },
    ],
    quiz: [
      { question: "Un fonds a rapporté 9,8 % et son indice 10,0 %. Quel est l'écart de performance ?", options: ["-0,2 %", "+0,2 %", "9,8 %"], why: "Performance du fonds moins performance de l'indice." },
      { question: "Que décrit l'erreur de suivi ?", options: ["L'écart moyen", "La variation de l'écart", "Les frais"], why: "Elle mesure la variabilité, pas l'ampleur du retard moyen." },
    ],
  },
  replication: {
    title: "Réplication physique et synthétique",
    summary: "Comment un fonds obtient son exposition, et quels risques accompagnent chaque méthode.",
    sections: [
      { heading: "Physique", paragraphs: [
        "Un ETF physique achète les titres. La réplication complète achète tout ce que contient l'indice. L'échantillonnage en achète une partie représentative, ce qui est courant pour les indices comptant des milliers de titres.",
      ] },
      { heading: "Synthétique", paragraphs: [
        "Un ETF synthétique détient d'autres actifs et utilise un swap, par lequel une banque s'engage à verser la performance de l'indice. Cela peut convenir à des marchés difficiles d'accès ou coûteux à détenir. Cela ajoute un risque de contrepartie, que les règles UCITS limitent et que les fonds gèrent au moyen de garanties.",
      ] },
      { heading: "Aucune n'est meilleure par principe", paragraphs: [
        "Comparez les coûts, le suivi de l'indice et les risques fonds par fonds. Les fonds physiques peuvent aussi prêter leurs titres, ce qui crée un risque de contrepartie propre, plus faible.",
      ] },
    ],
    tryIt: "Comparer des ETF S&P 500 physiques et synthétiques",
    quiz: [
      { question: "Quel risque supplémentaire un swap ajoute-t-il ?", options: ["Un risque de contrepartie", "Aucun risque", "Uniquement un risque de change"], why: "La banque de l'autre côté du swap doit payer." },
      { question: "Que signifie l'échantillonnage ?", options: ["Acheter chaque titre de l'indice", "Acheter une partie représentative", "Utiliser un swap"], why: "Il vise à reproduire l'indice sans tout détenir." },
    ],
  },
  "accumulating-distributing": {
    title: "Capitalisant ou distribuant",
    summary: "Ce que le fonds fait des dividendes, et ce que cela change pour vous.",
    sections: [
      { heading: "La différence", paragraphs: [
        "Une classe de parts distribuante vous verse les revenus en espèces. Une classe capitalisante les réinvestit dans le fonds : vous ne recevez rien en espèces, mais le prix de la part reflète ces revenus. Le portefeuille sous-jacent peut être le même.",
      ] },
      { heading: "Comment choisir", paragraphs: [
        "Si vous voulez un revenu régulier, une classe distribuante le fait automatiquement. Si vous constituez un patrimoine, une classe capitalisante vous évite les petits coûts et l'effort de réinvestir vous-même. Le traitement fiscal diffère selon les pays et peut trancher la question : vérifiez les règles de votre pays de résidence.",
      ] },
    ],
    tryIt: "Comparer les deux classes d'un même fonds",
    quiz: [
      { question: "Les dividendes d'un fonds capitalisant sont :", options: ["Versés en espèces", "Réinvestis dans le fonds", "Conservés par l'émetteur"], why: "Ils restent dans le fonds et augmentent la valeur de chaque part." },
      { question: "Un fonds capitalisant est-il toujours plus avantageux fiscalement ?", options: ["Oui, partout", "Non, cela dépend de votre pays"], why: "Certains pays imposent aussi les revenus capitalisés." },
    ],
  },
  "currency-and-hedging": {
    title: "Risque de change et couverture",
    summary: "La devise de négociation d'un fonds n'est pas votre risque de change.",
    sections: [
      { heading: "L'erreur fréquente", paragraphs: [
        "Acheter un ETF monde en euros ne supprime pas le risque lié au dollar. Votre risque vient des devises de ce que détient le fonds. Si les actions américaines pèsent lourd dans le fonds et que le dollar baisse face à l'euro, votre performance en euros baisse aussi, quelle que soit la cotation achetée.",
      ] },
      { heading: "Les classes de parts couvertes", paragraphs: [
        "Une classe couverte utilise des contrats de change pour réduire ces variations. Elle a en général des frais plus élevés et des coûts propres, qui dépendent en partie de l'écart de taux d'intérêt entre les devises. La couverture est courante pour les obligations, où les mouvements de change peuvent dépasser le rendement.",
      ] },
    ],
    tryIt: "Ouvrir le calculateur de change",
    quiz: [
      { question: "Vous achetez un ETF d'actions américaines en euros sur Xetra. Êtes-vous exposé au dollar ?", options: ["Non, j'ai payé en euros", "Oui, à travers les titres détenus"], why: "La devise de négociation ne change pas ce que possède le fonds." },
      { question: "Fonds +10 %, devise -5 %. Quelle est à peu près votre performance ?", options: ["+15 %", "+4,5 %", "+10 %"], why: "1,10 × 0,95 = 1,045." },
    ],
  },
  "domicile-and-ucits": {
    title: "Domicile du fonds, UCITS et DIC",
    summary: "Où un fonds est établi, ce que signifie UCITS, et ce qu'il faut lire avant d'investir.",
    sections: [
      { heading: "Le domicile", paragraphs: [
        "Le domicile d'un fonds est le pays où il est juridiquement établi. Beaucoup d'ETF européens sont établis en Irlande ou au Luxembourg. Le domicile peut influer sur la retenue à la source appliquée aux dividendes que reçoit le fonds, car les conventions fiscales diffèrent, mais aucun domicile n'est le meilleur pour tout le monde.",
      ] },
      { heading: "UCITS", paragraphs: [
        "UCITS (OPCVM en français) est le cadre européen des fonds vendus au public. Il fixe des règles de diversification, d'actifs autorisés, de conservation indépendante des actifs et d'information. Il réduit certains risques, mais ne vous protège pas des pertes de marché.",
      ] },
      { heading: "Le DIC", paragraphs: [
        "Selon la réglementation PRIIPs, les produits vendus aux particuliers dans l'Union européenne doivent fournir un document d'informations clés (DIC, ou KID en anglais), qui présente risques et coûts dans un format standard. Lisez-le avant d'investir. Beaucoup d'ETF domiciliés aux États-Unis n'en proposent pas, ce qui en limite souvent l'accès pour les particuliers européens.",
      ] },
    ],
    tryIt: "Filtrer les ETF par domicile",
    quiz: [
      { question: "UCITS vous protège-t-il des pertes de marché ?", options: ["Oui", "Non"], why: "Il encadre la structure du fonds et son information, pas l'évolution des marchés." },
      { question: "Quel document donne une information standard sur les risques et les coûts ?", options: ["Le DIC", "Le ticker", "L'ISIN"], why: "Le document d'informations clés existe précisément pour cela." },
    ],
  },
  "bond-etfs": {
    title: "Comprendre les ETF obligataires",
    summary: "Duration, qualité de crédit et rendement, en termes simples.",
    sections: [
      { heading: "La duration", paragraphs: [
        "La duration estime la sensibilité d'un fonds obligataire aux taux d'intérêt. En première approximation, une duration de 6 signifie que le prix du fonds baisse d'environ 6 % si les taux montent d'un point de pourcentage, et monte d'environ 6 % s'ils baissent d'un point.",
      ] },
      { heading: "La qualité de crédit", paragraphs: [
        "Les obligations « investment grade » sont émises par des emprunteurs jugés moins risqués. Les obligations à haut rendement rapportent davantage parce que le risque de défaut est plus élevé, et elles ont tendance à se comporter davantage comme des actions en période de crise.",
      ] },
      { heading: "Le rendement à l'échéance", paragraphs: [
        "Il estime ce que rapporterait la détention des obligations du fonds jusqu'à leur échéance, sans aucun défaut et avant frais. Contrairement à une obligation, la plupart des ETF obligataires n'arrivent jamais à échéance, car ils remplacent sans cesse leurs obligations pour rester dans leur indice.",
      ] },
    ],
    tryIt: "Voir la duration et le rendement d'un ETF obligataire",
    quiz: [
      { question: "Un fonds a une duration de 5 et les taux montent d'un point. Son prix varie d'environ :", options: ["+5 %", "-5 %", "-1 %"], why: "Les prix baissent quand les taux montent, à peu près de la duration." },
      { question: "Pourquoi le haut rendement rapporte-t-il davantage ?", options: ["Un risque de défaut plus élevé", "Des frais plus bas", "Il est garanti"], why: "Le supplément de rendement rémunère le supplément de risque." },
    ],
  },
  "diversification-and-risk": {
    title: "Diversification, baisses et rééquilibrage",
    summary: "Comment penser le risque à l'échelle d'un portefeuille d'ETF.",
    sections: [
      { heading: "Vérifiez ce que vous possédez vraiment", paragraphs: [
        "Détenir plusieurs ETF ne garantit pas la diversification. Un ETF monde et un ETF S&P 500 se recoupent largement, car les sociétés américaines représentent une grande part des indices mondiaux. La pondération par la valeur en bourse peut aussi concentrer un fonds sur quelques grandes sociétés.",
      ] },
      { heading: "Les mesures du risque", paragraphs: [
        "La volatilité mesure l'ampleur des variations de performance. La perte maximale (drawdown) est la plus forte baisse entre un sommet et un creux. Le ratio de Sharpe compare la performance au-dessus d'un taux peu risqué à la volatilité. Toutes regardent le passé et ne peuvent pas prédire l'avenir.",
      ] },
      { heading: "Le rééquilibrage", paragraphs: [
        "Avec le temps, les placements gagnants prennent plus de place dans un portefeuille, ce qui en change le risque. Rééquilibrer le ramène à votre répartition cible. Les coûts et la fiscalité comptent : beaucoup d'investisseurs orientent donc leurs nouveaux versements vers ce qui est sous-pondéré.",
      ] },
    ],
    quiz: [
      { question: "Un ETF monde et un ETF S&P 500 se recoupent-ils ?", options: ["Non", "Oui, largement"], why: "Les sociétés américaines représentent une grande part des indices mondiaux." },
      { question: "Un fonds passe de 100 à 70, puis remonte à 90. Quelle est la perte maximale ?", options: ["-10 %", "-30 %", "-20 %"], why: "Elle se mesure du sommet au creux : de 100 à 70." },
    ],
  },
  "reading-an-etf-page": {
    title: "Lire la fiche d'un ETF : les indicateurs qui comptent",
    summary: "Frais, encours, suivi, réplication, domicile et revenus : ce que dit chaque chiffre et lesquels regarder d'abord.",
    sections: [
      { heading: "Commencez par trois chiffres", paragraphs: [
        "Les frais annuels (TER ou frais courants) sont ce que le fonds prélève chaque année sur votre argent, quoi que fasse le marché. Sur 10 000 €, des frais de 0,20 % coûtent 20 € par an. Comparez-les à ceux des fonds sur le même indice, pas sur un autre.",
        "L'encours, ou actifs sous gestion, indique combien d'argent le fonds détient. Les gros fonds se négocient en général avec des écarts plus serrés et risquent moins d'être fermés. En dessous d'environ 100 millions d'euros, vérifiez que le fonds ne rétrécit pas.",
        "L'écart de suivi (tracking difference) mesure la distance entre le rendement du fonds et celui de son indice sur un an, frais compris. C'est le coût que vous avez réellement payé, qui peut être plus bas ou plus haut que les frais.",
      ] },
      { heading: "Puis la façon dont le fonds est construit", paragraphs: [
        "La réplication indique comment le fonds suit son indice : en détenant les actions (physique) ou par un swap avec une banque (synthétique). L'erreur de suivi (tracking error) mesure à quel point son rendement s'est écarté de l'indice au jour le jour : un chiffre bas signifie une copie régulière.",
        "Le domicile est le pays où le fonds est constitué, souvent l'Irlande ou le Luxembourg pour les ETF européens. Il décide de la fiscalité des dividendes avant qu'ils n'arrivent au fonds, et des investisseurs qui peuvent l'acheter.",
        "Le traitement des revenus indique si le fonds distribue ses revenus (distribuant) ou les réinvestit (capitalisant). Le bon choix dépend de la fiscalité de votre pays et de votre besoin de liquidités.",
      ] },
      { heading: "Lisez-les ensemble", paragraphs: [
        "Un fonds bon marché mais très petit, ou un gros fonds aux frais élevés, impliquent chacun un compromis. Le quadrant frais et taille de chaque indice place chaque fonds sur les deux à la fois : les fonds gros et bon marché ressortent.",
      ] },
    ],
    tryIt: "Voir les fonds S&P 500 par frais et par taille",
    quiz: [
      { question: "Quel chiffre est le coût réellement payé par rapport à l'indice ?", options: ["Le TER", "L'écart de suivi", "L'encours"], why: "L'écart de suivi inclut les frais et tout ce qui a fait que le fonds a suivi ou battu son indice." },
      { question: "Pourquoi l'encours compte-t-il ?", options: ["Les gros fonds rapportent toujours plus", "Les gros fonds se négocient avec des écarts plus serrés et ferment moins souvent", "Il fixe le dividende"], why: "La taille donne une idée de la liquidité et de la probabilité que le fonds reste ouvert." },
      { question: "Que change le domicile ?", options: ["L'indice", "La fiscalité des dividendes avant qu'ils n'arrivent au fonds", "Le cours"], why: "Les conventions fiscales dépendent du pays où le fonds est établi." },
    ],
  },
  "liquidity-and-spreads": {
    title: "Liquidité, écarts et moment pour passer ses ordres",
    summary: "Ce que vous payez pour acheter et vendre, au-delà des frais, et comment le réduire.",
    sections: [
      { heading: "L'écart est aussi un coût", paragraphs: [
        "En bourse, il y a deux prix : ce que proposent les acheteurs (bid) et ce que demandent les vendeurs (ask). La différence est l'écart (spread). Acheter au prix demandé puis revendre au prix offert vous coûte l'écart, une fois à l'entrée et une fois à la sortie.",
        "Pour les gros ETF sur les grands indices, l'écart est souvent de quelques centièmes de pour cent. Pour les fonds petits ou de niche, il peut atteindre plusieurs dixièmes.",
      ] },
      { heading: "Un ETF est aussi liquide que ce qu'il détient", paragraphs: [
        "Un faible volume en bourse ne veut pas dire qu'un fonds est difficile à négocier : les teneurs de marché peuvent créer et racheter des parts contre les titres sous-jacents. Ce qui compte le plus, c'est la facilité à négocier ce que le fonds détient, et sa taille.",
      ] },
      { heading: "Des habitudes qui réduisent les coûts", paragraphs: [
        "Passez vos ordres quand les marchés sous-jacents sont ouverts : un ETF européen sur des actions américaines se négocie avec des écarts plus serrés l'après-midi, quand New York est ouvert. Utilisez des ordres à cours limité plutôt qu'au marché, et évitez les premières et dernières minutes de la séance.",
      ] },
    ],
    quiz: [
      { question: "Vous achetez au prix demandé et vendez au prix offert. Combien cela a-t-il coûté ?", options: ["Rien", "L'écart", "Le TER"], why: "Chaque aller-retour traverse l'écart." },
      { question: "Quand un ETF européen sur des actions américaines a-t-il en général les écarts les plus serrés ?", options: ["À l'ouverture européenne", "Quand le marché américain est aussi ouvert", "La nuit"], why: "Les teneurs de marché peuvent alors fixer les prix et se couvrir avec les actions sous-jacentes en cotation." },
    ],
  },
  "tax-wrappers-and-holding": {
    title: "Enveloppes fiscales et durée de détention",
    summary: "PEA, assurance-vie, ISA, box 3 et les autres : pourquoi l'enveloppe peut compter davantage que le fonds.",
    sections: [
      { heading: "Le même ETF, une fiscalité différente", paragraphs: [
        "Beaucoup de pays proposent des enveloppes avantageuses pour l'épargne de long terme : le PEA et l'assurance-vie en France, le stocks and shares ISA au Royaume-Uni, le pilier 3a en Suisse. À l'intérieur, plus-values et revenus sont moins imposés, plus tard, ou pas du tout.",
        "En dehors de ces enveloppes, les règles habituelles s'appliquent : en France une flat tax sur les plus-values et les dividendes, en Allemagne un prélèvement forfaitaire avec une part des revenus des fonds actions exonérée, aux Pays-Bas un impôt annuel sur un rendement supposé.",
      ] },
      { heading: "Des horloges qui changent l'impôt", paragraphs: [
        "Certains avantages ne commencent qu'après une durée de détention. Un PEA exonère les plus-values d'impôt sur le revenu cinq ans après son ouverture, et l'assurance-vie devient plus légère après huit ans. Au Luxembourg, les plus-values sur titres vendus après six mois sont exonérées pour une petite participation. En Irlande, l'horloge joue dans l'autre sens : chaque période de huit ans de détention compte comme une vente pour l'impôt.",
        "Avant de vendre, vérifiez si une date est proche. Attendre quelques semaines peut changer l'impôt sur toute la plus-value.",
      ] },
      { heading: "Utilisez le site", paragraphs: [
        "Choisissez votre pays en haut de la page. Dans votre portefeuille, indiquez l'enveloppe et sa date d'ouverture : les points fiscaux montrent les dates qui vous concernent et, à peu près, ce que coûterait une vente aujourd'hui.",
      ] },
    ],
    tryIt: "Voir combien de temps détenir, pays par pays",
    quiz: [
      { question: "Quand un PEA exonère-t-il les plus-values d'impôt sur le revenu ?", options: ["Immédiatement", "Cinq ans après son ouverture", "Après huit ans"], why: "Les cinq ans courent à partir de l'ouverture du plan, pas de chaque achat." },
      { question: "Que se passe-t-il en Irlande après huit ans de détention d'un ETF européen ?", options: ["Les plus-values deviennent exonérées", "Cela compte comme une vente, et l'exit tax est due sur la plus-value", "Rien"], why: "C'est la règle de la cession présumée (deemed disposal)." },
    ],
  },
  "etf-tax-layers": {
    title: "Les niveaux de la fiscalité des ETF",
    summary: "Une carte des endroits où l'impôt peut s'appliquer. À visée pédagogique, sans taux ni conseil.",
    sections: [
      { heading: "L'impôt s'applique par niveaux", paragraphs: [
        "Demander quel impôt paie un ETF mélange plusieurs questions distinctes : les impôts à l'intérieur du fonds, la retenue à la source sur les dividendes qu'il reçoit, l'impôt que vous pouvez devoir sur les distributions, celui sur les revenus capitalisés, et celui dû à la vente.",
      ] },
      { heading: "Résidence et domicile sont deux choses différentes", paragraphs: [
        "Votre résidence fiscale est le pays où vous êtes imposé en tant qu'investisseur. Le domicile du fonds est le pays où le fonds est établi. Les deux peuvent compter, à des niveaux différents. L'endroit où vous vous trouvez physiquement ne détermine pas à lui seul votre résidence fiscale.",
      ] },
      { heading: "Et ensuite", paragraphs: [
        "Les règles diffèrent selon les pays et évoluent avec le temps. Consultez les indications de votre administration fiscale, et interrogez un conseiller qualifié sur votre situation. Ce site n'ajoute les règles d'un pays qu'après les avoir vérifiées auprès de sources officielles.",
      ] },
    ],
    quiz: [
      { question: "Existe-t-il un taux d'imposition unique pour un ETF ?", options: ["Oui", "Non, il y a plusieurs niveaux"], why: "Les impôts au niveau du fonds, la retenue à la source et l'impôt de l'investisseur sont distincts." },
      { question: "Le domicile du fonds est-il la même chose que votre résidence fiscale ?", options: ["Oui", "Non"], why: "L'un décrit le fonds, l'autre vous décrit, vous." },
    ],
  },
};

export const PATHS_FR: Record<string, { title: string; description: string }> = {
  "start-here": { title: "Le parcours complet", description: "Chaque indicateur et chaque mot dont vous avez besoin pour choisir vos ETF seul, dans l'ordre." },
  beginner: { title: "Débuter avec les ETF", description: "Comprendre ce que vous achetez." },
  investor: { title: "Investir en ETF", description: "Comparer les fonds sur ce qui compte vraiment." },
  analyst: { title: "Analyse avancée des ETF", description: "Lire les fonds obligataires et le risque d'un portefeuille." },
  portfolio: { title: "Construire un portefeuille d'ETF", description: "Passer d'un fonds à une répartition cohérente." },
  tax: { title: "Les bases de la fiscalité des ETF", description: "Apprendre quelles questions poser." },
};

/** Same order as the English glossary. The page sorts the French terms alphabetically. */
export const GLOSSARY_FR: [string, string][] = [
  ["Capitalisant", "Une classe de parts qui réinvestit les revenus dans le fonds au lieu de les verser."],
  ["Encours (AUM)", "Actifs sous gestion : la valeur totale de ce que détient un fonds."],
  ["Participant autorisé", "Une grande société qui peut créer des parts d'ETF et en faire racheter directement par le fonds."],
  ["Indice de référence", "L'indice qu'un fonds suit ou auquel il est comparé."],
  ["Fourchette achat-vente", "L'écart entre le prix le plus élevé proposé par les acheteurs et le prix le plus bas demandé par les vendeurs."],
  ["Risque de contrepartie", "Le risque que l'autre partie d'un contrat, par exemple un swap, ne paie pas."],
  ["Distribuant", "Une classe de parts qui verse les revenus aux investisseurs en espèces."],
  ["Domicile", "Le pays où un fonds est juridiquement établi."],
  ["Perte maximale (drawdown)", "Une baisse entre un sommet et un creux ultérieur."],
  ["Duration", "Une estimation de la sensibilité du prix d'un fonds obligataire aux taux d'intérêt."],
  ["ETC", "Exchange-traded commodity : un titre de créance qui suit une matière première, comme l'or physique. Ce n'est pas un fonds."],
  ["Couvert", "Une classe de parts qui utilise des contrats de change pour réduire les variations de change."],
  ["Indice", "Une liste de titres établie selon des règles, que suit un fonds passif."],
  ["ISIN", "Un code de 12 caractères qui identifie un titre, ici une classe de parts."],
  ["DIC (KID)", "Document d'informations clés : un résumé standard des risques et des coûts pour les produits vendus aux particuliers dans l'Union européenne."],
  ["Cotation", "Un endroit où une classe de parts se négocie, avec son propre ticker et sa devise de négociation."],
  ["VL (NAV)", "Valeur liquidative : les actifs d'un fonds moins ses dettes, par part."],
  ["OCF", "Frais courants : une mesure des frais de fonctionnement annuels d'un fonds."],
  ["Prime et décote", "L'écart entre le prix de marché et la valeur liquidative, au-dessus ou en dessous."],
  ["Réplication", "La façon dont un fonds obtient son exposition : physique ou synthétique."],
  ["Prêt de titres", "Le prêt de titres du fonds à d'autres établissements contre rémunération."],
  ["Classe de parts", "Une version d'un fonds, par exemple selon la devise ou le traitement des revenus."],
  ["Ratio de Sharpe", "La performance au-dessus d'un taux peu risqué, divisée par la volatilité."],
  ["Swap", "Un contrat par lequel une banque s'engage à verser une performance, par exemple celle d'un indice."],
  ["TER", "Total des frais sur encours : une mesure des frais annuels d'un fonds."],
  ["Ticker", "Un code de négociation court, propre à une bourse."],
  ["Écart de performance (tracking difference)", "La performance d'un fonds moins celle de son indice."],
  ["Erreur de suivi (tracking error)", "La variation de l'écart de performance dans le temps."],
  ["UCITS (OPCVM)", "Le cadre européen des fonds vendus au public."],
  ["Volatilité", "L'ampleur des variations de performance autour de leur moyenne."],
  ["Retenue à la source", "L'impôt prélevé à la source sur les dividendes ou les intérêts."],
  ["Rendement à l'échéance", "La performance estimée de la détention d'obligations jusqu'à leur échéance, sans défaut."],
];

type Lang = "en" | "fr";

/** A lesson in the reader's language. Falls back to English for anything not translated. */
export function localLesson(lesson: Lesson, lang: Lang): Lesson {
  const fr = lang === "fr" ? LESSONS_FR[lesson.slug] : undefined;
  if (!fr) return lesson;
  return {
    ...lesson,
    title: fr.title,
    summary: fr.summary,
    sections: lesson.sections.map((s, i) => fr.sections[i] ?? s),
    tryIt: lesson.tryIt ? { ...lesson.tryIt, label: fr.tryIt ?? lesson.tryIt.label } : undefined,
    quiz: lesson.quiz.map((q, i) => (fr.quiz[i] ? { ...q, ...fr.quiz[i] } : q)),
  };
}

export const localLessons = (lang: Lang) => LESSONS.map((l) => localLesson(l, lang));

export const localPaths = (lang: Lang) => PATHS.map((p) => (lang === "fr" && PATHS_FR[p.slug] ? { ...p, ...PATHS_FR[p.slug] } : p));

export const localGlossary = (lang: Lang): [string, string][] =>
  lang === "fr" ? [...GLOSSARY_FR].sort((a, b) => a[0].localeCompare(b[0], "fr")) : GLOSSARY;
