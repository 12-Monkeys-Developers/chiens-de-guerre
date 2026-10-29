import { SYSTEM } from "../config/system.mjs"
import CdgBattle from "../combat/battle.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

/**
 * Réglage de la table des adversaires en bataille (p. 52) : à gauche les tranches du d20, à droite
 * les profils tirés. On retire un profil, on en dépose un autre (compendium ou barre latérale) sur
 * sa ligne. Rien n'est écrit avant « Enregistrer » ; le réglage ne garde que les tranches changées.
 */
export default class CdgBattleAdversariesConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "cdg-battle-adversaries",
    classes: ["cdg", "battle-adversaries"],
    position: {
      width: 560,
      height: "auto",
    },
    window: {
      title: "CDG.battle.adversariesConfig.title",
      icon: "fa-solid fa-table-list",
      resizable: true,
    },
    actions: {
      removeAdversary: CdgBattleAdversariesConfig.#onRemove,
      reset: CdgBattleAdversariesConfig.#onReset,
      save: CdgBattleAdversariesConfig.#onSave,
    },
  }

  /** @override */
  static PARTS = {
    body: { template: `${SYSTEM.PATH}/templates/battle/adversaries-config.hbs`, scrollable: [".adversary-rows"] },
  }

  /** Les profils de chaque tranche en cours d'édition, par clé de tranche. */
  #draft = Object.fromEntries(CdgBattle.adversaryTable().map((entry) => [CdgBattle.adversaryKey(entry), [...entry.actors]]))

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    context.rows = SYSTEM.BATTLE_ADVERSARIES.map((entry) => {
      const key = CdgBattle.adversaryKey(entry)
      return {
        key,
        die: entry.min === entry.max ? `${entry.min}` : `${entry.min}–${entry.max}`,
        hint: game.i18n.localize(entry.label),
        actors: this.#draft[key].map((uuid) => {
          const actor = fromUuidSync(uuid)
          return { uuid, name: actor?.name ?? uuid, img: actor?.img ?? "icons/svg/mystery-man.svg", missing: !actor }
        }),
      }
    })
    return context
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options)
    for (const row of this.element.querySelectorAll("[data-key]")) {
      row.addEventListener("dragover", (event) => event.preventDefault())
      row.addEventListener("drop", (event) => this.#onDrop(event, row.dataset.key))
    }
  }

  /**
   * Un PNJ déposé sur une ligne rejoint les profils de sa tranche.
   * @param {DragEvent} event
   * @param {string} key
   */
  async #onDrop(event, key) {
    event.preventDefault()
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data?.type !== "Actor") return
    const actor = await fromUuid(data.uuid)
    if (actor?.type !== "adversaire") return ui.notifications.warn("CDG.battle.adversariesConfig.adversaryOnly", { localize: true })
    if (!this.#draft[key].includes(actor.uuid)) this.#draft[key].push(actor.uuid)
    this.render()
  }

  static async #onRemove(event, target) {
    const key = target.closest("[data-key]").dataset.key
    this.#draft[key] = this.#draft[key].filter((uuid) => uuid !== target.dataset.uuid)
    this.render()
  }

  /** Revient à la table du livre, sans enregistrer. */
  static async #onReset() {
    this.#draft = Object.fromEntries(
      SYSTEM.BATTLE_ADVERSARIES.map((entry) => [CdgBattle.adversaryKey(entry), entry.actors.map((id) => `Compendium.${CdgBattle.PACK}.Actor.${id}`)]),
    )
    this.render()
  }

  /** N'enregistre que les tranches qui s'écartent du livre : une correction du bestiaire profite aux autres. */
  static async #onSave() {
    const custom = {}
    for (const entry of SYSTEM.BATTLE_ADVERSARIES) {
      const key = CdgBattle.adversaryKey(entry)
      const defaults = entry.actors.map((id) => `Compendium.${CdgBattle.PACK}.Actor.${id}`)
      if (!foundry.utils.objectsEqual(this.#draft[key], defaults)) custom[key] = this.#draft[key]
    }
    await game.settings.set(SYSTEM.PACKAGE_ID, CdgBattle.ADVERSARIES_SETTING, custom)
    ui.notifications.info("CDG.battle.adversariesConfig.saved", { localize: true })
    return this.close()
  }
}
