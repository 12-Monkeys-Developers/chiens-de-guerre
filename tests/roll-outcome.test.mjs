import { test } from "node:test"
import assert from "node:assert/strict"
import { bestDieIndex, keptOutcome, OUTCOMES, outcomeScore, resolveOutcome, worstDieIndex } from "../module/dice/roll-outcome.mjs"

const outcome = (die, sr) => resolveOutcome(die, sr).outcome

test("régime courant : réussite sous le seuil, critique en l'égalant, échec au-dessus", () => {
  assert.equal(outcome(5, 12), OUTCOMES.success.id)
  assert.equal(outcome(12, 12), OUTCOMES.criticalSuccess.id)
  assert.equal(outcome(13, 12), OUTCOMES.failure.id)
  assert.equal(outcome(20, 12), OUTCOMES.criticalFailure.id)
})

test("qualité : de justesse jusqu'à 5, franche au-delà", () => {
  assert.equal(resolveOutcome(5, 12).tier, "weak")
  assert.equal(resolveOutcome(6, 12).tier, "standard")
  assert.equal(resolveOutcome(5, 12).quality, 5)
})

test("seuil d'au moins 20 : jamais d'échec critique, le surplus s'ajoute à la qualité", () => {
  assert.equal(outcome(20, 22), OUTCOMES.criticalSuccess.id)
  assert.equal(resolveOutcome(10, 22).quality, 12)
  assert.equal(outcome(10, 22), OUTCOMES.success.id)
  assert.equal(outcome(18, 22), OUTCOMES.criticalSuccess.id)
})

test("seuil nul ou négatif : seul un 1 réussit, jamais en critique ; échec critique dès 20 + seuil", () => {
  assert.equal(outcome(1, 0), OUTCOMES.success.id)
  assert.equal(resolveOutcome(1, -3).critical, false)
  assert.equal(outcome(19, 0), OUTCOMES.failure.id)
  assert.equal(outcome(20, 0), OUTCOMES.criticalFailure.id)
  assert.equal(outcome(16, -3), OUTCOMES.failure.id)
  assert.equal(outcome(17, -3), OUTCOMES.criticalFailure.id)
})

test("le meilleur dé est le plus grand qui reste sous le seuil", () => {
  assert.equal(bestDieIndex([5, 11], 12), 1)
  assert.equal(bestDieIndex([5, 15], 12), 0)
  // Aucun ne passe : on évite l'échec critique.
  assert.equal(bestDieIndex([20, 13], 12), 1)
  // À égalité, le premier dé lancé l'emporte.
  assert.equal(bestDieIndex([7, 7], 12), 0)
})

test("le pire dé, imposé au rang 0", () => {
  assert.equal(worstDieIndex([5, 11], 12), 0)
  assert.equal(worstDieIndex([20, 13], 12), 0)
  assert.equal(worstDieIndex([12, 3], 12), 1)
})

test("l'ordre des issues : échec critique < échec < réussite < réussite critique", () => {
  const scores = [outcomeScore(resolveOutcome(20, 12)), outcomeScore(resolveOutcome(13, 12)), outcomeScore(resolveOutcome(5, 12)), outcomeScore(resolveOutcome(12, 12))]
  assert.deepEqual(
    [...scores].sort((a, b) => a - b),
    scores,
  )
})

test("issue d'un test lancé : seul le dé conservé compte, pas le meilleur de la poignée", () => {
  const test = { results: [12, 4, 20], keptIndex: 1, sr: 12 }
  assert.deepEqual(keptOutcome(test), resolveOutcome(4, 12))
  assert.equal(keptOutcome({ ...test, keptIndex: 0 }).outcome, OUTCOMES.criticalSuccess.id)
  assert.equal(keptOutcome({ ...test, keptIndex: 2 }).outcome, OUTCOMES.criticalFailure.id)
})
