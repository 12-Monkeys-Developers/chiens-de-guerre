/**
 * Les batailles (p. 51-54) : affrontements de masse résolus en tours de bataille abstraits, à côté
 * de l'escarmouche et du duel.
 */

/** Points de victoire qui donnent la bataille, à condition de devancer l'autre camp (p. 54). */
export const BATTLE_VICTORY_POINTS = 3

/** Bornes du modificateur de bataille (p. 51). */
export const BATTLE_MODIFIER_MIN = -10
export const BATTLE_MODIFIER_MAX = 10

/**
 * Table des modificateurs de bataille (p. 51). Le Meneur peut retenir toute autre valeur entre les
 * bornes : la table ne donne que des repères.
 */
export const BATTLE_MODIFIERS = [
  { value: -10, label: "CDG.battle.modifiers.desperate" },
  { value: -5, label: "CDG.battle.modifiers.slim" },
  { value: -2, label: "CDG.battle.modifiers.tense" },
  { value: 0, label: "CDG.battle.modifiers.balanced" },
  { value: 2, label: "CDG.battle.modifiers.goodOmen" },
  { value: 5, label: "CDG.battle.modifiers.won" },
  { value: 10, label: "CDG.battle.modifiers.formality" },
]

/**
 * Les cinq phases d'un tour de bataille (p. 52), dans l'ordre.
 */
export const BATTLE_PHASES = {
  location: { id: "location", label: "CDG.battle.phases.location", order: 1 },
  fights: { id: "fights", label: "CDG.battle.phases.fights", order: 2 },
  exploits: { id: "exploits", label: "CDG.battle.phases.exploits", order: 3 },
  generals: { id: "generals", label: "CDG.battle.phases.generals", order: 4 },
  losses: { id: "losses", label: "CDG.battle.phases.losses", order: 5 },
}

/** Les phases dans l'ordre où elles se jouent, pour passer de l'une à la suivante. */
export const BATTLE_PHASES_ORDERED = Object.freeze(Object.values(BATTLE_PHASES).sort((a, b) => a.order - b.order))

/**
 * Localisation d'un PJ, de l'arrière au front (p. 52). `step` mesure la distance entre deux
 * positions : on ne change que d'un cran par tour. `chiefMalus` pénalise le test d'Esprit / Tactique
 * d'un PJ chef d'armée qui ne se tient pas en soutien (p. 53).
 */
export const BATTLE_POSITIONS = {
  soutien: { id: "soutien", label: "CDG.battle.positions.soutien", step: 0, chiefMalus: 0 },
  engage: { id: "engage", label: "CDG.battle.positions.engage", step: 1, chiefMalus: -1 },
  front: { id: "front", label: "CDG.battle.positions.front", step: 2, chiefMalus: -3 },
}

/**
 * Composition de l'armée adverse (encadré « Varier la puissance des adversaires », p. 53) : combien
 * de d20 tirer sur la table des adversaires, et lequel garder.
 *
 * Le texte dit de garder pour une armée faible « le résultat le moins favorable pour le PJ », mais
 * l'exemple de la p. 54 garde le plus bas des deux dés (7 plutôt que 11) face à de piètres
 * combattants : c'est l'exemple qui est suivi, le bas de la table étant le moins dangereux.
 */
export const BATTLE_ARMY_QUALITIES = {
  normal: { id: "normal", label: "CDG.battle.army.normal", formula: "1d20", keep: "single" },
  weak: { id: "weak", label: "CDG.battle.army.weak", formula: "2d20", keep: "lowest" },
  elite: { id: "elite", label: "CDG.battle.army.elite", formula: "2d20", keep: "highest" },
}

/**
 * Table des adversaires en bataille (p. 52) : chaque tranche du d20 et les profils du compendium des
 * PNJ qui lui répondent. Une tranche à plusieurs profils (« Paysan ou Citadin ») laisse le choix au
 * Meneur.
 *
 * 16 et 20 (officier ou Marqué/Élu) restent en attente : Marqué et Élu modifient un profil existant
 * (p. 61), ce que le système ne sait pas encore faire. Sans profil, le Meneur choisit lui-même.
 *
 * C'est la table par défaut : le Meneur remplace les profils de chaque tranche dans les réglages du
 * système (réglage `battleAdversaries`, voir `CdgBattle.adversaryTable`).
 */
export const BATTLE_ADVERSARIES = [
  { min: 1, max: 1, label: "CDG.battle.adversaries.peasant", actors: ["cdgpnpaysan01bqh", "cdgpncitadinynv9"] },
  { min: 2, max: 3, label: "CDG.battle.adversaries.conscript", actors: ["cdgpnconscri9nxo"] },
  { min: 4, max: 6, label: "CDG.battle.adversaries.soldierWeak", actors: ["cdgpnsoldatfexub"] },
  { min: 7, max: 8, label: "CDG.battle.adversaries.soldierAverage", actors: ["cdgpnsoldatmbiju"] },
  { min: 9, max: 9, label: "CDG.battle.adversaries.heavyWeak", actors: ["cdgpnguerriece6j"] },
  { min: 10, max: 10, label: "CDG.battle.adversaries.shockWeak", actors: ["cdgpnguerriexbc0"] },
  { min: 11, max: 11, label: "CDG.battle.adversaries.duellistWeak", actors: ["cdgpnduellis73h7"] },
  { min: 12, max: 12, label: "CDG.battle.adversaries.soldierVeteran", actors: ["cdgpnsoldatvtu7l"] },
  { min: 13, max: 13, label: "CDG.battle.adversaries.heavyAverage", actors: ["cdgpnguerriev8oi"] },
  { min: 14, max: 14, label: "CDG.battle.adversaries.shockAverage", actors: ["cdgpnguerriecekv"] },
  { min: 15, max: 15, label: "CDG.battle.adversaries.duellistAverage", actors: ["cdgpnduellisdiyq"] },
  { min: 16, max: 16, label: "CDG.battle.adversaries.officerWeak", actors: [] },
  { min: 17, max: 17, label: "CDG.battle.adversaries.heavyVeteran", actors: ["cdgpnguerrievo6h"] },
  { min: 18, max: 18, label: "CDG.battle.adversaries.shockVeteran", actors: ["cdgpnguerriejggc"] },
  { min: 19, max: 19, label: "CDG.battle.adversaries.duellistVeteran", actors: ["cdgpnduellis8p2x"] },
  { min: 20, max: 20, label: "CDG.battle.adversaries.officerAverage", actors: [] },
]
