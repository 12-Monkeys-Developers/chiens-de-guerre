import { SYSTEM } from "../config/system.mjs"
import { newMember } from "./battle-rules.mjs"

const { ForcedReplacement } = foundry.data.operators

/**
 * Les clés et chemins des batailles, repris tels quels par `CdgBattle`.
 */
export const BATTLE = {
  /** Clé du drapeau de la compagnie qui porte la bataille en cours. */
  FLAG: "battle",
  /** Clé du drapeau d'une carte de conséquences (phase 2). */
  CARD_FLAG: "battleCard",
  /** Clé du drapeau d'un combat d'escarmouche ouvert par une bataille. */
  SKIRMISH_FLAG: "battleSkirmish",
  /** Clé du drapeau des acteurs adverses importés pour une escarmouche, supprimés avec elle. */
  TEMPORARY_FLAG: "battleTemporary",
  /** Drapeau du journal « Batailles » d'une compagnie : l'uuid de la compagnie dont il archive les batailles. */
  ARCHIVE_FLAG: "battleArchive",
  /** Compendium des adversaires de la table p. 52. */
  PACK: `${SYSTEM.PACKAGE_ID}.pnjs`,
  /** Réglage du monde qui remplace les profils de la table des adversaires. */
  ADVERSARIES_SETTING: "battleAdversaries",
  TEMPLATES: {
    card: `${SYSTEM.PATH}/templates/chat/battle-card.hbs`,
    recap: `${SYSTEM.PATH}/templates/chat/battle-recap.hbs`,
    start: `${SYSTEM.PATH}/templates/chat/battle-start.hbs`,
    consequences: `${SYSTEM.PATH}/templates/battle/consequences.hbs`,
  },
}

/**
 * La bataille en cours d'une compagnie, ou `null`.
 * @param {CdgActor} company
 * @returns {Object|null}
 */
export function getState(company) {
  return company?.getFlag(SYSTEM.PACKAGE_ID, BATTLE.FLAG) ?? null
}

/**
 * Les personnages joueurs du roster de la compagnie, résolus en acteurs du monde.
 * @param {CdgActor} company
 * @returns {CdgActor[]}
 */
export function rosterActors(company) {
  return company.system.rosterPJ
    .map((entry) => (entry.actorUuid ? fromUuidSync(entry.actorUuid) : null))
    .filter((actor) => actor?.documentName === "Actor" && actor.type === "character" && !actor.isToken)
}

/**
 * Prépare une nouvelle bataille à partir de la saisie du Meneur.
 * @param {CdgActor} company
 * @param {Object} setup
 * @returns {Object}
 */
export function newState(company, setup) {
  const modifier = Math.clamp(Math.round(Number(setup.modifier) || 0), SYSTEM.BATTLE_MODIFIER_MIN, SYSTEM.BATTLE_MODIFIER_MAX)
  const members = {}
  for (const actor of rosterActors(company)) members[actor.id] = newMember(null)
  return {
    id: foundry.utils.randomID(),
    stake: String(setup.stake ?? "").trim(),
    modifier,
    armyQuality: SYSTEM.BATTLE_ARMY_QUALITIES[setup.armyQuality] ? setup.armyQuality : "normal",
    general: sanitizeGeneral(setup.general),
    chiefUuid: setup.chiefUuid || "",
    turn: 1,
    phase: SYSTEM.BATTLE_PHASES.location.id,
    points: { company: 0, enemy: 0 },
    members,
    generals: { company: null, enemy: null, result: null },
    losses: null,
    history: [],
    winner: null,
  }
}

/**
 * Le général adverse : un acteur adversaire, ou une saisie libre (nom, Esprit, rang de Tactique).
 * @param {Object} general
 * @returns {Object}
 */
function sanitizeGeneral(general = {}) {
  // Un PNJ déposé depuis le compendium n'est pas forcément résolu de façon synchrone : ses scores
  // ont été relevés au dépôt (voir `CdgBattleApp`), on ne garde de lui que son uuid pour le jet.
  return {
    actorUuid: general.actorUuid || "",
    name: String(general.name ?? "").trim() || game.i18n.localize("CDG.battle.general.defaultName"),
    esprit: Math.clamp(Number(general.esprit) || 10, 1, 30),
    tactique: Math.clamp(Number(general.tactique) || 0, 0, SYSTEM.MAX_RANK),
  }
}

/**
 * Remplace la bataille entière : une simple fusion garderait les PJ sortis du roster.
 * @param {CdgActor} company
 * @param {Object} state
 */
export async function writeState(company, state) {
  return company.update({ [`flags.${SYSTEM.PACKAGE_ID}.${BATTLE.FLAG}`]: ForcedReplacement.create(state) })
}
