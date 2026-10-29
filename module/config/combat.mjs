/**
 * Malus cumulatif appliqué aux esquives d'un même round : la première est gratuite, chaque esquive
 * supplémentaire coûte 2 points. L'index du tableau est le nombre d'esquives déjà utilisées.
 */
export const DODGE_MALUS = [0, -2, -4, -6, -8]

/**
 * Les deux défenses d'une confrontation (p. 44) et le test que chacune ouvre. L'esquive se paie de
 * plus en plus cher dans le round (`DODGE_MALUS`) ; la parade ne sert qu'une fois par round, et seul
 * son test profite d'un objet de qualité exceptionnelle (`qualityDomain`).
 */
export const DEFENSES = {
  dodge: { id: "dodge", ability: "vivacite", skill: "esquive", qualityDomain: null },
  parry: { id: "parry", ability: "corps", skill: "blocage", qualityDomain: "parry" },
}

/** Chaque action entreprise pendant un round retire ce nombre de points d'initiative. */
export const INITIATIVE_ACTION_COST = 10

/** Les deux économies de tours prévues par les règles. */
export const COMBAT_MODES = {
  skirmish: { id: "skirmish", label: "CDG.combat.modes.skirmish", skill: "sensCombat" },
  duel: { id: "duel", label: "CDG.combat.modes.duel", skill: "sensDuels" },
}

/** Formes de duel. */
export const DUEL_TYPES = {
  plaisance: { id: "plaisance", label: "CDG.combat.duel.types.plaisance" },
  outrance: { id: "outrance", label: "CDG.combat.duel.types.outrance" },
}

/** Objectifs autorisés pour un duel de plaisance. */
export const DUEL_TOUCH_TARGETS = [1, 2, 3]

/** Bonus d'initiative lorsque deux armes de mêlée légères ou moyennes sont effectivement tenues. */
export const DUAL_WIELD_INITIATIVE_BONUS = [0, 0, 1, 2]
