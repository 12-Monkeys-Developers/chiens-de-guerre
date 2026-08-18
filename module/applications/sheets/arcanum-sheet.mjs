import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"

/** Partiels partagés par les fiches d'objet. */
const SHARED_DESCRIPTION = `${SYSTEM.PATH}/templates/items/shared/description.hbs`

export default class CdgArcanumSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["arcanum"],
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/arcanum.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.isPassive = this.document.system.isPassive
    context.bonus = this.document.system.bonus
    context.choiceTypes = SYSTEM.ARCANUM_TYPES
    context.choiceSkills = SYSTEM.SKILLS
    context.enrichedEffect = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.effect ?? "")

    return context
  }
}
