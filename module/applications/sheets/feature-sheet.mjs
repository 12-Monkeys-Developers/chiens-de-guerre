import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"
import { SHARED_DESCRIPTION } from "./partials.mjs"

const SHARED_EFFECTS = `${SYSTEM.PATH}/templates/items/shared/effects.hbs`

export default class CdgFeatureSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["feature"],
    position: {
      height: 620,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/feature.hbs`, templates: [SHARED_DESCRIPTION, SHARED_EFFECTS], scrollable: [""] },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.choiceCategories = SYSTEM.FEATURE_CATEGORIES
    context.choiceSuspicions = SYSTEM.FEATURE_SUSPICIONS

    return context
  }
}
