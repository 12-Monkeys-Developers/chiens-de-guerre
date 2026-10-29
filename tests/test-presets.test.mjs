import { test } from "node:test"
import assert from "node:assert/strict"
import { SYSTEM } from "../module/config/system.mjs"
import { damageSeed, defenseSeed, soakSeed, survivalSeed } from "../module/combat/test-presets.mjs"

const armored = (rank) => ({ armor: { system: { protection: { rank } } } })

test("défenses : esquive en Vivacité / Esquive, parade en Corps / Blocage, couple imposé", () => {
  assert.deepEqual(defenseSeed("dodge"), { abilityId: "vivacite", skillId: "esquive", lockedPair: true, qualityDomain: null })
  assert.deepEqual(defenseSeed("parry"), { abilityId: "corps", skillId: "blocage", lockedPair: true, qualityDomain: "parry" })
  for (const defense of Object.values(SYSTEM.DEFENSES)) {
    assert.ok(SYSTEM.ABILITIES[defense.ability], defense.ability)
    assert.ok(SYSTEM.SKILLS[defense.skill], defense.skill)
  }
})

test("dégâts : Corps au rang de dégâts de l'arme", () => {
  const seed = damageSeed({ system: { damage: { rank: 2 } } })
  assert.equal(seed.abilityId, "corps")
  assert.equal(seed.rank, 2)
  assert.equal(seed.qualityDomain, "damage")
  assert.equal(seed.skillId, undefined)
})

test("encaissement : rang de l'armure portée, 0 sans armure ou armure ignorée, blessure décochée", () => {
  assert.equal(soakSeed(armored(2)).rank, 2)
  assert.equal(soakSeed({ armor: null }).rank, 0)
  assert.equal(soakSeed(armored(3), { ignoreArmor: true }).rank, 0)
  assert.deepEqual(soakSeed(armored(1)).toggles, { wound: false })
  assert.equal(soakSeed(armored(1)).label, "CDG.combat.soakTest")
  assert.equal(soakSeed(armored(1), { label: "CDG.battle.protectionTest" }).label, "CDG.battle.protectionTest")
})

test("survie : Corps / Vigueur restreint, sans le malus de blessure", () => {
  const seed = survivalSeed()
  assert.deepEqual([seed.abilityId, seed.skillId, seed.restricted], ["corps", "vigueur", true])
  assert.deepEqual(seed.toggles, { wound: false })
})

test("chaque préréglage rend un objet neuf : un appelant qui le complète ne touche pas aux autres", () => {
  const first = soakSeed(armored(1))
  first.toggles.wound = true
  assert.deepEqual(soakSeed(armored(1)).toggles, { wound: false })
})
