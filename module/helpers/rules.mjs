import { SYSTEM } from "../config/system.mjs"

/**
 * Règles partagées entre les documents, les fiches et les assistants.
 *
 * Ce fichier est volontairement pur, comme `roll-outcome.mjs` : il ne touche ni à Foundry, ni aux
 * documents, et se teste donc sous Node (`npm test`).
 */

/**
 * Totaux des vices et des vertus, karma, puis allégeance.
 *
 * Le karma est la différence vertus moins vices ; l'allégeance est la tranche dans laquelle il
 * tombe : Obscurité jusqu'à -3, Balance entre -2 et 2, Lumière à partir de 3. Seul le côté dominant
 * d'un couple compte, l'autre est inhibé.
 * @param {Object<string, {dominant: string|null, value: number}>} traits Les couples, par identifiant.
 * @returns {{vices: number, virtues: number, value: number, allegiance: string, allegianceLabel: string}}
 */
export function computeKarma(traits) {
  let vices = 0
  let virtues = 0
  for (const pair of Object.values(SYSTEM.TRAIT_PAIRS)) {
    const trait = traits[pair.id]
    if (trait?.dominant === SYSTEM.TRAIT_SIDES.vice.id) vices += trait.value
    else if (trait?.dominant === SYSTEM.TRAIT_SIDES.virtue.id) virtues += trait.value
  }
  const value = virtues - vices

  // Les tranches sont ordonnées par maximum croissant ; la dernière a un maximum nul et ramasse
  // tout ce qui dépasse.
  const allegiance = Object.values(SYSTEM.ALLEGIANCES).find((entry) => entry.max === null || value <= entry.max)
  return { vices, virtues, value, allegiance: allegiance.id, allegianceLabel: allegiance.label }
}

/**
 * Simule un plan de guérison de compagnie (p. 126) sur des blessures, sans rien écrire.
 *
 * Chaque opération améliore une blessure existante d'un ou deux crans : elle quitte sa case et en
 * occupe une plus légère, ou disparaît si elle passe sous la légère. Une destination pleine invalide
 * tout le plan — jamais d'application partielle.
 * @param {Object<string, {value: number, max: number}>} wounds Les blessures, par gravité.
 * @param {{level: string, steps: number}[]} operations
 * @returns {Object<string, {value: number, max: number}>|null} Les blessures après le plan, ou `null`
 *   si le plan ne s'applique pas.
 */
export function simulateCompanyHealing(wounds, operations) {
  const levels = SYSTEM.WOUND_LEVELS_ORDERED
  const result = Object.fromEntries(levels.map((level) => [level.id, { value: wounds[level.id].value, max: wounds[level.id].max }]))

  for (const operation of operations) {
    const index = levels.findIndex((level) => level.id === operation?.level)
    const steps = Number(operation?.steps)
    if (index < 0 || ![1, 2].includes(steps) || result[operation.level].value <= 0) return null

    const destination = index - steps
    if (destination >= 0 && result[levels[destination].id].value >= result[levels[destination].id].max) return null
    result[operation.level].value -= 1
    if (destination >= 0) result[levels[destination].id].value += 1
  }
  return result
}

/**
 * Qui peut faire un effort : un personnage, une compagnie franche, ou un adversaire majeur.
 * @param {{type: string, system: {major?: boolean}}} actor
 * @returns {boolean}
 */
export function canSpendEffort(actor) {
  return actor.type === "character" || actor.type === "compagnie" || !!actor.system.major
}

/**
 * L'effort engageable sur une réserve, et les crans que la fenêtre de jet en affiche.
 *
 * « Un joueur ne peut jamais décider volontairement d'utiliser ainsi le dernier point d'une
 * réserve et tomber à zéro » : le plafond laisse toujours un point.
 * @param {number} poolValue La valeur courante de la réserve.
 * @param {number|string} wanted L'effort demandé, ramené dans les bornes.
 * @param {boolean} allowed Faux pour qui ne peut pas faire d'effort : tout est alors à zéro.
 * @returns {{value: number, max: number, bonus: number, steps: {value: number, bonus: number, selected: boolean, disabled: boolean}[]}}
 */
export function effortChoices(poolValue, wanted, allowed) {
  const max = allowed ? Math.max(0, Math.min(SYSTEM.MAX_EFFORT, poolValue - 1)) : 0
  const value = Math.min(Math.max(parseInt(wanted) || 0, 0), max)
  const steps = Array.from({ length: SYSTEM.MAX_EFFORT + 1 }, (unused, step) => ({
    value: step,
    bonus: step * SYSTEM.EFFORT_BONUS_PER_POINT,
    selected: step === value,
    disabled: step > max,
  }))
  return { value, max, bonus: value * SYSTEM.EFFORT_BONUS_PER_POINT, steps }
}
