import { test } from "node:test"
import assert from "node:assert/strict"
import { askActiveGM, serialize } from "../module/helpers/gm-writer.mjs"

const wait = (delay) =>
  new Promise((resolve) => {
    setTimeout(resolve, delay)
  })

test("file d'écriture : les tâches d'une même clé passent l'une après l'autre, dans l'ordre", async () => {
  const log = []
  const task = (name, delay) => async () => {
    log.push(`${name} début`)
    await wait(delay)
    log.push(`${name} fin`)
    return name
  }
  const results = await Promise.all([serialize("test.a", task("1", 20)), serialize("test.a", task("2", 1)), serialize("test.a", task("3", 1))])
  assert.deepEqual(results, ["1", "2", "3"])
  assert.deepEqual(log, ["1 début", "1 fin", "2 début", "2 fin", "3 début", "3 fin"])
})

test("file d'écriture : deux clés différentes ne s'attendent pas", async () => {
  const log = []
  const slow = serialize("test.b", async () => {
    await wait(5)
    log.push("lente")
  })
  const fast = serialize("test.c", async () => log.push("rapide"))
  await Promise.all([slow, fast])
  assert.deepEqual(log, ["rapide", "lente"])
})

test("file d'écriture : un échec revient à son demandeur sans bloquer la tâche suivante", async () => {
  const failing = serialize("test.d", async () => {
    throw new Error("refus")
  })
  const next = serialize("test.d", async () => "suite")
  await assert.rejects(failing, /refus/)
  assert.equal(await next, "suite")
})

/**
 * Simule le poste courant : Meneur ou joueur, avec ou sans Meneur actif connecté.
 * @param {Object} options
 * @param {boolean} options.isGM Le poste courant est-il celui d'un Meneur ?
 * @param {{answer: boolean}|null} [options.activeGM] Le Meneur actif et sa réponse, ou personne.
 * @returns {{errors: string[], queries: Object[]}}
 */
function stubClient({ isGM, activeGM = null }) {
  const errors = []
  const queries = []
  globalThis.CONFIG = { debug: {} }
  globalThis.ui = { notifications: { error: (message) => errors.push(message) } }
  globalThis.game = {
    user: { isGM },
    users: {
      activeGM: activeGM && {
        name: "Meneur",
        query: async (query, payload) => {
          queries.push({ query, payload })
          return activeGM.answer
        },
      },
    },
  }
  return { errors, queries }
}

test("demande au Meneur : le Meneur écrit lui-même, sans requête", async () => {
  const { queries } = stubClient({ isGM: true, activeGM: { answer: false } })
  assert.equal(await askActiveGM("cdg.test", { id: 1 }, { apply: () => "écrit", category: "combat", label: "Étape" }), "écrit")
  assert.equal(queries.length, 0)
})

test("demande au Meneur : un joueur transmet la requête et reçoit la réponse", async () => {
  const { queries } = stubClient({ isGM: false, activeGM: { answer: true } })
  let applied = false
  const result = await askActiveGM("cdg.test", { id: 2 }, { apply: () => (applied = true), category: "combat", label: "Étape" })
  assert.equal(result, true)
  assert.equal(applied, false)
  assert.deepEqual(queries, [{ query: "cdg.test", payload: { id: 2 } }])
})

test("demande au Meneur : sans Meneur connecté, le joueur est prévenu et rien n'est écrit", async () => {
  const { errors } = stubClient({ isGM: false })
  assert.equal(await askActiveGM("cdg.test", {}, { apply: () => assert.fail(), category: "combat", label: "Étape" }), false)
  assert.deepEqual(errors, ["CDG.confrontation.notif.noGM"])
})
