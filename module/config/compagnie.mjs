/**
 * Le triptyque de la compagnie franche (p. 123) : Effectifs, Logistique, Moral. Notées sur 20,
 * à la fois un score et une réserve qu'on ponctionne pour investir de l'effort — même sémantique
 * que les caractéristiques du personnage, mais un tout autre vocabulaire.
 */
export const COMPANY_ABILITIES = {
  effectifs: {
    id: "effectifs",
    label: "CDG.company.abilities.long.effectifs",
  },
  logistique: {
    id: "logistique",
    label: "CDG.company.abilities.long.logistique",
  },
  moral: {
    id: "moral",
    label: "CDG.company.abilities.long.moral",
  },
}

/**
 * Les 18 compétences de compagnie (p. 124), chacune rattachée à SA caractéristique.
 *
 * À la différence du personnage, le couple n'est pas libre : tous les exemples de test du livre
 * associent une compétence à une seule caractéristique (Effectifs / Bataille, Logistique /
 * Équipements, Moral / Discipline…), jamais un autre appariement. `ability` fixe ce couple ; la
 * fenêtre de jet s'ouvre alors avec `lockedPair: true`.
 */
export const COMPANY_SKILLS = {
  bataille: { id: "bataille", label: "CDG.company.skills.bataille", ability: "effectifs" },
  ingenierie: { id: "ingenierie", label: "CDG.company.skills.ingenierie", ability: "effectifs" },
  savoirs: { id: "savoirs", label: "CDG.company.skills.savoirs", ability: "effectifs" },
  magie: { id: "magie", label: "CDG.company.skills.magie", ability: "effectifs" },
  soins: { id: "soins", label: "CDG.company.skills.soins", ability: "effectifs" },
  tactique: { id: "tactique", label: "CDG.company.skills.tactique", ability: "effectifs" },

  approvisionnement: { id: "approvisionnement", label: "CDG.company.skills.approvisionnement", ability: "logistique" },
  equipements: { id: "equipements", label: "CDG.company.skills.equipements", ability: "logistique" },
  mobilite: { id: "mobilite", label: "CDG.company.skills.mobilite", ability: "logistique" },
  montures: { id: "montures", label: "CDG.company.skills.montures", ability: "logistique" },
  reperage: { id: "reperage", label: "CDG.company.skills.reperage", ability: "logistique" },
  richesses: { id: "richesses", label: "CDG.company.skills.richesses", ability: "logistique" },

  cohesion: { id: "cohesion", label: "CDG.company.skills.cohesion", ability: "moral" },
  discipline: { id: "discipline", label: "CDG.company.skills.discipline", ability: "moral" },
  informateurs: { id: "informateurs", label: "CDG.company.skills.informateurs", ability: "moral" },
  negociation: { id: "negociation", label: "CDG.company.skills.negociation", ability: "moral" },
  ruse: { id: "ruse", label: "CDG.company.skills.ruse", ability: "moral" },
  surveillance: { id: "surveillance", label: "CDG.company.skills.surveillance", ability: "moral" },
}

/**
 * Nombre de cases de blessure par gravité, selon le rang dans la compétence Cohésion (p. 126).
 *
 * La compagnie part d'une case légère, deux graves et trois mortelles, auxquelles la Cohésion
 * ajoute des cases légères puis graves — inverse de la progression du personnage (Vigueur y ajoute
 * des cases légères et graves, jamais mortelles).
 */
export const COMPANY_WOUND_SLOTS_BY_COHESION = {
  0: { legere: 1, grave: 2, mortelle: 3 },
  1: { legere: 2, grave: 2, mortelle: 3 },
  2: { legere: 2, grave: 3, mortelle: 3 },
  3: { legere: 3, grave: 3, mortelle: 3 },
}

/** Enveloppe et bornes de saisie des caractéristiques de compagnie à la création (p. 126), que suit
 *  l'assistant de création de compagnie. */
export const COMPANY_ABILITY_POINTS = 34
export const COMPANY_ABILITY_MIN = 8
export const COMPANY_ABILITY_MAX = 14

/**
 * La hiérarchie de la compagnie franche, du capitaine au valet, proposée pour le grade d'un membre
 * du roster. Plus large que les trois grades accessibles à un personnage (`GRADES`), dont elle
 * reprend les identifiants : le grade d'un personnage déposé sur le roster s'y retrouve tel quel.
 */
export const COMPANY_GRADES = {
  capitaine: { id: "capitaine", label: "CDG.grades.capitaine" },
  lieutenant: { id: "lieutenant", label: "CDG.grades.lieutenant" },
  sergent: { id: "sergent", label: "CDG.grades.sergent" },
  duplicator: { id: "duplicator", label: "CDG.grades.duplicator" },
  hommeDArmes: { id: "hommeDArmes", label: "CDG.grades.hommeDArmes" },
  valet: { id: "valet", label: "CDG.grades.valet" },
}

/** Les trois étapes de l'assistant de création de compagnie (p. 126). */
export const COMPANY_CREATION_STEPS = [
  { id: "abilities", label: "CDG.companyCreation.steps.abilities", icon: "fa-solid fa-people-group" },
  { id: "skills", label: "CDG.companyCreation.steps.skills", icon: "fa-solid fa-shield-halved" },
  { id: "identity", label: "CDG.companyCreation.steps.identity", icon: "fa-solid fa-flag" },
]
