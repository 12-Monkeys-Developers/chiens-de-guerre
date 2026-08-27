import { SYSTEM } from "../config/system.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
const TEMPLATES = `${SYSTEM.PATH}/templates/dialogs`

/** Fenêtre du jet spécial d'initiative, qui produit un total et jamais une réussite. */
export default class CdgInitiativeDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "cdg-initiative-{id}",
    tag: "form",
    classes: ["cdg", "roll", "initiative-roll"],
    position: { width: 520, height: "auto" },
    window: { title: "CDG.combat.initiative.title", icon: "fa-solid fa-stopwatch", resizable: false, contentClasses: ["roll-content"] },
    form: { handler: CdgInitiativeDialog.#onChangeForm, submitOnChange: true, closeOnSubmit: false },
    actions: {
      setEffort: CdgInitiativeDialog.#onSetEffort,
      setPassionMode: CdgInitiativeDialog.#onSetPassionMode,
      roll: CdgInitiativeDialog.#onRoll,
      cancel: CdgInitiativeDialog.#onCancel,
    },
  }

  /** @override */
  static PARTS = {
    body: { template: `${TEMPLATES}/initiative-dialog.hbs` },
    footer: { template: `${TEMPLATES}/initiative-footer.hbs` },
  }

  #combatant

  #draft = { effort: 0, passionPairId: "", passionMode: "bonus", modifier: 0, wound: true, equipment: true, dualWield: true }

  #derived = {}

  /**
   * Construit la fenêtre pour un combattant.
   * @param {Combatant} combatant
   * @param {Object} options
   */
  constructor(combatant, options = {}) {
    super(options)
    this.#combatant = combatant
  }

  /**
   * Ouvre une seule fenêtre par combattant.
   * @param {Combatant} combatant
   */
  static async open(combatant) {
    if (!combatant?.actor) return null
    const id = `cdg-initiative-${combatant.uuid.replaceAll(".", "-")}`
    const existing = foundry.applications.instances.get(id)
    if (existing) {
      existing.bringToFront()
      return existing
    }
    return new this(combatant, { id }).render({ force: true })
  }

  /**
   * Lance sans dépense ni dialogue, pour les commandes collectives du MJ.
   * @param {Combatant} combatant
   */
  static async rollDefault(combatant) {
    if (!combatant?.actor) return null
    const data = this.compute(combatant, {})
    return this.resolve(combatant, data)
  }

  /** @override */
  get title() {
    return game.i18n.format("CDG.combat.initiative.titleFor", { name: this.#combatant.name })
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    this.#derived = this.constructor.compute(this.#combatant, this.#draft)
    Object.assign(context, this.#derived, { draft: this.#draft, actor: this.#combatant.actor, SYSTEM })
    return context
  }

  /**
   * Construit le total et les choix sans modifier l'acteur.
   * @param {Combatant} combatant
   * @param {Object} draft
   */
  static compute(combatant, draft = {}) {
    const actor = combatant.actor
    const system = actor.system
    const mode = combatant.combat?.cdgMode ?? SYSTEM.COMBAT_MODES.skirmish.id
    const skillId = SYSTEM.COMBAT_MODES[mode]?.skill ?? SYSTEM.COMBAT_MODES.skirmish.skill
    const skill = SYSTEM.SKILLS[skillId]
    const rank = system.skills[skillId]?.rank ?? 0
    const rankEntry = SYSTEM.RANKS[rank] ?? SYSTEM.RANKS[0]
    const pool = system.abilities.vivacite
    const canUseEffort = actor.type === "character" || actor.system.major
    const effortMax = canUseEffort ? Math.max(0, Math.min(SYSTEM.MAX_EFFORT, pool.value - 1)) : 0
    draft.effort = Math.clamp(parseInt(draft.effort) || 0, 0, effortMax)

    const passion = this.#passion(actor, draft)
    const wound = draft.wound !== false ? (system.wounds?.malus ?? 0) : 0
    const equipment = draft.equipment !== false ? (system.combat?.initiative?.modifier ?? 0) : 0
    const heldWeapons = actor.heldWeapons ?? []
    const dualWield =
      mode === SYSTEM.COMBAT_MODES.skirmish.id && draft.dualWield !== false && heldWeapons.length === 2 && !actor.shield
        ? (SYSTEM.DUAL_WIELD_INITIATIVE_BONUS[system.skills.sensDuels?.rank ?? 0] ?? 0)
        : 0
    const free = Number(draft.modifier) || 0

    const parts = [{ label: game.i18n.localize("CDG.abilities.long.vivacite"), value: pool.value }]
    if (draft.effort) parts.push({ label: game.i18n.localize("CDG.roll.effort"), value: draft.effort * SYSTEM.EFFORT_BONUS_PER_POINT })
    if (passion.selected) parts.push({ label: passion.selected.label, value: passion.value })
    if (wound) parts.push({ label: game.i18n.localize("CDG.combat.initiative.wounds"), value: wound })
    if (equipment) parts.push({ label: game.i18n.localize("CDG.combat.initiative.equipment"), value: equipment })
    if (dualWield) parts.push({ label: game.i18n.localize("CDG.combat.initiative.dualWield"), value: dualWield })
    if (free) parts.push({ label: game.i18n.localize("CDG.roll.freeModifier"), value: free })

    return {
      mode,
      skill,
      initiativeSkillLabel: game.i18n.localize(skill.label),
      rank,
      rankEntry,
      rankName: game.i18n.localize(rankEntry.label),
      pool,
      canUseEffort,
      effort: draft.effort,
      effortMax,
      effortSteps: Array.fromRange(SYSTEM.MAX_EFFORT + 1).map((value) => ({
        value,
        bonus: value * SYSTEM.EFFORT_BONUS_PER_POINT,
        selected: value === draft.effort,
        disabled: value > effortMax,
      })),
      passion,
      parts,
      fixedTotal: parts.reduce((sum, part) => sum + part.value, 0),
      hasWound: !!system.wounds?.malus,
      woundValue: system.wounds?.malus ?? 0,
      hasEquipment: !!system.combat?.initiative?.modifier,
      equipmentValue: system.combat?.initiative?.modifier ?? 0,
      hasDualWield: mode === SYSTEM.COMBAT_MODES.skirmish.id && heldWeapons.length === 2 && !actor.shield,
      dualWieldValue: SYSTEM.DUAL_WIELD_INITIATIVE_BONUS[system.skills.sensDuels?.rank ?? 0] ?? 0,
    }
  }

  /**
   * Calcule les traits invocables avec les mêmes contraintes que le test normal.
   * @param {CdgActor} actor
   * @param {Object} draft
   */
  static #passion(actor, draft) {
    if (actor.type !== "character") return { available: false, choices: [], selected: null, value: 0 }
    const invoked = new Set(actor.system.passion.invokedThisSession)
    const choices = Object.values(SYSTEM.TRAIT_PAIRS)
      .map((pair) => ({ pair, trait: actor.system.traits[pair.id] }))
      .filter(({ pair, trait }) => trait.dominant && trait.value > 0 && !invoked.has(pair.id))
      .map(({ pair, trait }) => ({
        id: pair.id,
        label: game.i18n.localize(trait.dominant === SYSTEM.TRAIT_SIDES.vice.id ? pair.vice : pair.virtue),
        value: trait.value,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))

    const selected = choices.find((choice) => choice.id === draft.passionPairId) ?? null
    const canSpend = actor.system.passion.tokens > 0
    if (!canSpend && draft.passionMode === "bonus") draft.passionMode = "malus"
    const value = selected ? (draft.passionMode === "bonus" ? selected.value : -selected.value) : 0
    return { available: true, choices, selected, value, tokens: actor.system.passion.tokens, canSpend, mode: draft.passionMode }
  }

  /**
   * Évalue les dés, applique les dépenses et inscrit le total sur le Combatant.
   * @param {Combatant} combatant
   * @param {Object} data
   */
  static async resolve(combatant, data) {
    const actor = combatant.actor
    const roll = await new Roll(data.rankEntry.formula).evaluate()
    const results = roll.dice[0]?.results.map((result) => result.result) ?? []
    const kept = data.rankEntry.keep === "worst" ? Math.min(...results) : Math.max(...results)
    const total = kept + data.fixedTotal

    const updates = {}
    const effort = data.effort ?? 0
    if (effort > 0) updates["system.abilities.vivacite.value"] = data.pool.value - effort
    if (data.passion.selected) {
      updates["system.passion.tokens"] = actor.system.passion.tokens + (data.passion.mode === "bonus" ? -1 : 1)
      updates["system.passion.invokedThisSession"] = [...actor.system.passion.invokedThisSession, data.passion.selected.id]
    }
    if (!foundry.utils.isEmpty(updates)) await actor.update(updates)
    await combatant.update({ initiative: total })

    const breakdown = data.parts.map((part) => `<li><span>${part.label}</span><strong>${part.value > 0 ? "+" : ""}${part.value}</strong></li>`).join("")
    const name = foundry.utils.escapeHTML(combatant.name)
    const content = `<section class="cdg chat-card initiative-card"><header><h3>${game.i18n.localize("CDG.combat.initiative.chatTitle")}</h3><strong>${name}</strong></header><p>${data.initiativeSkillLabel} (${data.rankName}) : ${results.join(", ")} — ${game.i18n.localize("CDG.combat.initiative.kept")} <strong>${kept}</strong></p><ul>${breakdown}</ul><div class="initiative-total">${game.i18n.localize("CDG.label.long.initiative")} <strong>${total}</strong></div></section>`
    const whisper = combatant.hidden ? ChatMessage.getWhisperRecipients("GM").map((user) => user.id) : []
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll], whisper, flags: { "core.initiativeRoll": true } })
    await combatant.combat?.activateHighestInitiative()
    return total
  }

  static async #onChangeForm(event, form, formData) {
    foundry.utils.mergeObject(this.#draft, foundry.utils.expandObject(formData.object))
    this.render()
  }

  static async #onSetEffort(event, target) {
    this.#draft.effort = parseInt(target.dataset.value) || 0
    this.render()
  }

  static async #onSetPassionMode(event, target) {
    if (!["bonus", "malus"].includes(target.dataset.mode)) return
    this.#draft.passionMode = target.dataset.mode
    this.render()
  }

  static async #onRoll() {
    const data = { ...this.#derived, effort: this.#draft.effort }
    await this.constructor.resolve(this.#combatant, data)
    return this.close()
  }

  static async #onCancel() {
    return this.close()
  }
}
