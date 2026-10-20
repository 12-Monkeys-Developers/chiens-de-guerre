import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveOpposedOutcome, resolveWound } from "../module/combat/opposition.mjs"

// Une issue de chaque sorte, sur un seuil de 12 : le dé et la qualité suffisent aux tables.
const CF = { outcome: "criticalFailure", quality: null }
const F = { outcome: "failure", quality: null }
const S = (quality = 8) => ({ outcome: "success", quality })
const CS = (quality = 12) => ({ outcome: "criticalSuccess", quality })

test("table d'opposition (p. 44) : l'actif en ligne, le passif en colonne", () => {
  const expected = [
    [CF, [CF, F, S(), CS()], ["failure", "failure", "criticalFailure", "criticalFailure"]],
    [F, [CF, F, S(), CS()], ["success", "failure", "failure", "criticalFailure"]],
    [S(), [CF, F], ["criticalSuccess", "success"]],
    [S(), [CS()], ["failure"]],
    [CS(), [CF, F, S()], ["criticalSuccess", "criticalSuccess", "success"]],
  ]
  for (const [active, passives, results] of expected) {
    passives.forEach((passive, index) => assert.equal(resolveOpposedOutcome(active, passive), results[index], `${active.outcome} contre ${passive.outcome}`))
  }
})

test("opposition à égalité de palier : la qualité départage, l'actif l'emporte à qualité égale", () => {
  assert.equal(resolveOpposedOutcome(S(9), S(8)), "success")
  assert.equal(resolveOpposedOutcome(S(8), S(8)), "success")
  assert.equal(resolveOpposedOutcome(S(7), S(8)), "failure")
  assert.equal(resolveOpposedOutcome(CS(12), CS(14)), "failure")
})

test("grille des blessures (p. 45) : dommages en ligne, encaissement en colonne", () => {
  const expected = [
    [CF, ["legere", null, null, null]],
    [F, ["grave", "legere", null, null]],
    [S(), ["mortelle", "grave", "conditional", null]],
    [CS(), ["mortelle", "mortelle", "conditional", "conditional"]],
  ]
  const soaks = [CF, F, S(), CS()]
  for (const [damage, results] of expected) {
    results.forEach((result, index) => {
      if (result === "conditional") return
      assert.equal(resolveWound(damage, soaks[index]), result, `${damage.outcome} contre ${soaks[index].outcome}`)
    })
  }
})

test("blessure à départager : grave si les dommages valent au moins l'encaissement, légère sinon", () => {
  assert.equal(resolveWound(S(9), S(8)), "grave")
  assert.equal(resolveWound(S(8), S(8)), "grave")
  assert.equal(resolveWound(S(7), S(8)), "legere")
  assert.equal(resolveWound(CS(12), S(14)), "legere")
  assert.equal(resolveWound(CS(15), CS(12)), "grave")
})
