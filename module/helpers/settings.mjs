import { SYSTEM } from "../config/system.mjs"
import CdgBattleAdversariesConfig from "../applications/battle-adversaries-config.mjs"

/**
 * Enregistre les réglages du système.
 */
export function registerSystemSettings() {
  game.settings.register(SYSTEM.PACKAGE_ID, "debugMode", {
    name: "CDG.settings.debugMode.name",
    hint: "CDG.settings.debugMode.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  })

  /**
   * Les esquives et la parade se rechargent d'office à chaque fin de round. Les tables qui
   * préfèrent tenir ces compteurs à la main peuvent désactiver la remise à zéro.
   */
  game.settings.register(SYSTEM.PACKAGE_ID, "autoResetRoundCounters", {
    name: "CDG.settings.autoResetRoundCounters.name",
    hint: "CDG.settings.autoResetRoundCounters.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  })

  /**
   * Table des adversaires en bataille (p. 52) : les profils de chaque tranche du d20, quand le
   * Meneur les a changés. Seules les tranches modifiées y figurent, par leurs bornes (« 7-8 »).
   */
  game.settings.register(SYSTEM.PACKAGE_ID, "battleAdversaries", {
    scope: "world",
    config: false,
    type: Object,
    default: {},
  })

  game.settings.registerMenu(SYSTEM.PACKAGE_ID, "battleAdversariesMenu", {
    name: "CDG.settings.battleAdversaries.name",
    label: "CDG.settings.battleAdversaries.label",
    hint: "CDG.settings.battleAdversaries.hint",
    icon: "fa-solid fa-table-list",
    type: CdgBattleAdversariesConfig,
    restricted: true,
  })
}
