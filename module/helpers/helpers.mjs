import { SYSTEM } from "../config/system.mjs"
import { signed } from "./format.mjs"

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

  /** Info-bulle d'un rang : « Professionnel — 2d20, le meilleur ». */
  Handlebars.registerHelper("rankTooltip", function (rank) {
    const entry = SYSTEM.RANKS[rank] ?? SYSTEM.RANKS[SYSTEM.DEFAULT_RANK]
    return `${game.i18n.localize(entry.label)} — ${game.i18n.localize(entry.hint)}`
  })

  /** Nombre signé, pour les malus et les modificateurs. */
  Handlebars.registerHelper("signed", function (value) {
    return signed(parseInt(value) || 0)
  })

  Handlebars.registerHelper("formulabreakdown", function (parts) {
    let stringFormula = ""
    for (let part of parts) {
      stringFormula += `${part.label} ${part.value} `
    }
    return stringFormula
  })

  Handlebars.registerHelper("allegeanceIcon", function (value) {
    if (value === "obscurite") return "fas fa-moon"
    if (value === "balance") return "fas fa-scale-balanced"
    return "fa-light fa-sun"
  })
}
