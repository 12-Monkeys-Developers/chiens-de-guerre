/**
 * Les quatre rangs de compétence et la poignée de dés associée.
 *
 * Le système est en dessous : on cherche à faire moins que le seuil de réussite. « Le meilleur »
 * est donc le plus petit résultat, d'où les `kl` (keep lowest) aux rangs 2 et 3, et le `kh`
 * (keep highest, donc le pire) au rang 0.
 *
 * Le moteur de jet n'est pas encore branché : ces formules servent pour l'instant aux info-bulles
 * de la fiche, et seront la source unique quand il le sera.
 */
export const RANKS = {
  0: {
    id: 0,
    label: "CDG.ranks.0",
    formula: "2d20kh",
    hint: "CDG.ranks.hint.0",
  },
  1: {
    id: 1,
    label: "CDG.ranks.1",
    formula: "1d20",
    hint: "CDG.ranks.hint.1",
  },
  2: {
    id: 2,
    label: "CDG.ranks.2",
    formula: "2d20kl",
    hint: "CDG.ranks.hint.2",
  },
  3: {
    id: 3,
    label: "CDG.ranks.3",
    formula: "3d20kl",
    hint: "CDG.ranks.hint.3",
  },
}

/** Rang maximum atteignable, et donc nombre d'écussons dessinés sur la fiche. */
export const MAX_RANK = 3

/** Rang appliqué à un test pour lequel aucune compétence ne s'applique. */
export const DEFAULT_RANK = 1

/**
 * Qualité d'une réussite, d'après le résultat du dé conservé.
 * Un résultat de 1 à 5 est une réussite de justesse (« oui, mais... »), 6 et plus une réussite
 * franche. Au-delà du seuil de réussite, c'est un échec.
 */
export const SUCCESS_QUALITY = {
  weak: { id: "weak", label: "CDG.success.weak", max: 5 },
  standard: { id: "standard", label: "CDG.success.standard", max: null },
}

/** Le résultat maximal d'un d20, utile pour le critique sur seuil supérieur à 20. */
export const NATURAL_MAX = 20
