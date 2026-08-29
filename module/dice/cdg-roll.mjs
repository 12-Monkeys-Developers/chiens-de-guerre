import { SYSTEM } from "../config/system.mjs"
import { bestDieIndex, OUTCOMES, outcomeLabel, resolveOutcome, worstDieIndex } from "./roll-outcome.mjs"

/**
 * Le jet d'un test de Chiens de guerre, et la carte de chat qui le porte.
 *
 * La poignée est lancée brute (`2d20`, jamais `2d20kh`) pour deux raisons : les règles choisissent
 * le dé conservé après coup, et Dice So Nice doit faire rouler tous les dés, pas seulement celui
 * qu'on garde. Le dé conservé est donc une donnée de la carte, pas une modification du jet.
 *
 * Le dé conservé est toujours calculé automatiquement dès le lancer (le meilleur, ou le pire au
 * rang 0) : le joueur n'a rien à choisir. Seul le Meneur peut ensuite cliquer un autre dé de la
 * poignée, pour un cas particulier.
 *
 * Tout l'état du test vit dans un drapeau du message de chat : c'est lui la source unique, puisqu'il
 * évolue quand le Meneur outrepasse le dé conservé ou que le joueur décide de se dépasser.
 */
export default class CdgRoll extends Roll {
  /** Gabarit de la carte de chat. */
  static CHAT_TEMPLATE = `${SYSTEM.PATH}/templates/chat/roll-card.hbs`

  /** Clé du drapeau qui porte le test dans le message. */
  static FLAG = "test"

  /** Chemin complet du drapeau, pour les mises à jour de message. */
  static get FLAG_PATH() {
    return `flags.${SYSTEM.PACKAGE_ID}.${this.FLAG}`
  }

  // #region Lancer

  /**
   * Lance la poignée de dés d'un test et interprète le résultat, sans poster de carte.
   *
   * Étape commune à un test isolé (`post`) et à un sous-jet de confrontation (`CdgConfrontation`),
   * qui n'a pas de message propre : les deux ont besoin du même lancer et du même dé imposé d'office,
   * mais seul le premier crée immédiatement un `ChatMessage`.
   * @param {Object} test Le test préparé par la fenêtre de jet (voir `CdgRollDialog`).
   * @returns {Promise<{roll: Roll, data: Object}>}
   */
  static async roll(test) {
    const roll = new this(`${test.dice}d20`)
    await roll.evaluate()

    const results = roll.dice[0].results.map((die) => die.result)
    return { roll, data: { ...test, results, keptIndex: this.#autoKeptIndex(test, results) } }
  }

  /**
   * Lance un test et poste sa carte.
   * @param {Object} test Le test préparé par la fenêtre de jet (voir `CdgRollDialog`).
   * @returns {Promise<ChatMessage>}
   */
  static async post(test) {
    const { roll, data } = await this.roll(test)

    const actor = await fromUuid(test.actorUuid)
    return ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor }),
      content: await this.renderCard(data),
      rolls: [roll],
      flags: { [SYSTEM.PACKAGE_ID]: { [this.FLAG]: data } },
    })
  }

  /**
   * Le dé conservé d'office, calculé dès le lancer : le joueur ne choisit jamais.
   *
   * Un seul dé ne laisse aucun choix ; au rang 0, la règle impose le résultat le moins bon — ce qui
   * n'est ni le plus grand ni le plus petit, mais celui qui produit la pire issue face au seuil ;
   * partout ailleurs, c'est le dé qui produit la meilleure issue qui est retenu.
   * @param {Object} test
   * @param {number[]} results
   * @returns {number}
   */
  static #autoKeptIndex(test, results) {
    if (test.keep === "single" || results.length === 1) return 0
    if (test.keep === "worst") return worstDieIndex(results, test.sr)
    return bestDieIndex(results, test.sr)
  }

  // #endregion

  // #region Carte de chat

  /**
   * Compose le contenu de la carte.
   * @param {Object} test
   * @returns {Promise<string>}
   */
  static async renderCard(test) {
    return foundry.applications.handlebars.renderTemplate(this.CHAT_TEMPLATE, this.cardContext(test))
  }

  /**
   * Contexte du gabarit : le test, ses dés interprétés et son verdict.
   *
   * Chaque dé est résolu individuellement, ce qui permet d'afficher au joueur ce que vaut chacun,
   * pas seulement celui qui est retenu — c'est le sel du système de savoir ce qu'on a laissé passer.
   * @param {Object} test
   * @returns {Object}
   */
  static cardContext(test) {
    const dice = test.results.map((result, index) => {
      const outcome = resolveOutcome(result, test.sr)
      return {
        index,
        result,
        outcome: outcome.outcome,
        label: game.i18n.localize(outcomeLabel(outcome)),
        kept: index === test.keptIndex,
      }
    })

    const outcome = resolveOutcome(test.results[test.keptIndex], test.sr)

    return {
      test,
      dice,
      canPush: !test.pushed && !test.noPush,
      outcome,
      outcomeId: outcome.outcome,
      outcomeLabel: game.i18n.localize(outcomeLabel(outcome)),
      outcomeIcon: OUTCOMES[outcome.outcome].icon,
      SYSTEM,
    }
  }

  /**
   * Le test porté par un message, ou `null` si ce n'en est pas un.
   * @param {ChatMessage} message
   * @returns {Object|null}
   */
  static getTest(message) {
    return message.getFlag(SYSTEM.PACKAGE_ID, this.FLAG) ?? null
  }

  /**
   * Réécrit la carte d'un message après modification du test.
   * Le contenu et le drapeau partent ensemble : le message reste cohérent même si le rendu du chat
   * ne repasse pas par là.
   * @param {ChatMessage} message
   * @param {Object} test
   * @returns {Promise<ChatMessage>}
   */
  static async #refresh(message, test) {
    return message.update({ content: await this.renderCard(test), [this.FLAG_PATH]: test })
  }

  // #endregion

  // #region Interactions

  /**
   * Branche les boutons de la carte. Appelé sur `renderChatMessageHTML`.
   *
   * Les deux boutons n'ont pas la même portée : le dé conservé n'est outrepassable que par le
   * Meneur (le joueur ne choisit plus rien), alors que se dépasser reste ouvert à l'auteur du test.
   * @param {ChatMessage} message
   * @param {HTMLElement} html
   */
  static activateListeners(message, html) {
    const test = this.getTest(message)
    if (!test) return

    for (const button of html.querySelectorAll("[data-action='keepDie']")) {
      if (!game.user.isGM) {
        button.disabled = true
        continue
      }
      button.addEventListener("click", (event) => this.#onKeepDie(event, message))
    }

    if (!this.#canInteract(message)) return
    for (const button of html.querySelectorAll("[data-action='pushTest']")) {
      button.addEventListener("click", (event) => this.#onPushTest(event, message))
    }
  }

  /**
   * Seuls l'auteur du jet et le Meneur de jeu touchent à la carte : le choix du dé et le dépassement
   * engagent les réserves du personnage.
   * @param {ChatMessage} message
   * @returns {boolean}
   */
  static #canInteract(message) {
    return message.isAuthor || game.user.isGM
  }

  /**
   * Le Meneur outrepasse le dé conservé — la sélection automatique reste la règle, ceci n'est
   * qu'une exception ponctuelle.
   * @param {PointerEvent} event
   * @param {ChatMessage} message
   */
  static async #onKeepDie(event, message) {
    event.preventDefault()
    const index = parseInt(event.currentTarget.dataset.index)
    const test = this.getTest(message)
    if (!test || isNaN(index) || index === test.keptIndex) return

    return this.#refresh(message, { ...test, keptIndex: index })
  }

  /**
   * Se dépasser (p. 43) : relancer un test dont le résultat ne satisfait pas.
   *
   * Le prix est d'un point dans chacune des trois réserves, et aucune ne peut tomber à zéro. Le
   * seuil de réussite est conservé tel quel, bonus compris ; seuls les dés sont rejetés. Une seule
   * fois par test.
   * @param {PointerEvent} event
   * @param {ChatMessage} message
   */
  static async #onPushTest(event, message) {
    event.preventDefault()
    const test = this.getTest(message)
    if (!test || test.pushed || test.noPush) return

    const actor = await fromUuid(test.actorUuid)
    if (!actor) return ui.notifications.warn(game.i18n.localize("CDG.roll.notif.actorMissing"))

    const drained = Object.values(SYSTEM.ABILITIES).filter((ability) => actor.system.abilities[ability.id].value <= 1)
    if (drained.length > 0) {
      const names = drained.map((ability) => game.i18n.localize(ability.label)).join(", ")
      return ui.notifications.warn(game.i18n.format("CDG.roll.notif.cannotPush", { abilities: names }))
    }

    const updates = {}
    for (const ability of Object.values(SYSTEM.ABILITIES)) {
      updates[`system.abilities.${ability.id}.value`] = actor.system.abilities[ability.id].value - 1
    }
    await actor.update(updates)

    await this.#refresh(message, { ...test, pushed: true })
    return this.post({ ...test, pushed: true, isPush: true })
  }

  // #endregion
}
