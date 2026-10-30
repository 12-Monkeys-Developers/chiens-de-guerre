/**
 * Les trois caractéristiques. Chacune porte un maximum (8 à 12 à la création) et une réserve
 * courante qui se vide en cours de partie (effort, dépassement, surmenage).
 */
export const ABILITIES = {
  corps: {
    id: "corps",
    label: "CDG.abilities.long.corps",
  },
  vivacite: {
    id: "vivacite",
    label: "CDG.abilities.long.vivacite",
  },
  esprit: {
    id: "esprit",
    label: "CDG.abilities.long.esprit",
  },
}

/**
 * Les 31 compétences de la fiche, dans l'ordre des trois colonnes imprimées.
 *
 * Aucune caractéristique n'est associée : un test s'annonce « Caractéristique / Compétence » et le
 * couple est choisi au moment du jet (Corps/Blocage, Vivacité/Esquive, Esprit/Arcanum...).
 * `column` ne sert qu'à reproduire la mise en page de la fiche papier.
 */
export const SKILLS = {
  acrobatie: { id: "acrobatie", label: "CDG.skills.acrobatie", column: 1 },
  artsArtisanats: { id: "artsArtisanats", label: "CDG.skills.artsArtisanats", column: 1 },
  athletisme: { id: "athletisme", label: "CDG.skills.athletisme", column: 1 },
  autorite: { id: "autorite", label: "CDG.skills.autorite", column: 1 },
  baratin: { id: "baratin", label: "CDG.skills.baratin", column: 1 },
  blocage: { id: "blocage", label: "CDG.skills.blocage", column: 1 },
  commerce: { id: "commerce", label: "CDG.skills.commerce", column: 1 },
  discretion: { id: "discretion", label: "CDG.skills.discretion", column: 1 },
  eloquence: { id: "eloquence", label: "CDG.skills.eloquence", column: 1 },
  empathie: { id: "empathie", label: "CDG.skills.empathie", column: 1 },
  equitation: { id: "equitation", label: "CDG.skills.equitation", column: 1 },
  erudition: { id: "erudition", label: "CDG.skills.erudition", column: 1 },
  escamotage: { id: "escamotage", label: "CDG.skills.escamotage", column: 1 },
  esquive: { id: "esquive", label: "CDG.skills.esquive", column: 1 },
  etiquette: { id: "etiquette", label: "CDG.skills.etiquette", column: 1 },
  ingenierie: { id: "ingenierie", label: "CDG.skills.ingenierie", column: 1 },

  investigation: { id: "investigation", label: "CDG.skills.investigation", column: 2 },
  medecine: { id: "medecine", label: "CDG.skills.medecine", column: 2 },
  melee: { id: "melee", label: "CDG.skills.melee", column: 2 },
  portArmures: { id: "portArmures", label: "CDG.skills.portArmures", column: 2 },
  religionsLegendes: { id: "religionsLegendes", label: "CDG.skills.religionsLegendes", column: 2 },
  sciencesNaturelles: { id: "sciencesNaturelles", label: "CDG.skills.sciencesNaturelles", column: 2 },
  sensCombat: { id: "sensCombat", label: "CDG.skills.sensCombat", column: 2 },
  sensBatailles: { id: "sensBatailles", label: "CDG.skills.sensBatailles", column: 2 },
  sensDuels: { id: "sensDuels", label: "CDG.skills.sensDuels", column: 2 },
  survie: { id: "survie", label: "CDG.skills.survie", column: 2 },
  tactique: { id: "tactique", label: "CDG.skills.tactique", column: 2 },
  tir: { id: "tir", label: "CDG.skills.tir", column: 2 },
  vigilance: { id: "vigilance", label: "CDG.skills.vigilance", column: 2 },
  vigueur: { id: "vigueur", label: "CDG.skills.vigueur", column: 2 },
  volonte: { id: "volonte", label: "CDG.skills.volonte", column: 2 },
}
/** L'ordre des caractéristiques sur la fiche de PNJ, celui des encadrés du bestiaire. */
export const ADVERSARY_ABILITY_ORDER = Object.freeze(["corps", "esprit", "vivacite"])

/**
 * Les compétences de combat, affichées en tête de la fiche de PNJ avant toutes les autres.
 */
export const ADVERSARY_SKILLS = {
  blocage: { id: "blocage", label: "CDG.skills.blocage", column: 1 },
  esquive: { id: "esquive", label: "CDG.skills.esquive", column: 1 },
  melee: { id: "melee", label: "CDG.skills.melee", column: 1 },
  sensCombat: { id: "sensCombat", label: "CDG.skills.sensCombat", column: 2 },
  sensDuels: { id: "sensDuels", label: "CDG.skills.sensDuels", column: 2 },
  tir: { id: "tir", label: "CDG.skills.tir", column: 2 },
}

/**
 * Caractéristique proposée d'office pour les compétences dont les règles fixent le couple.
 *
 * Le couple caractéristique / compétence reste choisi au moment du jet, mais les règles de combat et
 * de bataille en imposent quelques-uns : Vivacité / Mêlée, Corps / Blocage, Esprit / Tactique...
 * La fenêtre de jet s'en sert comme simple présélection, que le joueur reste libre de changer.
 * Les compétences absentes de cette table n'ont pas de couple imposé.
 */
export const SKILL_DEFAULT_ABILITY = {
  blocage: "corps",
  melee: "vivacite",
  portArmures: "corps",
  sensBatailles: "esprit",
  sensCombat: "vivacite",
  sensDuels: "vivacite",
  tactique: "esprit",
  tir: "vivacite",
  esquive: "vivacite",
  vigueur: "corps",
  volonte: "esprit",
}

/**
 * Les 17 couples de traits de personnalité, dans l'ordre de la fiche.
 * Pour chaque couple, l'un des deux traits est dominant et noté de 1 à 3, l'autre est inhibé et
 * reste à 0. Il n'y a pas de score neutre.
 */
export const TRAIT_PAIRS = {
  blaseCurieux: { id: "blaseCurieux", vice: "CDG.traits.blase", virtue: "CDG.traits.curieux" },
  concupiscentChaste: { id: "concupiscentChaste", vice: "CDG.traits.concupiscent", virtue: "CDG.traits.chaste" },
  couardCourageux: { id: "couardCourageux", vice: "CDG.traits.couard", virtue: "CDG.traits.courageux" },
  desinvolteMeticuleux: { id: "desinvolteMeticuleux", vice: "CDG.traits.desinvolte", virtue: "CDG.traits.meticuleux" },
  dogmatiqueTolerant: { id: "dogmatiqueTolerant", vice: "CDG.traits.dogmatique", virtue: "CDG.traits.tolerant" },
  dynamiqueCalme: { id: "dynamiqueCalme", vice: "CDG.traits.dynamique", virtue: "CDG.traits.calme" },
  egocentriqueAltruiste: { id: "egocentriqueAltruiste", vice: "CDG.traits.egocentrique", virtue: "CDG.traits.altruiste" },
  excentriqueSobre: { id: "excentriqueSobre", vice: "CDG.traits.excentrique", virtue: "CDG.traits.sobre" },
  fierModeste: { id: "fierModeste", vice: "CDG.traits.fier", virtue: "CDG.traits.modeste" },
  grossierRaffine: { id: "grossierRaffine", vice: "CDG.traits.grossier", virtue: "CDG.traits.raffine" },
  impassibleSensible: { id: "impassibleSensible", vice: "CDG.traits.impassible", virtue: "CDG.traits.sensible" },
  impulsifReflechi: { id: "impulsifReflechi", vice: "CDG.traits.impulsif", virtue: "CDG.traits.reflechi" },
  mefiantNaif: { id: "mefiantNaif", vice: "CDG.traits.mefiant", virtue: "CDG.traits.naif" },
  renfermeExpansif: { id: "renfermeExpansif", vice: "CDG.traits.renferme", virtue: "CDG.traits.expansif" },
  tristeJoyeux: { id: "tristeJoyeux", vice: "CDG.traits.triste", virtue: "CDG.traits.joyeux" },
  trompeurLoyal: { id: "trompeurLoyal", vice: "CDG.traits.trompeur", virtue: "CDG.traits.loyal" },
  vindicatifPacifiste: { id: "vindicatifPacifiste", vice: "CDG.traits.vindicatif", virtue: "CDG.traits.pacifiste" },
}

/** Les deux côtés d'un couple de traits. */
export const TRAIT_SIDES = {
  vice: { id: "vice", label: "CDG.label.long.vice" },
  virtue: { id: "virtue", label: "CDG.label.long.virtue" },
}

/**
 * Allégeance déduite du karma (total des vertus moins total des vices).
 * L'ordre du tableau est celui de l'évaluation : la première tranche dont le maximum n'est pas
 * dépassé l'emporte.
 */
export const ALLEGIANCES = {
  obscurite: { id: "obscurite", label: "CDG.allegiance.obscurite", max: -3 },
  balance: { id: "balance", label: "CDG.allegiance.balance", max: 2 },
  lumiere: { id: "lumiere", label: "CDG.allegiance.lumiere", max: null },
}

/**
 * Grades de la compagnie, solde mensuelle en ducats, et prix en points de personnalisation pour
 * commencer la partie à ce grade.
 *
 * On entre dans la Compagnie comme duplicator ; la promotion au grade de sergent s'achète.
 * `creationCost` nul signifie que le grade n'est pas accessible à la création.
 */
export const GRADES = {
  duplicator: { id: "duplicator", label: "CDG.grades.duplicator", pay: 12, creationCost: 0 },
  sergent: { id: "sergent", label: "CDG.grades.sergent", pay: 18, creationCost: 5 },
  lieutenant: { id: "lieutenant", label: "CDG.grades.lieutenant", pay: 24, creationCost: null },
}

/** Langues du monde de jeu, dans l'ordre des deux colonnes de la fiche. */
export const LANGUAGES = {
  stygien: { id: "stygien", label: "CDG.languages.stygien" },
  tuheen: { id: "tuheen", label: "CDG.languages.tuheen" },
  escannien: { id: "escannien", label: "CDG.languages.escannien" },
  elfique: { id: "elfique", label: "CDG.languages.elfique" },
  lithelin: { id: "lithelin", label: "CDG.languages.lithelin" },
  aduatain: { id: "aduatain", label: "CDG.languages.aduatain" },
  tolenien: { id: "tolenien", label: "CDG.languages.tolenien" },
  darguanais: { id: "darguanais", label: "CDG.languages.darguanais" },
}

/**
 * Les trois gravités de blessure et le malus qu'elles infligent à tous les tests
 * (hors encaissement et stabilisation). Seule la blessure la plus grave cochée compte.
 * `order` sert à trouver cette blessure la plus grave.
 */
export const WOUND_LEVELS = {
  legere: { id: "legere", label: "CDG.wounds.legere", labelComp: "CDG.woundsComp.legere", malus: -1, order: 1 },
  grave: { id: "grave", label: "CDG.wounds.grave", labelComp: "CDG.woundsComp.grave", malus: -3, order: 2 },
  mortelle: { id: "mortelle", label: "CDG.wounds.mortelle", labelComp: "CDG.woundsComp.mortelle", malus: -6, order: 3 },
}

/** Les gravités de blessure de la plus légère à la plus grave : l'ordre du débordement et des soins. */
export const WOUND_LEVELS_ORDERED = Object.freeze(Object.values(WOUND_LEVELS).sort((a, b) => a.order - b.order))

/**
 * Nombre de cases de blessure par gravité, selon le rang dans la compétence Vigueur.
 *
 * Le personnage part de 1 case de chaque, auxquelles la Vigueur ajoute des cases légères et graves.
 */
export const WOUND_SLOTS_BY_VIGUEUR = {
  0: { legere: 1, grave: 1, mortelle: 1 },
  1: { legere: 2, grave: 1, mortelle: 1 },
  2: { legere: 2, grave: 2, mortelle: 1 },
  3: { legere: 3, grave: 2, mortelle: 1 },
}

/** Nombre maximum de points d'une réserve investis en effort avant un test. */
export const MAX_EFFORT = 3

/** Chaque point d'effort investi ajoute ce bonus au seuil de réussite. */
export const EFFORT_BONUS_PER_POINT = 3

/** Points regagnés dans chaque réserve à la fin d'une journée, selon le confort du repos. */
export const REST_CONDITIONS = {
  execrables: { id: "execrables", label: "CDG.rest.execrables", recovery: 1 },
  voyage: { id: "voyage", label: "CDG.rest.voyage", recovery: 2 },
  agreables: { id: "agreables", label: "CDG.rest.agreables", recovery: 3 },
  exceptionnelles: { id: "exceptionnelles", label: "CDG.rest.exceptionnelles", recovery: 4 },
}

/** Bornes de saisie d'une caractéristique à la création. */
export const ABILITY_MIN = 8
export const ABILITY_MAX = 12

/**
 * Enveloppe de points à répartir entre les trois caractéristiques à la création.
 *
 * Les bonus accordés par le peuple et la carrière viennent par-dessus : ils ne se prennent pas sur
 * ces points.
 */
export const ABILITY_POINTS_TOTAL = 32

/**
 * Enveloppe de points à dépenser dans les compétences à la création, en plus des rangs que la
 * carrière accorde d'office. Ces rangs-là sont gratuits : le budget ne paie que ce qui les dépasse.
 */
export const SKILL_POINTS_TOTAL = 10

/**
 * Coût d'un cran de compétence : ce que coûte le passage AU rang indiqué, depuis le rang inférieur.
 *
 * Les coûts se cumulent — ouvrir une compétence au rang 2 depuis rien coûte 1 + 2 = 3 points.
 * La même table sert aux 10 points de l'étape des compétences et aux points de personnalisation ;
 * seul le rang 3 échappe à la première, qui s'arrête au rang 2.
 */
export const SKILL_RANK_COST = {
  1: 1,
  2: 2,
  3: 4,
}

/**
 * Rang maximum qu'une compétence peut atteindre à l'étape d'attribution.
 * Le rang 3 n'est ouvert qu'aux points de personnalisation, plus tard dans la création.
 */
export const CREATION_MAX_SKILL_RANK = 2

/**
 * Enveloppe de points de personnalisation, dépensée après les compétences.
 *
 * Ces points se comportent comme de l'expérience, à deux exceptions près : la promotion au grade de
 * sergent et l'achat de pécule, qui n'ont pas d'équivalent en cours de partie.
 */
export const CUSTOMIZATION_POINTS_TOTAL = 15

/** Ce que coûte chaque emploi des points de personnalisation. */
export const CUSTOMIZATION_COSTS = {
  /** +1 à une caractéristique, une seule fois par caractéristique. */
  abilityImprovement: 5,
  /** Par rang d'arcanum, à l'acquisition comme à la montée. */
  arcanumRank: 7,
  /** Une langue supplémentaire, au-delà de celles que le peuple accorde. */
  language: 2,
  /** Ducats obtenus par point investi dans le pécule de départ. */
  ducatsPerPoint: 10,
}

/** Nombre d'augmentations de caractéristique achetables à la création, par caractéristique. */
export const CREATION_MAX_ABILITY_IMPROVEMENTS = 1

/** Rang maximum d'un arcanum en début de partie : on ne commence pas au rang 3. */
export const CREATION_MAX_ARCANUM_RANK = 2

/** Nombre de compétences pouvant atteindre le rang 3 à l'issue de la création. */
export const CREATION_MAX_RANK3_SKILLS = 1

/**
 * Quotas des traits de personnalité à la création.
 *
 * Chaque couple reçoit d'abord un dominant au rang 1 — il n'y a pas de couple neutre. Puis 5 à 10
 * de ces traits montent au rang 2, et 0 à 2 des traits au rang 2 poussent jusqu'au rang 3. Un trait
 * au rang 3 compte donc aussi dans les 5 à 10 : il est passé par le rang 2.
 */
export const TRAIT_RANK2_MIN = 5
export const TRAIT_RANK2_MAX = 10
export const TRAIT_RANK3_MAX = 2

/** Nombre d'augmentations possibles d'une caractéristique par rapport à son score de départ. */
export const ABILITY_MAX_IMPROVEMENTS = 3

/** Jetons de passion en début de session. */
export const BASE_PASSION_TOKENS = 1
