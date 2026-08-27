import { OUTCOMES } from "../dice/roll-outcome.mjs"

/**
 * Résolution des tests d'opposition d'un combat — Phases 2 et 3 (p. 44-45).
 *
 * Ce fichier est volontairement pur, comme `roll-outcome.mjs` : il ne touche ni à Foundry, ni aux
 * documents, ni à l'interface. Il prend en entrée des issues déjà résolues par `resolveOutcome`
 * (chaque camp a déjà lancé son propre test, face à son propre seuil) et les croise.
 */

/**
 * Table de résolution d'un test d'opposition — méthode générale, pas spécifique au combat : tout
 * autre test opposé du système peut s'en servir. Le personnage actif est en ligne, le passif en
 * colonne. La relation n'est pas monotone : un Échec de l'actif face à un Échec Critique du passif
 * devient une Réussite, par exemple — d'où une table de correspondance plutôt qu'une comparaison de
 * paliers.
 *
 * `"tie"` marque les deux cases qui se départagent par la qualité des dés conservés plutôt que par
 * un résultat fixe.
 */
const OPPOSED_TABLE = {
  [OUTCOMES.criticalFailure.id]: {
    [OUTCOMES.criticalFailure.id]: OUTCOMES.failure.id,
    [OUTCOMES.failure.id]: OUTCOMES.failure.id,
    [OUTCOMES.success.id]: OUTCOMES.criticalFailure.id,
    [OUTCOMES.criticalSuccess.id]: OUTCOMES.criticalFailure.id,
  },
  [OUTCOMES.failure.id]: {
    [OUTCOMES.criticalFailure.id]: OUTCOMES.success.id,
    [OUTCOMES.failure.id]: OUTCOMES.failure.id,
    [OUTCOMES.success.id]: OUTCOMES.failure.id,
    [OUTCOMES.criticalSuccess.id]: OUTCOMES.criticalFailure.id,
  },
  [OUTCOMES.success.id]: {
    [OUTCOMES.criticalFailure.id]: OUTCOMES.criticalSuccess.id,
    [OUTCOMES.failure.id]: OUTCOMES.success.id,
    [OUTCOMES.success.id]: "tie",
    [OUTCOMES.criticalSuccess.id]: OUTCOMES.failure.id,
  },
  [OUTCOMES.criticalSuccess.id]: {
    [OUTCOMES.criticalFailure.id]: OUTCOMES.criticalSuccess.id,
    [OUTCOMES.failure.id]: OUTCOMES.criticalSuccess.id,
    [OUTCOMES.success.id]: OUTCOMES.success.id,
    [OUTCOMES.criticalSuccess.id]: "tie",
  },
}

/**
 * Résout un test d'opposition entre un personnage actif et un personnage passif.
 *
 * Les deux issues doivent déjà porter un `quality` : c'est le cas de tout retour de `resolveOutcome`
 * dont le test a réussi. Le champ n'est lu que pour les deux cases à égalité, où les deux camps ont
 * nécessairement réussi.
 * @param {Object} activeOutcome Le retour de `resolveOutcome` pour le personnage actif.
 * @param {Object} passiveOutcome Le retour de `resolveOutcome` pour le personnage passif.
 * @returns {string} Une clé de `OUTCOMES`.
 */
export function resolveOpposedOutcome(activeOutcome, passiveOutcome) {
  const cell = OPPOSED_TABLE[activeOutcome.outcome][passiveOutcome.outcome]
  if (cell !== "tie") return cell
  return activeOutcome.quality >= passiveOutcome.quality ? OUTCOMES.success.id : OUTCOMES.failure.id
}

/**
 * Grille de résolution des blessures (p. 45) : croise le test de Dommages (en ligne) et le test
 * d'Encaissement (en colonne). Distincte de `resolveOpposedOutcome` : ce n'est pas la même relation
 * appliquée une seconde fois, les deux tables ont été vérifiées indépendantes l'une de l'autre.
 *
 * `"conditional"` marque les trois cases qui se départagent par la qualité des dés conservés.
 */
const WOUND_TABLE = {
  [OUTCOMES.criticalFailure.id]: {
    [OUTCOMES.criticalFailure.id]: "legere",
    [OUTCOMES.failure.id]: null,
    [OUTCOMES.success.id]: null,
    [OUTCOMES.criticalSuccess.id]: null,
  },
  [OUTCOMES.failure.id]: {
    [OUTCOMES.criticalFailure.id]: "grave",
    [OUTCOMES.failure.id]: "legere",
    [OUTCOMES.success.id]: null,
    [OUTCOMES.criticalSuccess.id]: null,
  },
  [OUTCOMES.success.id]: {
    [OUTCOMES.criticalFailure.id]: "mortelle",
    [OUTCOMES.failure.id]: "grave",
    [OUTCOMES.success.id]: "conditional",
    [OUTCOMES.criticalSuccess.id]: null,
  },
  [OUTCOMES.criticalSuccess.id]: {
    [OUTCOMES.criticalFailure.id]: "mortelle",
    [OUTCOMES.failure.id]: "mortelle",
    [OUTCOMES.success.id]: "conditional",
    [OUTCOMES.criticalSuccess.id]: "conditional",
  },
}

/**
 * Résout la gravité de la blessure infligée, à partir des issues indépendantes des tests de
 * Dommages et d'Encaissement (chacun face à son propre seuil, pas l'un contre l'autre).
 * @param {Object} damageOutcome Le retour de `resolveOutcome` pour le test de Dommages.
 * @param {Object} soakOutcome Le retour de `resolveOutcome` pour le test d'Encaissement.
 * @returns {string|null} Un id de `SYSTEM.WOUND_LEVELS`, ou `null` pour « Aucune blessure ».
 */
export function resolveWound(damageOutcome, soakOutcome) {
  const cell = WOUND_TABLE[damageOutcome.outcome][soakOutcome.outcome]
  if (cell !== "conditional") return cell
  return damageOutcome.quality >= soakOutcome.quality ? "grave" : "legere"
}
