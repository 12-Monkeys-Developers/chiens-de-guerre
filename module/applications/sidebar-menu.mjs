import { SYSTEM } from "../config/system.mjs"
import CdgCharacterCreation from "./character-creation.mjs"

const { HandlebarsApplicationMixin } = foundry.applications.api
const { AbstractSidebarTab } = foundry.applications.sidebar

/**
 * L'onglet du système dans la barre latérale : porte d'entrée du tableau de bord des joueurs (MJ
 * seulement) et de l'assistant de création de personnage (tout compte pouvant créer un acteur).
 */
export default class CdgSidebarMenu extends HandlebarsApplicationMixin(AbstractSidebarTab) {
  /** @override */
  static DEFAULT_OPTIONS = {
    // `AbstractSidebarTab` ne pose que `tab`/`sidebar-tab` par défaut : sans cette classe, la
    // feuille de style de l'onglet (`styles/applications/sidebar.less`, sélecteur `.cdg-sidebar`)
    // ne rencontrerait jamais son élément.
    classes: ["cdg-sidebar"],
    window: {
      title: "CDG.sidebar.title",
    },
    actions: {
      openApp: CdgSidebarMenu.#onOpenApp,
    },
  }

  /** @override */
  static tabName = "cdg"

  /** @override */
  static PARTS = {
    cdg: {
      template: `${SYSTEM.PATH}/templates/sidebar-menu.hbs`,
      // Plusieurs sections à la racine du gabarit, sans conteneur intermédiaire.
      root: true,
    },
  }

  /**
   * Ouvre l'application demandée.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-app`.
   */
  static async #onOpenApp(event, target) {
    switch (target.dataset.app) {
      case "party":
        return game.system.partySheet.render({ force: true })
      case "character-creation":
        return CdgCharacterCreation.open()
    }
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    return Object.assign(context, {
      version: game.i18n.format("CDG.sidebar.version", { version: game.system.version }),
      isGM: game.user.isGM,
      // Un joueur sans droit de création d'acteur verrait l'assistant échouer au dernier bouton.
      canCreateActor: game.user.can("ACTOR_CREATE"),
    })
  }
}
