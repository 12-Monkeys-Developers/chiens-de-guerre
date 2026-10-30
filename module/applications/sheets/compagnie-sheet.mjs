import { SYSTEM } from "../../config/system.mjs"
import CdgBattle from "../../combat/battle.mjs"
import CdgMacros from "../../helpers/macros.mjs"
import CdgBattleApp from "../battle-app.mjs"
import CdgBaseActorSheet from "./base-actor-sheet.mjs"
import { RANK_SHIELDS } from "./partials.mjs"

/** Partiels propres à la fiche de compagnie, à précharger comme le fait déjà `RANK_SHIELDS`. */
const ROSTER_ROW = `${SYSTEM.PATH}/templates/actors/partials/compagnie-roster-row.hbs`
const CHRONICLE_ROW = `${SYSTEM.PATH}/templates/actors/partials/compagnie-chronicle-row.hbs`

/**
 * Fiche de compagnie franche (p. 171). Un en-tête compact (emblème, nom, réserves et malus courant)
 * reste visible au-dessus de trois onglets : la compagnie (caractéristiques, compétences, blessés,
 * guérison), ses membres (personnages joueurs et non joueurs), ses chroniques et notes. Une
 * compagnie peut compter une douzaine de PNJ : sur une seule page, la fiche n'en finissait plus.
 */
export default class CdgCompagnieSheet extends CdgBaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["compagnie"],
    position: {
      width: 860,
      height: 720,
    },
    window: {
      contentClasses: ["compagnie-content"],
    },
    actions: {
      reactivate: CdgCompagnieSheet.#onReactivate,
      openBattle: CdgCompagnieSheet.#onOpenBattle,
      companyHealing: CdgCompagnieSheet.#onCompanyHealing,
      addChronicle: CdgCompagnieSheet.#onAddChronicle,
      removeChronicle: CdgCompagnieSheet.#onRemoveChronicle,
      addRosterEntry: CdgCompagnieSheet.#onAddRosterEntry,
      removeRosterEntry: CdgCompagnieSheet.#onRemoveRosterEntry,
      openRosterActor: CdgCompagnieSheet.#onOpenRosterActor,
      unlinkRosterActor: CdgCompagnieSheet.#onUnlinkRosterActor,
      sortRosterByGrade: CdgCompagnieSheet.#onSortRosterByGrade,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/actors/compagnie-header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    compagnie: { template: `${SYSTEM.PATH}/templates/actors/compagnie-tab-compagnie.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    // Chaque colonne de membres défile seule : c'est elle, et non l'onglet, qui retient sa position.
    membres: { template: `${SYSTEM.PATH}/templates/actors/compagnie-tab-membres.hbs`, templates: [ROSTER_ROW], scrollable: [".roster-pj .item-list", ".roster-pnj .item-list"] },
    chroniques: { template: `${SYSTEM.PATH}/templates/actors/compagnie-tab-chroniques.hbs`, templates: [CHRONICLE_ROW], scrollable: [""] },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "compagnie", cssClass: "tabName" },
        { id: "membres", cssClass: "tabName" },
        { id: "chroniques", cssClass: "tabName" },
      ],
      initial: "compagnie",
      labelPrefix: "CDG.sheet.tabs",
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.companyAbilities = SYSTEM.COMPANY_ABILITIES
    // Trois colonnes groupées par caractéristique (Effectifs/Logistique/Moral), à la place du
    // regroupement par colonne imprimée que lit le socle commun pour le personnage.
    context.skillColumns = Object.values(SYSTEM.COMPANY_ABILITIES).map((ability) => ({
      ability,
      skills: Object.values(SYSTEM.COMPANY_SKILLS).filter((skill) => skill.ability === ability.id),
    }))

    // Les PJ suivent l'ordre fixé à la main (glisser-déposer) ; les PNJ, nombreux et sans ordre
    // propre, sont rangés par grade en consultation.
    context.rosterPJ = this.#prepareRoster(this.document.system.rosterPJ)
    context.rosterPNJ = this.#prepareRoster(this.document.system.rosterPNJ, { sortByGrade: !this.isEditMode })
    context.chronicles = this.document.system.chronicles.map((chronicle, index) => ({ ...chronicle, index }))
    context.dissolved = this.document.system.dissolved
    context.battleActive = !!CdgBattle.getState(this.document)
    context.hasWounds = Object.values(SYSTEM.WOUND_LEVELS).some((level) => this.document.system.wounds[level.id].value > 0)
    context.choiceRestConditions = Object.values(SYSTEM.REST_CONDITIONS)
    context.choiceGrades = SYSTEM.COMPANY_GRADES

    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML
    context.enrichedNotes = await enrichHTML(this.document.system.notes)

    return context
  }

  /**
   * Résout, pour chaque ligne du roster, l'acteur qu'elle référence — s'il y en a un —, le nom à
   * afficher et le libellé de son grade.
   * @param {Object[]} entries
   * @param {Object} [options]
   * @param {boolean} [options.sortByGrade] Ranger les lignes par grade, pour l'affichage seulement.
   * @returns {Object[]}
   */
  #prepareRoster(entries, { sortByGrade = false } = {}) {
    const rows = entries.map((entry, index) => {
      const actor = entry.actorUuid ? fromUuidSync(entry.actorUuid) : null
      return {
        ...entry,
        index,
        actor,
        displayName: actor?.name ?? entry.name,
        gradeLabel: entry.grade ? game.i18n.localize(SYSTEM.COMPANY_GRADES[entry.grade].label) : "",
      }
    })
    if (!sortByGrade) return rows

    // Un état des effectifs : du Capitaine au Valet, puis les sans-grade, chaque grade par ordre
    // alphabétique. Chaque ligne garde son `index` dans le tableau d'origine.
    const rank = this.constructor.#gradeRank
    return rows.toSorted((a, b) => rank(a.grade) - rank(b.grade) || (a.displayName ?? "").localeCompare(b.displayName ?? "", game.i18n.lang))
  }

  /**
   * Rang d'un grade dans la hiérarchie de la compagnie, du Capitaine (0) au Valet ; sans grade, après.
   * @param {string} grade
   * @returns {number}
   */
  static #gradeRank(grade) {
    const grades = Object.keys(SYSTEM.COMPANY_GRADES)
    return grade && grades.includes(grade) ? grades.indexOf(grade) : grades.length
  }

  /**
   * Insère une ligne de PJ à la place de son grade, après ceux de même grade : la liste reste
   * rangée par grade tant qu'on ne la réordonne pas à la main.
   * @param {Object[]} roster
   * @param {Object} line
   * @returns {Object[]}
   */
  static #insertByGrade(roster, line) {
    const rank = this.#gradeRank(line.grade)
    const at = roster.findIndex((entry) => this.#gradeRank(entry.grade) > rank)
    return at === -1 ? [...roster, line] : roster.toSpliced(at, 0, line)
  }

  // #region Actions

  /** Ouvre la fenêtre de bataille de la compagnie (p. 51-54). */
  static async #onOpenBattle() {
    return CdgBattleApp.open(this.document)
  }

  /** Rend jouable une compagnie conservée après dissolution, une fois ses Effectifs corrigés. */
  static async #onReactivate() {
    if (!this.isEditable) return
    if (this.document.system.abilities.effectifs.max <= 0) {
      return ui.notifications.warn("CDG.company.cannotReactivate", { localize: true })
    }
    return this.document.update({ "system.state.dissolved": false })
  }

  /**
   * Lance l'un des deux tests quotidiens qui peuvent résorber les blessures de la compagnie.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCompanyHealing(event, target) {
    if (!this.isEditable || this.document.system.dissolved) return
    const type = target.dataset.healing
    const pair = type === "recovery" ? ["effectifs", "cohesion"] : type === "care" ? ["logistique", "soins"] : null
    if (!pair) return
    return CdgMacros.rollTest(pair[0], pair[1], this.document, { lockedPair: true, companyHealing: type })
  }

  static async #onAddChronicle() {
    if (!this.isEditable) return
    return this.document.update({ "system.chronicles": [...this.document.system.chronicles, { date: "", event: "" }] })
  }

  /**
   * Retire une ligne du journal.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-index`.
   */
  static async #onRemoveChronicle(event, target) {
    if (!this.isEditable) return
    const index = parseInt(target.dataset.index)
    if (isNaN(index)) return
    const chronicles = this.document.system.chronicles.toSpliced(index, 1)
    return this.document.update({ "system.chronicles": chronicles })
  }

  /**
   * Ajoute une ligne vide au roster.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Contenu dans un `[data-roster]` (`pj` ou `pnj`).
   */
  static async #onAddRosterEntry(event, target) {
    if (!this.isEditable) return
    const roster = target.closest("[data-roster]")?.dataset.roster
    const key = roster === "pj" ? "rosterPJ" : roster === "pnj" ? "rosterPNJ" : null
    if (!key) return
    return this.document.update({ [`system.${key}`]: [...this.document.system[key], { actorUuid: "", name: "", grade: "", notes: "" }] })
  }

  /** Range les personnages joueurs par grade, du Capitaine au Valet ; l'ordre reste ensuite modifiable. */
  static async #onSortRosterByGrade() {
    if (!this.isEditable) return
    const rank = this.constructor.#gradeRank
    const roster = this.document.system.rosterPJ.toSorted((a, b) => rank(a.grade) - rank(b.grade))
    return this.document.update({ "system.rosterPJ": roster })
  }

  /**
   * Retire une ligne du roster.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Contenu dans une `[data-roster-row]`.
   */
  static async #onRemoveRosterEntry(event, target) {
    if (!this.isEditable) return
    const { key, index } = this.constructor.#rosterRow(target)
    if (!key) return
    const roster = this.document.system[key].toSpliced(index, 1)
    return this.document.update({ [`system.${key}`]: roster })
  }

  /**
   * Ouvre la fiche de l'acteur lié à une ligne du roster.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Contenu dans une `[data-roster-row]`.
   */
  static async #onOpenRosterActor(event, target) {
    const { key, index } = this.constructor.#rosterRow(target)
    if (!key) return
    const actor = await fromUuid(this.document.system[key][index]?.actorUuid)
    return actor?.sheet.render(true)
  }

  /**
   * Délie l'acteur d'une ligne du roster, sans toucher au texte déjà saisi.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Contenu dans une `[data-roster-row]`.
   */
  static async #onUnlinkRosterActor(event, target) {
    if (!this.isEditable) return
    const { key, index } = this.constructor.#rosterRow(target)
    if (!key) return
    // Le roster est un tableau : une mise à jour par chemin (`system.rosterPJ.0.actorUuid`) le
    // remplaçait par cette seule ligne, vidée de tout le reste — la liste entière disparaissait.
    // On renvoie donc le tableau complet, comme pour l'ajout et la suppression.
    const roster = this.document.system[key].map((entry, i) => (i === index ? { ...entry, actorUuid: "" } : entry))
    return this.document.update({ [`system.${key}`]: roster })
  }

  /**
   * Le tableau de roster et l'index visés par une action, d'après la `[data-roster-row]` la plus
   * proche (porte `data-roster` — `pj` ou `pnj` — et `data-index`).
   * @param {HTMLElement} target
   * @returns {{key: "rosterPJ"|"rosterPNJ"|null, index: number}}
   */
  static #rosterRow(target) {
    const row = target.closest("[data-roster-row]")
    const roster = row?.dataset.roster
    const key = roster === "pj" ? "rosterPJ" : roster === "pnj" ? "rosterPNJ" : null
    return { key, index: parseInt(row?.dataset.index) }
  }

  // #endregion

  // #region Glisser-déposer

  /**
   * Dépose un acteur sur le roster : il y gagne une ligne, avec son nom, et son grade s'il s'agit
   * d'un personnage. Lâché sur l'une des deux listes, il la rejoint ; n'importe où ailleurs sur la
   * fiche, il rejoint celle de son type — un personnage les personnages joueurs, un adversaire les
   * non joueurs. Les listes ne couvraient que leur titre et leurs lignes, et un acteur lâché à côté
   * était ignoré sans un mot. Tout le reste (objets d'inventaire, etc.) est délégué au socle commun.
   * @param {DragEvent} event
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type === "cdg.rosterMove") return this.isEditable && this.isEditMode ? this.#moveRosterPJ(event, data.index) : undefined
    if (data.type !== "Actor") return super._onDrop(event)
    if (!this.isEditable) return

    const actor = await Actor.implementation.fromDropData(data)
    if (!actor || actor.type === "compagnie") return

    const roster = event.target.closest?.("[data-roster]")?.dataset.roster ?? (actor.type === "character" ? "pj" : "pnj")
    const key = roster === "pj" ? "rosterPJ" : "rosterPNJ"

    // Un acteur ne figure qu'une fois au roster, toutes listes confondues.
    const { rosterPJ, rosterPNJ } = this.document.system
    if ([...rosterPJ, ...rosterPNJ].some((entry) => entry.actorUuid === actor.uuid)) {
      ui.notifications.info(game.i18n.format("CDG.company.alreadyInRoster", { name: actor.name }))
      return
    }

    const newline = { actorUuid: actor.uuid, name: actor.name, grade: this.constructor.#gradeOf(actor), notes: "" }
    const entries = key === "rosterPJ" ? this.constructor.#insertByGrade(rosterPJ, newline) : [...rosterPNJ, newline]
    return this.document.update({ [`system.${key}`]: entries })
  }

  /**
   * Saisie d'un personnage joueur par sa poignée (mode édition), pour le déplacer dans sa colonne. Tout autre
   * glissement (macros de test, objets) reste au socle commun.
   * @param {DragEvent} event
   */
  _onDragStart(event) {
    const row = event.currentTarget.closest("[data-roster-row]")
    if (row?.dataset.roster !== "pj") return super._onDragStart(event)
    event.dataTransfer.setData("text/plain", JSON.stringify({ type: "cdg.rosterMove", index: Number(row.dataset.index) }))
  }

  /**
   * Déplace un personnage joueur à la place de la ligne sur laquelle il est lâché — avant elle en
   * remontant, après elle en descendant —, ou en fin de liste sous la dernière ligne.
   * @param {DragEvent} event
   * @param {number} from
   */
  async #moveRosterPJ(event, from) {
    const roster = this.document.system.rosterPJ
    if (!event.target.closest?.('[data-roster="pj"]') || !Number.isInteger(from) || !roster[from]) return
    const over = event.target.closest("[data-roster-row]")
    const to = over ? Number(over.dataset.index) : roster.length - 1
    if (to === from) return
    const moved = roster.toSpliced(from, 1).toSpliced(to, 0, roster[from])
    return this.document.update({ "system.rosterPJ": moved })
  }

  /**
   * L'identifiant du grade d'un personnage, ou une chaîne vide pour tout autre type d'acteur —
   * un adversaire n'a ni identité, ni grade (p. 121).
   * @param {CdgActor} actor
   * @returns {string}
   */
  static #gradeOf(actor) {
    const gradeId = actor.system.identity?.grade
    return Object.hasOwn(SYSTEM.COMPANY_GRADES, gradeId ?? "") ? gradeId : ""
  }

  // #endregion
}
