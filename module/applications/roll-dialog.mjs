import { SYSTEM } from "../config/system.mjs"
import CdgRoll from "../dice/cdg-roll.mjs"
import Utils from "../helpers/utils.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
const TEMPLATES = `${SYSTEM.PATH}/templates/dialogs`

/**
 * Nombre signé, pour les libellés composés ici plutôt que dans les gabarits.
 * @param {number} value
 * @returns {string}
 */
const signed = (value) => (value > 0 ? `+${value}` : `${value}`)

/**
 * La fenêtre de test — règles p. 40-41.
 *
 * Elle mène les quatre premières étapes du test : choisir le couple caractéristique / compétence,
 * appliquer la difficulté annoncée par le Meneur, décider d'un effort, invoquer une passion. La
 * cinquième — lancer et interpréter — revient à `CdgRoll`.
 *
 * Rien n'est écrit sur l'acteur avant que le joueur ne lance : la saisie vit dans `#draft`, et tout
 * ce qui s'en déduit est recalculé à chaque rendu dans `#derived`. Les réserves ne sont débitées
 * qu'au moment du jet.
 */
export default class CdgRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "cdg-roll-{id}",
    tag: "form",
    classes: ["cdg", "roll"],
    position: {
      width: 500,
      height: "auto",
    },
    window: {
      title: "CDG.roll.title",
      icon: "fa-solid fa-dice-d20",
      resizable: false,
      contentClasses: ["roll-content"],
    },
    form: {
      handler: CdgRollDialog.#onChangeForm,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      setAbility: CdgRollDialog.#onSetAbility,
      setEffort: CdgRollDialog.#onSetEffort,
      setPassionMode: CdgRollDialog.#onSetPassionMode,
      toggleModifier: CdgRollDialog.#onToggleModifier,
      roll: CdgRollDialog.#onRoll,
      cancel: CdgRollDialog.#onCancel,
    },
  }

  /** @override */
  static PARTS = {
    body: { template: `${TEMPLATES}/roll-dialog.hbs` },
    footer: { template: `${TEMPLATES}/roll-footer.hbs` },
  }

  /** L'acteur qui teste. */
  #actor

  /** La saisie du joueur, et elle seule. */
  #draft

  /** Tout ce qui s'en déduit, reconstruit à chaque rendu. */
  #derived = {}

  /** Traitement métier facultatif exécuté uniquement après un jet effectivement lancé. */
  #afterRoll = null

  /**
   * Remplace `CdgRoll.post` comme destination du jet — une confrontation de combat fusionne ainsi
   * le test dans sa propre carte au lieu d'en poster une autonome.
   */
  #postHandler = null

  /** Acteur ciblé, affiché en tête de fenêtre pour un test d'attaque. */
  #targetUuid = null

  /** Nature du test pour rechercher les objets de qualité exceptionnelle applicables. */
  #qualityDomain = null

  /** Type de guérison de compagnie à proposer sur la carte du jet. */
  #companyHealing = null

  /**
   * Test restreint (jet de survie, p. 46) : ni effort, ni passion, ni dépassement — le personnage
   * ne peut rien engager pour améliorer ce jet précis.
   */
  #restricted = false

  /**
   * Le volet « Modificateurs » est déplié d'emblée. Son état vit ici et non dans le DOM : chaque
   * rendu reconstruit le gabarit, et un `<details>` neuf se replierait à chaque clic sur un effort,
   * une passion ou un modificateur.
   */
  #modifiersOpen = true

  /**
   * Les caractéristiques et compétences de l'acteur qui teste — celles du personnage/adversaire, ou
   * celles, propres, de la compagnie franche (p. 123). Jamais `SYSTEM.ABILITIES`/`SYSTEM.SKILLS` en
   * dur : la fenêtre de jet doit rester correcte quel que soit le type d'acteur qui l'ouvre.
   */
  get #abilities() {
    return this.#actor.system.constructor.ABILITIES
  }

  get #skills() {
    return this.#actor.system.constructor.SKILLS
  }

  /**
   * Prépare le brouillon du test à partir de la présélection reçue de la fiche.
   * @param {CdgActor} actor
   * @param {Object} [seed] Présélection : `abilityId`, `skillId`.
   * @param {Object} [options]
   */
  constructor(actor, seed = {}, options = {}) {
    super(options)
    this.#actor = actor
    this.#draft = {
      abilityId: seed.abilityId ?? SYSTEM.SKILL_DEFAULT_ABILITY[seed.skillId] ?? Object.keys(this.#abilities)[0],
      skillId: seed.skillId ?? "",
      difficulty: SYSTEM.DEFAULT_DIFFICULTY,
      modifier: 0,
      effort: 0,
      passionPairId: "",
      passionMode: "bonus",
      toggles: seed.toggles ?? {},
      rankOverride: Number.isInteger(seed.rank) ? seed.rank : null,
      labelOverride: seed.label ?? null,
      lockedPair: !!seed.lockedPair,
    }
    this.#afterRoll = typeof seed.afterRoll === "function" ? seed.afterRoll : null
    this.#postHandler = typeof seed.postHandler === "function" ? seed.postHandler : null
    this.#targetUuid = seed.targetUuid ?? null
    this.#qualityDomain = Object.hasOwn(SYSTEM.EXCEPTIONAL_BONUS_DOMAINS, seed.qualityDomain) ? seed.qualityDomain : null
    this.#companyHealing = ["recovery", "care"].includes(seed.companyHealing) && actor.type === "compagnie" ? seed.companyHealing : null
    this.#restricted = !!seed.restricted
  }

  /**
   * Ouvre la fenêtre pour un acteur, ou ramène au premier plan celle qui l'est déjà : deux tests
   * concurrents sur le même personnage n'auraient pas de sens, et le second effacerait le premier.
   * @param {CdgActor} actor
   * @param {Object} [seed] Présélection : `abilityId`, `skillId`.
   * @returns {Promise<CdgRollDialog>}
   */
  static async open(actor, seed = {}) {
    if (!actor) return null
    if (actor.type === "compagnie" && actor.system.dissolved) {
      ui.notifications.warn("CDG.company.cannotRollDissolved", { localize: true })
      return null
    }
    // L'identifiant est imposé en entier, pas via le `{id}` de `DEFAULT_OPTIONS` : ApplicationV2
    // écrase `uniqueId` par son propre compteur dans `_initializeApplicationOptions`, si bien qu'un
    // `uniqueId` passé en option ne survit pas. Les points de l'uuid deviennent des tirets pour
    // rester un identifiant HTML valide, y compris pour un acteur de token.
    const id = `cdg-roll-${actor.uuid.replaceAll(".", "-")}`
    const existing = foundry.applications.instances.get(id)
    if (existing) {
      existing.#applySeed(seed)
      existing.bringToFront()
      existing.render()
      return existing
    }
    return new this(actor, seed, { id }).render({ force: true })
  }

  /**
   * Remplace la présélection d'une fenêtre déjà ouverte, notamment lors du choix d'une arme.
   * @param {Object} seed Présélection : `abilityId`, `skillId`.
   */
  #applySeed(seed) {
    const skillId = seed.skillId ?? ""
    if (!skillId || this.#skills[skillId]) this.#draft.skillId = skillId

    const abilityId = seed.abilityId ?? SYSTEM.SKILL_DEFAULT_ABILITY[skillId]
    if (this.#abilities[abilityId]) this.#draft.abilityId = abilityId
    this.#draft.rankOverride = Number.isInteger(seed.rank) ? seed.rank : null
    this.#draft.labelOverride = seed.label ?? null
    this.#draft.lockedPair = !!seed.lockedPair
    this.#draft.toggles = seed.toggles ?? {}
    this.#afterRoll = typeof seed.afterRoll === "function" ? seed.afterRoll : null
    this.#postHandler = typeof seed.postHandler === "function" ? seed.postHandler : null
    this.#targetUuid = seed.targetUuid ?? null
    this.#qualityDomain = Object.hasOwn(SYSTEM.EXCEPTIONAL_BONUS_DOMAINS, seed.qualityDomain) ? seed.qualityDomain : null
    this.#companyHealing = ["recovery", "care"].includes(seed.companyHealing) && this.#actor.type === "compagnie" ? seed.companyHealing : null
    this.#restricted = !!seed.restricted
  }

  /** @override */
  get title() {
    return game.i18n.format("CDG.roll.titleFor", { name: this.#actor.name })
  }

  /** Les adversaires n'ont ni traits de personnalité ni jetons : pas de passion à invoquer. */
  get hasPassion() {
    return this.#actor.type === "character"
  }

  // #region Contexte

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    this.#derived = this.#compute()

    Object.assign(context, this.#derived)
    context.actor = this.#actor
    context.draft = this.#draft
    context.hasPassion = this.hasPassion
    context.modifiersOpen = this.#modifiersOpen
    context.target = this.#targetUuid ? fromUuidSync(this.#targetUuid) : null
    context.SYSTEM = SYSTEM

    if (CONFIG.debug.cdg?.sheets) console.debug(Utils.log(`${this.constructor.name} - contexte`), context)

    return context
  }

  /**
   * Recompose le test à partir de la saisie.
   *
   * L'ordre importe : l'effort est plafonné avant d'être compté, et la passion est vérifiée avant
   * d'entrer dans la somme. Le seuil n'est que le total des lignes affichées — ce qui garantit que
   * le détail montré au joueur explique exactement le nombre qu'il voit.
   * @returns {Object}
   */
  #compute() {
    const system = this.#actor.system
    const draft = this.#draft

    const ability = this.#abilities[draft.abilityId]
    const pool = system.abilities[draft.abilityId]
    const skill = draft.skillId ? this.#skills[draft.skillId] : null

    // « Il peut arriver qu'aucune compétence ne soit pertinente. Dans ce cas, la poignée de dés sera
    // composée d'un unique d20, exactement comme si le test se faisait avec une compétence de rang 1. »
    const rank = Number.isInteger(draft.rankOverride) ? draft.rankOverride : skill ? system.skills[draft.skillId].rank : SYSTEM.DEFAULT_RANK
    const rankEntry = SYSTEM.RANKS[rank] ?? SYSTEM.RANKS[SYSTEM.DEFAULT_RANK]

    // « Un joueur ne peut jamais décider volontairement d'utiliser ainsi le dernier point d'une
    // réserve et tomber à zéro. »
    const canUseEffort = !this.#restricted && (this.#actor.type === "character" || this.#actor.type === "compagnie" || this.#actor.system.major)
    const effortMax = canUseEffort ? Math.max(0, Math.min(SYSTEM.MAX_EFFORT, pool.value - 1)) : 0
    draft.effort = Math.clamp(draft.effort, 0, effortMax)

    const difficulty = SYSTEM.DIFFICULTIES[draft.difficulty] ?? SYSTEM.DIFFICULTIES[SYSTEM.DEFAULT_DIFFICULTY]
    const passion = this.#computePassion()
    const modifiers = this.#computeModifiers()

    // « Le bonus s'applique au seuil de réussite, qui se base sur la valeur de la caractéristique
    // avant qu'elle ait été diminuée par l'effort. »
    const parts = [{ id: "base", label: game.i18n.localize(ability.label), value: pool.value, base: true }]
    if (difficulty.modifier !== 0) parts.push({ id: "difficulty", label: game.i18n.localize(difficulty.label), value: difficulty.modifier })
    if (draft.effort > 0) parts.push({ id: "effort", label: game.i18n.localize("CDG.roll.effort"), value: draft.effort * SYSTEM.EFFORT_BONUS_PER_POINT })
    if (passion.selected) parts.push({ id: "passion", label: passion.selected.label, value: passion.value })
    for (const modifier of modifiers) if (modifier.active) parts.push({ id: modifier.id, label: modifier.label, value: modifier.value })
    if (draft.modifier !== 0) parts.push({ id: "free", label: game.i18n.localize("CDG.roll.freeModifier"), value: draft.modifier })

    const sr = parts.reduce((total, part) => total + part.value, 0)

    return {
      ability,
      pool,
      abilities: Object.values(this.#abilities).map((entry) => ({
        ...entry,
        name: game.i18n.localize(entry.label),
        pool: system.abilities[entry.id],
        selected: entry.id === draft.abilityId,
      })),
      skill,
      testLabel: draft.labelOverride ? game.i18n.localize(draft.labelOverride) : null,
      lockedPair: draft.lockedPair,
      skillChoices: this.#skillChoices(),
      rank,
      rankEntry,
      rankName: game.i18n.localize(rankEntry.label),
      rankHint: game.i18n.localize(rankEntry.hint),
      difficulty,
      difficultyChoices: Object.values(SYSTEM.DIFFICULTIES)
        .sort((a, b) => a.order - b.order)
        .map((entry) => ({ id: entry.id, label: `${game.i18n.localize(entry.label)} (${signed(entry.modifier)})` })),
      canUseEffort,
      effortMax,
      effortSteps: Array.fromRange(SYSTEM.MAX_EFFORT + 1).map((step) => ({
        value: step,
        bonus: step * SYSTEM.EFFORT_BONUS_PER_POINT,
        selected: step === draft.effort,
        disabled: step > effortMax,
      })),
      passion,
      modifiers,
      parts,
      sr,
      status: this.#status(sr, rankEntry),
    }
  }

  /**
   * Les compétences du personnage, avec leur rang, triées comme le joueur les lit.
   * `label` est composé ici plutôt que dans le gabarit : `selectOptions` ne sait afficher qu'un
   * seul champ, et le rang doit figurer dans la liste déroulante.
   * @returns {Object[]}
   */
  #skillChoices() {
    const system = this.#actor.system
    return Object.values(this.#skills)
      .map((entry) => {
        const name = game.i18n.localize(entry.label)
        return { id: entry.id, name, rank: system.skills[entry.id].rank, label: `${name} (${system.skills[entry.id].rank})` }
      })
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
  }

  /**
   * L'invocation de passion — règles p. 41.
   *
   * Un trait n'est invocable que s'il est dominant, et une seule fois par session. Le bonus coûte un
   * jeton ; s'imposer le malus correspondant en rapporte un, ce qui reste toujours possible.
   * @returns {Object}
   */
  #computePassion() {
    const draft = this.#draft
    if (!this.hasPassion || this.#restricted) return { available: false, choices: [], selected: null, value: 0 }

    const system = this.#actor.system
    const invoked = new Set(system.passion.invokedThisSession)

    const choices = Object.values(SYSTEM.TRAIT_PAIRS)
      .map((pair) => ({ pair, trait: system.traits[pair.id] }))
      .filter(({ pair, trait }) => trait.dominant && trait.value > 0 && !invoked.has(pair.id))
      .map(({ pair, trait }) => {
        const label = game.i18n.localize(trait.dominant === SYSTEM.TRAIT_SIDES.vice.id ? pair.vice : pair.virtue)
        return { id: pair.id, label, value: trait.value, option: `${label} (${trait.value})` }
      })
      .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))

    // Un trait choisi puis devenu indisponible ne doit pas rester silencieusement dans la somme.
    if (draft.passionPairId && !choices.some((choice) => choice.id === draft.passionPairId)) draft.passionPairId = ""

    const tokens = system.passion.tokens
    const canSpend = tokens > 0
    if (!canSpend && draft.passionMode === "bonus") draft.passionMode = "malus"

    const selected = choices.find((choice) => choice.id === draft.passionPairId) ?? null
    const value = selected ? (draft.passionMode === "bonus" ? selected.value : -selected.value) : 0

    return { available: true, choices, selected, value, tokens, canSpend, mode: draft.passionMode }
  }

  /**
   * Les modificateurs que le système sait déduire de la fiche.
   *
   * Aucun n'est imposé : la blessure ne compte pas sur un test d'encaissement, un bonus
   * circonstanciel dépend de ce que le personnage cherche à obtenir, et le meneur a toujours le
   * dernier mot. Chacun est donc présenté coché ou non, mais toujours décochable.
   * @returns {Object[]}
   */
  #computeModifiers() {
    const actor = this.#actor
    const system = actor.system
    const draft = this.#draft
    const list = []

    const add = (id, label, value, hint, defaultActive, group = null) => {
      if (!value) return
      list.push({ id, label, value, hint, group, active: draft.toggles[id] ?? defaultActive })
    }

    if (system.wounds.worst) {
      const level = SYSTEM.WOUND_LEVELS[system.wounds.worst]
      add("wound", game.i18n.localize(`CDG.roll.wounds.${level.id}`), system.wounds.malus, game.i18n.localize("CDG.roll.hint.wound"), true)
    }

    for (const arcanum of actor.passiveArcanums ?? []) {
      if (!draft.skillId || arcanum.system.linkedSkill !== draft.skillId) continue
      add(`arcanum.${arcanum.id}`, arcanum.name, arcanum.system.bonus, game.i18n.localize("CDG.roll.hint.arcanum"), true)
    }

    if (draft.skillId === "esquive") add("dodge", game.i18n.localize("CDG.roll.dodge"), system.combat.dodgeMalus, game.i18n.localize("CDG.roll.hint.dodge"), true)
    if (draft.skillId === "blocage") add("block", game.i18n.localize("CDG.roll.block"), system.combat.blockBonus, game.i18n.localize("CDG.roll.hint.block"), true)

    // Bonus circonstanciels déposés par les effets actifs : pré-cochés quand la compétence lancée
    // est l'une de celles par lesquelles la situation passe d'ordinaire.
    const situational = system.situationalModifiers ?? []
    situational.forEach((modifier, index) => {
      const situation = SYSTEM.SITUATIONS?.[modifier.situation]
      const label = situation ? `${modifier.label} (${game.i18n.localize(situation.label)})` : modifier.label
      add(`situation.${index}`, label, modifier.value, game.i18n.localize("CDG.roll.hint.situational"), modifier.skills?.includes(draft.skillId) ?? false)
    })

    const exceptional = actor.equipments.filter((item) => {
      const equipment = item.system
      if (!equipment.exceptionalQuality || equipment.exceptionalBonus !== this.#qualityDomain) return false
      if (this.#qualityDomain === "skill" && (!draft.skillId || equipment.exceptionalSkill !== draft.skillId)) return false
      return equipment.isWeapon || equipment.isArmor || equipment.isShield ? equipment.equipped : equipment.quantity > 0
    })
    const exceptionalIds = exceptional.map((item) => `exceptional.${item.id}`)
    const hasExplicitChoice = exceptionalIds.some((id) => Object.hasOwn(draft.toggles, id))
    const selectedExceptionalId = exceptionalIds.find((id) => draft.toggles[id] === true) ?? (hasExplicitChoice ? null : exceptionalIds[0])
    exceptional.forEach((item, index) => {
      const id = exceptionalIds[index]
      list.push({
        id,
        label: item.name,
        value: 1,
        hint: game.i18n.localize("CDG.equipment.exceptionalModifierHint"),
        group: "exceptional",
        active: id === selectedExceptionalId,
      })
    })

    return list
  }

  /**
   * Le mot d'avertissement du pied de fenêtre : les deux régimes particuliers du seuil méritent
   * d'être annoncés avant le jet, pas découverts sur la carte.
   * @param {number} sr
   * @param {Object} rankEntry
   * @returns {Object}
   */
  #status(sr, rankEntry) {
    if (sr <= 0) return { level: "warn", message: game.i18n.format("CDG.roll.status.desperate", { critical: SYSTEM.NATURAL_MAX + sr }) }
    if (sr >= SYSTEM.NATURAL_MAX) return { level: "good", message: game.i18n.format("CDG.roll.status.assured", { bonus: sr - SYSTEM.NATURAL_MAX }) }
    if (rankEntry.keep === "worst") return { level: "warn", message: game.i18n.localize("CDG.roll.status.untrained") }
    return { level: "ok", message: game.i18n.localize("CDG.roll.status.ready") }
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options)
    // `toggle` ne remonte pas : l'écouteur se pose sur le volet lui-même, recréé à chaque rendu.
    this.element.querySelector(".roll-modifiers details")?.addEventListener("toggle", (event) => {
      this.#modifiersOpen = event.currentTarget.open
    })
  }

  // #endregion

  // #region Actions

  /**
   * Recueille la saisie des champs de formulaire. Les boutons — caractéristique, effort, passion —
   * passent par leurs propres actions.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onChangeForm(event, form, formData) {
    foundry.utils.mergeObject(this.#draft, foundry.utils.expandObject(formData.object))
    this.render()
  }

  /**
   * Choisit la caractéristique mise en jeu.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-ability`.
   */
  static async #onSetAbility(event, target) {
    const abilityId = target.dataset.ability
    if (!this.#abilities[abilityId]) return
    this.#draft.abilityId = abilityId
    this.render()
  }

  /**
   * Fixe le nombre de points d'effort investis.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-value`.
   */
  static async #onSetEffort(event, target) {
    const value = parseInt(target.dataset.value)
    if (isNaN(value)) return
    this.#draft.effort = value
    this.render()
  }

  /**
   * Bascule entre gagner un bonus contre un jeton et s'imposer un malus pour en gagner un.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-mode`.
   */
  static async #onSetPassionMode(event, target) {
    const mode = target.dataset.mode
    if (!["bonus", "malus"].includes(mode)) return
    this.#draft.passionMode = mode
    this.render()
  }

  /**
   * Retient ou écarte un modificateur déduit de la fiche.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-id` et `data-active`.
   */
  static async #onToggleModifier(event, target) {
    const id = target.dataset.id
    if (!id) return
    const activating = target.dataset.active !== "true"
    if (id.startsWith("exceptional.") && activating) {
      for (const modifier of this.#derived.modifiers.filter((entry) => entry.group === "exceptional")) {
        this.#draft.toggles[modifier.id] = false
      }
    }
    this.#draft.toggles[id] = activating
    this.render()
  }

  /** Ferme sans rien débiter. */
  static async #onCancel() {
    return this.close()
  }

  /**
   * Lance le test : débite ce que le joueur a engagé, puis poste la carte.
   *
   * Le test est figé avant la mise à jour de l'acteur, pour que la carte garde la valeur de la
   * caractéristique telle qu'elle était au moment du calcul du seuil.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRoll(event, target) {
    const actor = this.#actor
    const draft = this.#draft
    const derived = this.#derived

    const test = {
      actorUuid: actor.uuid,
      actorName: actor.name,
      abilityId: draft.abilityId,
      abilityLabel: game.i18n.localize(derived.ability.label),
      abilityValue: derived.pool.value,
      skillId: draft.skillId || null,
      skillLabel: derived.testLabel ?? (derived.skill ? game.i18n.localize(derived.skill.label) : null),
      rank: derived.rank,
      dice: derived.rankEntry.dice,
      keep: derived.rankEntry.keep,
      sr: derived.sr,
      breakdown: derived.parts.map((part) => ({ label: part.label, value: part.value, base: !!part.base })),
      effort: draft.effort,
      passion: derived.passion.selected
        ? { pairId: derived.passion.selected.id, label: derived.passion.selected.label, value: derived.passion.value, mode: draft.passionMode }
        : null,
      pushed: false,
      noPush: this.#restricted,
      companyHealing: this.#companyHealing ? { type: this.#companyHealing, applied: false } : null,
    }

    const updates = {}
    if (draft.effort > 0) updates[`system.abilities.${draft.abilityId}.value`] = derived.pool.value - draft.effort
    if (test.passion) {
      updates["system.passion.tokens"] = actor.system.passion.tokens + (draft.passionMode === "bonus" ? -1 : 1)
      updates["system.passion.invokedThisSession"] = [...actor.system.passion.invokedThisSession, test.passion.pairId]
    }
    if (!foundry.utils.isEmpty(updates)) await actor.update(updates)

    const post = this.#postHandler ?? ((posted) => CdgRoll.post(posted))
    await post(test)
    await this.#afterRoll?.(test)
    return this.close()
  }

  // #endregion
}
