import { SYSTEM } from "../config/system.mjs"
import { adversaryName, memberView, modifierLabel, outcomeName, recapContext } from "./battle-cards.mjs"
import { chief, rollFight, rollGeneralCompany, rollGeneralEnemy, rollLosses, rollProtection, rollTactique } from "./battle-rolls.mjs"
import { exploitAvailable } from "./battle-rules.mjs"
import { adversaryKey, adversaryTable, drawAdversary, endSkirmish, onDeleteCombat, openAdversary, startSkirmish } from "./battle-skirmish.mjs"
import { BATTLE, getState, rosterActors } from "./battle-state.mjs"
import { applyStep, handleStepQuery, onRollMessage, request } from "./battle-writer.mjs"

/**
 * Les batailles (p. 51-54) : enjeu, modificateur de bataille, puis des tours de cinq phases jusqu'à
 * ce qu'un camp totalise trois points de victoire.
 *
 * Une seule bataille à la fois par compagnie franche, dans un drapeau de l'acteur compagnie. Le
 * Meneur actif en est le seul écrivain (`battle-writer.mjs`).
 *
 * `CdgBattle` est la porte d'entrée du reste du système (fenêtre de bataille, fiche de compagnie,
 * hooks de `cdg.mjs`) ; le travail est réparti, dépendances dans un seul sens :
 * - `battle-rules.mjs` : les tables et règles pures, testées sous Node ;
 * - `battle-state.mjs` : clés des drapeaux, lecture et écriture brute de l'état ;
 * - `battle-cards.mjs` : cartes de tchat, récapitulatif et page de journal ;
 * - `battle-writer.mjs` : les étapes appliquées par le Meneur, dont le rangement des jets ;
 * - `battle-rolls.mjs` : les jets de chaque phase ;
 * - `battle-skirmish.mjs` : l'adversaire tiré et l'escarmouche d'un round ;
 * - ce fichier : les boutons des cartes et de la fenêtre.
 */
export default class CdgBattle {
  static FLAG = BATTLE.FLAG

  static CARD_FLAG = BATTLE.CARD_FLAG

  static SKIRMISH_FLAG = BATTLE.SKIRMISH_FLAG

  static TEMPORARY_FLAG = BATTLE.TEMPORARY_FLAG

  static ARCHIVE_FLAG = BATTLE.ARCHIVE_FLAG

  static PACK = BATTLE.PACK

  static ADVERSARIES_SETTING = BATTLE.ADVERSARIES_SETTING

  static TEMPLATES = BATTLE.TEMPLATES

  // État
  static getState = getState

  static rosterActors = rosterActors

  // Écriture (Meneur)
  static request = request

  static handleStepQuery = handleStepQuery

  static applyStep = applyStep

  static onRollMessage = onRollMessage

  // Jets
  static rollFight = rollFight

  static rollProtection = rollProtection

  static rollTactique = rollTactique

  static chief = chief

  static rollGeneralCompany = rollGeneralCompany

  static rollGeneralEnemy = rollGeneralEnemy

  static rollLosses = rollLosses

  static exploitAvailable = exploitAvailable

  // Adversaire et escarmouche
  static adversaryTable = adversaryTable

  static adversaryKey = adversaryKey

  static adversaryName = adversaryName

  static drawAdversary = drawAdversary

  static startSkirmish = startSkirmish

  static openAdversary = openAdversary

  static endSkirmish = endSkirmish

  static onDeleteCombat = onDeleteCombat

  // Cartes et archives
  static outcomeName = outcomeName

  static modifierLabel = modifierLabel

  static memberView = memberView

  static recapContext = recapContext

  // #region Interactions

  /**
   * Masque, pour le client courant, les boutons qui ne le concernent pas : `owner` revient au
   * propriétaire du PJ (et au Meneur), `gm` au seul Meneur.
   * @param {HTMLElement} html
   */
  static filterButtons(html) {
    for (const button of html.querySelectorAll("[data-requires]")) {
      const actor = button.closest("[data-actor-id]") ? game.actors.get(button.closest("[data-actor-id]").dataset.actorId) : null
      const allowed = button.dataset.requires === "gm" ? game.user.isGM : !!actor?.isOwner
      if (allowed) continue
      // Une position se lit encore sur le bouton désactivé ; les autres boutons disparaissent.
      if (button.classList.contains("position")) button.disabled = true
      else button.remove()
    }
  }

  /**
   * Exécute une action d'un bouton de bataille, depuis la fenêtre ou une carte.
   * @param {CdgActor} company
   * @param {HTMLElement} target Porte `data-battle-action`, et au besoin `data-adversary-id`.
   */
  static runAction(company, target) {
    const actorId = target.closest("[data-actor-id]")?.dataset.actorId
    switch (target.dataset.battleAction) {
      case "rollFight":
        return rollFight(company, actorId)
      case "rollProtection":
        return rollProtection(company, actorId)
      case "rollTactique":
        return rollTactique(company, actorId)
      case "drawAdversary":
        return drawAdversary(company, actorId)
      case "startSkirmish":
        return startSkirmish(company, actorId, target.dataset.adversaryUuid)
      case "openAdversary":
        return openAdversary(company, actorId)
      case "grantExploit":
        return request(company, { type: "exploit", actorId })
      case "openBattle":
        return game.system.api.applications.CdgBattleApp.open(company)
    }
  }

  /**
   * Branche les boutons d'une carte de bataille. Appelé sur `renderChatMessageHTML`.
   * @param {ChatMessage} message
   * @param {HTMLElement} html
   */
  static activateListeners(message, html) {
    const data = message.getFlag(SYSTEM.PACKAGE_ID, BATTLE.CARD_FLAG)
    if (!data) return
    const company = fromUuidSync(data.companyUuid)
    const state = getState(company)
    // Une carte d'un tour révolu, ou d'une bataille close, n'a plus de bouton actif.
    const stale = data.actorId && (!state || state.id !== data.battleId || state.turn !== data.turn)
    if (!game.user.isGM) for (const element of html.querySelectorAll(".gm-only")) element.remove()
    this.filterButtons(html)
    for (const button of html.querySelectorAll("[data-battle-action]")) {
      if (stale || !company) {
        button.remove()
        continue
      }
      button.addEventListener("click", (event) => {
        event.preventDefault()
        this.runAction(company, event.currentTarget)
      })
    }
  }

  // #endregion
}
