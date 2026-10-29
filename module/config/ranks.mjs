/**
 * Les quatre rangs de compétence et la poignée de dés associée.
 *
 * Le système est « en dessous » : on cherche un résultat inférieur ou égal au seuil de réussite.
 * Attention, « le meilleur dé » n'est pas le plus petit : c'est le plus grand qui reste sous le
 * seuil, puisque la qualité de la réussite est le score du dé (p. 42). Aucun `kh`/`kl` de Foundry ne
 * sait exprimer ça — la poignée est donc lancée brute et le dé conservé est choisi ensuite,
 * automatiquement : le pire au rang 0, le meilleur aux rangs 2 et 3 (le Meneur peut outrepasser ce
 * choix depuis la carte de chat).
 */
export const RANKS = {
  0: {
    id: 0,
    label: "CDG.ranks.0",
    formula: "2d20",
    dice: 2,
    keep: "worst",
    hint: "CDG.ranks.hint.0",
  },
  1: {
    id: 1,
    label: "CDG.ranks.1",
    formula: "1d20",
    dice: 1,
    keep: "single",
    hint: "CDG.ranks.hint.1",
  },
  2: {
    id: 2,
    label: "CDG.ranks.2",
    formula: "2d20",
    dice: 2,
    keep: "best",
    hint: "CDG.ranks.hint.2",
  },
  3: {
    id: 3,
    label: "CDG.ranks.3",
    formula: "3d20",
    dice: 3,
    keep: "best",
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

/**
 * La table des difficultés (p. 40). Le modificateur s'applique au seuil de réussite, jamais au dé.
 *
 * Les quatre crans du milieu sont « ceux les plus couramment utilisés en jeu » ; les extrêmes sont
 * à réserver aux actions véritablement héroïques, ou aux cas où l'on ne lancerait normalement pas
 * les dés mais où l'échec aurait un impact réel. `order` fixe l'ordre du sélecteur.
 */
export const DIFFICULTIES = {
  tresFacile: { id: "tresFacile", label: "CDG.difficulties.tresFacile", modifier: 10, order: 1 },
  facile: { id: "facile", label: "CDG.difficulties.facile", modifier: 5, order: 2 },
  assezSimple: { id: "assezSimple", label: "CDG.difficulties.assezSimple", modifier: 2, order: 3 },
  moyenne: { id: "moyenne", label: "CDG.difficulties.moyenne", modifier: 0, order: 4 },
  complication: { id: "complication", label: "CDG.difficulties.complication", modifier: -2, order: 5 },
  difficile: { id: "difficile", label: "CDG.difficulties.difficile", modifier: -5, order: 6 },
  tresDifficile: { id: "tresDifficile", label: "CDG.difficulties.tresDifficile", modifier: -10, order: 7 },
}

/** Les difficultés dans l'ordre du sélecteur, de la plus facile à la plus difficile. */
export const DIFFICULTIES_ORDERED = Object.freeze(Object.values(DIFFICULTIES).sort((a, b) => a.order - b.order))

/** Difficulté proposée par défaut à l'ouverture de la fenêtre de jet. */
export const DEFAULT_DIFFICULTY = "moyenne"
