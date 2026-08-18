import { SYSTEM } from "../config/system.mjs"

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
}
