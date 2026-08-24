import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"

/** Partiels partagés par les fiches d'objet. */
const SHARED_DESCRIPTION = `${SYSTEM.PATH}/templates/items/shared/description.hbs`

export default class CdgCarriereSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["carriere"],
    position: {
      height: 700,
    },
    actions: {
      addSkill: CdgCarriereSheet.#onAddSkill,
      removeSkill: CdgCarriereSheet.#onRemoveSkill,
      removeReference: CdgCarriereSheet.#onRemoveReference,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/carriere.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.choiceAbilities = SYSTEM.ABILITIES
    context.choiceSkills = SYSTEM.SKILLS

    const embedded = this.document.parent?.documentName === "Actor"
    const arcanums = embedded ? this.document.system.arcanums.map((uuid) => fromUuidSync(uuid)) : await Promise.all(this.document.system.arcanums.map((uuid) => fromUuid(uuid)))
    const equipments = embedded
      ? this.document.system.equipments.map((uuid) => fromUuidSync(uuid))
      : await Promise.all(this.document.system.equipments.map((uuid) => fromUuid(uuid)))
    context.arcanums = arcanums.filter((item) => item)
    context.equipments = equipments.filter((item) => item)

    return context
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this.element.addEventListener("drop", this.#onDrop.bind(this))
    this.element.addEventListener("dragover", (event) => event.preventDefault())
  }

  /**
   * Ajoute un arcanum ou un équipement de départ déposé sur la fiche.
   * @param {DragEvent} event
   */
  async #onDrop(event) {
    if (!this.isEditable) return
    event.preventDefault()

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Item") return

    const item = await Item.implementation.fromDropData(data)
    if (!item) return

    const field = item.type === SYSTEM.ITEM_TYPE.arcanum ? "arcanums" : item.type === SYSTEM.ITEM_TYPE.equipment ? "equipments" : null
    if (!field) return
    if (this.document.system[field].includes(item.uuid)) return

    return this.document.update({ [`system.${field}`]: [...this.document.system[field], item.uuid] })
  }

  /**
   * Ajoute une ligne de compétence de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddSkill(event, target) {
    if (!this.isEditable) return
    // La première compétence non encore listée, pour éviter un doublon dès la création de la ligne.
    const used = new Set(this.document.system.skills.map((entry) => entry.skill))
    const available = Object.keys(SYSTEM.SKILLS).find((skill) => !used.has(skill))
    if (!available) return

    return this.document.update({ "system.skills": [...this.document.system.skills, { skill: available, rank: 1 }] })
  }

  /**
   * Retire une ligne de compétence de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-index`.
   */
  static async #onRemoveSkill(event, target) {
    if (!this.isEditable) return
    const index = parseInt(target.dataset.index)
    if (isNaN(index)) return

    const skills = [...this.document.system.skills]
    skills.splice(index, 1)
    return this.document.update({ "system.skills": skills })
  }

  /**
   * Retire un arcanum ou un équipement de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-field` et `data-uuid`.
   */
  static async #onRemoveReference(event, target) {
    if (!this.isEditable) return
    const field = target.dataset.field
    const uuid = target.dataset.uuid
    if (!field || !uuid) return

    return this.document.update({ [`system.${field}`]: this.document.system[field].filter((entry) => entry !== uuid) })
  }
}
