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
        { id: "description", cssClass: "tabName" },
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

    // Les compétences de combat d'abord, puis toutes les autres : toutes en édition, seules celles
    // qui ont un rang en lecture. Chaque groupe se lit en deux colonnes, de haut en bas.
    const combat = Object.values(SYSTEM.ADVERSARY_SKILLS)
    const others = Object.values(SYSTEM.SKILLS).filter((skill) => !SYSTEM.ADVERSARY_SKILLS[skill.id])
    context.skillGroups = [combat, others]
      .map((skills) => (this.isEditMode ? skills : skills.filter((skill) => this.document.system.skills[skill.id].rank > 0)))
      .filter((skills) => skills.length > 0)
      .map((skills) => {
        const columnSize = Math.ceil(skills.length / 2)
        return [skills.slice(0, columnSize), skills.slice(columnSize)]
      })
    context.hasSkills = context.skillGroups.length > 0

    return context
  }
}
