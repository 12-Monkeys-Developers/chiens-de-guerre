import { SYSTEM } from "../config/system.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/**
 * Tableau de bord des joueurs — sur le principe de la fiche de groupe de co2 : une fenêtre en
 * singleton (`game.system.partySheet`), réservée au MJ, qui liste les personnages joueurs
 * actuellement connectés avec leurs caractéristiques, leur passion et leurs blessures.
 *
 * Purement informatif : seul le portrait/nom du personnage est cliquable (ouvre sa fiche). Aucun
 * jet ne se lance depuis ce tableau — décision explicite, à la différence de co2.
 */
export default class CdgPartySheet extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "cdg-party-sheet",
    classes: ["cdg", "party-sheet"],
    position: {
      width: 780,
      height: "auto",
    },
    window: {
      title: "CDG.party.title",
      resizable: true,
    },
    actions: {
      openSheet: CdgPartySheet.#onOpenSheet,
    },
  }

  /** @override */
  static PARTS = {
    party: { template: `${SYSTEM.PATH}/templates/party/party-sheet.hbs` },
  }

  constructor(options = {}) {
    super(options)
    // Pas de polling : la fiche se retrace d'elle-même dès qu'un personnage change, ou qu'un
    // joueur se connecte/déconnecte (la liste ne montre que les joueurs actifs).
    Hooks.on("updateActor", () => this.render(false))
    Hooks.on("renderPlayers", () => this.render(false))
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)

    // Colonnes fixes (les trois caractéristiques du personnage) : l'en-tête du tableau les lit une
    // seule fois, chaque ligne ne porte que les valeurs, dans le même ordre.
    context.abilityColumns = Object.values(SYSTEM.ABILITIES).map((ability) => ({ ...ability, name: game.i18n.localize(ability.label) }))

    context.members = game.users
      .filter((user) => !user.isGM && user.active && user.character?.type === "character")
      .map((user) => {
        const actor = user.character
        return {
          userId: user.id,
          userName: user.name,
          userColor: user.color,
          actorId: actor.id,
          name: actor.name,
          img: actor.img,
          abilities: Object.values(SYSTEM.ABILITIES).map((ability) => ({
            ...ability,
            name: game.i18n.localize(ability.label),
            pool: actor.system.abilities[ability.id],
          })),
          passion: actor.system.passion,
          wounds: actor.system.wounds,
        }
      })
    context.woundLevels = Object.values(SYSTEM.WOUND_LEVELS)

    return context
  }

  /**
   * Ouvre la fiche du personnage.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte, ou est contenu dans, un `data-actor-id`.
   */
  static async #onOpenSheet(event, target) {
    const actor = game.actors.get(target.closest("[data-actor-id]")?.dataset.actorId)
    return actor?.sheet.render(true)
  }
}
