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
   * Trace de débogage, écrite seulement si sa catégorie est active (`CONFIG.debug.cdg`, posé au
   * `ready` d'après le réglage « Mode débogage » du poste).
   *
   * `console.log` plutôt que `console.debug` : ce dernier n'apparaît qu'au niveau « Détaillé » de
   * la console, et on croyait le mode sans effet. Les objets suivent le message pour rester dépliables.
   * @param {"sheets"|"rolls"|"confrontation"|"combat"|"wounds"|"battle"|"origins"} category
   * @param {string} message
   * @param {...*} data
   */
  static debug(category, message, ...data) {
    if (!CONFIG.debug.cdg?.[category]) return
    console.log(this.log(`[${category}] ${message}`), ...data)
  }

  /**
   * Un champ HTML dit-il quelque chose ?
   *
   * ProseMirror n'écrit jamais une chaîne vide : refermer un éditeur qu'on a vidé y laisse un
   * paragraphe sans contenu, parfois une espace insécable. Le tester à vue ferait afficher une
   * zone ou une info-bulle vide au moindre survol.
   * @param {string} html
   * @returns {boolean}
   */
  static hasText(html) {
    return !!html
      ?.replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim()
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
}
