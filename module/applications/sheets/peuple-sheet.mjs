import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"
import { SHARED_DESCRIPTION } from "./partials.mjs"

export default class CdgPeupleSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["peuple"],
    actions: {
      toggleLanguage: CdgPeupleSheet.#onToggleLanguage,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/peuple.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  static REFERENCE_FIELDS = {
    features: { type: SYSTEM.ITEM_TYPE.feature },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.choiceAbilities = SYSTEM.ABILITIES
    context.languages = Object.values(SYSTEM.LANGUAGES).map((language) => ({
      ...language,
      known: this.document.system.languages.includes(language.id),
    }))

    context.features = await this._resolveReferences("features")

    return context
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
}
