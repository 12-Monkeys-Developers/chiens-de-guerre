import { SYSTEM } from "../config/system.mjs"

export default class Utils {
  /**
   * Préfixe un message de journal du nom du système.
   * @param {string} message
   * @returns {string}
   */
  static log(message) {
    return `${SYSTEM.SYSTEM_DESCRIPTION} | ${message}`
  }

  /**
   * Nom localisé d'une caractéristique.
   * @param {string} ability
   * @returns {string}
   */
  static getAbilityName(ability) {
    return game.i18n.localize(SYSTEM.ABILITIES[ability]?.label ?? ability)
  }

  /**
   * Nom localisé d'une compétence.
   * @param {string} skill
   * @returns {string}
   */
  static getSkillName(skill) {
    return game.i18n.localize(SYSTEM.SKILLS[skill]?.label ?? skill)
  }

  /**
   * État déplié d'une section, mémorisé d'une ouverture de fiche à l'autre.
   * @param {string} key
   * @param {boolean} [defaultValue]
   * @returns {boolean}
   */
  static getExpandedState(key, defaultValue = true) {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) return JSON.parse(stored).expanded === true
    } catch {
      // LocalStorage indisponible ou contenu illisible : on retombe sur la valeur par défaut.
    }
    return defaultValue
  }

  /**
   * Mémorise l'état déplié d'une section.
   * @param {string} key
   * @param {boolean} expanded
   */
  static setExpandedState(key, expanded) {
    try {
      localStorage.setItem(key, JSON.stringify({ expanded }))
    } catch {
      // Sans localStorage, l'état n'est pas mémorisé — sans conséquence sur l'affichage courant.
    }
  }

  /**
   * Convertit un montant en deniers vers un couple ducats / deniers.
   * @param {number} deniers
   * @returns {{ducat: number, denier: number}}
   */
  static splitCurrency(deniers) {
    const total = Math.max(0, Math.round(deniers))
    return {
      ducat: Math.floor(total / SYSTEM.DENIERS_PER_DUCAT),
      denier: total % SYSTEM.DENIERS_PER_DUCAT,
    }
  }
}
