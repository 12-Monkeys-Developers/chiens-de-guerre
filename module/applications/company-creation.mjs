import { SYSTEM } from "../config/system.mjs"
import Utils from "../helpers/utils.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/** Assistant en trois étapes pour créer la compagnie commune aux joueurs (p. 126). */
export default class CdgCompanyCreation extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "cdg-company-creation",
    tag: "form",
    classes: ["cdg", "creation", "company-creation", "themed", "theme-light"],
    position: { width: 900, height: 800 },
    window: {
      title: "CDG.companyCreation.title",
      icon: "fa-solid fa-flag",
      resizable: true,
      contentClasses: ["creation-content"],
    },
    form: {
      handler: CdgCompanyCreation.#onChangeForm,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      goToStep: CdgCompanyCreation.#onGoToStep,
      previousStep: CdgCompanyCreation.#onPreviousStep,
      nextStep: CdgCompanyCreation.#onNextStep,
      adjustAbility: CdgCompanyCreation.#onAdjustAbility,
      setCompanySkillRank: CdgCompanyCreation.#onSetSkillRank,
      pickImage: CdgCompanyCreation.#onPickImage,
      create: CdgCompanyCreation.#onCreate,
      reset: CdgCompanyCreation.#onReset,
    },
  }

  static PARTS = {
    steps: { template: `${SYSTEM.PATH}/templates/creation/steps.hbs` },
    body: { template: `${SYSTEM.PATH}/templates/company-creation/step-abilities.hbs`, scrollable: [""] },
    footer: { template: `${SYSTEM.PATH}/templates/creation/footer.hbs` },
  }

  #step = 0

  #maxStep = 0

  #draft = CdgCompanyCreation.#blankDraft()

  #derived = {}

  #creating = false

  static #blankDraft() {
    return {
      name: "",
      img: SYSTEM.ACTOR_ICONS.compagnie,
      abilities: Object.fromEntries(Object.keys(SYSTEM.COMPANY_ABILITIES).map((id) => [id, SYSTEM.COMPANY_ABILITY_MIN])),
      // La procédure commence avec toutes les compétences au rang 1, avant de choisir la faiblesse.
      skills: Object.fromEntries(Object.keys(SYSTEM.COMPANY_SKILLS).map((id) => [id, 1])),
    }
  }

  get currentStep() {
    return SYSTEM.COMPANY_CREATION_STEPS[this.#step]
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options)
    parts.body.template = `${SYSTEM.PATH}/templates/company-creation/step-${this.currentStep.id}.hbs`
    return parts
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    this.#computeDerived()

    const statuses = SYSTEM.COMPANY_CREATION_STEPS.map((step, index) => this.#stepStatus(index))
    const reached = SYSTEM.COMPANY_CREATION_STEPS.map((step, index) => index <= this.#maxStep)
    const achieved = statuses.map((status, index) => status.complete && reached[index])
    const completedCount = achieved.filter(Boolean).length

    return Object.assign(context, {
      SYSTEM,
      draft: this.#draft,
      derived: this.#derived,
      step: this.currentStep,
      stepIndex: this.#step,
      stepNumber: this.#step + 1,
      stepCount: SYSTEM.COMPANY_CREATION_STEPS.length,
      isFirstStep: this.#step === 0,
      isLastStep: this.#step === SYSTEM.COMPANY_CREATION_STEPS.length - 1,
      status: statuses[this.#step],
      steps: SYSTEM.COMPANY_CREATION_STEPS.map((step, index) => ({
        ...step,
        index,
        number: index + 1,
        active: index === this.#step,
        reachable: reached[index],
        complete: achieved[index],
      })),
      completedCount,
      progress: Math.round((completedCount / SYSTEM.COMPANY_CREATION_STEPS.length) * 100),
      incompleteSteps: SYSTEM.COMPANY_CREATION_STEPS.filter((step, index) => !statuses[index].complete),
      creating: this.#creating,
      creationLabels: {
        progress: "CDG.companyCreation.progress",
        stepComplete: "CDG.companyCreation.stepComplete",
        previous: "CDG.companyCreation.previous",
        next: "CDG.companyCreation.next",
        create: "CDG.companyCreation.create",
        reset: "CDG.companyCreation.reset",
        resetTooltip: "CDG.companyCreation.resetTooltip",
      },
    })
  }

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
            .map((ability) => `${game.i18n.localize(ability.label)} ${this.#draft.abilities[ability.id]}`)
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
    const values = Object.values(this.#draft.abilities).map(Number)
    const pointsSpent = values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0)
    const pointsRemaining = SYSTEM.COMPANY_ABILITY_POINTS - pointsSpent
    const rankCounts = { 0: 0, 1: 0, 2: 0, 3: 0 }
    for (const rank of Object.values(this.#draft.skills)) rankCounts[rank] = (rankCounts[rank] ?? 0) + 1

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

  #stepStatus(index) {
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
        return this.#draft.name.trim() ? done : missing("name")
      default:
        return done
    }
  }

  static #onChangeForm(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object)
    if (data.abilities) {
      for (const id of Object.keys(data.abilities)) data.abilities[id] = Number(data.abilities[id])
    }
    foundry.utils.mergeObject(this.#draft, data)
    this.render()
  }

  static #onGoToStep(event, target) {
    const index = parseInt(target.dataset.step)
    if (isNaN(index) || index > this.#maxStep) return
    this.#step = index
    this.render()
  }

  static #onPreviousStep() {
    if (this.#step === 0) return
    this.#step -= 1
    this.render()
  }

  static #onNextStep() {
    if (this.#step >= SYSTEM.COMPANY_CREATION_STEPS.length - 1) return
    this.#step += 1
    this.#maxStep = Math.max(this.#maxStep, this.#step)
    this.render()
  }

  static #onAdjustAbility(event, target) {
    const ability = target.dataset.ability
    const delta = parseInt(target.dataset.delta)
    if (!ability || isNaN(delta)) return
    const value = Number(this.#draft.abilities[ability]) + delta
    if (value < SYSTEM.COMPANY_ABILITY_MIN || value > SYSTEM.COMPANY_ABILITY_MAX) return
    if (delta > 0 && this.#derived.pointsRemaining < delta) return
    this.#draft.abilities[ability] = value
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
    const current = this.#draft.skills[skill]
    if (current === rank) return

    if (rank === 0) {
      for (const id of Object.keys(this.#draft.skills)) if (this.#draft.skills[id] === 0) this.#draft.skills[id] = 1
      this.#draft.skills[skill] = 0
    } else if (rank === 1) {
      this.#draft.skills[skill] = 1
    } else if (rank === 2) {
      if (current < 2 && this.#derived.advancedCount >= 10) return
      this.#draft.skills[skill] = 2
    } else {
      if (current !== 2 || this.#derived.expertCount >= 5) return
      this.#draft.skills[skill] = 3
    }
    this.render()
  }

  static async #onPickImage() {
    const picker = new foundry.applications.apps.FilePicker.implementation({
      current: this.#draft.img,
      type: "image",
      callback: (path) => {
        this.#draft.img = path
        this.render()
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return picker.browse()
  }

  static async #onReset() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CDG.companyCreation.resetTitle") },
      content: `<p>${game.i18n.localize("CDG.companyCreation.resetContent")}</p>`,
    })
    if (!confirmed) return
    this.#draft = CdgCompanyCreation.#blankDraft()
    this.#step = 0
    this.#maxStep = 0
    this.render()
  }

  static async #onCreate(event, target) {
    if (this.#creating) return
    if (!this.#draft.name.trim()) {
      ui.notifications.warn("CDG.companyCreation.missing.name", { localize: true })
      this.#step = SYSTEM.COMPANY_CREATION_STEPS.length - 1
      return this.render()
    }

    const incomplete = SYSTEM.COMPANY_CREATION_STEPS.filter((step, index) => !this.#stepStatus(index).complete)
    if (incomplete.length > 0) {
      const list = incomplete.map((step) => `<li>${game.i18n.localize(step.label)}</li>`).join("")
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CDG.companyCreation.incompleteTitle") },
        content: `<p>${game.i18n.localize("CDG.companyCreation.incompleteContent")}</p><ul>${list}</ul>`,
      })
      if (!confirmed) return
    }

    this.#creating = true
    target.disabled = true
    let actor = null
    let completed = false
    try {
      const abilities = Object.fromEntries(
        Object.keys(SYSTEM.COMPANY_ABILITIES).map((id) => {
          const value = Math.max(0, Math.round(Number(this.#draft.abilities[id]) || 0))
          return [id, { max: value, value }]
        }),
      )
      const skills = Object.fromEntries(Object.keys(SYSTEM.COMPANY_SKILLS).map((id) => [id, { rank: this.#draft.skills[id] }]))
      actor = await Actor.implementation.create({
        name: this.#draft.name.trim(),
        type: "compagnie",
        img: this.#draft.img,
        system: { abilities, skills },
      })
      if (!actor) throw new Error("Actor.implementation.create n'a retourné aucun document")
      completed = true
    } catch (error) {
      console.error(Utils.log("Création de la compagnie impossible"), error)
      let removed = !actor
      if (actor) {
        try {
          await actor.delete()
          removed = true
        } catch (cleanupError) {
          console.error(Utils.log("Suppression de la compagnie partielle impossible"), cleanupError)
        }
      }
      if (removed) ui.notifications.error("CDG.companyCreation.createFailed", { localize: true })
      else ui.notifications.error(game.i18n.format("CDG.companyCreation.createFailedPartial", { name: actor.name }))
    } finally {
      this.#creating = false
      if (!completed) this.render()
    }
    if (!completed) return

    ui.notifications.info(game.i18n.format("CDG.companyCreation.created", { name: actor.name }))
    await this.close()
    actor.sheet.render(true)
  }

  /** Ouvre l'assistant ou ramène au premier plan l'instance existante. */
  static async open() {
    const existing = foundry.applications.instances.get("cdg-company-creation")
    if (existing) {
      existing.bringToFront()
      return existing
    }
    return new CdgCompanyCreation().render({ force: true })
  }
}
