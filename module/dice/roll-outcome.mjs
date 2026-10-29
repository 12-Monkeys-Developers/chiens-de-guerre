import { SYSTEM } from "../config/system.mjs"

/**
 * Résolution d'un test de Chiens de guerre — règles p. 42-43.
 *
 * Ce fichier est volontairement pur : il ne touche ni à Foundry, ni aux documents, ni à l'interface.
 * Toute la casuistique des règles tient dans `resolveOutcome` ; si l'éditeur publie un erratum,
 * c'est le seul endroit à corriger.
 *
 * Le système est « en dessous » : on cherche un résultat inférieur ou égal au seuil de réussite (SR),
 * mais le plus proche possible de ce seuil, car la qualité de la réussite est le score du dé.
 * Égaler le SR est une réussite critique.
 */

/** Les quatre issues possibles d'un test, de la pire à la meilleure. */
export const OUTCOMES = {
  criticalFailure: { id: "criticalFailure", label: "CDG.roll.outcome.criticalFailure", icon: "fa-skull" },
  failure: { id: "failure", label: "CDG.roll.outcome.failure", icon: "fa-xmark" },
  success: { id: "success", label: "CDG.success.standard", icon: "fa-check" },
  criticalSuccess: { id: "criticalSuccess", label: "CDG.roll.outcome.criticalSuccess", icon: "fa-star" },
}

/**
 * Interprète un dé face à un seuil de réussite.
 *
 * Trois régimes, dans cet ordre :
 * - SR supérieur ou égal à 20 (p. 43) : un 20 ne provoque plus d'échec critique, et chaque point
 *   au-delà de 20 s'ajoute à la qualité. Aboutir à 20 de qualité ou plus est une réussite critique.
 * - SR nul ou négatif (p. 43) : seul un 1 réussit, et jamais en critique. L'échec est critique
 *   dès que le dé atteint 20 moins l'écart, soit `20 + sr` puisque `sr` est négatif.
 * - Régime courant : réussite si le dé ne dépasse pas le SR, critique s'il l'égale exactement ;
 *   sinon échec, critique sur un 20 naturel.
 * @param {number} die Le résultat du dé conservé, de 1 à 20.
 * @param {number} sr Le seuil de réussite, tous modificateurs compris.
 * @returns {{die: number, sr: number, outcome: string, success: boolean, critical: boolean, quality: number|null, tier: string|null}}
 */
export function resolveOutcome(die, sr) {
  const base = { die, sr }

  if (sr >= SYSTEM.NATURAL_MAX) {
    const quality = die + (sr - SYSTEM.NATURAL_MAX)
    const critical = quality >= SYSTEM.NATURAL_MAX
    return { ...base, outcome: critical ? OUTCOMES.criticalSuccess.id : OUTCOMES.success.id, success: true, critical, quality, tier: qualityTier(quality) }
  }

  if (sr <= 0) {
    if (die === 1) return { ...base, outcome: OUTCOMES.success.id, success: true, critical: false, quality: 1, tier: qualityTier(1) }
    const critical = die >= SYSTEM.NATURAL_MAX + sr
    return { ...base, outcome: critical ? OUTCOMES.criticalFailure.id : OUTCOMES.failure.id, success: false, critical, quality: null, tier: null }
  }

  if (die > sr) {
    const critical = die === SYSTEM.NATURAL_MAX
    return { ...base, outcome: critical ? OUTCOMES.criticalFailure.id : OUTCOMES.failure.id, success: false, critical, quality: null, tier: null }
  }

  const critical = die === sr
  return { ...base, outcome: critical ? OUTCOMES.criticalSuccess.id : OUTCOMES.success.id, success: true, critical, quality: die, tier: qualityTier(die) }
}

/**
 * L'issue d'un test lancé : son dé conservé face à son seuil. C'est ce que lisent la carte, la
 * confrontation, la bataille et le jet de survie, qui ne doivent jamais relire un autre dé.
 * @param {{results: number[], keptIndex: number, sr: number}} test Un test tel que le pose `CdgRoll.roll`.
 * @returns {Object} Le retour de `resolveOutcome`.
 */
export function keptOutcome(test) {
  return resolveOutcome(test.results[test.keptIndex], test.sr)
}

/**
 * Tranche de qualité d'une réussite : de justesse jusqu'à 5, franche au-delà (p. 42).
 * @param {number} quality
 * @returns {string} `"weak"` ou `"standard"`
 */
export function qualityTier(quality) {
  return quality <= SYSTEM.SUCCESS_QUALITY.weak.max ? SYSTEM.SUCCESS_QUALITY.weak.id : SYSTEM.SUCCESS_QUALITY.standard.id
}

/**
 * Clé de libellé d'une issue. Une réussite simple emprunte le libellé de sa tranche de qualité,
 * « Oui, mais… » ou « Oui » ; une réussite critique est un « Oui, et… ».
 * @param {Object} outcome Le retour de `resolveOutcome`.
 * @returns {string}
 */
export function outcomeLabel(outcome) {
  if (outcome.outcome === OUTCOMES.success.id) return SYSTEM.SUCCESS_QUALITY[outcome.tier].label
  return OUTCOMES[outcome.outcome].label
}

/**
 * Note ordinale d'une issue, du pire au meilleur.
 *
 * Sert à imposer le pire dé au rang 0 et à mettre en avant le meilleur ailleurs. L'ordre suit celui
 * des règles — échec critique, échec, réussite, réussite critique — et départage deux réussites par
 * leur qualité, comme le fait un test d'opposition.
 * @param {Object} outcome Le retour de `resolveOutcome`.
 * @returns {number}
 */
export function outcomeScore(outcome) {
  switch (outcome.outcome) {
    case OUTCOMES.criticalFailure.id:
      return 0
    case OUTCOMES.failure.id:
      return 1
    case OUTCOMES.success.id:
      return 2 + outcome.quality
    default:
      return 1000 + outcome.quality
  }
}

/**
 * Indice du dé le plus avantageux d'une poignée, face à un seuil donné.
 *
 * Ce n'est pas le plus grand ni le plus petit : c'est celui qui produit la meilleure issue, donc le
 * plus grand qui reste sous le seuil — et, si aucun ne passe, celui qui évite l'échec critique.
 * À égalité, le premier dé lancé l'emporte.
 * @param {number[]} dice
 * @param {number} sr
 * @returns {number}
 */
export function bestDieIndex(dice, sr) {
  return extremeDieIndex(dice, sr, (score, reference) => score > reference)
}

/**
 * Indice du dé le moins avantageux d'une poignée : ce que la règle impose au rang 0.
 * @param {number[]} dice
 * @param {number} sr
 * @returns {number}
 */
export function worstDieIndex(dice, sr) {
  return extremeDieIndex(dice, sr, (score, reference) => score < reference)
}

/**
 * Parcourt la poignée et retient l'indice qui satisfait le comparateur.
 * @param {number[]} dice
 * @param {number} sr
 * @param {Function} isBetter
 * @returns {number}
 */
function extremeDieIndex(dice, sr, isBetter) {
  let index = 0
  let reference = outcomeScore(resolveOutcome(dice[0], sr))
  for (let i = 1; i < dice.length; i++) {
    const score = outcomeScore(resolveOutcome(dice[i], sr))
    if (isBetter(score, reference)) {
      index = i
      reference = score
    }
  }
  return index
}
