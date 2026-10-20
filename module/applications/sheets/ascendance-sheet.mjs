import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"

/** Partiels partagés par les fiches d'objet. */
const SHARED_DESCRIPTION = `${SYSTEM.PATH}/templates/items/shared/description.hbs`

export default class CdgAscendanceSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ascendance"],
    form: { handler: CdgAscendanceSheet.#onSubmit },
    actions: {
      removeArcanumChoice: CdgAscendanceSheet.#onRemoveArcanumChoice,
      editArcanumChoice: CdgAscendanceSheet.#onEditArcanumChoice,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/ascendance.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.enrichedcompulsionDesc = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.compulsionDesc)

    // Les arcanums candidats sont référencés par UUID : on les résout pour afficher nom et image,
    // et pour peupler le select du bonus. Un arcanum supprimé du monde laisse une entrée vide,
    // filtrée ici plutôt que de casser l'affichage.
    const choices =
      this.document.parent?.documentName === "Actor"
        ? this.document.system.arcanumChoices.map((uuid) => fromUuidSync(uuid))
        : await Promise.all(this.document.system.arcanumChoices.map((uuid) => fromUuid(uuid)))
    context.arcanumChoices = choices.filter((arcanum) => arcanum)
    context.arcanumOptions = context.arcanumChoices.map((arcanum) => ({ id: arcanum.uuid, label: arcanum.name }))

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
   * Ajoute un arcanum candidat déposé sur la fiche, jusqu'à 4.
   * @param {DragEvent} event
   */
  async #onDrop(event) {
    if (!this.isEditable) return
    event.preventDefault()

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Item") return

    const item = await Item.implementation.fromDropData(data)
    if (!item || item.type !== SYSTEM.ITEM_TYPE.arcanum) return
    if (this.document.system.arcanumChoices.includes(item.uuid)) return
    if (this.document.system.arcanumChoices.length >= 4) return ui.notifications.warn(game.i18n.localize("CDG.ui.tooManyArcanumChoices"))

    return this.document.update({ "system.arcanumChoices": [...this.document.system.arcanumChoices, item.uuid] })
  }

  /**
   * Retire un arcanum candidat de la liste. S'il portait le bonus actif, le bonus est défait sur
   * le personnage avant d'être vidé.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`.
   */
  static async #onRemoveArcanumChoice(event, target) {
    if (!this.isEditable) return
    const uuid = target.dataset.uuid
    const clearingBonus = this.document.system.arcanumBonus === uuid
    const previousUuid = this.document.system.arcanumBonus

    await this.document.update({
      "system.arcanumChoices": this.document.system.arcanumChoices.filter((entry) => entry !== uuid),
      ...(clearingBonus ? { "system.arcanumBonus": "" } : {}),
    })

    if (clearingBonus && this.document.parent?.documentName === "Actor") return this.document.parent.updateArcanumBonus(this.document, previousUuid, "")
  }

  /**
   * Ouvre la fiche d'un arcanum candidat.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`.
   */
  static async #onEditArcanumChoice(event, target) {
    const uuid = target.dataset.uuid
    const item = this.document.parent?.documentName === "Actor" ? fromUuidSync(uuid) : await fromUuid(uuid)
    return item?.sheet.render(true)
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
