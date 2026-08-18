import { SYSTEM } from "../../config/system.mjs"
import CdgBaseActorSheet from "./base-actor-sheet.mjs"

/** Partiel des rangées d'écussons, partagé par les onglets Compétences et Combat. */
const RANK_SHIELDS = `${SYSTEM.PATH}/templates/shared/rank-shields.hbs`

/**
 * Fiche d'adversaire : le strict nécessaire pour tenir une créature en jeu — caractéristiques,
 * compétences notées, blessures, armes portées et une description.
 */
export default class CdgAdversaireSheet extends CdgBaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["adversaire"],
    position: {
      width: 780,
      height: 780,
    },
    window: {
      contentClasses: ["adversaire-content"],
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/actors/adversaire-header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    competences: { template: `${SYSTEM.PATH}/templates/actors/character-competences.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    combat: { template: `${SYSTEM.PATH}/templates/actors/adversaire-combat.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    description: { template: `${SYSTEM.PATH}/templates/actors/adversaire-description.hbs`, scrollable: [""] },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "competences" }, { id: "combat" }, { id: "description" }],
      initial: "combat",
      labelPrefix: "CDG.sheet.tabs",
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()
    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML

    context.enrichedDescription = await enrichHTML(this.document.system.details.description)
    context.enrichedNotes = await enrichHTML(this.document.system.details.notes)

    return context
  }
}
