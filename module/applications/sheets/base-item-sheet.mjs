import { SYSTEM } from "../../config/system.mjs"
import { signed } from "../../helpers/format.mjs"
import Utils from "../../helpers/utils.mjs"

const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api

/**
 * Socle des fiches d'objet : en-tête commun (image, nom), description, l'action de
 * réglage des rangs partagée avec les fiches d'acteur, et les listes d'objets référencés par UUID
 * que tiennent les fiches d'origine (`REFERENCE_FIELDS`).
 */
export default class CdgBaseItemSheet extends HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["cdg", "item"],
    position: {
      width: 560,
      height: 620,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      editImage: CdgBaseItemSheet.#onEditImage,
      setRank: CdgBaseItemSheet.#onSetRank,
      createEffect: CdgBaseItemSheet.#onCreateEffect,
      editEffect: CdgBaseItemSheet.#onEditEffect,
      deleteEffect: CdgBaseItemSheet.#onDeleteEffect,
      toggleEffect: CdgBaseItemSheet.#onToggleEffect,
      editReference: CdgBaseItemSheet.#onEditReference,
      removeReference: CdgBaseItemSheet.#onRemoveReference,
    },
  }

  /**
   * Les listes d'UUID que la fiche alimente par dépôt, par champ de `system` : le type d'objet
   * accepté, et au besoin un plafond avec le message qui le signale (formaté avec `{max}`).
   * Une fiche qui n'en déclare aucune ne branche pas le dépôt.
   * @type {Record<string, {type: string, max?: number, tooMany?: string}>}
   */
  static REFERENCE_FIELDS = {}

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.effects = this.#prepareEffects()

    context.item = this.document
    context.system = this.document.system
    context.source = this.document.toObject()
    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.isEditable = this.isEditable
    context.SYSTEM = SYSTEM

    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description ?? "")

    Utils.debug("sheets", `${this.constructor.name} - contexte`, context)

    return context
  }

  /**
   * Le dépôt est branché une seule fois : la fenêtre survit à ses rendus, un branchement par rendu
   * empilerait les écouteurs et traiterait chaque dépôt autant de fois.
   * @inheritDoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options)
    if (foundry.utils.isEmpty(this.constructor.REFERENCE_FIELDS)) return
    this.element.addEventListener("drop", this.#onDrop.bind(this))
    this.element.addEventListener("dragover", (event) => event.preventDefault())
  }

  /**
   * Ajoute l'objet déposé à la liste qui accepte son type.
   * @param {DragEvent} event
   */
  async #onDrop(event) {
    if (!this.isEditable) return
    event.preventDefault()

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Item") return

    const item = await Item.implementation.fromDropData(data)
    if (!item) return

    const [field, config] = Object.entries(this.constructor.REFERENCE_FIELDS).find(([, entry]) => entry.type === item.type) ?? []
    if (!field) return
    const references = this.document.system[field]
    if (references.includes(item.uuid)) return
    if (config.max !== undefined && references.length >= config.max) return ui.notifications.warn(game.i18n.format(config.tooMany, { max: config.max }))

    return this.document.update({ [`system.${field}`]: [...references, item.uuid] })
  }

  /**
   * Résout une référence, sans jamais lever.
   *
   * Sur un objet embarqué, la référence vise un objet du personnage (`CdgActor#grantOrigin` les
   * réécrit après les avoir embarqués) : `fromUuidSync` suffit et évite un rendu asynchrone de plus.
   * Ailleurs elle vise un compendium, qu'il faut charger. Dans les deux cas un objet supprimé, ou
   * un UUID devenu illisible, ne vaut pas une erreur — la ligne disparaît simplement de la fiche,
   * et le clic n'ouvre rien.
   * @param {string} uuid
   * @returns {Promise<CdgItem|null>}
   */
  async _resolveReference(uuid) {
    try {
      return (this.document.parent?.documentName === "Actor" ? fromUuidSync(uuid) : await fromUuid(uuid)) ?? null
    } catch {
      return null
    }
  }

  /**
   * Les objets d'une liste de références, sans les entrées qui ne se résolvent plus.
   * @param {string} field Le champ de `system`.
   * @returns {Promise<CdgItem[]>}
   */
  async _resolveReferences(field) {
    const items = await Promise.all(this.document.system[field].map((uuid) => this._resolveReference(uuid)))
    return items.filter((item) => item)
  }

  /**
   * Retire une référence de sa liste.
   * @param {string} field Le champ de `system`.
   * @param {string} uuid
   */
  async _removeReference(field, uuid) {
    return this.document.update({ [`system.${field}`]: this.document.system[field].filter((entry) => entry !== uuid) })
  }

  /**
   * Ouvre la fiche d'un objet référencé — celle de l'objet du personnage quand la fiche est
   * embarquée. Si l'objet a été supprimé, il n'y a rien à ouvrir et rien à signaler.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`.
   */
  static async #onEditReference(event, target) {
    const item = await this._resolveReference(target.dataset.uuid)
    return item?.sheet.render({ force: true })
  }

  /**
   * Retire un objet référencé.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-field` et `data-uuid`.
   */
  static async #onRemoveReference(event, target) {
    if (!this.isEditable) return
    const { field, uuid } = target.dataset
    if (!Object.hasOwn(this.constructor.REFERENCE_FIELDS, field) || !uuid) return
    return this._removeReference(field, uuid)
  }

  /**
   * Les effets portés par l'objet, chacun résumé en une phrase lisible.
   *
   * Un effet transféré s'applique à l'acteur qui porte l'objet ; sans transfert il ne vaut que pour
   * l'objet lui-même. La distinction est affichée, parce qu'un trait oublié sans transfert ne
   * produit rien et que rien à l'écran ne le dirait autrement.
   * @returns {Object[]}
   */
  #prepareEffects() {
    return this.document.effects.map((effect) => ({
      id: effect.id,
      name: effect.name,
      img: effect.img,
      disabled: effect.disabled,
      transfer: effect.transfer,
      changes: effect.system.changes.map((change) => this.#describeChange(change)),
    }))
  }

  /**
   * Met un change en français.
   * @param {Object} change
   * @returns {string}
   */
  #describeChange(change) {
    const value = Number(change.value)
    // Une valeur qui n'est pas un nombre (une formule) s'affiche telle qu'elle a été saisie.
    const amount = Number.isFinite(value) ? signed(value) : `${change.value}`

    if (change.type === SYSTEM.SITUATIONAL_CHANGE_TYPE) {
      const situation = SYSTEM.SITUATIONS[change.situation]
      const label = situation ? game.i18n.localize(situation.label) : game.i18n.localize("CDG.effect.anySituation")
      return game.i18n.format("CDG.effect.summary.situational", { value: amount, situation: label })
    }

    return game.i18n.format("CDG.effect.summary.permanent", { value: amount, key: change.key })
  }

  /**
   * Crée un effet vide sur l'objet et ouvre sa fenêtre de configuration.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCreateEffect(event, target) {
    if (!this.isEditable) return
    const [effect] = await this.document.createEmbeddedDocuments("ActiveEffect", [
      {
        name: this.document.name,
        img: this.document.img,
        // Un effet créé sur un objet doit valoir pour son porteur : c'est le cas de tous les
        // traits, et l'oubli du transfert est l'erreur de saisie la plus coûteuse à diagnostiquer.
        transfer: true,
      },
    ])
    return effect?.sheet.render({ force: true })
  }

  /**
   * Ouvre la fenêtre de configuration d'un effet.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-effect-id`.
   */
  static async #onEditEffect(event, target) {
    const effect = this.document.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)
    return effect?.sheet.render({ force: true })
  }

  /**
   * Supprime un effet, après confirmation.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-effect-id`.
   */
  static async #onDeleteEffect(event, target) {
    if (!this.isEditable) return
    const effect = this.document.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)
    if (!effect) return
    return effect.deleteDialog()
  }

  /**
   * Active ou désactive un effet sans le supprimer.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-effect-id`.
   */
  static async #onToggleEffect(event, target) {
    if (!this.isEditable) return
    const effect = this.document.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)
    return effect?.update({ disabled: !effect.disabled })
  }

  /**
   * Choisit l'image de l'objet.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onEditImage(event, target) {
    if (!this.isEditable) return
    const current = foundry.utils.getProperty(this.document, "img")
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: "image",
      callback: (path) => this.document.update({ img: path }),
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  /**
   * Fixe un rang en cliquant sur un écusson ; recliquer sur le cran courant redescend d'un.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-target` et `data-rank`.
   */
  static async #onSetRank(event, target) {
    if (!this.isEditable) return
    const path = target.dataset.target
    const clicked = parseInt(target.dataset.rank)
    if (!path || isNaN(clicked)) return

    const current = foundry.utils.getProperty(this.document, path)
    const value = current === clicked ? clicked - 1 : clicked
    return this.document.update({ [path]: Math.max(0, value) })
  }
}
