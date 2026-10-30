import { SYSTEM } from "../config/system.mjs"

const CoreCombatTracker = foundry.applications.sidebar.tabs.CombatTracker

/** Combat Tracker v14 enrichi des deux cadences de Chiens de guerre. */
export default class CdgCombatTracker extends CoreCombatTracker {
  /** @override */
  static DEFAULT_OPTIONS = {
    ...super.DEFAULT_OPTIONS,
    classes: [...(super.DEFAULT_OPTIONS.classes ?? []), "cdg", "cdg-combat-tracker"],
    actions: {
      ...super.DEFAULT_OPTIONS.actions,
      setCombatMode: CdgCombatTracker.#onSetCombatMode,
      completeCdgAction: CdgCombatTracker.#onCompleteAction,
      adjustDuelTouch: CdgCombatTracker.#onAdjustDuelTouch,
      assignDuelAttacker: CdgCombatTracker.#onAssignDuelAttacker,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/combat/header.hbs` },
    tracker: { template: `${SYSTEM.PATH}/templates/combat/tracker.hbs`, scrollable: [""] },
    footer: { template: `${SYSTEM.PATH}/templates/combat/footer.hbs` },
  }

  /** @override */
  _attachFrameListeners() {
    super._attachFrameListeners()
    this.element.addEventListener("change", this.#onCdgSettingChange.bind(this))
    this.element.addEventListener("click", this.#onIndividualInitiativeClick.bind(this), { capture: true })
  }

  /** @override */
  async _prepareCombatContext(context, options) {
    await super._prepareCombatContext(context, options)
    this.#enrichCdgContext(context)
  }

  /** @override */
  async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options)
    this.#enrichCdgContext(context)
  }

  /**
   * Ajoute les réglages communs aux trois parties du Tracker.
   * @param {Object} context
   */
  #enrichCdgContext(context) {
    const combat = this.viewed
    if (!combat) return
    const settings = combat.duelSettings
    const hasCurrentAction =
      combat.cdgMode === SYSTEM.COMBAT_MODES.duel.id ? !!combat.duelAttackerId : Number.isFinite(combat.combatant?.initiative) && combat.combatant.initiative > 0
    Object.assign(context, {
      cdgMode: combat.cdgMode,
      isSkirmish: combat.cdgMode === SYSTEM.COMBAT_MODES.skirmish.id,
      isDuel: combat.cdgMode === SYSTEM.COMBAT_MODES.duel.id,
      initiativesReady: combat.initiativesReady,
      duelTied: combat.duelTied,
      duelType: settings.type,
      duelTarget: settings.target,
      duelFormal: settings.formal,
      duelIsPlaisance: combat.cdgMode === SYSTEM.COMBAT_MODES.duel.id && settings.type === SYSTEM.DUEL_TYPES.plaisance.id,
      duelParticipantWarning: combat.cdgMode === SYSTEM.COMBAT_MODES.duel.id && combat.activeCombatants.length !== 2,
      cdgCanAdvance: hasCurrentAction && (game.user.isGM || combat.combatant?.isOwner),
      combatStarted: combat.started,
      combatModeEditable: game.user.isGM && !combat.started,
      combatModes: Object.values(SYSTEM.COMBAT_MODES),
      duelTypes: Object.values(SYSTEM.DUEL_TYPES),
      duelTargets: SYSTEM.DUEL_TOUCH_TARGETS.map((value) => ({ value, label: String(value) })),
    })
  }

  /** @override */
  async _prepareTurnContext(combat, combatant, index) {
    const turn = await super._prepareTurnContext(combat, combatant, index)
    const attackerId = combat.duelAttackerId
    // Un adversaire inconscient est grisé comme un vaincu : il ne jouera plus ce round.
    const out = combat.constructor.isOut(combatant)
    if (out && !turn.isDefeated) turn.css = [turn.css, "defeated"].filterJoin(" ")
    turn.actionsRemaining = !out && Number.isFinite(combatant.initiative) && combatant.initiative > 0 ? Math.ceil(combatant.initiative / SYSTEM.INITIATIVE_ACTION_COST) : 0
    // En escarmouche, une initiative tombée à zéro ou moins n'est plus affichée : le combattant a
    // joué toutes ses actions du round. En duel, elle ne sert qu'à désigner l'attaquant.
    turn.initiativeSpent = combat.cdgMode !== SYSTEM.COMBAT_MODES.duel.id && Number.isFinite(combatant.initiative) && combatant.initiative <= 0
    turn.touches = combat.touchesFor(combatant)
    turn.isAttacker = combat.cdgMode === SYSTEM.COMBAT_MODES.duel.id && attackerId === combatant.id
    turn.isDefender = combat.cdgMode === SYSTEM.COMBAT_MODES.duel.id && !!attackerId && attackerId !== combatant.id && combat.duelists.some((entry) => entry.id === combatant.id)
    turn.canAssignAttacker = game.user.isGM && combat.duelTied && combat.duelists.some((entry) => entry.id === combatant.id)
    return turn
  }

  async #onCdgSettingChange(event) {
    const target = event.target.closest("[data-cdg-setting]")
    if (!target || !game.user.isGM || !this.viewed || this.viewed.started) return
    await this.viewed.setDuelSetting(target.dataset.cdgSetting, target.type === "checkbox" ? target.checked : target.value)
  }

  /**
   * Un jet individuel ouvre les choix d'Effort et de Passion : le bouton est intercepté en capture,
   * avant le routeur d'actions de Foundry, qui passerait un tableau d'identifiants à
   * `Combat#rollInitiative` et ferait prendre le chemin des jets collectifs, sans fenêtre.
   *
   * Seul chemin du jet individuel : l'action `rollInitiative` du cœur n'est plus atteinte que par
   * un clic sur un combattant qu'on ne possède pas, qui ne lance alors rien.
   * @param {MouseEvent} event
   */
  async #onIndividualInitiativeClick(event) {
    const target = event.target.closest("[data-action='rollInitiative']")
    if (!target || !this.element.contains(target)) return

    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId
    const combatant = this.viewed?.combatants.get(combatantId)
    if (!combatant?.isOwner) return

    event.preventDefault()
    event.stopImmediatePropagation()
    await this.viewed.rollInitiative(combatantId)
  }

  static async #onSetCombatMode(event, target) {
    if (!game.user.isGM || this.viewed?.started) return
    return this.viewed?.setCdgMode(target.dataset.mode)
  }

  static async #onCompleteAction() {
    return this.viewed?.nextTurn()
  }

  static async #onAdjustDuelTouch(event, target) {
    if (!game.user.isGM) return
    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId
    return this.viewed?.adjustDuelTouches(combatantId, Number(target.dataset.delta))
  }

  static async #onAssignDuelAttacker(event, target) {
    if (!game.user.isGM) return
    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId
    return this.viewed?.assignDuelAttacker(combatantId)
  }
}
