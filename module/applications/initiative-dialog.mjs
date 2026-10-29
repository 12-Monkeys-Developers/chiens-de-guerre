import { SYSTEM } from "../config/system.mjs"
import { invocablePassions, passionUpdates } from "../helpers/passion.mjs"
import Utils from "../helpers/utils.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
const TEMPLATES = `${SYSTEM.PATH}/templates/dialogs`

/**
 * Fenêtre du jet spécial d'initiative, qui produit un total et jamais une réussite.
 *
 * Elle travaille sur un combattant, dont elle inscrit le total, ou sur un acteur seul : lancée depuis
 * la fiche sans combat, ou pour un personnage absent du combat, l'initiative ne s'inscrit nulle part
 * et n'apparaît que dans le tchat.
 */
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

  #actor

  #draft = { effort: 0, passionPairId: "", passionMode: "bonus", modifier: 0, wound: true, equipment: true, dualWield: true }

  #derived = {}

  /**
   * Construit la fenêtre pour un combattant ou un acteur hors combat.
   * @param {Combatant|Actor} target
   * @param {Object} options
   */
  constructor(target, options = {}) {
    super(options)
    const { actor, combatant } = this.constructor.subject(target)
    this.#actor = actor
    this.#combatant = combatant
  }

  /**
   * L'acteur qui lance et, s'il y en a un, le combattant qui reçoit le total.
   * @param {Combatant|Actor} target
   * @returns {{actor: Actor|null, combatant: Combatant|null}}
   */
  static subject(target) {
    if (target?.documentName === "Combatant") return { actor: target.actor, combatant: target }
    return { actor: target ?? null, combatant: null }
  }

  /**
   * Ouvre une seule fenêtre par combattant ou par acteur.
   * @param {Combatant|Actor} target
   */
  static async open(target) {
    if (!this.subject(target).actor) return null
    const id = `cdg-initiative-${target.uuid.replaceAll(".", "-")}`
    const existing = foundry.applications.instances.get(id)
    if (existing) {
      existing.bringToFront()
      return existing
    }
    return new this(target, { id }).render({ force: true })
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
    return game.i18n.format("CDG.combat.initiative.titleFor", { name: this.#combatant?.name ?? this.#actor.name })
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    this.#derived = this.constructor.compute(this.#combatant ?? this.#actor, this.#draft)
    Object.assign(context, this.#derived, { draft: this.#draft, actor: this.#actor, SYSTEM })
    return context
  }

  /**
   * Construit le total et les choix sans modifier l'acteur. Hors combat, l'escarmouche fait foi.
   * @param {Combatant|Actor} target
   * @param {Object} draft
   */
  static compute(target, draft = {}) {
    const { actor, combatant } = this.subject(target)
    const system = actor.system
    const mode = combatant?.combat?.cdgMode ?? SYSTEM.COMBAT_MODES.skirmish.id
    const skillId = SYSTEM.COMBAT_MODES[mode]?.skill ?? SYSTEM.COMBAT_MODES.skirmish.skill
    const skill = SYSTEM.SKILLS[skillId]
    const rank = system.skills[skillId]?.rank ?? 0
    const rankEntry = SYSTEM.RANKS[rank] ?? SYSTEM.RANKS[0]
    const pool = system.abilities.vivacite
    const canUseEffort = actor.type === "character" || actor.system.major
    const effortMax = canUseEffort ? Math.max(0, Math.min(SYSTEM.MAX_EFFORT, pool.value - 1)) : 0
    draft.effort = Math.clamp(parseInt(draft.effort) || 0, 0, effortMax)

    const passion = invocablePassions(actor, draft)
    const wound = draft.wound !== false ? (system.wounds?.malus ?? 0) : 0
    const equipment = draft.equipment !== false ? (system.combat?.initiative?.modifier ?? 0) : 0
    const dualWieldEligible = actor.canDualWield
    const dualWield = mode === SYSTEM.COMBAT_MODES.skirmish.id && draft.dualWield !== false && dualWieldEligible ? actor.dualWieldInitiativeBonus : 0
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
      hasDualWield: mode === SYSTEM.COMBAT_MODES.skirmish.id && dualWieldEligible,
      dualWieldValue: actor.dualWieldInitiativeBonus,
    }
  }

  /**
   * Évalue les dés, applique les dépenses et inscrit le total sur le combattant, s'il y en a un.
   * @param {Combatant|Actor} target
   * @param {Object} data
   */
  static async resolve(target, data) {
    const { actor, combatant } = this.subject(target)
    const roll = await new Roll(data.rankEntry.formula).evaluate()
    const results = roll.dice[0]?.results.map((result) => result.result) ?? []
    const kept = data.rankEntry.keep === "worst" ? Math.min(...results) : Math.max(...results)
    const total = kept + data.fixedTotal

    const updates = {}
    const effort = data.effort ?? 0
    if (effort > 0) updates["system.abilities.vivacite.value"] = data.pool.value - effort
    Object.assign(updates, passionUpdates(actor, data.passion.selected, data.passion.mode))
    if (!foundry.utils.isEmpty(updates)) await actor.update(updates)
    await combatant?.update({ initiative: total })
    Utils.debug(
      "combat",
      `Initiative : ${combatant?.name ?? actor.name} — ${results.join(", ")} → ${kept} + ${data.fixedTotal} = ${total}, ${combatant ? "inscrite au combat" : "hors combat, tchat seulement"}`,
      { parts: data.parts, effort, passion: data.passion.selected },
    )

    const breakdown = data.parts.map((part) => `<li><span>${part.label}</span><strong>${part.value > 0 ? "+" : ""}${part.value}</strong></li>`).join("")
    const name = foundry.utils.escapeHTML(combatant?.name ?? actor.name)
    const content = `<section class="cdg chat-card initiative-card"><header><h3>${game.i18n.localize("CDG.combat.initiative.chatTitle")}</h3><strong>${name}</strong></header><p>${data.initiativeSkillLabel} (${data.rankName}) : ${results.join(", ")} — ${game.i18n.localize("CDG.combat.initiative.kept")} <strong>${kept}</strong></p><ul>${breakdown}</ul><div class="initiative-total">${game.i18n.localize("CDG.label.long.initiative")} <strong>${total}</strong></div></section>`
    // L'initiative d'un PNJ reste une information réservée au Meneur, que son combattant soit
    // masqué ou visible dans le tracker. Un combattant masqué conserve la même confidentialité
    // quel que soit son type d'acteur.
    const whisper = actor.type === "adversaire" || combatant?.hidden ? ChatMessage.getWhisperRecipients("GM").map((user) => user.id) : []
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll], whisper, flags: { "core.initiativeRoll": !!combatant } })
    await combatant?.combat?.activateHighestInitiative()
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
    await this.constructor.resolve(this.#combatant ?? this.#actor, data)
    return this.close()
  }

  static async #onCancel() {
    return this.close()
  }
}
