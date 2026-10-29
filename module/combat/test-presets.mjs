import { SYSTEM } from "../config/system.mjs"

/**
 * Les réglages de la fenêtre de jet pour les tests de combat, quel que soit l'endroit d'où on les
 * lance : carte de confrontation, fiche, macro, bataille, rappel du mourant.
 *
 * Chaque fonction ne rend que ce que le test *est* — couple, rang, libellé, domaine de qualité
 * exceptionnelle, malus de blessure décoché. Ce que l'appelant fait du jet (le fusionner dans une
 * carte, le ranger dans une bataille, décompter la défense) s'ajoute par-dessus, à l'appel.
 *
 * Ce fichier est volontairement pur, comme `rules.mjs` : il ne lit que les données des documents
 * qu'on lui passe, et se teste donc sous Node (`npm test`).
 */

/**
 * Esquive (Vivacité / Esquive) ou parade (Corps / Blocage), voir `SYSTEM.DEFENSES`.
 *
 * Le malus des esquives déjà faites et le bonus du bouclier ne sont pas posés ici : la fenêtre de
 * jet les lit sur la fiche, d'après la compétence lancée.
 * @param {"dodge"|"parry"} method
 * @returns {Object}
 */
export function defenseSeed(method) {
  const defense = SYSTEM.DEFENSES[method]
  return { abilityId: defense.ability, skillId: defense.skill, lockedPair: true, qualityDomain: defense.qualityDomain }
}

/**
 * Dégâts (p. 45) : Corps, au rang de dégâts de l'arme employée plutôt qu'à celui d'une compétence.
 * @param {Item} weapon
 * @returns {Object}
 */
export function damageSeed(weapon) {
  return { abilityId: "corps", rank: weapon.system.damage.rank, label: "CDG.combat.damageTest", lockedPair: true, qualityDomain: "damage" }
}

/**
 * Encaissement (p. 45) : Corps, au rang de protection de l'armure portée, sans le malus des
 * blessures déjà subies. Une réussite critique de l'attaquant fait ignorer l'armure (rang 0).
 * @param {Actor} actor Celui qui encaisse.
 * @param {Object} [options]
 * @param {boolean} [options.ignoreArmor] L'armure ne protège pas.
 * @param {string} [options.label] Libellé du test — la bataille parle de protection face à l'environnement.
 * @returns {Object}
 */
export function soakSeed(actor, { ignoreArmor = false, label = "CDG.combat.soakTest" } = {}) {
  return {
    abilityId: "corps",
    rank: ignoreArmor ? 0 : (actor.armor?.system.protection.rank ?? 0),
    label,
    lockedPair: true,
    qualityDomain: "soak",
    toggles: { wound: false },
  }
}

/**
 * Jet de survie du mourant (p. 46) : Corps / Vigueur, restreint — ni effort, ni passion, ni
 * dépassement —, sans le malus des blessures qui le mettent justement en danger.
 * @returns {Object}
 */
export function survivalSeed() {
  return { abilityId: "corps", skillId: "vigueur", lockedPair: true, label: "CDG.combat.survivalTest", restricted: true, toggles: { wound: false } }
}
