import { SYSTEM } from "../config/system.mjs"
import CdgBattle from "../combat/battle.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/**
 * La fenêtre « Bataille » d'une compagnie franche (p. 51-54) : préparation par le Meneur, puis
 * déroulé des tours phase par phase. Une fenêtre par compagnie, ouverte par tous ceux qui voient la
 * compagnie ; l'état vit dans la compagnie (voir `CdgBattle`), la fenêtre ne fait que l'afficher.
 */
export default class CdgBattleApp extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["cdg", "battle"],
    tag: "form",
    position: {
      width: 820,
      height: "auto",
    },
    window: {
      icon: "fa-solid fa-chess-rook",
      resizable: true,
    },
    form: {
      handler: CdgBattleApp.#onChangeForm,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      start: CdgBattleApp.#onStart,
      clearGeneral: CdgBattleApp.#onClearGeneral,
      setPosition: CdgBattleApp.#onSetPosition,
      battleAction: CdgBattleApp.#onBattleAction,
      phase: CdgBattleApp.#onPhase,
      points: CdgBattleApp.#onPoints,
      rollGeneralCompany: CdgBattleApp.#onRollGeneralCompany,
      rollGeneralEnemy: CdgBattleApp.#onRollGeneralEnemy,
      rollLosses: CdgBattleApp.#onRollLosses,
      abandon: CdgBattleApp.#onAbandon,
      openActor: CdgBattleApp.#onOpenActor,
    },
  }

  /** @override */
  static PARTS = {
    body: { template: `${SYSTEM.PATH}/templates/battle/battle-app.hbs`, templates: [CdgBattle.TEMPLATES.consequences], scrollable: [""] },
  }

  /** La compagnie franche qui livre bataille. */
  #company

  /** La préparation en cours de saisie, avant que le Meneur n'engage la bataille. */
  #draft = { stake: "", modifier: 0, armyQuality: "normal", chiefUuid: "", general: { actorUuid: "", name: "", esprit: 10, tactique: 1 } }

  /** Le crochet qui retrace la fenêtre au moindre changement de la compagnie ou d'un PJ. */
  #hookId = null

  constructor(company, options = {}) {
    super(options)
    this.#company = company
  }

  /**
   * Ouvre la fenêtre de bataille d'une compagnie, ou la ramène au premier plan.
   * @param {CdgActor} company
   * @returns {Promise<CdgBattleApp>}
   */
  static async open(company) {
    if (company?.type !== "compagnie") return null
    const id = `cdg-battle-${company.id}`
    const existing = foundry.applications.instances.get(id)
    if (existing) {
      existing.bringToFront()
      return existing.render()
    }
    return new this(company, { id }).render({ force: true })
  }

  /** @override */
  get title() {
    return game.i18n.format("CDG.battle.title", { company: this.#company.name })
  }

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options)
    this.#hookId = Hooks.on("updateActor", (actor) => {
      const state = CdgBattle.getState(this.#company)
      if (actor === this.#company || state?.members[actor.id]) this.render()
    })
  }

  /** @override */
  _onClose(options) {
    super._onClose(options)
    Hooks.off("updateActor", this.#hookId)
  }

  // #region Contexte

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    const company = this.#company
    const state = CdgBattle.getState(company)
    Object.assign(context, { company, isGM: game.user.isGM, state, SYSTEM })
    if (!state) return Object.assign(context, this.#setupContext())

    const phases = Object.values(SYSTEM.BATTLE_PHASES).sort((a, b) => a.order - b.order)
    const phaseIndex = phases.findIndex((phase) => phase.id === state.phase)
    const isPhase = (id) => state.phase === id
    const chief = CdgBattle.chief(state)
    const outcome = (result) => CdgBattle.outcomeName(result)

    return Object.assign(context, {
      phases: phases.map((phase, index) => ({ ...phase, current: index === phaseIndex, done: index < phaseIndex })),
      phaseLocation: isPhase("location"),
      phaseFights: isPhase("fights") || isPhase("exploits"),
      phaseExploits: isPhase("exploits"),
      phaseGenerals: isPhase("generals"),
      phaseLosses: isPhase("losses"),
      nextLabel: isPhase("losses") ? (state.winner ? "CDG.battle.conclude" : "CDG.battle.nextTurn") : "CDG.battle.nextPhase",
      modifier: CdgBattle.modifierLabel(state.modifier),
      armyLabel: game.i18n.localize(SYSTEM.BATTLE_ARMY_QUALITIES[state.armyQuality].label),
      winnerLabel: state.winner ? game.i18n.format(`CDG.battle.winner.${state.winner}`, { company: company.name, enemy: state.general.name }) : null,
      tie: !state.winner && state.points.company === state.points.enemy && state.points.company >= SYSTEM.BATTLE_VICTORY_POINTS,
      members: Object.keys(state.members)
        .map((actorId) => CdgBattle.memberView(company, state, actorId))
        .filter(Boolean),
      chiefChoices: this.#chiefChoices(),
      chiefName: chief?.name ?? null,
      chiefId: chief?.id ?? null,
      canRollCompany: chief ? chief.isOwner : company.isOwner,
      generals: {
        company: outcome(state.generals.company),
        enemy: outcome(state.generals.enemy),
        result: state.generals.result
          ? game.i18n.format(`CDG.battle.generals.points.${state.generals.result.side}`, { points: state.generals.result.points, company: company.name, enemy: state.general.name })
          : null,
        lossModifier: state.generals.result?.lossModifier ?? 0,
      },
      losses: state.losses
        ? {
            outcome: outcome(state.losses.outcome),
            wound: state.losses.applied ? game.i18n.localize(SYSTEM.WOUND_LEVELS[state.losses.applied].labelComp) : game.i18n.localize("CDG.battle.noLosses"),
          }
        : null,
      lossModifier: state.generals.result?.lossModifier ?? 0,
    })
  }

  /**
   * Contexte de la préparation : la saisie du Meneur, et ce que voient les joueurs en attendant.
   * @returns {Object}
   */
  #setupContext() {
    const general = this.#draft.general.actorUuid ? fromUuidSync(this.#draft.general.actorUuid) : null
    return {
      draft: this.#draft,
      generalActor: general,
      modifierChoices: Array.fromRange(SYSTEM.BATTLE_MODIFIER_MAX - SYSTEM.BATTLE_MODIFIER_MIN + 1, SYSTEM.BATTLE_MODIFIER_MIN).map((value) => ({
        value,
        label: CdgBattle.modifierLabel(value),
      })),
      armyChoices: Object.values(SYSTEM.BATTLE_ARMY_QUALITIES).map((entry) => ({ id: entry.id, label: game.i18n.localize(entry.label) })),
      rankChoices: Object.values(SYSTEM.RANKS).map((rank) => ({ id: rank.id, label: `${rank.id} — ${game.i18n.localize(rank.label)}` })),
      chiefChoices: this.#chiefChoices(),
      rosterCount: CdgBattle.rosterActors(this.#company).length,
    }
  }

  /**
   * Le chef d'armée : la compagnie (test d'Effectifs / Tactique) ou l'un des PJ du roster, avec son
   * grade pour mémoire — il faut d'ordinaire être sergent ou mieux (p. 53), mais le Meneur tranche.
   * @returns {{value: string, label: string}[]}
   */
  #chiefChoices() {
    const choices = [{ value: "", label: game.i18n.localize("CDG.battle.chief.company") }]
    for (const entry of this.#company.system.rosterPJ) {
      const actor = entry.actorUuid ? fromUuidSync(entry.actorUuid) : null
      if (actor?.type !== "character") continue
      const grade = entry.grade ? ` (${game.i18n.localize(SYSTEM.COMPANY_GRADES[entry.grade].label)})` : ""
      choices.push({ value: actor.uuid, label: `${actor.name}${grade}` })
    }
    return choices
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options)
    CdgBattle.filterButtons(this.element)
    // Le général adverse se dépose depuis la barre latérale ou le compendium des PNJ.
    const drop = this.element.querySelector(".general-drop")
    drop?.addEventListener("dragover", (event) => event.preventDefault())
    drop?.addEventListener("drop", (event) => this.#onDropGeneral(event))
  }

  // #endregion

  // #region Actions

  /**
   * Préparation : la saisie reste dans la fenêtre. Pendant la bataille, seul le chef d'armée se
   * change par le formulaire.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onChangeForm(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object)
    if (CdgBattle.getState(this.#company)) {
      if (game.user.isGM && "chiefUuid" in data) await CdgBattle.request(this.#company, { type: "chief", chiefUuid: data.chiefUuid })
      return
    }
    foundry.utils.mergeObject(this.#draft, data)
    this.#draft.modifier = Number(this.#draft.modifier) || 0
    this.render()
  }

  async #onDropGeneral(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data?.type !== "Actor") return
    const actor = await fromUuid(data.uuid)
    if (actor?.type !== "adversaire") return ui.notifications.warn("CDG.battle.general.adversaryOnly", { localize: true })
    this.#draft.general = { actorUuid: actor.uuid, name: actor.name, esprit: actor.system.abilities.esprit.value, tactique: actor.system.skills.tactique?.rank ?? 0 }
    this.render()
  }

  static async #onClearGeneral() {
    this.#draft.general.actorUuid = ""
    this.render()
  }

  static async #onStart() {
    if (!game.user.isGM) return
    if (!CdgBattle.rosterActors(this.#company).length) ui.notifications.warn("CDG.battle.notif.noMembers", { localize: true })
    return CdgBattle.request(this.#company, { type: "start", setup: this.#draft })
  }

  static async #onSetPosition(event, target) {
    const actorId = target.closest("[data-actor-id]")?.dataset.actorId
    return CdgBattle.request(this.#company, { type: "position", actorId, position: target.dataset.position })
  }

  static async #onBattleAction(event, target) {
    return CdgBattle.runAction(this.#company, target)
  }

  static async #onPhase(event, target) {
    return CdgBattle.request(this.#company, { type: "phase", direction: Number(target.dataset.direction) })
  }

  static async #onPoints(event, target) {
    return CdgBattle.request(this.#company, { type: "points", side: target.dataset.side, delta: Number(target.dataset.delta) })
  }

  static async #onRollGeneralCompany() {
    return CdgBattle.rollGeneralCompany(this.#company)
  }

  static async #onRollGeneralEnemy() {
    return CdgBattle.rollGeneralEnemy(this.#company)
  }

  static async #onRollLosses() {
    return CdgBattle.rollLosses(this.#company)
  }

  static async #onAbandon() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CDG.battle.abandon") },
      content: `<p>${game.i18n.localize("CDG.battle.abandonConfirm")}</p>`,
      rejectClose: false,
    })
    if (confirmed) return CdgBattle.request(this.#company, { type: "abandon" })
  }

  static async #onOpenActor(event, target) {
    return game.actors.get(target.closest("[data-actor-id]")?.dataset.actorId)?.sheet.render(true)
  }

  // #endregion
}
