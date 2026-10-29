import { test } from "node:test"
import assert from "node:assert/strict"
import { SYSTEM } from "../module/config/system.mjs"
import { signed } from "../module/helpers/format.mjs"
import { fromDeniers, toDeniers } from "../module/helpers/money.mjs"

test("nombre signé : plus devant un bonus, rien devant zéro, le moins d'un malus", () => {
  assert.equal(signed(2), "+2")
  assert.equal(signed(0), "0")
  assert.equal(signed(-3), "-3")
})

test("monnaie : une bourse se compte en deniers, une monnaie absente vaut zéro", () => {
  assert.equal(toDeniers({ ducat: 3, denier: 25 }), 3 * SYSTEM.DENIERS_PER_DUCAT + 25)
  assert.equal(toDeniers({ ducat: 2 }), 2 * SYSTEM.DENIERS_PER_DUCAT)
  assert.equal(toDeniers(undefined), 0)
})

test("monnaie : les deniers se rendent en ducats et deniers, jamais sous zéro", () => {
  assert.deepEqual(fromDeniers(3 * SYSTEM.DENIERS_PER_DUCAT + 25), { ducat: 3, denier: 25 })
  assert.deepEqual(fromDeniers(-40), { ducat: 0, denier: 0 })
  assert.deepEqual(fromDeniers(toDeniers({ ducat: 7, denier: 99 })), { ducat: 7, denier: 99 })
})

test("listes ordonnées de la configuration : rangées par `order`, complètes et figées", () => {
  for (const [list, source] of [
    [SYSTEM.WOUND_LEVELS_ORDERED, SYSTEM.WOUND_LEVELS],
    [SYSTEM.BATTLE_PHASES_ORDERED, SYSTEM.BATTLE_PHASES],
    [SYSTEM.DIFFICULTIES_ORDERED, SYSTEM.DIFFICULTIES],
  ]) {
    assert.equal(list.length, Object.keys(source).length)
    assert.deepEqual(
      list.map((entry) => entry.order),
      Object.values(source)
        .map((entry) => entry.order)
        .sort((a, b) => a - b),
    )
    assert.ok(Object.isFrozen(list))
  }
  assert.deepEqual(
    SYSTEM.WOUND_LEVELS_ORDERED.map((level) => level.id),
    ["legere", "grave", "mortelle"],
  )
})
