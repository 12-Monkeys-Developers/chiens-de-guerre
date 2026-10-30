import { SYSTEM } from "../config/system.mjs"
import CdgRoll from "../dice/cdg-roll.mjs"
import { keptOutcome } from "../dice/roll-outcome.mjs"
import { askActiveGM, serialize } from "../helpers/gm-writer.mjs"
import Utils from "../helpers/utils.mjs"
import { closeTurn, conclude, postCard, postStart, refreshCards } from "./battle-cards.mjs"
import { battleWinner, canMove, exploitAvailable, fightConsequence, generalsResult, lossesWound, newMember, previousPhase, shiftWound } from "./battle-rules.mjs"
import { BATTLE, getState, newState, rosterActors, writeState } from "./battle-state.mjs"
import { resolveOpposedOutcome } from "./opposition.mjs"

/**
 * L'écriture d'une bataille. Comme pour la confrontation, **le Meneur actif est le seul
 * écrivain** : un joueur lui confie chaque étape (requête `cdg.battleStep`), et les jets se
 * rattachent à la bataille par un drapeau de leur carte de test, que le Meneur lit à la création
 * du message — puis de nouveau si le dé conservé change ou si le joueur se dépasse.
 */

/**
 * Confie une étape au Meneur actif — ou l'applique directement si l'on est Meneur.
 * @param {CdgActor} company
 * @param {Object} step
 * @returns {Promise<boolean>}
 */
export function request(company, step) {
  const payload = { ...step, companyUuid: company.uuid }
  return askActiveGM("cdg.battleStep", payload, { apply: () => applyStep(payload, game.user), category: "battle", label: `Étape ${step.type}` })
}

/**
 * Requête `cdg.battleStep`, exécutée par le Meneur pour le compte d'un joueur.
 * @param {Object} step
 * @param {{user: User}} context
 * @returns {Promise<boolean>}
 */
export async function handleStepQuery(step, { user } = {}) {
  if (!game.user.isGM || !user) return false
  return applyStep(step, user)
}

/**
 * Met l'étape dans la file de sa compagnie : deux jets qui arrivent ensemble ne s'écrasent pas.
 * @param {Object} step
 * @param {User} user
 * @returns {Promise<boolean>}
 */
export function applyStep(step, user) {
  return serialize(`battle.${step?.companyUuid}`, async () => {
    const company = fromUuidSync(step?.companyUuid)
    const before = company ? getState(company) : null
    const applied = await applyStepNow(step, user)
    const after = company ? getState(company) : null
    const context = before ? `tour ${before.turn}, phase ${before.phase}` : "aucune bataille en cours"
    Utils.debug("battle", `Étape ${step?.type} demandée par ${user.name}${user.isGM ? " (Meneur)" : ""} : ${applied ? "appliquée" : "refusée"} — ${context}`, {
      step,
      avant: before,
      après: after,
    })
    return applied
  })
}

/**
 * Branché sur la création et la mise à jour des messages : le Meneur actif range le résultat d'un
 * test de bataille. La carte d'origine d'un test dépassé est ignorée, c'est la relance qui compte.
 * @param {ChatMessage} message
 */
export function onRollMessage(message) {
  if (!game.users.activeGM?.isSelf) return
  const test = CdgRoll.getTest(message)
  if (!test?.battle || (test.pushed && !test.isPush)) return
  const company = fromUuidSync(test.battle.companyUuid)
  if (!company) return
  return applyStep({ type: "result", companyUuid: company.uuid, message: message.id }, game.user)
}

/**
 * Applique une étape sur l'état relu de la compagnie. Tout est vérifié ici, côté Meneur : une
 * requête fabriquée à la main ne doit pas déplacer le PJ d'un autre joueur ni avancer les phases.
 * @param {Object} step
 * @param {User} user
 * @returns {Promise<boolean>}
 */
async function applyStepNow(step, user) {
  const company = await fromUuid(step?.companyUuid)
  if (company?.type !== "compagnie") return false

  if (step.type === "start") {
    if (!user.isGM || getState(company)) return false
    const state = newState(company, step.setup ?? {})
    await writeState(company, state)
    await postStart(company, state)
    return true
  }

  const previous = getState(company)
  if (!previous) return false
  const state = foundry.utils.deepClone(previous)

  switch (step.type) {
    case "position": {
      const actor = game.actors.get(step.actorId)
      const member = state.members[step.actorId] ?? (rosterActors(company).includes(actor) ? newMember(null) : null)
      if (!actor || !member || !SYSTEM.BATTLE_POSITIONS[step.position]) return false
      if (!user.isGM) {
        if (!actor.testUserPermission(user, "OWNER") || state.phase !== SYSTEM.BATTLE_PHASES.location.id) return false
        if (!canMove(member.previousPosition, step.position)) return false
      }
      member.position = step.position
      state.members[step.actorId] = member
      break
    }
    case "chief":
      if (!user.isGM) return false
      state.chiefUuid = step.chiefUuid || ""
      break
    case "phase":
      if (!user.isGM) return false
      if (step.direction < 0) previousPhase(state)
      else if (!(await nextPhase(company, state))) return true
      break
    case "points":
      if (!user.isGM || !["company", "enemy"].includes(step.side)) return false
      state.points[step.side] = Math.max(0, state.points[step.side] + Math.sign(step.delta))
      state.winner = battleWinner(state.points)
      break
    case "exploit": {
      const member = state.members[step.actorId]
      if (!user.isGM || !member || !exploitAvailable(member)) return false
      member.exploitGranted = !member.exploitGranted
      state.points.company = Math.max(0, state.points.company + (member.exploitGranted ? 1 : -1))
      state.winner = battleWinner(state.points)
      break
    }
    case "adversary": {
      const member = state.members[step.actorId]
      if (!user.isGM || !member?.fight?.combat) return false
      member.adversary = step.adversary
      break
    }
    case "skirmish": {
      const member = state.members[step.actorId]
      if (!user.isGM || !member?.adversary) return false
      member.adversary.skirmish = { ...member.adversary.skirmish, ...step.skirmish }
      break
    }
    case "result":
      if (!(await applyResult(company, state, step.message))) return false
      break
    case "abandon":
      if (!user.isGM) return false
      await company.unsetFlag(SYSTEM.PACKAGE_ID, BATTLE.FLAG)
      return true
    default:
      return false
  }

  await writeState(company, state)
  await refreshCards(company, previous, state)
  return true
}

/**
 * Phase suivante. Une fois la victoire acquise, on passe directement aux pertes (les combats ont
 * eu lieu), puis la bataille se conclut au lieu d'ouvrir un nouveau tour.
 * @param {CdgActor} company
 * @param {Object} state
 * @returns {Promise<boolean>} `false` si la bataille vient d'être conclue (l'état n'existe plus).
 */
async function nextPhase(company, state) {
  const phases = SYSTEM.BATTLE_PHASES_ORDERED
  const index = phases.findIndex((phase) => phase.id === state.phase)
  const last = index === phases.length - 1

  if (last) {
    closeTurn(state)
    if (state.winner) {
      await conclude(company, state)
      return false
    }
    state.turn += 1
    state.phase = phases[0].id
    for (const [actorId, member] of Object.entries(state.members)) state.members[actorId] = newMember(member.position)
    state.generals = { company: null, enemy: null, result: null }
    state.losses = null
    return true
  }

  state.phase = state.winner ? SYSTEM.BATTLE_PHASES.losses.id : phases[index + 1].id
  return true
}

/**
 * Range un résultat de test dans la bataille. Un nouveau jet du même test (dépassement, dé changé
 * par le Meneur) remplace le précédent tant que la suite n'a pas été jouée.
 * @param {CdgActor} company
 * @param {Object} state Modifié sur place.
 * @param {string} messageId
 * @returns {Promise<boolean>}
 */
async function applyResult(company, state, messageId) {
  const message = game.messages.get(messageId)
  const test = message ? CdgRoll.getTest(message) : null
  const tag = test?.battle
  if (!tag || tag.battleId !== state.id || tag.turn !== state.turn) return false

  const outcome = keptOutcome(test)
  Utils.debug("battle", `Résultat ${tag.kind}${tag.actorId ? ` de ${game.actors.get(tag.actorId)?.name}` : ""} : ${CdgRoll.summary(test)}`)
  const phase = state.phase
  const fightPhases = [SYSTEM.BATTLE_PHASES.fights.id, SYSTEM.BATTLE_PHASES.exploits.id]
  const member = tag.actorId ? state.members[tag.actorId] : null
  const actor = tag.actorId ? game.actors.get(tag.actorId) : null

  switch (tag.kind) {
    case "fight": {
      if (!member?.position || !fightPhases.includes(phase) || member.protection || member.adversary || member.tactique) return false
      member.fight = { ...fightConsequence(member.position, outcome.outcome), outcome }
      if (!member.cardId) member.cardId = (await postCard(company, state, tag.actorId))?.id ?? null
      return true
    }
    case "protection": {
      if (!member?.fight?.wound || !actor) return false
      const wound = shiftWound(member.fight.wound, outcome.outcome)
      const applied = await actor.applyWoundOverflow(member.protection?.applied ?? null, wound)
      member.protection = { outcome, wound, applied }
      return true
    }
    case "tactique":
      if (member?.fight?.exploit !== "test" || member.exploitGranted) return false
      member.tactique = { outcome }
      return true
    case "generalCompany":
    case "generalEnemy": {
      if (phase !== SYSTEM.BATTLE_PHASES.generals.id) return false
      state.generals[tag.kind === "generalCompany" ? "company" : "enemy"] = outcome
      const previous = state.generals.result
      if (previous) state.points[previous.side] -= previous.points
      state.generals.result = null
      if (state.generals.company && state.generals.enemy) {
        const opposed = resolveOpposedOutcome(state.generals.company, state.generals.enemy)
        state.generals.result = { ...generalsResult(opposed), outcome: opposed }
        state.points[state.generals.result.side] += state.generals.result.points
      }
      state.winner = battleWinner(state.points)
      return true
    }
    case "losses": {
      if (phase !== SYSTEM.BATTLE_PHASES.losses.id) return false
      const wound = lossesWound(outcome.outcome)
      const applied = await company.applyWoundOverflow(state.losses?.applied ?? null, wound)
      state.losses = { outcome, wound, applied }
      return true
    }
  }
  return false
}
