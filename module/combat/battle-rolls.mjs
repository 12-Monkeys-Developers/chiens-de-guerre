import { SYSTEM } from "../config/system.mjs"
import CdgRollDialog from "../applications/roll-dialog.mjs"
import CdgRoll from "../dice/cdg-roll.mjs"
import { createTest } from "../dice/roll-outcome.mjs"
import { getState } from "./battle-state.mjs"
import { soakSeed } from "./test-presets.mjs"

/**
 * Les jets d'une bataille. Chacun ouvre la fenêtre de jet (ou part directement, pour un général
 * adverse sans fiche) avec une étiquette `battle` sur sa carte : c'est elle que le Meneur lit pour
 * ranger le résultat (voir `onRollMessage`, dans `battle-writer.mjs`).
 */

/**
 * Étiquette posée sur la carte d'un test de bataille, pour que le Meneur sache où le ranger.
 * @param {CdgActor} company
 * @param {Object} state
 * @param {string} kind `fight`, `protection`, `tactique`, `generalCompany`, `generalEnemy` ou `losses`.
 * @param {string} [actorId] Le PJ concerné, pour les jets de la phase 2.
 * @returns {Object}
 */
function tag(company, state, kind, actorId = null) {
  return { companyUuid: company.uuid, battleId: state.id, turn: state.turn, kind, actorId }
}

/**
 * Ouvre la fenêtre de jet en rattachant la carte à la bataille.
 * @param {CdgActor} actor
 * @param {Object} seed
 * @param {Object} battle L'étiquette du test.
 * @returns {Promise<CdgRollDialog>}
 */
function openRoll(actor, seed, battle) {
  return CdgRollDialog.open(actor, { ...seed, postHandler: (test) => CdgRoll.post({ ...test, battle }) })
}

/**
 * Phase 2 : test d'Esprit / Sens des batailles.
 * @param {CdgActor} company
 * @param {string} actorId
 */
export function rollFight(company, actorId) {
  const state = getState(company)
  const actor = game.actors.get(actorId)
  if (!state || !actor) return
  return openRoll(actor, { abilityId: "esprit", skillId: "sensBatailles", lockedPair: true, qualityDomain: "skill" }, tag(company, state, "fight", actorId))
}

/**
 * Phase 2 : encaisser la blessure de l'environnement, Corps / Protection — le rang de l'armure,
 * sans le malus des blessures déjà subies, comme à l'encaissement d'une escarmouche.
 * @param {CdgActor} company
 * @param {string} actorId
 */
export function rollProtection(company, actorId) {
  const state = getState(company)
  const actor = game.actors.get(actorId)
  if (!state || !actor) return
  return openRoll(actor, soakSeed(actor, { label: "CDG.battle.protectionTest" }), tag(company, state, "protection", actorId))
}

/**
 * Phase 2 : le test d'Esprit / Tactique dont dépend l'action d'éclat (soutien en réussite critique,
 * front en réussite).
 * @param {CdgActor} company
 * @param {string} actorId
 */
export function rollTactique(company, actorId) {
  const state = getState(company)
  const actor = game.actors.get(actorId)
  if (!state || !actor) return
  return openRoll(actor, { abilityId: "esprit", skillId: "tactique", lockedPair: true, qualityDomain: "skill" }, tag(company, state, "tactique", actorId))
}

/**
 * Le chef d'armée de la compagnie : un PJ désigné par le Meneur, ou à défaut la compagnie
 * elle-même.
 * @param {Object} state
 * @returns {CdgActor|null}
 */
export function chief(state) {
  const actor = state.chiefUuid ? fromUuidSync(state.chiefUuid) : null
  return actor?.type === "character" ? actor : null
}

/**
 * Phase 4, côté compagnie : Esprit / Tactique du PJ chef d'armée (malus selon sa position), ou
 * test de compagnie Effectifs / Tactique. Le modificateur de bataille s'applique dans les deux cas.
 * @param {CdgActor} company
 */
export function rollGeneralCompany(company) {
  const state = getState(company)
  if (!state) return
  const modifiers = []
  if (state.modifier) modifiers.push({ id: "battle", label: game.i18n.localize("CDG.battle.modifier"), value: state.modifier })
  const battle = tag(company, state, "generalCompany")

  const leader = chief(state)
  if (leader) {
    const position = SYSTEM.BATTLE_POSITIONS[state.members[leader.id]?.position]
    if (position?.chiefMalus) {
      modifiers.push({ id: "chief", label: game.i18n.format("CDG.battle.chiefMalus", { position: game.i18n.localize(position.label) }), value: position.chiefMalus })
    }
    return openRoll(leader, { abilityId: "esprit", skillId: "tactique", lockedPair: true, qualityDomain: "skill", extraModifiers: modifiers }, battle)
  }
  return openRoll(company, { abilityId: "effectifs", skillId: "tactique", lockedPair: true, extraModifiers: modifiers }, battle)
}

/**
 * Phase 4, côté adverse : Esprit / Tactique du général adverse, au modificateur de bataille
 * inversé. Saisi à la main, il n'a pas de fiche : le jet part directement, sans fenêtre.
 * @param {CdgActor} company
 */
export async function rollGeneralEnemy(company) {
  const state = getState(company)
  if (!state || !game.user.isGM) return
  const battle = tag(company, state, "generalEnemy")
  const mirror = -state.modifier
  const label = game.i18n.localize("CDG.battle.modifierMirror")

  const actor = state.general.actorUuid ? await fromUuid(state.general.actorUuid) : null
  if (actor) {
    const extraModifiers = mirror ? [{ id: "battle", label, value: mirror }] : []
    return openRoll(actor, { abilityId: "esprit", skillId: "tactique", lockedPair: true, extraModifiers }, battle)
  }

  const { name, esprit, tactique } = state.general
  const abilityLabel = game.i18n.localize(SYSTEM.ABILITIES.esprit.label)
  const breakdown = [{ label: abilityLabel, value: esprit, base: true }]
  if (mirror) breakdown.push({ label, value: mirror })
  return CdgRoll.post(
    createTest({
      actorName: name,
      abilityId: "esprit",
      abilityLabel,
      abilityValue: esprit,
      skillId: "tactique",
      skillLabel: game.i18n.localize(SYSTEM.SKILLS.tactique.label),
      rank: tactique,
      breakdown,
      noPush: true,
      battle,
    }),
  )
}

/**
 * Phase 5 : test de compagnie Effectifs / Bataille, au modificateur de pertes de l'opposition des
 * généraux.
 * @param {CdgActor} company
 */
export function rollLosses(company) {
  const state = getState(company)
  if (!state) return
  const lossModifier = state.generals.result?.lossModifier ?? 0
  const extraModifiers = lossModifier ? [{ id: "losses", label: game.i18n.localize("CDG.battle.lossModifier"), value: lossModifier }] : []
  return openRoll(company, { abilityId: "effectifs", skillId: "bataille", lockedPair: true, extraModifiers }, tag(company, state, "losses"))
}
