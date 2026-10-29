import { SYSTEM } from "../config/system.mjs"

/**
 * Conversions de monnaie : ducats et deniers (1 ducat = {@link SYSTEM.DENIERS_PER_DUCAT} deniers).
 *
 * Tous les calculs se font en deniers, l'unité de compte interne, pour ne jamais additionner deux
 * monnaies différentes. Ce fichier est volontairement pur, comme `rules.mjs` : il ne touche ni à
 * Foundry, ni aux documents, et se teste donc sous Node (`npm test`).
 */

/**
 * Le total d'une bourse ou d'un prix, en deniers. Une monnaie absente compte pour zéro.
 * @param {{ducat?: number, denier?: number}} wealth
 * @returns {number}
 */
export function toDeniers(wealth) {
  return Object.values(SYSTEM.CURRENCIES).reduce((total, currency) => total + (wealth?.[currency.id] ?? 0) * currency.inBaseUnit, 0)
}

/**
 * Reconvertit un total de deniers en ducats et deniers, jamais sous zéro.
 * @param {number} deniers
 * @returns {{ducat: number, denier: number}}
 */
export function fromDeniers(deniers) {
  const total = Math.max(0, deniers)
  return { ducat: Math.floor(total / SYSTEM.DENIERS_PER_DUCAT), denier: total % SYSTEM.DENIERS_PER_DUCAT }
}
