import { SYSTEM } from "../config/system.mjs"
import { createChatMessage } from "../helpers/chat.mjs"
import { signed } from "../helpers/format.mjs"
import { canMove, exploitAvailable } from "./battle-rules.mjs"
import { BATTLE } from "./battle-state.mjs"

/**
 * Ce que la bataille montre : la carte de départ, la carte de conséquences de chaque PJ, le
 * récapitulatif final et sa page de journal. Rien ici ne modifie l'état de la bataille.
 */

/**
 * Libellé d'une issue dans une bataille : les tables des p. 52-54 ne lisent que les quatre
 * paliers — échec critique, échec, réussite, réussite critique —, pas « Oui, mais… » ni « Oui ».
 * @param {Object|null} outcome Le retour de `resolveOutcome`.
 * @returns {string|null}
 */
export function outcomeName(outcome) {
  return outcome ? game.i18n.localize(`CDG.battle.outcomes.${outcome.outcome}`) : null
}

/**
 * Libellé d'un modificateur de bataille : sa valeur signée, et le repère de la table s'il en est un.
 * @param {number} value
 * @returns {string}
 */
export function modifierLabel(value) {
  const preset = SYSTEM.BATTLE_MODIFIERS.find((entry) => entry.value === value)
  return preset ? `${signed(value)} (${game.i18n.localize(preset.label)})` : signed(value)
}

/**
 * Nom d'un profil de la table des adversaires, sans charger le document (index du compendium ou
 * acteur du monde).
 * @param {string} uuid
 * @returns {string}
 */
export function adversaryName(uuid) {
  return fromUuidSync(uuid)?.name ?? uuid
}

/**
 * Annonce le début de la bataille dans le tchat, avec de quoi ouvrir sa fenêtre.
 * @param {CdgActor} company
 * @param {Object} state
 */
export async function postStart(company, state) {
  const content = await foundry.applications.handlebars.renderTemplate(BATTLE.TEMPLATES.start, {
    company,
    state,
    modifier: modifierLabel(state.modifier),
  })
  return createChatMessage(
    { speaker: ChatMessage.implementation.getSpeaker({ actor: company }), content, flags: { [SYSTEM.PACKAGE_ID]: { [BATTLE.CARD_FLAG]: { companyUuid: company.uuid } } } },
    { messageMode: "public" },
  )
}

/**
 * Ce qu'un PJ a vécu ce tour-ci et ce qu'il lui reste à faire, pour la fenêtre comme pour sa carte
 * de conséquences. Les boutons portent `data-requires` (`owner` ou `gm`) : chaque client masque
 * ceux qui ne le concernent pas (voir `CdgBattle.filterButtons`).
 * @param {CdgActor} company
 * @param {Object} state
 * @param {string} actorId
 * @returns {Object|null}
 */
export function memberView(company, state, actorId) {
  const member = state.members[actorId]
  const actor = game.actors.get(actorId)
  if (!member || !actor) return null
  const fightPhase = [SYSTEM.BATTLE_PHASES.fights.id, SYSTEM.BATTLE_PHASES.exploits.id].includes(state.phase)
  const fight = member.fight
  const label = (outcome) => outcomeName(outcome)
  const woundLabel = (id) => (id ? game.i18n.localize(SYSTEM.WOUND_LEVELS[id].label) : game.i18n.localize("CDG.battle.noWound"))

  const view = {
    actorId,
    name: actor.name,
    img: actor.img,
    position: member.position,
    positionLabel: member.position ? game.i18n.localize(SYSTEM.BATTLE_POSITIONS[member.position].label) : null,
    positions: Object.values(SYSTEM.BATTLE_POSITIONS).map((position) => ({
      ...position,
      active: position.id === member.position,
      allowed: canMove(member.previousPosition, position.id),
    })),
    // Le bouton reste affiché mais grisé une fois le test lancé : une relance passe par « Se
    // dépasser » sur la carte du test, pas par un second jet.
    showFight: fightPhase && !!member.position,
    canRollFight: fightPhase && !!member.position && !member.fight,
    fight: fight ? { ...fight, label: label(fight.outcome) } : null,
  }
  if (!fight) return view

  view.consequences = {
    wound: fight.wound ? game.i18n.localize(SYSTEM.WOUND_LEVELS[fight.wound].label) : null,
    combat: fight.combat,
    exploit: fight.exploit,
  }
  if (fight.wound) {
    view.protection = member.protection ? { label: label(member.protection.outcome), wound: woundLabel(member.protection.applied) } : null
    view.canRollProtection = !member.protection
  }
  if (fight.combat) {
    const adversary = member.adversary
    view.canDraw = !adversary
    if (adversary) {
      view.adversary = {
        label: adversary.label,
        die: adversary.die,
        pending: adversary.actors.length === 0,
        skirmish: adversary.skirmish,
        skirmishResult: adversary.skirmish?.result ? game.i18n.localize(`CDG.battle.skirmish.${adversary.skirmish.result}`) : null,
        choices: adversary.skirmish ? [] : adversary.actors.map((uuid) => ({ uuid, name: adversaryName(uuid) })),
      }
    }
  }
  if (fight.exploit === "test") {
    view.tactique = member.tactique ? { label: label(member.tactique.outcome), success: member.tactique.outcome.success } : null
    view.canRollTactique = !member.tactique
  }
  view.exploitAvailable = exploitAvailable(member)
  view.exploitGranted = member.exploitGranted
  return view
}

/**
 * Phase 2 : la carte de conséquences d'un PJ, postée au premier résultat de son test.
 * @param {CdgActor} company
 * @param {Object} state
 * @param {string} actorId
 * @returns {Promise<ChatMessage>}
 */
export async function postCard(company, state, actorId) {
  return createChatMessage(
    {
      speaker: ChatMessage.implementation.getSpeaker({ actor: game.actors.get(actorId) }),
      content: await renderCard(company, state, actorId),
      flags: { [SYSTEM.PACKAGE_ID]: { [BATTLE.CARD_FLAG]: { companyUuid: company.uuid, actorId, battleId: state.id, turn: state.turn } } },
    },
    { messageMode: "public" },
  )
}

/**
 * Le contenu de la carte de conséquences d'un PJ.
 * @param {CdgActor} company
 * @param {Object} state
 * @param {string} actorId
 * @returns {Promise<string>}
 */
async function renderCard(company, state, actorId) {
  return foundry.applications.handlebars.renderTemplate(BATTLE.TEMPLATES.card, { company, state, member: memberView(company, state, actorId) })
}

/**
 * Réécrit la carte de conséquences des PJ dont l'état a changé.
 * @param {CdgActor} company
 * @param {Object} previous
 * @param {Object} state
 */
export async function refreshCards(company, previous, state) {
  if (previous.turn !== state.turn) return
  for (const [actorId, member] of Object.entries(state.members)) {
    if (!member.cardId || foundry.utils.equals(member, previous.members[actorId] ?? {})) continue
    const message = game.messages.get(member.cardId)
    if (message) await message.update({ content: await renderCard(company, state, actorId) })
  }
}

/**
 * Résume le tour qui s'achève dans l'historique, pour la carte et la page de journal finales.
 * @param {Object} state Modifié sur place.
 */
export function closeTurn(state) {
  const members = Object.entries(state.members)
    .filter(([, member]) => member.position)
    .map(([actorId, member]) => ({
      name: game.actors.get(actorId)?.name ?? "?",
      position: member.position,
      fight: member.fight?.outcome ?? null,
      wound: member.protection ? member.protection.applied : null,
      adversary: member.adversary?.label ?? null,
      skirmish: member.adversary?.skirmish?.result ?? null,
      exploit: member.exploitGranted,
    }))
  state.history.push({
    turn: state.turn,
    members,
    generals: state.generals.result,
    losses: state.losses ? state.losses.applied : null,
    lossesRolled: !!state.losses,
    points: { ...state.points },
  })
}

/**
 * Conclut la bataille : carte récapitulative, page du journal des batailles de la compagnie, puis
 * la compagnie est libérée pour une prochaine bataille.
 * @param {CdgActor} company
 * @param {Object} state
 */
export async function conclude(company, state) {
  const content = await foundry.applications.handlebars.renderTemplate(BATTLE.TEMPLATES.recap, recapContext(company, state))
  await createChatMessage({ speaker: ChatMessage.implementation.getSpeaker({ actor: company }), content }, { messageMode: "public" })
  await archive(company, state, content)
  await company.unsetFlag(SYSTEM.PACKAGE_ID, BATTLE.FLAG)
}

/**
 * Contexte du récapitulatif, partagé par la carte de fin et la page de journal.
 * @param {CdgActor} company
 * @param {Object} state
 * @returns {Object}
 */
export function recapContext(company, state) {
  const wound = (id) => (id ? game.i18n.localize(SYSTEM.WOUND_LEVELS[id].label) : game.i18n.localize("CDG.battle.noWound"))
  const outcome = (result) => outcomeName(result)
  return {
    company,
    state,
    stake: state.stake || game.i18n.localize("CDG.battle.noStake"),
    winnerLabel: game.i18n.format(`CDG.battle.winner.${state.winner}`, { company: company.name, enemy: state.general.name }),
    modifier: modifierLabel(state.modifier),
    general: state.general.name,
    turns: state.history.map((turn) => ({
      ...turn,
      members: turn.members.map((member) => ({
        ...member,
        positionLabel: game.i18n.localize(SYSTEM.BATTLE_POSITIONS[member.position].label),
        fightLabel: outcome(member.fight),
        woundLabel: wound(member.wound),
        skirmishLabel: member.skirmish ? game.i18n.localize(`CDG.battle.skirmish.${member.skirmish}`) : null,
      })),
      generalsLabel: turn.generals
        ? game.i18n.format(`CDG.battle.generals.points.${turn.generals.side}`, { points: turn.generals.points, company: company.name, enemy: state.general.name })
        : null,
      lossesLabel: turn.lossesRolled ? wound(turn.losses) : null,
    })),
  }
}

/**
 * Ajoute la bataille au journal des batailles de la compagnie, créé au premier besoin et lisible
 * par les joueurs.
 * @param {CdgActor} company
 * @param {Object} state
 * @param {string} content
 */
async function archive(company, state, content) {
  let journal = game.journal.find((entry) => entry.getFlag(SYSTEM.PACKAGE_ID, BATTLE.ARCHIVE_FLAG) === company.uuid)
  journal ??= await JournalEntry.implementation.create({
    name: game.i18n.format("CDG.battle.journal.name", { company: company.name }),
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
    flags: { [SYSTEM.PACKAGE_ID]: { [BATTLE.ARCHIVE_FLAG]: company.uuid } },
  })
  const name = state.stake || game.i18n.format("CDG.battle.journal.page", { number: journal.pages.size + 1 })
  return journal.createEmbeddedDocuments("JournalEntryPage", [{ name, type: "text", text: { content } }])
}
