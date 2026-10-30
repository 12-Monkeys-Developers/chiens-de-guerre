import { SYSTEM } from "../config/system.mjs"
import CdgCreationWizard from "./creation-wizard.mjs"

/** Assistant en trois étapes pour créer la compagnie commune aux joueurs (p. 126). */
export default class CdgCompanyCreation extends CdgCreationWizard {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "cdg-company-creation",
    classes: ["cdg", "creation", "company-creation", "themed", "theme-light"],
    window: {
      title: "CDG.companyCreation.title",
      icon: "fa-solid fa-flag",
    },
    form: {
      handler: CdgCompanyCreation.#onChangeForm,
    },
    actions: {
      adjustAbility: CdgCompanyCreation.#onAdjustAbility,
      setCompanySkillRank: CdgCompanyCreation.#onSetSkillRank,
    },
  }

  /** @override */
  static STEPS = SYSTEM.COMPANY_CREATION_STEPS

  /** @override */
  static STEP_TEMPLATES = `${SYSTEM.PATH}/templates/company-creation`

  /** @override */
  static I18N = "CDG.companyCreation"

  /** @override */
  static ACTOR_TYPE = "compagnie"

  #derived = {}

  /** @override */
  static _blankDraft() {
    return {
      name: "",
      img: SYSTEM.ACTOR_ICONS.compagnie,
      abilities: Object.fromEntries(Object.keys(SYSTEM.COMPANY_ABILITIES).map((id) => [id, SYSTEM.COMPANY_ABILITY_MIN])),
      // La procédure commence avec toutes les compétences au rang 1, avant de choisir la faiblesse.
      skills: Object.fromEntries(Object.keys(SYSTEM.COMPANY_SKILLS).map((id) => [id, 1])),
    }
  }

  /** @override */
  async _prepareDraft() {
    this.#computeDerived()
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    context.derived = this.#derived
    return context
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options)
    if (partId !== "body") return context

    if (this.currentStep.id === "abilities") context.abilities = Object.values(SYSTEM.COMPANY_ABILITIES)
    if (this.currentStep.id === "skills") {
      context.skillColumns = Object.values(SYSTEM.COMPANY_ABILITIES).map((ability) => ({
        ability,
        skills: Object.values(SYSTEM.COMPANY_SKILLS).filter((skill) => skill.ability === ability.id),
      }))
    }
    if (this.currentStep.id === "identity") {
      context.recap = [
        {
          label: "CDG.label.long.abilities",
          value: Object.values(SYSTEM.COMPANY_ABILITIES)
            .map((ability) => `${game.i18n.localize(ability.label)} ${this._draft.abilities[ability.id]}`)
            .join(" · "),
        },
        {
          label: "CDG.label.long.skills",
          value: game.i18n.format("CDG.companyCreation.identity.skillSummary", {
            weak: this.#derived.rankCounts[0],
            standard: this.#derived.rankCounts[1],
            trained: this.#derived.rankCounts[2],
            expert: this.#derived.rankCounts[3],
          }),
        },
      ]
    }
    return context
  }

  #computeDerived() {
    const values = Object.values(this._draft.abilities).map(Number)
    const pointsSpent = values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
    const pointsRemaining = SYSTEM.COMPANY_ABILITY_POINTS - pointsSpent
    const rankCounts = { 0: 0, 1: 0, 2: 0, 3: 0 }
    for (const rank of Object.values(this._draft.skills)) rankCounts[rank] = (rankCounts[rank] ?? 0) + 1

    this.#derived = {
      pointsSpent,
      pointsRemaining,
      pointsOver: Math.max(0, -pointsRemaining),
      pointsWithinBounds: values.every((value) => Number.isInteger(value) && value >= SYSTEM.COMPANY_ABILITY_MIN && value <= SYSTEM.COMPANY_ABILITY_MAX),
      rankCounts,
      advancedCount: rankCounts[2] + rankCounts[3],
      expertCount: rankCounts[3],
    }
  }

  /** @override */
  _stepStatus(index) {
    const missing = (key, data = {}) => ({ complete: false, message: game.i18n.format(`CDG.companyCreation.missing.${key}`, data) })
    const done = { complete: true, message: "" }

    switch (SYSTEM.COMPANY_CREATION_STEPS[index].id) {
      case "abilities":
        if (!this.#derived.pointsWithinBounds) {
          return missing("abilitiesBounds", { min: SYSTEM.COMPANY_ABILITY_MIN, max: SYSTEM.COMPANY_ABILITY_MAX })
        }
        if (this.#derived.pointsRemaining > 0) return missing("abilitiesRemaining", { points: this.#derived.pointsRemaining })
        if (this.#derived.pointsRemaining < 0) return missing("abilitiesOver", { points: -this.#derived.pointsRemaining })
        return done
      case "skills":
        if (this.#derived.rankCounts[0] !== 1) return missing("weak", { count: Math.abs(1 - this.#derived.rankCounts[0]) })
        if (this.#derived.advancedCount !== 10) return missing("advanced", { count: Math.abs(10 - this.#derived.advancedCount) })
        if (this.#derived.expertCount !== 5) return missing("expert", { count: Math.abs(5 - this.#derived.expertCount) })
        return done
      case "identity":
        return this._draft.name.trim() ? done : missing("name")
      default:
        return done
    }
  }

  static #onChangeForm(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object)
    if (data.abilities) {
      for (const id of Object.keys(data.abilities)) data.abilities[id] = Number(data.abilities[id])
    }
    foundry.utils.mergeObject(this._draft, data)
    this.render()
  }

  static #onAdjustAbility(event, target) {
    const ability = target.dataset.ability
    const delta = parseInt(target.dataset.delta)
    if (!ability || isNaN(delta)) return
    const value = Number(this._draft.abilities[ability]) + delta
    if (value < SYSTEM.COMPANY_ABILITY_MIN || value > SYSTEM.COMPANY_ABILITY_MAX) return
    if (delta > 0 && this.#derived.pointsRemaining < delta) return
    this._draft.abilities[ability] = value
    this.render()
  }

  /**
   * Applique les trois phases de la procédure : faiblesse, dix entraînées, cinq expertes.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onSetSkillRank(event, target) {
    const skill = target.dataset.skill
    const rank = parseInt(target.dataset.rank)
    if (!SYSTEM.COMPANY_SKILLS[skill] || ![0, 1, 2, 3].includes(rank)) return
    const current = this._draft.skills[skill]
    if (current === rank) return

    if (rank === 0) {
      for (const id of Object.keys(this._draft.skills)) if (this._draft.skills[id] === 0) this._draft.skills[id] = 1
      this._draft.skills[skill] = 0
    } else if (rank === 1) {
      this._draft.skills[skill] = 1
    } else if (rank === 2) {
      if (current < 2 && this.#derived.advancedCount >= 10) return
      this._draft.skills[skill] = 2
    } else {
      if (current !== 2 || this.#derived.expertCount >= 5) return
      this._draft.skills[skill] = 3
    }
    this.render()
  }

  /** @override */
  _actorSystemData() {
    const abilities = Object.fromEntries(
      Object.keys(SYSTEM.COMPANY_ABILITIES).map((id) => {
        const value = Math.max(0, Math.round(Number(this._draft.abilities[id]) || 0))
        return [id, { max: value, value }]
      }),
    )
    const skills = Object.fromEntries(Object.keys(SYSTEM.COMPANY_SKILLS).map((id) => [id, { rank: this._draft.skills[id] }]))
    return { abilities, skills }
  }
}
