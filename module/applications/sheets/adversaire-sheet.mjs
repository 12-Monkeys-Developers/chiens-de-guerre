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
      width: 520,
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
    combat: { template: `${SYSTEM.PATH}/templates/actors/adversaire-combat.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    description: { template: `${SYSTEM.PATH}/templates/actors/adversaire-description.hbs`, scrollable: [""] },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "combat", cssClass: "tabName" },
        { id: "description", cssClass: "tabName" }
      ],
      initial: "combat",
      labelPrefix: "CDG.sheet.tabs",
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()
    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML

    context.enrichedDescription = await enrichHTML(this.document.system.details.description)
    context.enrichedSpecial = await enrichHTML(this.document.system.details.special)
    context.enrichedNotes = await enrichHTML(this.document.system.details.notes)
    context.hasSpecial = !!this.document.system.details.special?.trim()
    context.adversaireAbilities = [SYSTEM.ABILITIES.corps, SYSTEM.ABILITIES.esprit, SYSTEM.ABILITIES.vivacite]

    const skills = Object.values(SYSTEM.ADVERSARY_SKILLS)
    if (this.isEditMode) {
      const columnSize = Math.ceil(skills.length / 4)
      context.skillColumns = Array.from({ length: 4 }, (_, column) => skills.slice(column * columnSize, (column + 1) * columnSize))
    } else {
      context.skillColumns = [1, 2].map((column) => skills.filter((skill) => skill.column === column && this.document.system.skills[skill.id].rank > 0))
    }
    context.hasSkills = context.skillColumns.some((column) => column.length > 0)

    return context
  }
}
