/**
 * Les 9 Ascendances des Marques, p. 118.
 *
 * `arcanumChoices` renvoie à des **slugs** de `arcanums.mjs`, jamais à des UUID — même convention
 * que `arcanums`/`equipments` sur `carrieres.mjs` : c'est le générateur qui résout, ce qui permet à
 * la macro de viser les compendiums d'un monde plutôt que ceux du système. Naissance et Spontanée
 * n'en portent aucun : la première octroie un bonus de caractéristique (non modélisé, décrit dans
 * `description`), la seconde n'octroie rien.
 */
export const ASCENDANCES = [
  {
    slug: "mue",
    name: "Apposée par Mue",
    description: [
      "Mue qu'on connaît principalement pour avoir créé les orques est la maîtresse des métamorphoses. On dit d'elle qu'elle collecte les savoirs interdits depuis les siècles et aurait à plusieurs reprises accepté d'aider toutes sortes d'individus pour accéder à des secrets inavouables.",
    ],
    arcanumChoices: ["magice", "alkemia", "prophetiae", "iter"],
    compulsion: "Omniscience",
    compulsionDesc:
      "« Le savoir, c'est le pouvoir. » Tel est le désir insatiable d'engranger des connaissances de toutes sortes qui vous anime. Pour certains, ce sera une vie consacrée à la collecte de savoirs ésotériques. Pour d'autres, il s'agira d'accumuler par tout moyen du pouvoir sur autrui.",
  },
  {
    slug: "perce-ame",
    name: "Apposée par Perce-âme",
    description: [
      "Perce-âme aurait sondé tant d'esprits, volé tant d'âmes, que sa propre personnalité serait enfouie au milieu de centaines d'autres. Son comportement semble n'avoir aucun sens, aucune forme de continuité.",
    ],
    arcanumChoices: ["acuitus", "inspex", "nebula", "mandatum"],
    compulsion: "Duplicité",
    compulsionDesc:
      "Le mensonge, la conspiration et la trahison sont vos passe-temps quotidiens. La duplicité se traduit selon les personnalités par une forte tendance à la mythomanie ou un amour immodéré des complots obscurs et entrelacés.",
  },
  {
    slug: "souffreteux",
    name: "Apposée par Souffreteux",
    description: [
      "Souffreteux est à peine l'ombre de ce qu'il devait être à l'apogée de sa puissance. Profondément affaibli par de puissantes magies incontrôlées, il n'a de cesse que de prolonger à tout prix sa pitoyable existence. Souffreteux a créé et contrôlé de gigantesques hordes de morts-vivants tout au long de la Guerre d'oppression.",
    ],
    arcanumChoices: ["rejuvnum", "mortem", "medicatus", "induratus"],
    compulsion: "Obsession morbide",
    compulsionDesc:
      "Vous êtes obnubilé par la vie, la mort et les maladies. Peut-être en avez-vous peur et avez-vous développé une forme d'hypocondrie, à moins que vous ne cherchiez sans cesse à approfondir vos connaissances du corps humain ? Il n'est pas rare non plus que les individus marqués par Souffreteux soient d'une façon ou d'une autre rongés par le désir d'immortalité...",
  },
  {
    slug: "guingois",
    name: "Apposée par Guingois",
    description: [
      "Le véritable visage de Guingois est inconnu et pour cause : il apparaît chaque jour sous une nouvelle forme. Grand maître des illusions, l'Oblitéré se présente toujours sous les traits d'une exquise beauté. Ses talents sont nombreux et c'est le plus grand stratège parmi les Oblitérés.",
    ],
    arcanumChoices: ["devito", "stratagema", "parmae", "subjugatio"],
    compulsion: "Vanité",
    compulsionDesc:
      "Imbu de votre personne, votre orgueil est démesuré. Vous aimez le paraître et avez tendance à vous montrer égocentrique et à vous vanter. Ceci peut fréquemment vous amener à rabaisser les autres, voire les humilier. Il n'est pas rare que votre fierté soit déplacée et dangereuse.",
  },
  {
    slug: "agite",
    name: "Apposée par Agité",
    description: [
      "Excentrique et faste, Agité n'en est pas moins un formidable combattant et un duelliste hors pair. Sa magie lui permet d'altérer le hasard et les fils de la destinée. Après avoir conquis le pays de Tuhée, il en a méthodiquement pillé les richesses et ressources.",
    ],
    arcanumChoices: ["delere", "dextem", "devito", "prophetiae"],
    compulsion: "Cupidité",
    compulsionDesc:
      "Vous convoitez les richesses, aimez les biens matériels et ne pensez la plupart du temps qu'à l'argent. Ceci peut faire de vous un kleptomane ou un détrousseur sans foi ni loi. Certains deviennent avares à l'excès. D'autres, encore, en arrivent à concevoir un désir incontrôlable pour une chose inaccessible.",
  },
  {
    slug: "marionnette",
    name: "Apposée par Marionnette",
    description: [
      "Son visage toujours dissimulé sous un masque de velours, Marionnette (qu'on dit muette) excelle au contrôle mental d'autrui. Sous le joug de son esprit, les volontés se brisent et ses serviteurs rivalisent d'ingéniosité pour s'attirer ses faveurs. Marionnette serait actuellement en Escannie, au service du roi Abdulah IV.",
    ],
    arcanumChoices: ["impero", "subjugatio", "fulmen", "dextem"],
    compulsion: "Luxure",
    compulsionDesc:
      "Vous êtes l'hôte de puissants désirs refoulés et immoraux. Les plaisirs de toutes sortes vous attirent. Ces débauches peuvent concerner aussi bien les choses du sexe que les goinfreries de toutes sortes. Des addictions diverses et variées (drogues, alcools, etc.) sont également fréquentes.",
  },
  {
    slug: "harpie",
    name: "Apposée par Harpie",
    description: [
      "Harpie, maîtresse de la magie du feu, est tout aussi féroce qu'implacable. Son courroux semble infini. La ruine et la destruction suivent partout où son chemin la mène. Selon les rumeurs, elle se taillerait actuellement un royaume dans les Terres vierges.",
    ],
    arcanumChoices: ["delere", "obsidio", "vehementer", "induratus"],
    compulsion: "Fureur",
    compulsionDesc:
      "Que vous soyez d'un naturel calme ou tumultueux, une terrible colère couve en vous et ne demande qu'à exploser de manière destructrice. Et lorsque cela arrive, vous perdez généralement toute forme de contrôle et provoquez de terribles dégâts.",
  },
  {
    slug: "naissance",
    name: "Naissance",
    description: [
      "Vous êtes né avec la Marque. Horrifiés, la plupart des parents se débarrassent de leur rejeton. Votre vie a été dès le début marquée par le destin.",
      "<strong>Bonus :</strong> +1 dans la caractéristique la plus faible du personnage (en cas d'égalité, le joueur choisit laquelle est augmentée). Ce bonus n'est pas modélisé par cet objet : appliquez-le à la main sur la fiche.",
    ],
    arcanumChoices: [],
    compulsion: "Au choix",
    compulsionDesc: "Définissez une compulsion avec le Meneur de jeu, d'une ampleur similaire à celles que procurent les Oblitérés.",
  },
  {
    slug: "spontanee",
    name: "Spontanée",
    description: [
      "La Marque est apparue au cours de votre vie, du jour au lendemain, sans explication. On ne sait quelle signification donner à cet étrange (et rarissime) événement et les théories vont bon train.",
    ],
    arcanumChoices: [],
    compulsion: "",
    compulsionDesc: "",
  },
]
