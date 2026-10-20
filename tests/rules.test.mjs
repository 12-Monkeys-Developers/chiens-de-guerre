import { test } from "node:test"
import assert from "node:assert/strict"
import { SYSTEM } from "../module/config/system.mjs"
import { customizationBudget, skillBudget, skillCost, traitQuotas } from "../module/helpers/creation-calculations.mjs"
import { computeKarma, simulateCompanyHealing } from "../module/helpers/rules.mjs"

const traits = (entries) => Object.fromEntries(Object.keys(SYSTEM.TRAIT_PAIRS).map((id, index) => [id, entries[index] ?? { dominant: null, value: 0 }]))

test("karma : vertus moins vices, côté dominant seulement", () => {
  const karma = computeKarma(
    traits([
      { dominant: "virtue", value: 3 },
      { dominant: "virtue", value: 2 },
      { dominant: "vice", value: 1 },
    ]),
  )
  assert.deepEqual([karma.vices, karma.virtues, karma.value], [1, 5, 4])
  assert.equal(karma.allegiance, "lumiere")
})

test("allégeance : Obscurité jusqu'à -3, Balance de -2 à 2, Lumière à partir de 3", () => {
  const withValue = (value) => computeKarma(traits([{ dominant: value < 0 ? "vice" : "virtue", value: Math.abs(value) }])).allegiance
  assert.equal(withValue(-3), "obscurite")
  assert.equal(withValue(-2), "balance")
  assert.equal(withValue(2), "balance")
  assert.equal(withValue(3), "lumiere")
  assert.equal(computeKarma(traits([])).allegiance, "balance")
})

test("coût d'un rang de compétence : les crans se cumulent", () => {
  assert.equal(skillCost(0, 2, SYSTEM.SKILL_RANK_COST), 3)
  assert.equal(skillCost(1, 3, SYSTEM.SKILL_RANK_COST), 6)
  assert.equal(skillCost(2, 2, SYSTEM.SKILL_RANK_COST), 0)
})

test("budget de compétences : le plancher de carrière est gratuit, les ouvertures offertes s'imputent", () => {
  const budget = skillBudget({
    skillIds: ["a", "b"],
    skills: { a: 2, b: 1 },
    grantedSkills: { b: 1 },
    freeSkillRanks: 1,
    rankCosts: SYSTEM.SKILL_RANK_COST,
  })
  assert.deepEqual(budget, { total: 2, freeUsed: 1, freeRemaining: 0 })
})

test("enveloppe de personnalisation et dépassement", () => {
  assert.deepEqual(customizationBudget(15, 2, { a: 10, b: 9 }), { total: 17, spent: 19, remaining: -2, over: 2 })
})

test("quotas de traits", () => {
  const quotas = traitQuotas(
    [
      { dominant: "vice", value: 1 },
      { dominant: "virtue", value: 2 },
      { dominant: "virtue", value: 3 },
      { dominant: null, value: 0 },
    ],
    17,
  )
  assert.deepEqual(quotas, { count: 3, total: 17, promoted: 2, mastered: 1 })
})

const wounds = (legere, grave, mortelle) => ({ legere: { value: legere, max: 2 }, grave: { value: grave, max: 3 }, mortelle: { value: mortelle, max: 3 } })

test("soins de compagnie : un cran fait passer une blessure à la gravité inférieure", () => {
  const after = simulateCompanyHealing(wounds(0, 1, 0), [{ level: "grave", steps: 1 }])
  assert.deepEqual([after.legere.value, after.grave.value], [1, 0])
  // Une blessure légère soignée disparaît.
  assert.equal(simulateCompanyHealing(wounds(1, 0, 0), [{ level: "legere", steps: 1 }]).legere.value, 0)
})

test("soins de compagnie : deux crans, ou deux blessures d'un cran", () => {
  const twoSteps = simulateCompanyHealing(wounds(0, 0, 1), [{ level: "mortelle", steps: 2 }])
  assert.deepEqual([twoSteps.legere.value, twoSteps.mortelle.value], [1, 0])
  const twoWounds = simulateCompanyHealing(wounds(0, 2, 0), [
    { level: "grave", steps: 1 },
    { level: "grave", steps: 1 },
  ])
  assert.deepEqual([twoWounds.legere.value, twoWounds.grave.value], [2, 0])
})

test("soins de compagnie : plan refusé si la blessure manque ou si la destination est pleine", () => {
  assert.equal(simulateCompanyHealing(wounds(0, 0, 0), [{ level: "grave", steps: 1 }]), null)
  assert.equal(simulateCompanyHealing(wounds(2, 1, 0), [{ level: "grave", steps: 1 }]), null)
  assert.equal(simulateCompanyHealing(wounds(0, 1, 0), [{ level: "grave", steps: 3 }]), null)
})
