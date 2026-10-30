import { SYSTEM } from "../config/system.mjs"
import Utils from "../helpers/utils.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/**
 * Socle des assistants de création (personnage, compagnie franche) : une suite d'étapes, un
 * brouillon que rien n'écrit dans le monde avant le dernier bouton, puis la création de l'acteur.
 *
 * La base tient la navigation (étape courante, étape la plus avancée atteinte), le bandeau de
 * progression, le portrait, la remise à zéro et le squelette de la création. Chaque assistant
 * déclare ses étapes (`STEPS`), le dossier de leurs gabarits (`STEP_TEMPLATES`), le préfixe de ses
 * textes (`I18N`) et le type d'acteur produit (`ACTOR_TYPE`), puis fournit :
 * - `_blankDraft()` : le brouillon vierge, qui porte au moins `name` et `img` ;
 * - `_prepareDraft()` : ce qui doit être recalculé avant chaque rendu ;
 * - `_stepStatus(index)` : `{ complete, message }` pour une étape ;
 * - `_actorSystemData()` : les données `system` de l'acteur à créer ;
 * - `_afterCreate(actor)` : ce qui s'embarque une fois l'acteur créé, facultatif.
 */
export default class CdgCreationWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    tag: "form",
    position: { width: 900, height: 800 },
    window: { resizable: true, contentClasses: ["creation-content"] },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: {
      goToStep: CdgCreationWizard.#onGoToStep,
      previousStep: CdgCreationWizard.#onPreviousStep,
      nextStep: CdgCreationWizard.#onNextStep,
      pickImage: CdgCreationWizard.#onPickImage,
      create: CdgCreationWizard.#onCreate,
      reset: CdgCreationWizard.#onReset,
    },
  }

  /** @override */
  static PARTS = {
    steps: { template: `${SYSTEM.PATH}/templates/creation/steps.hbs` },
    body: { template: `${SYSTEM.PATH}/templates/creation/step-abilities.hbs`, scrollable: [""] },
    footer: { template: `${SYSTEM.PATH}/templates/creation/footer.hbs` },
  }

  /**
   * Les étapes de l'assistant, dans l'ordre, telles que la configuration les décrit.
   * @type {{id: string, label: string}[]}
   */
  static STEPS = []

  /** Le dossier des gabarits d'étape, `step-<id>.hbs`. */
  static STEP_TEMPLATES = ""

  /** Le préfixe des textes de l'assistant (`CDG.creation`…). */
  static I18N = ""

  /** Le type d'acteur créé. */
  static ACTOR_TYPE = ""

  /**
   * Index de l'étape affichée, à partir de 0.
   * @type {number}
   */
  #step = 0

  /**
   * Index de l'étape la plus avancée atteinte. Les pastilles du bandeau au-delà restent inertes :
   * on ne saute pas la moitié du guide d'un clic.
   * @type {number}
   */
  #maxStep = 0

  /** Empêche deux clics de créer deux acteurs. */
  #creating = false

  /**
   * La saisie du joueur, et elle seule.
   * @type {Object}
   */
  _draft = this.constructor._blankDraft()

  /**
   * Un brouillon vierge.
   * @returns {{name: string, img: string}}
   * @abstract
   */
  static _blankDraft() {
    throw new Error(`${this.name} doit définir _blankDraft`)
  }

  /** L'étape courante, telle que décrite dans la configuration. */
  get currentStep() {
    return this.constructor.STEPS[this.#step]
  }

  /**
   * Ouvre l'assistant, ou ramène au premier plan celui qui l'est déjà.
   * @returns {Promise<CdgCreationWizard>}
   */
  static async open() {
    const existing = foundry.applications.instances.get(this.DEFAULT_OPTIONS.id)
    if (existing) {
      existing.bringToFront()
      return existing
    }
    return new this().render({ force: true })
  }

  // #region Rendu

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options)
    // Une seule zone de contenu, dont le gabarit suit l'étape courante : toutes les étapes
    // partagent le même emplacement, entre le bandeau de progression et le pied de navigation.
    parts.body.template = `${this.constructor.STEP_TEMPLATES}/step-${this.currentStep.id}.hbs`
    return parts
  }

  /**
   * Recalcule ce qui dépend du brouillon, avant que le statut des étapes ne soit lu.
   * @returns {Promise<void>}
   */
  async _prepareDraft() {}

  /**
   * L'état d'une étape.
   * @param {number} index
   * @returns {{complete: boolean, message?: string}}
   * @abstract
   */
  _stepStatus(index) {
    throw new Error(`${this.constructor.name} doit définir _stepStatus`)
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    await this._prepareDraft()

    const steps = this.constructor.STEPS
    const i18n = this.constructor.I18N
    const statuses = steps.map((step, index) => this._stepStatus(index))

    // Une étape n'est achevée que si elle a été atteinte : une étape qui n'exige aucune saisie est
    // valide d'entrée de jeu, mais la compter avant de l'avoir vue gonflerait la progression dès
    // l'ouverture de l'assistant.
    const reached = steps.map((step, index) => index <= this.#maxStep)
    const achieved = statuses.map((status, index) => status.complete && reached[index])
    const completedCount = achieved.filter(Boolean).length

    return Object.assign(context, {
      SYSTEM,
      draft: this._draft,
      step: this.currentStep,
      stepIndex: this.#step,
      stepNumber: this.#step + 1,
      stepCount: steps.length,
      isFirstStep: this.#step === 0,
      isLastStep: this.#step === steps.length - 1,
      status: statuses[this.#step],
      steps: steps.map((step, index) => ({
        ...step,
        index,
        number: index + 1,
        active: index === this.#step,
        reachable: reached[index],
        complete: achieved[index],
      })),
      completedCount,
      progress: Math.round((completedCount / steps.length) * 100),
      incompleteSteps: steps.filter((step, index) => !statuses[index].complete),
      creating: this.#creating,
      creationLabels: Object.fromEntries(["progress", "stepComplete", "previous", "next", "create", "reset", "resetTooltip"].map((key) => [key, `${i18n}.${key}`])),
    })
  }

  // #endregion

  // #region Création

  /**
   * Les données `system` de l'acteur à créer, à partir du brouillon.
   * @returns {Object}
   * @abstract
   */
  _actorSystemData() {
    throw new Error(`${this.constructor.name} doit définir _actorSystemData`)
  }

  /**
   * Ce qui s'embarque une fois l'acteur créé. Une erreur levée ici fait supprimer l'acteur partiel.
   * @param {CdgActor} actor
   * @returns {Promise<void>}
   */
  async _afterCreate(actor) {}

  // #endregion

  // #region Actions

  /**
   * Va directement à une étape déjà atteinte, depuis le bandeau.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-step`.
   */
  static #onGoToStep(event, target) {
    const index = parseInt(target.dataset.step)
    if (isNaN(index) || index > this.#maxStep) return
    this.#step = index
    this.render()
  }

  /** Revient à l'étape précédente. */
  static #onPreviousStep() {
    if (this.#step === 0) return
    this.#step -= 1
    this.render()
  }

  /**
   * Passe à l'étape suivante. Une étape incomplète ne bloque pas : elle reste signalée dans le
   * bandeau, et le récapitulatif final la rappellera.
   */
  static #onNextStep() {
    if (this.#step >= this.constructor.STEPS.length - 1) return
    this.#step += 1
    this.#maxStep = Math.max(this.#maxStep, this.#step)
    this.render()
  }

  /** Choisit le portrait. */
  static async #onPickImage() {
    const picker = new foundry.applications.apps.FilePicker.implementation({
      current: this._draft.img,
      type: "image",
      callback: (path) => {
        this._draft.img = path
        this.render()
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return picker.browse()
  }

  /** Repart d'un brouillon vierge, après confirmation. */
  static async #onReset() {
    const i18n = this.constructor.I18N
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize(`${i18n}.resetTitle`) },
      content: `<p>${game.i18n.localize(`${i18n}.resetContent`)}</p>`,
    })
    if (!confirmed) return
    this._draft = this.constructor._blankDraft()
    this.#step = 0
    this.#maxStep = 0
    this.render()
  }

  /**
   * Crée l'acteur. Un nom est exigé ; une étape laissée en plan ne l'interdit pas, on prévient et le
   * joueur tranche. Un échec en cours de route supprime l'acteur à moitié créé.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCreate(event, target) {
    if (this.#creating) return
    const { STEPS: steps, I18N: i18n, ACTOR_TYPE: type } = this.constructor
    if (!this._draft.name.trim()) {
      ui.notifications.warn(`${i18n}.missing.name`, { localize: true })
      this.#step = steps.length - 1
      return this.render()
    }

    const incomplete = steps.filter((step, index) => !this._stepStatus(index).complete)
    if (incomplete.length > 0) {
      const list = incomplete.map((step) => `<li>${game.i18n.localize(step.label)}</li>`).join("")
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize(`${i18n}.incompleteTitle`) },
        content: `<p>${game.i18n.localize(`${i18n}.incompleteContent`)}</p><ul>${list}</ul>`,
      })
      if (!confirmed) return
    }

    this.#creating = true
    target.disabled = true
    let actor = null
    let completed = false
    try {
      actor = await Actor.implementation.create({ name: this._draft.name.trim(), type, img: this._draft.img, system: this._actorSystemData() })
      if (!actor) throw new Error("Actor.implementation.create n'a retourné aucun document")
      await this._afterCreate(actor)
      completed = true
    } catch (error) {
      console.error(Utils.log(`Création impossible (${type})`), error)
      let removed = !actor
      if (actor) {
        try {
          await actor.delete()
          removed = true
        } catch (cleanupError) {
          console.error(Utils.log(`Suppression de l'acteur partiel impossible (${type})`), cleanupError)
        }
      }
      if (removed) ui.notifications.error(`${i18n}.createFailed`, { localize: true })
      else ui.notifications.error(game.i18n.format(`${i18n}.createFailedPartial`, { name: actor.name }))
    } finally {
      this.#creating = false
      if (!completed) this.render()
    }
    if (!completed) return

    ui.notifications.info(game.i18n.format(`${i18n}.created`, { name: actor.name }))
    await this.close()
    actor.sheet.render(true)
  }

  // #endregion
}
