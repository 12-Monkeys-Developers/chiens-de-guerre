import { SYSTEM } from "../config/system.mjs"
import CdgBattle from "../combat/battle.mjs"
import CdgCharacterCreation from "./character-creation.mjs"
import CdgCompanyCreation from "./company-creation.mjs"
import CdgBattleApp from "./battle-app.mjs"

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
      case "company-creation":
        return CdgCompanyCreation.open()
      case "battle":
        return CdgSidebarMenu.#openBattle()
    }
  }

  /**
   * Ouvre la fenêtre de bataille : directement s'il n'y a qu'une compagnie visible (ou une seule
   * engagée dans une bataille), sinon après le choix de la compagnie.
   */
  static async #openBattle() {
    const companies = game.actors.filter((actor) => actor.type === "compagnie" && actor.visible)
    if (!companies.length) return ui.notifications.warn("CDG.battle.noCompany", { localize: true })
    const engaged = companies.filter((actor) => CdgBattle.getState(actor))
    const candidates = engaged.length === 1 ? engaged : companies
    if (candidates.length === 1) return CdgBattleApp.open(candidates[0])

    const options = candidates.map((actor) => `<option value="${actor.id}">${foundry.utils.escapeHTML(actor.name)}</option>`).join("")
    const id = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("CDG.battle.chooseCompany") },
      content: `<div class="form-group"><select name="company">${options}</select></div>`,
      ok: { callback: (event, button) => button.form.elements.company.value },
      rejectClose: false,
    })
    if (id) return CdgBattleApp.open(game.actors.get(id))
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
