import { SYSTEM } from "../config/system.mjs"

/**
 * Enregistre les helpers Handlebars du système.
 */
export function registerHandlebarsHelpers() {
  /**
   * Une plage d'entiers, pour dessiner les rangées d'écussons et de cases à cocher.
   * `{{#each (range 1 3)}}` produit 1, 2, 3.
   */
  Handlebars.registerHelper("range", function (from, to) {
    const start = parseInt(from)
    const end = parseInt(to)
    const values = []
    for (let i = start; i <= end; i++) values.push(i)
    return values
  })

  /** Vrai si le rang atteint le cran dessiné : sert à noircir un écusson. */
  Handlebars.registerHelper("rankFilled", function (rank, position) {
    return parseInt(rank) >= parseInt(position)
  })

  /** Les compétences d'une colonne de la fiche. */
  Handlebars.registerHelper("skillsInColumn", function (column) {
    return Object.values(SYSTEM.SKILLS).filter((skill) => skill.column === parseInt(column))
  })

  /** Libellé long d'une caractéristique. */
  Handlebars.registerHelper("abilityLabel", function (ability) {
    return game.i18n.localize(SYSTEM.ABILITIES[ability]?.label ?? ability)
  })

  /** Libellé d'une compétence. */
  Handlebars.registerHelper("skillLabel", function (skill) {
    return game.i18n.localize(SYSTEM.SKILLS[skill]?.label ?? skill)
  })

  /** Poignée de dés d'un rang, affichée en info-bulle. */
  Handlebars.registerHelper("rankFormula", function (rank) {
    return SYSTEM.RANKS[rank]?.formula ?? SYSTEM.RANKS[SYSTEM.DEFAULT_RANK].formula
  })

  /** Info-bulle d'un rang : « Professionnel — 2d20, le meilleur ». */
  Handlebars.registerHelper("rankTooltip", function (rank) {
    const entry = SYSTEM.RANKS[rank] ?? SYSTEM.RANKS[SYSTEM.DEFAULT_RANK]
    return `${game.i18n.localize(entry.label)} — ${game.i18n.localize(entry.hint)}`
  })

  /** Nombre signé, pour les malus et les modificateurs. */
  Handlebars.registerHelper("signed", function (value) {
    const number = parseInt(value) || 0
    return number > 0 ? `+${number}` : `${number}`
  })

  /** Somme de deux nombres. */
  Handlebars.registerHelper("add", function (a, b) {
    return (parseInt(a) || 0) + (parseInt(b) || 0)
  })

  /** Vrai si la valeur figure dans le tableau : cases de langues, listes de choix. */
  Handlebars.registerHelper("includes", function (array, value) {
    return Array.isArray(array) && array.includes(value)
  })
}
