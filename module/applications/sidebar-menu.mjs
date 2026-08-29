import { SYSTEM } from "../config/system.mjs"

const { HandlebarsApplicationMixin } = foundry.applications.api
const { AbstractSidebarTab } = foundry.applications.sidebar

/**
 * L'onglet du système dans la barre latérale : pour l'instant, la seule porte d'entrée du tableau
 * de bord des joueurs.
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
    if (target.dataset.app === "party") game.system.partySheet.render({ force: true })
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    return Object.assign(context, {
      version: game.i18n.format("CDG.sidebar.version", { version: game.system.version }),
      isGM: game.user.isGM,
    })
  }
}
