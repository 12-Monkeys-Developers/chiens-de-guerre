import { SYSTEM } from "../config/system.mjs"
import { adversaryName } from "./battle-cards.mjs"
import { adversaryEntry, keptAdversaryDie } from "./battle-rules.mjs"
import { BATTLE, getState } from "./battle-state.mjs"
import { applyStep, request } from "./battle-writer.mjs"

/**
 * L'adversaire tiré en phase 2 et l'escarmouche d'un round qui l'oppose au PJ (p. 52).
 */

/**
 * Clé d'une tranche dans le réglage : ses bornes, qui ne changent pas.
 * @param {{min: number, max: number}} entry
 * @returns {string}
 */
export function adversaryKey(entry) {
  return `${entry.min}-${entry.max}`
}

/**
 * La table des adversaires en vigueur : les tranches du livre, dont les profils (des uuid
 * d'acteurs) viennent du réglage du monde s'il les a changés, du bestiaire du système sinon.
 * @returns {{min: number, max: number, label: string, actors: string[], custom: boolean}[]}
 */
export function adversaryTable() {
  const custom = game.settings.get(SYSTEM.PACKAGE_ID, BATTLE.ADVERSARIES_SETTING) ?? {}
  return SYSTEM.BATTLE_ADVERSARIES.map((entry) => {
    const key = adversaryKey(entry)
    const actors = Array.isArray(custom[key]) ? custom[key] : entry.actors.map((id) => `Compendium.${BATTLE.PACK}.Actor.${id}`)
    return { ...entry, actors, custom: Array.isArray(custom[key]) }
  })
}

/**
 * Tire l'adversaire du PJ sur la table p. 52, selon la composition de l'armée adverse.
 * @param {CdgActor} company
 * @param {string} actorId
 */
export async function drawAdversary(company, actorId) {
  const state = getState(company)
  if (!state || !game.user.isGM || !state.members[actorId]?.fight?.combat) return
  const quality = SYSTEM.BATTLE_ARMY_QUALITIES[state.armyQuality]
  const roll = await new Roll(quality.formula).evaluate()
  const results = roll.dice[0].results.map((die) => die.result)
  const die = keptAdversaryDie(results, state.armyQuality)
  const entry = adversaryEntry(die, adversaryTable())
  // Une tranche modifiée par le Meneur porte le nom de ses profils, et non plus celui du livre.
  const label = entry.custom && entry.actors.length ? entry.actors.map((uuid) => adversaryName(uuid)).join(" / ") : game.i18n.localize(entry.label)

  await roll.toMessage({
    speaker: ChatMessage.implementation.getSpeaker({ actor: game.actors.get(actorId) }),
    flavor: game.i18n.format("CDG.battle.adversary.flavor", { die, adversary: label, army: game.i18n.localize(quality.label) }),
  })
  return request(company, { type: "adversary", actorId, adversary: { results, die, label, actors: entry.actors, skirmish: null } })
}

/**
 * Ouvre l'escarmouche d'un round contre l'adversaire tiré : une copie de son profil est importée
 * du compendium, son jeton posé à côté de celui du PJ s'il est sur la scène, et le combat démarré.
 * Copie, jeton et combat disparaissent à la fin du round (voir `onDeleteCombat`).
 * @param {CdgActor} company
 * @param {string} actorId
 * @param {string} adversaryUuid Le profil retenu, dans un compendium ou parmi les acteurs du monde.
 */
export async function startSkirmish(company, actorId, adversaryUuid) {
  const state = getState(company)
  const member = state?.members[actorId]
  const actor = game.actors.get(actorId)
  if (!game.user.isGM || !actor || !member?.adversary?.actors.includes(adversaryUuid) || member.adversary.skirmish) return

  const source = await fromUuid(adversaryUuid)
  if (source?.documentName !== "Actor") return ui.notifications.error("CDG.battle.notif.adversaryMissing", { localize: true })

  // Toujours une copie, même d'un acteur du monde : ses blessures ne doivent pas survivre à l'escarmouche.
  const data = source.pack ? game.actors.fromCompendium(source) : source.toObject()
  delete data._id
  delete data.folder
  const adversary = await Actor.implementation.create({
    ...data,
    flags: { ...data.flags, [SYSTEM.PACKAGE_ID]: { ...data.flags?.[SYSTEM.PACKAGE_ID], [BATTLE.TEMPORARY_FLAG]: true } },
  })

  const scene = canvas.scene
  const pcToken = scene ? actor.getActiveTokens(false, true).find((token) => token.parent === scene) : null
  let adversaryToken = null
  if (pcToken) {
    const size = scene.grid.size
    const data = await adversary.getTokenDocument({ x: pcToken.x + pcToken.width * size, y: pcToken.y })
    ;[adversaryToken] = await scene.createEmbeddedDocuments("Token", [data.toObject()])
  }

  const combat = await getDocumentClass("Combat").create({
    scene: pcToken ? scene.id : null,
    active: true,
    flags: {
      [SYSTEM.PACKAGE_ID]: {
        mode: SYSTEM.COMBAT_MODES.skirmish.id,
        [BATTLE.SKIRMISH_FLAG]: { companyUuid: company.uuid, actorId, adversaryActorId: adversary.id, tokenUuid: adversaryToken?.uuid ?? null },
      },
    },
  })
  await combat.createEmbeddedDocuments("Combatant", [
    pcToken ? { actorId, tokenId: pcToken.id, sceneId: scene.id } : { actorId },
    adversaryToken ? { actorId: adversary.id, tokenId: adversaryToken.id, sceneId: scene.id } : { actorId: adversary.id },
  ])
  await combat.startCombat()
  ui.combat.render({ force: true })

  return request(company, {
    type: "skirmish",
    actorId,
    skirmish: { status: "running", combatId: combat.id, name: adversary.name, adversaryUuid: (adversaryToken?.actor ?? adversary).uuid },
  })
}

/**
 * Ouvre la fiche de l'adversaire d'une escarmouche en cours — celle du jeton s'il est sur la
 * scène, puisque c'est lui qui encaisse —, pour lancer ses jets.
 * @param {CdgActor} company
 * @param {string} actorId Le PJ qu'il affronte.
 */
export async function openAdversary(company, actorId) {
  const uuid = getState(company)?.members[actorId]?.adversary?.skirmish?.adversaryUuid
  const adversary = uuid ? await fromUuid(uuid) : null
  return adversary?.sheet.render(true)
}

/**
 * Fin du round d'une escarmouche de bataille : la mêlée sépare les combattants (p. 52). Appelé par
 * `CdgCombat#nextRound` à la place du round suivant.
 * @param {CdgCombat} combat
 */
export async function endSkirmish(combat) {
  ui.notifications.info("CDG.battle.notif.skirmishOver", { localize: true })
  return combat.delete()
}

/**
 * Un combat d'escarmouche de bataille supprimé, à la fin de son round ou à la main : on note
 * l'issue, puis on retire le jeton et la copie de l'adversaire.
 * @param {CdgCombat} combat
 */
export async function onDeleteCombat(combat) {
  const data = combat.getFlag(SYSTEM.PACKAGE_ID, BATTLE.SKIRMISH_FLAG)
  if (!data || !game.users.activeGM?.isSelf) return

  const out = (actorId) => {
    const combatant = combat.combatants.find((entry) => entry.actorId === actorId)
    return !combatant || combatant.isDefeated || !!combatant.actor?.system.isDying
  }
  const result = out(data.adversaryActorId) ? "won" : out(data.actorId) ? "lost" : "separated"

  const company = await fromUuid(data.companyUuid)
  if (company && getState(company)?.members[data.actorId]?.adversary?.skirmish?.combatId === combat.id) {
    await applyStep({ type: "skirmish", companyUuid: company.uuid, actorId: data.actorId, skirmish: { status: "done", result } }, game.user)
  }

  const token = data.tokenUuid ? await fromUuid(data.tokenUuid) : null
  await token?.delete()
  const adversary = game.actors.get(data.adversaryActorId)
  if (adversary?.getFlag(SYSTEM.PACKAGE_ID, BATTLE.TEMPORARY_FLAG)) await adversary.delete()
}
