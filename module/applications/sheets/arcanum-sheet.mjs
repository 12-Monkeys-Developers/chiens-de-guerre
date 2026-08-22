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
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    main: { template: `${SYSTEM.PATH}/templates/items/arcanummain.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
    rank1: { template: `${SYSTEM.PATH}/templates/items/arcanumrank1.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
    rank2: { template: `${SYSTEM.PATH}/templates/items/arcanumrank2.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
    rank3: { template: `${SYSTEM.PATH}/templates/items/arcanumrank3.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        {
          id: "main", cssClass: "tabName" },
        { id: "rank1", cssClass: "tabName" },
        { id: "rank2", cssClass: "tabName" },
        { id: "rank3", cssClass: "tabName" },
      ],
      initial: "main",
      labelPrefix: "CDG.sheet.tabs",
    },
  }


  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.isPassive = this.document.system.isPassive
    context.bonus = this.document.system.bonus
    context.choiceTypes = SYSTEM.ARCANUM_TYPES
    context.choiceSkills = SYSTEM.SKILLS
    context.enrichedEffect1 = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.rankData.effect1 ?? "");
    context.enrichedEffect2 = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.rankData.effect2 ?? "");
    context.enrichedEffect3 = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.rankData.effect3 ?? "");

    return context
  }
}
