import { SYSTEM } from "../config/system.mjs"
import CdgRollDialog from "../applications/roll-dialog.mjs"
import CdgRoll from "../dice/cdg-roll.mjs"
import { keptOutcome } from "../dice/roll-outcome.mjs"
import { createChatMessage } from "../helpers/chat.mjs"
import Utils from "../helpers/utils.mjs"

/**
 * Rappel de fin de round pour un personnage joueur mourant (toutes les cases de blessure mortelle
 * cochées, non stabilisé, p. 46) : une carte de chat par personnage concerné, avec un bouton
 * ouvrant le test de survie Corps / Vigueur — sans effort, sans passion, sans dépassement
 * (`restricted: true`), et sans malus de blessure (case décochée, comme à l'encaissement).
 *
 * Le personnage reste mourant tant que le joueur ou le Meneur ne décoche pas `wounds.dying` à la
 * main (fiche, bloc Blessures) — sauf échec du test de survie, qui tranche définitivement : voir
 * `#postSurvivalRoll`.
 */
export default class CdgDyingPrompt {
  /** Gabarit de la carte de chat. */
  static CHAT_TEMPLATE = `${SYSTEM.PATH}/templates/chat/dying-prompt-card.hbs`

  /** Clé du drapeau qui porte l'acteur concerné dans le message. */
  static FLAG = "dyingPrompt"

  /**
   * Poste un rappel pour chaque personnage joueur toujours mourant à la fin du round. Les
   * adversaires ne sont volontairement pas concernés.
   * @param {CdgCombat} combat
   */
  static async postForCombat(combat) {
    for (const combatant of combat.combatants) {
      const actor = combatant.actor
      if (actor?.type !== "character" || !actor.system.wounds.dying) continue
      Utils.debug("wounds", `${actor.name} est mourant : rappel du jet de survie posté`)
      await this.#post(actor)
    }
  }

  /**
   * Poste la carte de rappel pour un personnage donné.
   * @param {CdgActor} actor
   * @returns {Promise<ChatMessage>}
   */
  static async #post(actor) {
    const content = await foundry.applications.handlebars.renderTemplate(this.CHAT_TEMPLATE, {
      message: game.i18n.format("CDG.combat.dying.chatMessage", { name: actor.name }),
    })

    return createChatMessage({
      speaker: ChatMessage.implementation.getSpeaker({ actor }),
      content,
      flags: { [SYSTEM.PACKAGE_ID]: { [this.FLAG]: { actorUuid: actor.uuid } } },
    })
  }

  /**
   * Branche le bouton de la carte. Appelé sur `renderChatMessageHTML`, comme `CdgRoll` et
   * `CdgConfrontation`, mais ne fait rien sur un message qui ne porte pas ce drapeau.
   * @param {ChatMessage} message
   * @param {HTMLElement} html
   */
  static activateListeners(message, html) {
    const state = message.getFlag(SYSTEM.PACKAGE_ID, this.FLAG)
    if (!state) return

    const button = html.querySelector("[data-action='rollSurvival']")
    if (!button) return

    const actor = fromUuidSync(state.actorUuid)
    if (!game.user.isGM && !actor?.isOwner) {
      button.style.display = "none"
      return
    }
    // Comme sur la carte de confrontation : le Meneur voit le bouton du joueur, mais en retrait.
    if (game.user.isGM && actor?.hasPlayerOwner) button.classList.add("player-side")
    button.addEventListener("click", () => this.#onRollSurvival(state.actorUuid))
  }

  /**
   * Ouvre le test de survie Corps / Vigueur restreint. La carte est postée par
   * `#postSurvivalRoll`, seule à interpréter l'issue — rien ici ne réécrit la carte de rappel.
   * @param {string} actorUuid
   */
  static async #onRollSurvival(actorUuid) {
    const actor = await fromUuid(actorUuid)
    if (!actor) return

    return CdgRollDialog.open(actor, {
      abilityId: "corps",
      skillId: "vigueur",
      lockedPair: true,
      label: "CDG.combat.survivalTest",
      restricted: true,
      toggles: { wound: false },
      postHandler: (test) => this.#postSurvivalRoll(test, actor),
    })
  }

  /**
   * Poste la carte du jet de survie comme un test isolé ordinaire (`CdgRoll.post`), puis tranche :
   * un échec applique le statut Foundry « Mort » (p. 46) et referme le drapeau
   * `wounds.dying`, puisqu'un personnage mort n'a plus de rappel de fin de round à recevoir.
   *
   * Le dé conservé peut encore être outrepassé par le Meneur après coup (`CdgRoll#onKeepDie`),
   * mais cette décision n'est pas reconsidérée : elle porte sur le résultat annoncé au moment du
   * jet, pas sur un correctif ultérieur — comme le dépassement, déjà exclu de ce test restreint.
   * @param {Object} test Le test préparé par la fenêtre de jet, pas encore lancé.
   * @param {CdgActor} actor
   * @returns {Promise<ChatMessage>}
   */
  static async #postSurvivalRoll(test, actor) {
    const message = await CdgRoll.post(test)
    const data = CdgRoll.getTest(message)

    const outcome = keptOutcome(data)
    Utils.debug("wounds", `Jet de survie de ${actor.name} : ${outcome.success ? "réussi" : "raté, marqué mort"}`)
    if (!outcome.success) {
      await actor.toggleStatusEffect("dead", { active: true })
      await actor.update({ "system.wounds.dying": false })
    }
    return message
  }
}
