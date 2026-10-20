import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"

/** Partiels partagés par les fiches d'objet. */
const SHARED_DESCRIPTION = `${SYSTEM.PATH}/templates/items/shared/description.hbs`

export default class CdgPeupleSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["peuple"],
    actions: {
      removeFeature: CdgPeupleSheet.#onRemoveFeature,
      toggleLanguage: CdgPeupleSheet.#onToggleLanguage,
      editFeature: CdgPeupleSheet.#onEditFeature,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/peuple.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.choiceAbilities = SYSTEM.ABILITIES
    context.languages = Object.values(SYSTEM.LANGUAGES).map((language) => ({
      ...language,
      known: this.document.system.languages.includes(language.id),
    }))

    // Les traits sont référencés par UUID : on les résout pour afficher nom et image. Un trait
    // supprimé du monde laisse une entrée vide, filtrée ici plutôt que de casser l'affichage.
    const features =
      this.document.parent?.documentName === "Actor"
        ? this.document.system.features.map((uuid) => fromUuidSync(uuid))
        : await Promise.all(this.document.system.features.map((uuid) => fromUuid(uuid)))
    context.features = features.filter((feature) => feature)

    return context
  }

  /**
   * Le dépôt est branché une seule fois : la fenêtre survit à ses rendus, un branchement par rendu
   * empilerait les écouteurs et traiterait chaque dépôt autant de fois.
   * @inheritDoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options)
    this.element.addEventListener("drop", this.#onDrop.bind(this))
    this.element.addEventListener("dragover", (event) => event.preventDefault())
  }

  /**
   * Ajoute un trait déposé sur la fiche.
   * @param {DragEvent} event
   */
  async #onDrop(event) {
    if (!this.isEditable) return
    event.preventDefault()

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Item") return

    const item = await Item.implementation.fromDropData(data)
    if (!item || item.type !== SYSTEM.ITEM_TYPE.feature) return
    if (this.document.system.features.includes(item.uuid)) return

    return this.document.update({ "system.features": [...this.document.system.features, item.uuid] })
  }

  /**
   * Retire un trait de la liste.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`.
   */
  static async #onRemoveFeature(event, target) {
    if (!this.isEditable) return
    const uuid = target.dataset.uuid
    return this.document.update({ "system.features": this.document.system.features.filter((entry) => entry !== uuid) })
  }

  /**
   * Coche ou décoche une langue de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-language`.
   */
  static async #onToggleLanguage(event, target) {
    if (!this.isEditable) return
    const language = target.dataset.language
    if (!language) return

    const known = new Set(this.document.system.languages)
    if (known.has(language)) known.delete(language)
    else known.add(language)

    return this.document.update({ "system.languages": [...known] })
  }

  /**
   * Ouvre la fiche d'un objet.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-item-id`.
   */
  static async #onEditFeature(event, target) {
    const uuid = target.dataset.uuid
    const item = this.document.parent?.documentName === "Actor" ? fromUuidSync(uuid) : await fromUuid(uuid)
    return item?.sheet.render(true)
  }
}
