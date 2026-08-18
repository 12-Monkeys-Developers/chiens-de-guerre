import { SYSTEM } from "../config/system.mjs"
import Utils from "../helpers/utils.mjs"

export default class CdgCombat extends Combat {
  /**
   * Les esquives et la parade se rechargent à chaque round : la première esquive du round suivant
   * repart sans malus, et la parade redevient disponible.
   * @inheritDoc
   */
  async _onEndRound(context) {
    await super._onEndRound(context)

    if (!game.settings.get(SYSTEM.PACKAGE_ID, "autoResetRoundCounters")) return

    for (const combatant of this.combatants) {
      await combatant.actor?.resetRoundCounters()
    }

    if (CONFIG.debug.cdg?.combat) console.debug(Utils.log("Fin de round : esquives et parade réinitialisées"))
  }
}
