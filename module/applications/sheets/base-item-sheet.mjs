import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../helpers/utils.mjs"

const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api

/**
 * Socle des fiches d'objet : en-tête commun (image, nom), description, et l'action de
 * réglage des rangs partagée avec les fiches d'acteur.
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
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.item = this.document
    context.system = this.document.system
    context.source = this.document.toObject()
    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.isEditable = this.isEditable
    context.SYSTEM = SYSTEM

    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description ?? "")

    if (CONFIG.debug.cdg?.sheets) console.debug(Utils.log(`${this.constructor.name} - contexte`), context)

    return context
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
