import { SYSTEM } from "../config/system.mjs"
import { OUTCOMES } from "../dice/roll-outcome.mjs"

/**
 * Tables des batailles (p. 52-54).
 *
 * Fichier pur, comme `opposition.mjs` : il ne touche ni à Foundry, ni aux documents, ni à
 * l'interface. Il prend des issues déjà résolues (clés de `OUTCOMES`) et dit ce qu'elles valent sur
 * le champ de bataille ; `CdgBattle` se charge d'appliquer.
 */

const { criticalFailure: CF, failure: F, success: S, criticalSuccess: CS } = Object.fromEntries(Object.entries(OUTCOMES).map(([key, value]) => [key, value.id]))

/** Gravités de blessure de la moins à la plus grave, précédées de l'absence de blessure. */
const WOUND_SCALE = [null, ...SYSTEM.WOUND_LEVELS_ORDERED.map((level) => level.id)]

/**
 * Table du déroulement des combats (p. 52) : la position du PJ en colonne, l'issue de son test
 * d'Esprit / Sens des batailles en ligne.
 *
 * `exploit` vaut `"test"` quand l'action d'éclat dépend encore d'un test d'Esprit / Tactique réussi,
 * `"granted"` quand elle est acquise.
 */
const FIGHT_TABLE = {
  soutien: {
    [CF]: { wound: "legere", combat: true },
    [F]: { wound: "legere" },
    [S]: {},
    [CS]: { exploit: "test" },
  },
  engage: {
    [CF]: { wound: "grave", combat: true },
    [F]: { wound: "legere", combat: true },
    [S]: { wound: "legere" },
    [CS]: { exploit: "granted" },
  },
  front: {
    [CF]: { wound: "mortelle", combat: true },
    [F]: { wound: "grave", combat: true },
    [S]: { wound: "legere", exploit: "test" },
    [CS]: { exploit: "granted" },
  },
}

/**
 * Conséquences du test de déroulement des combats.
 * @param {string} positionId Une clé de `SYSTEM.BATTLE_POSITIONS`.
 * @param {string} outcomeId Une clé de `OUTCOMES`.
 * @returns {{wound: string|null, combat: boolean, exploit: "test"|"granted"|null}}
 */
export function fightConsequence(positionId, outcomeId) {
  const cell = FIGHT_TABLE[positionId]?.[outcomeId] ?? {}
  return { wound: cell.wound ?? null, combat: !!cell.combat, exploit: cell.exploit ?? null }
}

/**
 * Décalage de la blessure selon le test de Corps / Protection (p. 52) : un échec la laisse telle
 * quelle, une réussite la diminue d'un cran, une réussite critique de deux, un échec critique
 * l'augmente d'un cran. On ne descend pas sous « aucune blessure » ni ne monte au-delà de
 * « blessure mortelle » (p. 47).
 * @param {string|null} woundId La blessure indiquée par la table.
 * @param {string} outcomeId L'issue du test de Corps / Protection.
 * @returns {string|null} La blessure à cocher, `null` si elle est annulée.
 */
export function shiftWound(woundId, outcomeId) {
  const shift = { [CF]: 1, [F]: 0, [S]: -1, [CS]: -2 }[outcomeId] ?? 0
  // Pas de `Math.clamp` : il vient de Foundry, et ce fichier se teste sous Node.
  const index = Math.min(Math.max(WOUND_SCALE.indexOf(woundId) + shift, 0), WOUND_SCALE.length - 1)
  return WOUND_SCALE[index]
}

/**
 * Opposition des généraux (p. 53), lue du côté de la compagnie franche : l'issue est celle du test
 * d'opposition de la compagnie (ou de son PJ chef d'armée) contre le général adverse.
 * @param {string} outcomeId L'issue de l'opposition pour la compagnie.
 * @returns {{side: "company"|"enemy", points: number, lossModifier: number}}
 */
export function generalsResult(outcomeId) {
  switch (outcomeId) {
    case CF:
      return { side: "enemy", points: 2, lossModifier: -5 }
    case F:
      return { side: "enemy", points: 1, lossModifier: -2 }
    case CS:
      return { side: "company", points: 2, lossModifier: 5 }
    default:
      return { side: "company", points: 1, lossModifier: 2 }
  }
}

/**
 * Test de pertes (p. 54) : la case de blessés que la compagnie coche.
 * @param {string} outcomeId
 * @returns {string|null}
 */
export function lossesWound(outcomeId) {
  return { [CF]: "mortelle", [F]: "grave", [S]: "legere" }[outcomeId] ?? null
}

/**
 * Le d20 retenu sur la table des adversaires, selon la composition de l'armée adverse.
 * @param {number[]} results Les dés lancés.
 * @param {string} qualityId Une clé de `SYSTEM.BATTLE_ARMY_QUALITIES`.
 * @returns {number}
 */
export function keptAdversaryDie(results, qualityId) {
  switch (SYSTEM.BATTLE_ARMY_QUALITIES[qualityId]?.keep) {
    case "lowest":
      return Math.min(...results)
    case "highest":
      return Math.max(...results)
    default:
      return results[0]
  }
}

/**
 * La tranche de la table des adversaires (p. 52) qui répond à un d20.
 * @param {number} die
 * @param {Object[]} [table] La table en vigueur, celle du livre par défaut.
 * @returns {Object|null} Une entrée de la table.
 */
export function adversaryEntry(die, table = SYSTEM.BATTLE_ADVERSARIES) {
  return table.find((entry) => die >= entry.min && die <= entry.max) ?? null
}

/**
 * Le camp qui remporte la bataille : trois points de victoire au moins, et plus que l'autre — à
 * égalité, on continue les tours jusqu'à départage (p. 54).
 * @param {{company: number, enemy: number}} points
 * @returns {"company"|"enemy"|null}
 */
export function battleWinner(points) {
  const { company, enemy } = points
  if (Math.max(company, enemy) < SYSTEM.BATTLE_VICTORY_POINTS || company === enemy) return null
  return company > enemy ? "company" : "enemy"
}

/**
 * Un PJ ne change de localisation que d'un cran par tour (p. 52).
 * @param {string|null} fromId La position du tour précédent, `null` au premier tour.
 * @param {string} toId
 * @returns {boolean}
 */
export function canMove(fromId, toId) {
  const to = SYSTEM.BATTLE_POSITIONS[toId]
  if (!to) return false
  const from = SYSTEM.BATTLE_POSITIONS[fromId]
  return !from || Math.abs(from.step - to.step) <= 1
}
