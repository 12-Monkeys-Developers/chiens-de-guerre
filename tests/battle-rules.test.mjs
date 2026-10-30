import { test } from "node:test"
import assert from "node:assert/strict"
import { SYSTEM } from "../module/config/system.mjs"
import {
  battleWinner,
  canMove,
  exploitAvailable,
  fightConsequence,
  generalsResult,
  keptAdversaryDie,
  lossesWound,
  newMember,
  previousPhase,
  shiftWound,
} from "../module/combat/battle-rules.mjs"

test("déroulement des combats (p. 52) : position en colonne, issue en ligne", () => {
  assert.deepEqual(fightConsequence("soutien", "success"), { wound: null, combat: false, exploit: null })
  assert.deepEqual(fightConsequence("soutien", "criticalSuccess"), { wound: null, combat: false, exploit: "test" })
  assert.deepEqual(fightConsequence("engage", "failure"), { wound: "legere", combat: true, exploit: null })
  assert.deepEqual(fightConsequence("front", "criticalFailure"), { wound: "mortelle", combat: true, exploit: null })
  assert.deepEqual(fightConsequence("front", "success"), { wound: "legere", combat: false, exploit: "test" })
  assert.deepEqual(fightConsequence("front", "criticalSuccess"), { wound: null, combat: false, exploit: "granted" })
})

test("encaissement : décalage d'un ou deux crans, borné à aucune blessure et à mortelle", () => {
  assert.equal(shiftWound("grave", "failure"), "grave")
  assert.equal(shiftWound("grave", "success"), "legere")
  assert.equal(shiftWound("grave", "criticalSuccess"), null)
  assert.equal(shiftWound("legere", "criticalSuccess"), null)
  assert.equal(shiftWound("legere", "criticalFailure"), "grave")
  assert.equal(shiftWound("mortelle", "criticalFailure"), "mortelle")
})

test("opposition des généraux (p. 53) : points de victoire et modificateur de pertes", () => {
  assert.deepEqual(generalsResult("criticalFailure"), { side: "enemy", points: 2, lossModifier: -5 })
  assert.deepEqual(generalsResult("failure"), { side: "enemy", points: 1, lossModifier: -2 })
  assert.deepEqual(generalsResult("success"), { side: "company", points: 1, lossModifier: 2 })
  assert.deepEqual(generalsResult("criticalSuccess"), { side: "company", points: 2, lossModifier: 5 })
})

test("pertes (p. 54) : la réussite critique épargne la compagnie", () => {
  assert.equal(lossesWound("criticalFailure"), "mortelle")
  assert.equal(lossesWound("success"), "legere")
  assert.equal(lossesWound("criticalSuccess"), null)
})

test("armée adverse : le plus bas des deux dés face à une armée faible (exemple p. 54)", () => {
  assert.equal(keptAdversaryDie([11, 7], "weak"), 7)
  assert.equal(keptAdversaryDie([11, 7], "elite"), 11)
  assert.equal(keptAdversaryDie([11], "normal"), 11)
})

test("issue de la bataille : trois points et devancer l'autre camp", () => {
  assert.equal(battleWinner({ company: 2, enemy: 1 }), null)
  assert.equal(battleWinner({ company: 3, enemy: 1 }), "company")
  assert.equal(battleWinner({ company: 3, enemy: 3 }), null)
  assert.equal(battleWinner({ company: 3, enemy: 4 }), "enemy")
})

test("localisation : un cran par tour, libre au premier tour", () => {
  assert.equal(canMove(null, "front"), true)
  assert.equal(canMove("front", "engage"), true)
  assert.equal(canMove("front", "soutien"), false)
})

test("nouveau tour : le PJ garde sa position, d'où part son déplacement, et rien d'autre", () => {
  const member = newMember("front")
  assert.equal(member.position, "front")
  assert.equal(member.previousPosition, "front")
  assert.deepEqual([member.fight, member.protection, member.adversary, member.tactique, member.cardId], [null, null, null, null, null])
  assert.equal(member.exploitGranted, false)
})

test("phase précédente : recule d'un cran, jamais avant la première", () => {
  const [first, second] = SYSTEM.BATTLE_PHASES_ORDERED
  const state = { phase: second.id }
  previousPhase(state)
  assert.equal(state.phase, first.id)
  previousPhase(state)
  assert.equal(state.phase, first.id)
})

test("action d'éclat : acquise d'emblée, ou gagnée par un test de Tactique réussi", () => {
  assert.equal(exploitAvailable({ fight: { exploit: "granted" } }), true)
  assert.equal(exploitAvailable({ fight: { exploit: "test" }, tactique: null }), false)
  assert.equal(exploitAvailable({ fight: { exploit: "test" }, tactique: { outcome: { success: false } } }), false)
  assert.equal(exploitAvailable({ fight: { exploit: "test" }, tactique: { outcome: { success: true } } }), true)
  assert.equal(exploitAvailable({ fight: { exploit: null } }), false)
  assert.equal(exploitAvailable(null), false)
})
