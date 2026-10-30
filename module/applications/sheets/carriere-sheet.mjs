import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"
import { SHARED_DESCRIPTION } from "./partials.mjs"

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
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/carriere.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  static REFERENCE_FIELDS = {
    arcanums: { type: SYSTEM.ITEM_TYPE.arcanum },
    equipments: { type: SYSTEM.ITEM_TYPE.equipment },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.choiceAbilities = SYSTEM.ABILITIES
    context.choiceSkills = SYSTEM.SKILLS

    context.arcanums = await this._resolveReferences("arcanums")
    context.equipments = await this._resolveReferences("equipments")

    return context
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
}
