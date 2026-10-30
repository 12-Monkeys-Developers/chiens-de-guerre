import Utils from "./utils.mjs"

/**
 * Le Meneur actif, seul écrivain d'un état partagé — carte de confrontation, bataille d'une
 * compagnie, round du combat.
 *
 * Deux joueurs qui écrivent le même état en même temps (les dégâts de l'attaquant et
 * l'encaissement de la cible, par exemple) l'effaceraient l'un l'autre, chacun réécrivant ce qu'il
 * avait lu avant l'arrivée de l'autre. Le joueur garde donc tout ce qui se passe chez lui — lancer
 * les dés, dépenser ses réserves — et ne confie au Meneur que l'écriture : `askActiveGM` lui
 * transmet la demande, et le Meneur range chaque écriture dans la file de son état (`serialize`),
 * où elle relit ce que la précédente a laissé.
 *
 * Les droits (qui peut écrire quoi, à quelle phase) restent à la charge de chaque appelant, qui les
 * vérifie côté Meneur avant d'écrire.
 */

/**
 * Les files d'attente en cours, par clé d'état.
 * @type {Map<string, Promise>}
 */
const queues = new Map()

/**
 * Fait exécuter une écriture par le Meneur actif : directement si l'on est soi-même Meneur, sinon
 * par la requête enregistrée sous `query` dans `CONFIG.queries`.
 *
 * Une demande refusée ne dit rien au joueur — le Meneur trace sa raison dans sa propre console ;
 * côté joueur, la trace se contente de signaler le refus.
 * @param {string} query Le nom de la requête, côté Meneur (`cdg.confrontationStep`…).
 * @param {Object} payload Ce qui est transmis au Meneur.
 * @param {Object} options
 * @param {Function} options.apply L'écriture elle-même, quand on est Meneur.
 * @param {string} options.category La catégorie des traces de débogage (`confrontation`, `battle`…).
 * @param {string} options.label Ce qui est demandé, au féminin, pour la trace (« Étape merge defense »).
 * @returns {Promise<*>} Le retour de `apply`, ou la réponse du Meneur ; `false` sans Meneur connecté.
 */
export async function askActiveGM(query, payload, { apply, category, label }) {
  if (game.user.isGM) return apply()
  const gm = game.users.activeGM
  if (!gm) {
    ui.notifications.error("CDG.confrontation.notif.noGM", { localize: true })
    return false
  }
  const accepted = await gm.query(query, payload)
  Utils.debug(category, `${label} ${accepted ? "acceptée" : "refusée"} par le Meneur (${gm.name})${accepted ? "" : " — la raison est tracée dans sa console"}`, payload)
  return accepted
}

/**
 * Exécute `task` après toutes celles déjà en attente sous la même clé, l'une après l'autre.
 *
 * L'échec d'une tâche ne bloque pas la suivante : il revient à celui qui l'a demandée, et la file
 * repart. La clé est libérée dès que sa dernière tâche est finie.
 * @param {string} key L'état visé, préfixé de son domaine (`confrontation.<id du message>`).
 * @param {Function} task Une fonction, éventuellement asynchrone.
 * @returns {Promise<*>} Le retour de `task`.
 */
export function serialize(key, task) {
  const previous = queues.get(key) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(task)
  queues.set(key, next)
  const release = () => {
    if (queues.get(key) === next) queues.delete(key)
  }
  // Libérée par les deux branches, sans enchaîner une promesse de plus qui rejetterait sans témoin.
  next.then(release, release)
  return next
}
