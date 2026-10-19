import CdgInitiativeDialog from "../applications/initiative-dialog.mjs"
import { SYSTEM } from "../config/system.mjs"
import CdgDyingPrompt from "../combat/dying-prompt.mjs"
import Utils from "../helpers/utils.mjs"

/** Combat Foundry adapté aux cadences d'escarmouche et de duel. */
export default class CdgCombat extends Combat {
  get cdgMode() {
    const mode = this.getFlag(SYSTEM.PACKAGE_ID, "mode")
    return SYSTEM.COMBAT_MODES[mode] ? mode : SYSTEM.COMBAT_MODES.skirmish.id
  }

  get duelSettings() {
    const type = this.getFlag(SYSTEM.PACKAGE_ID, "duel.type")
    const target = Number(this.getFlag(SYSTEM.PACKAGE_ID, "duel.target"))
    return {
      type: SYSTEM.DUEL_TYPES[type] ? type : SYSTEM.DUEL_TYPES.plaisance.id,
      target: SYSTEM.DUEL_TOUCH_TARGETS.includes(target) ? target : 1,
      formal: this.getFlag(SYSTEM.PACKAGE_ID, "duel.formal") !== false,
      attackerOverride: this.getFlag(SYSTEM.PACKAGE_ID, "duel.attackerOverride") ?? null,
    }
  }

  /**
   * Un combattant hors de combat ne compte plus pour l'initiative du round et ne prend plus la main :
   * vaincu (marqué par le Meneur), ou adversaire dont toutes les cases de blessure mortelle sont
   * cochées — inconscient, il ne se relèvera pas de lui-même, et le rappel de survie ne vaut que
   * pour les personnages des joueurs. Décocher une case le fait revenir dans le round.
   * @param {Combatant} combatant
   * @returns {boolean}
   */
  static isOut(combatant) {
    if (combatant.isDefeated) return true
    const actor = combatant.actor
    return actor?.type === "adversaire" && !!actor.system.isDying
  }

  get activeCombatants() {
    return this.combatants.filter((combatant) => !this.constructor.isOut(combatant))
  }

  get duelists() {
    const combatants = this.activeCombatants
    return combatants.length === 2 ? combatants : []
  }

  get initiativesReady() {
    const combatants = this.cdgMode === SYSTEM.COMBAT_MODES.duel.id ? this.duelists : this.activeCombatants
    return combatants.length > 0 && combatants.every((combatant) => Number.isFinite(combatant.initiative))
  }

  get duelAttackerId() {
    if (!this.initiativesReady || this.duelists.length !== 2) return null
    const [first, second] = this.duelists
    if (first.initiative === second.initiative) return this.duelSettings.attackerOverride
    return first.initiative > second.initiative ? first.id : second.id
  }

  get duelTied() {
    return this.initiativesReady && this.duelists[0]?.initiative === this.duelists[1]?.initiative && !this.duelAttackerId
  }

  touchesFor(combatant) {
    return Number(combatant?.getFlag(SYSTEM.PACKAGE_ID, "duelTouches")) || 0
  }

  async setCdgMode(mode) {
    if (this.started) {
      ui.notifications.warn("CDG.combat.modeLocked", { localize: true })
      return this
    }
    if (!SYSTEM.COMBAT_MODES[mode] || mode === this.cdgMode) return this
    await this.setFlag(SYSTEM.PACKAGE_ID, "mode", mode)
    await this.resetAll({ updateTurn: false })
    await this.update({ turn: null })
    if (this.started) this.#warnDuelConfiguration()
    return this
  }

  async setDuelSetting(key, value) {
    if (this.started && key !== "attackerOverride") {
      ui.notifications.warn("CDG.combat.modeLocked", { localize: true })
      return this
    }
    if (key === "type" && !SYSTEM.DUEL_TYPES[value]) return this
    if (key === "target") {
      value = Number(value)
      if (!SYSTEM.DUEL_TOUCH_TARGETS.includes(value)) return this
    }
    if (key === "formal") value = value === true || value === "true"
    await this.setFlag(SYSTEM.PACKAGE_ID, `duel.${key}`, value)
    return this
  }

  async adjustDuelTouches(combatantId, delta) {
    const combatant = this.combatants.get(combatantId)
    if (!combatant || !game.user.isGM) return this
    const touches = Math.max(0, this.touchesFor(combatant) + delta)
    await combatant.setFlag(SYSTEM.PACKAGE_ID, "duelTouches", touches)
    const settings = this.duelSettings
    if (settings.type === SYSTEM.DUEL_TYPES.plaisance.id && touches >= settings.target) {
      ui.notifications.info(game.i18n.format("CDG.combat.duel.victory", { name: combatant.name, touches }))
    }
    return this
  }

  async assignDuelAttacker(combatantId) {
    if (!this.duelists.some((combatant) => combatant.id === combatantId)) return this
    await this.setDuelSetting("attackerOverride", combatantId)
    return this.activateHighestInitiative()
  }

  /** @override */
  async startCombat() {
    this.#warnDuelConfiguration()
    await this.resetAll({ updateTurn: false })
    await super.startCombat()
    await this.update({ turn: null })
    return this
  }

  /** @override */
  async rollInitiative(ids) {
    if (!this.started) {
      ui.notifications.warn("CDG.combat.initiative.notStarted", { localize: true })
      return this
    }
    const individual = typeof ids === "string"
    ids = typeof ids === "string" ? [ids] : ids
    const combatants = ids.map((id) => this.combatants.get(id)).filter((combatant) => combatant?.isOwner && combatant.actor)
    if (individual && combatants.length === 1) {
      await CdgInitiativeDialog.open(combatants[0])
      return this
    }
    for (const combatant of combatants) await CdgInitiativeDialog.rollDefault(combatant)
    return this
  }

  async activateHighestInitiative() {
    if (!this.started || !this.initiativesReady) return this
    this.setupTurns()

    let combatant
    if (this.cdgMode === SYSTEM.COMBAT_MODES.duel.id) {
      if (!this.duelAttackerId) {
        await this.update({ turn: null })
        return this
      }
      combatant = this.combatants.get(this.duelAttackerId)
    } else combatant = this.turns.find((turn) => !this.constructor.isOut(turn) && turn.initiative > 0)

    const turn = combatant ? this.turns.findIndex((entry) => entry.id === combatant.id) : null
    if (turn !== this.turn) await this.update({ turn })
    return this
  }

  /** @override */
  async nextTurn() {
    if (!this.started) return this.nextRound()
    if (this.cdgMode === SYSTEM.COMBAT_MODES.duel.id) return this.completeDuelExchange()
    return this.completeSkirmishAction()
  }

  async completeSkirmishAction() {
    const combatant = this.combatant
    if (!combatant || !Number.isFinite(combatant.initiative)) return this
    await combatant.update({ initiative: combatant.initiative - SYSTEM.INITIATIVE_ACTION_COST })
    this.setupTurns()
    const next = this.turns.find((turn) => !this.constructor.isOut(turn) && turn.initiative > 0)
    if (!next) return this.nextRound()
    await this.update({ turn: this.turns.findIndex((turn) => turn.id === next.id) })
    return this
  }

  async completeDuelExchange() {
    if (!this.duelAttackerId) {
      ui.notifications.warn("CDG.combat.duel.noAttacker", { localize: true })
      return this
    }
    return this.nextRound()
  }

  /** @override */
  async nextRound() {
    await super.nextRound()
    await this.resetAll({ updateTurn: false })
    await this.unsetFlag(SYSTEM.PACKAGE_ID, "duel.attackerOverride")
    await this.update({ turn: null })
    return this
  }

  /** @override */
  async _onEndRound(context) {
    await super._onEndRound(context)
    if (game.settings.get(SYSTEM.PACKAGE_ID, "autoResetRoundCounters")) {
      for (const combatant of this.combatants) await combatant.actor?.resetRoundCounters()
      if (CONFIG.debug.cdg?.combat) console.debug(Utils.log("Fin de round : esquives et parade réinitialisées"))
    }
    await CdgDyingPrompt.postForCombat(this)
  }

  #warnDuelConfiguration() {
    if (this.cdgMode !== SYSTEM.COMBAT_MODES.duel.id) return
    if (this.activeCombatants.length !== 2) ui.notifications.warn("CDG.combat.duel.warnings.participants", { localize: true })
    if (!this.duelSettings.formal) return
    for (const combatant of this.activeCombatants) {
      const actor = combatant.actor
      if (!actor) continue
      const weapon = actor.heldWeapons?.[0]
      const invalidWeapon = actor.heldWeapons?.length !== 1 || weapon?.system.isRangedWeapon || weapon?.system.category === "lourde"
      if (actor.armor || actor.shield || invalidWeapon) {
        ui.notifications.warn(game.i18n.format("CDG.combat.duel.warnings.equipment", { name: combatant.name }))
      }
    }
  }
}
