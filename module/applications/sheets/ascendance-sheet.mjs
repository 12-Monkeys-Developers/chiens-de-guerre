import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"
import { SHARED_DESCRIPTION } from "./partials.mjs"

export default class CdgAscendanceSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ascendance"],
    form: { handler: CdgAscendanceSheet.#onSubmit },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/ascendance.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  static REFERENCE_FIELDS = {
    arcanumChoices: { type: SYSTEM.ITEM_TYPE.arcanum, max: SYSTEM.ASCENDANCE_MAX_ARCANUM_CHOICES, tooMany: "CDG.ui.tooManyArcanumChoices" },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.enrichedcompulsionDesc = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.compulsionDesc)

    // Les arcanums candidats sont résolus aussi pour peupler le select du bonus.
    context.arcanumChoices = await this._resolveReferences("arcanumChoices")
    context.arcanumOptions = context.arcanumChoices.map((arcanum) => ({ id: arcanum.uuid, label: arcanum.name }))

    return context
  }

  /**
   * Retire un arcanum candidat de la liste. S'il portait le bonus actif, le bonus est défait sur
   * le personnage avant d'être vidé.
   * @inheritDoc
   */
  async _removeReference(field, uuid) {
    const clearingBonus = this.document.system.arcanumBonus === uuid
    const previousUuid = this.document.system.arcanumBonus

    await this.document.update({
      "system.arcanumChoices": this.document.system.arcanumChoices.filter((entry) => entry !== uuid),
      ...(clearingBonus ? { "system.arcanumBonus": "" } : {}),
    })

    if (clearingBonus && this.document.parent?.documentName === "Actor") return this.document.parent.updateArcanumBonus(this.document, previousUuid, "")
  }

  /**
   * Soumission du formulaire : au-delà de la mise à jour habituelle, un changement de
   * `system.arcanumBonus` répercute l'octroi/retrait mécanique sur le personnage porteur.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmit(event, form, formData) {
    const previousUuid = this.document.system.arcanumBonus
    await this.document.update(formData.object)
    const nextUuid = this.document.system.arcanumBonus

    if (nextUuid === previousUuid) return
    if (this.document.parent?.documentName !== "Actor") return
    return this.document.parent.updateArcanumBonus(this.document, previousUuid, nextUuid)
  }
}
