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

  erudition: { id: "erudition", label: "CDG.skills.erudition", column: 2 },
  escamotage: { id: "escamotage", label: "CDG.skills.escamotage", column: 2 },
  esquive: { id: "esquive", label: "CDG.skills.esquive", column: 2 },
  etiquette: { id: "etiquette", label: "CDG.skills.etiquette", column: 2 },
  ingenierie: { id: "ingenierie", label: "CDG.skills.ingenierie", column: 2 },
  investigation: { id: "investigation", label: "CDG.skills.investigation", column: 2 },
  medecine: { id: "medecine", label: "CDG.skills.medecine", column: 2 },
  melee: { id: "melee", label: "CDG.skills.melee", column: 2 },
  portArmures: { id: "portArmures", label: "CDG.skills.portArmures", column: 2 },
  religionsLegendes: { id: "religionsLegendes", label: "CDG.skills.religionsLegendes", column: 2 },

  sciencesNaturelles: { id: "sciencesNaturelles", label: "CDG.skills.sciencesNaturelles", column: 3 },
  sensCombat: { id: "sensCombat", label: "CDG.skills.sensCombat", column: 3 },
  sensBatailles: { id: "sensBatailles", label: "CDG.skills.sensBatailles", column: 3 },
  sensDuels: { id: "sensDuels", label: "CDG.skills.sensDuels", column: 3 },
  survie: { id: "survie", label: "CDG.skills.survie", column: 3 },
  tactique: { id: "tactique", label: "CDG.skills.tactique", column: 3 },
  tir: { id: "tir", label: "CDG.skills.tir", column: 3 },
  vigilance: { id: "vigilance", label: "CDG.skills.vigilance", column: 3 },
  vigueur: { id: "vigueur", label: "CDG.skills.vigueur", column: 3 },
  volonte: { id: "volonte", label: "CDG.skills.volonte", column: 3 },
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

/** Grades de la compagnie et solde mensuelle associée, en ducats. */
export const GRADES = {
  duplicator: { id: "duplicator", label: "CDG.grades.duplicator", pay: 12 },
  sergent: { id: "sergent", label: "CDG.grades.sergent", pay: 18 },
  lieutenant: { id: "lieutenant", label: "CDG.grades.lieutenant", pay: 24 },
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
  legere: { id: "legere", label: "CDG.wounds.legere", malus: -1, order: 1 },
  grave: { id: "grave", label: "CDG.wounds.grave", malus: -3, order: 2 },
  mortelle: { id: "mortelle", label: "CDG.wounds.mortelle", malus: -6, order: 3 },
}

/**
 * Nombre de cases de blessure par gravité, selon le rang dans la compétence Vigueur.
 *
 * Le personnage part de 1 case de chaque, auxquelles la Vigueur ajoute des cases légères et graves.
 * À vérifier en jeu : le guide d'intégration et les cases imprimées sur la fiche ne se recoupent
 * pas exactement. Toute correction de règle se fait ici, en une ligne.
 */
export const WOUND_SLOTS_BY_VIGUEUR = {
  0: { legere: 2, grave: 1, mortelle: 1 },
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

/** Nombre d'augmentations possibles d'une caractéristique par rapport à son score de départ. */
export const ABILITY_MAX_IMPROVEMENTS = 3

/** Coût en expérience d'une augmentation de caractéristique. */
export const ABILITY_IMPROVEMENT_COST = 5

/** Jetons de passion en début de session. */
export const BASE_PASSION_TOKENS = 1
