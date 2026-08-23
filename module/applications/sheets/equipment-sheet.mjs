import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"

/** Partiels partagés par les fiches d'objet. */
const SHARED_DESCRIPTION = `${SYSTEM.PATH}/templates/items/shared/description.hbs`
const RANK_SHIELDS = `${SYSTEM.PATH}/templates/shared/rank-shields.hbs`

export default class CdgEquipmentSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["equipment"],
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/equipment.hbs`, templates: [SHARED_DESCRIPTION, RANK_SHIELDS], scrollable: [""] },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    // La fiche n'affiche que les champs du sous-type courant : une arme n'a pas de catégorie
    // d'armure, un bouclier pas de dégâts.
    context.isWeapon = this.document.system.isWeapon
    context.isArmor = this.document.system.isArmor
    context.isShield = this.document.system.isShield

    context.choiceSubtypes = SYSTEM.EQUIPMENT_SUBTYPES
    context.choiceCategories = SYSTEM.EQUIPMENT_CATEGORIES[this.document.system.subtype] ?? {}
    context.choiceAbilities = Object.values(SYSTEM.ABILITIES)
    context.choiceSkills = Object.values(SYSTEM.SKILLS)
    context.currencies = Object.values(SYSTEM.CURRENCIES)

    return context
  }
}
