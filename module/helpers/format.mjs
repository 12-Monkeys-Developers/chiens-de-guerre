/**
 * Mises en forme partagées par les fiches, les fenêtres, les cartes et les gabarits.
 *
 * Ce fichier est volontairement pur, comme `rules.mjs` : il ne touche ni à Foundry, ni aux
 * documents, et se teste donc sous Node (`npm test`).
 */

/**
 * Un nombre signé, tel que la fiche papier imprime bonus et malus : « +2 », « -3 », « 0 ».
 * @param {number} value
 * @returns {string}
 */
export function signed(value) {
  return value > 0 ? `+${value}` : `${value}`
}
