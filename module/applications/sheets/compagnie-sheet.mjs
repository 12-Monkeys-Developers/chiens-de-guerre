import { SYSTEM } from "../../config/system.mjs"
import CdgMacros from "../../helpers/macros.mjs"
import CdgBaseActorSheet from "./base-actor-sheet.mjs"

/** Partiel des rangées d'écussons, partagé avec les fiches personnage et adversaire. */
const RANK_SHIELDS = `${SYSTEM.PATH}/templates/shared/rank-shields.hbs`

/** Partiels propres à la fiche de compagnie, à précharger comme le fait déjà `RANK_SHIELDS`. */
const ROSTER_ROW = `${SYSTEM.PATH}/templates/actors/partials/compagnie-roster-row.hbs`
const CHRONICLE_ROW = `${SYSTEM.PATH}/templates/actors/partials/compagnie-chronicle-row.hbs`

/**
 * Fiche de compagnie franche (p. 171) : une seule page, pas d'onglets — caractéristiques et
 * compétences propres, roster de personnages joueurs/non joueurs, chroniques, notes.
 */
export default class CdgCompagnieSheet extends CdgBaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["compagnie"],
    position: {
      width: 860,
      height: 900,
    },
    window: {
      contentClasses: ["compagnie-content"],
    },
    actions: {
      // Le couple caractéristique / compétence d'une compagnie est imposé (p. 124) : cette
      // surcharge remplace, pour cette seule fiche, l'action `rollTest` héritée du socle commun.
      rollTest: CdgCompagnieSheet.#onRollTest,
      addWound: CdgCompagnieSheet.#onAddWound,
      reactivate: CdgCompagnieSheet.#onReactivate,
      addChronicle: CdgCompagnieSheet.#onAddChronicle,
      removeChronicle: CdgCompagnieSheet.#onRemoveChronicle,
      addRosterEntry: CdgCompagnieSheet.#onAddRosterEntry,
      removeRosterEntry: CdgCompagnieSheet.#onRemoveRosterEntry,
      openRosterActor: CdgCompagnieSheet.#onOpenRosterActor,
      unlinkRosterActor: CdgCompagnieSheet.#onUnlinkRosterActor,
    },
  }

  /** @override */
  static PARTS = {
    // Les compétences (et leur partiel d'écussons) sont remontées dans l'en-tête, sous le nom de
    // la compagnie — caractéristiques à gauche, compétences à droite.
    header: { template: `${SYSTEM.PATH}/templates/actors/compagnie-header.hbs`, templates: [RANK_SHIELDS] },
    body: { template: `${SYSTEM.PATH}/templates/actors/compagnie-body.hbs`, templates: [ROSTER_ROW, CHRONICLE_ROW], scrollable: [""] },
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

    context.rosterPJ = this.#prepareRoster(this.document.system.rosterPJ)
    context.rosterPNJ = this.#prepareRoster(this.document.system.rosterPNJ)
    context.chronicles = this.document.system.chronicles.map((chronicle, index) => ({ ...chronicle, index }))
    context.dissolved = this.document.system.dissolved

    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML
    context.enrichedNotes = await enrichHTML(this.document.system.notes)

    return context
  }

  /**
   * Résout, pour chaque ligne du roster, l'acteur qu'elle référence — s'il y en a un.
   * @param {Object[]} entries
   * @returns {Object[]}
   */
  #prepareRoster(entries) {
    return entries.map((entry, index) => ({
      ...entry,
      index,
      actor: entry.actorUuid ? fromUuidSync(entry.actorUuid) : null,
    }))
  }

  // #region Actions

  /**
   * Lance un test de compétence de compagnie. Le couple caractéristique / compétence n'est ici
   * jamais libre (p. 124), à la différence du personnage : `lockedPair` reste vrai même si le
   * joueur rouvre le sélecteur de caractéristique dans la fenêtre de jet.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte, ou est contenu dans, un `data-skill` et un `data-ability`.
   */
  static async #onRollTest(event, target) {
    return CdgMacros.rollTest(target.closest("[data-ability]")?.dataset.ability ?? null, target.closest("[data-skill]")?.dataset.skill ?? null, this.document, {
      lockedPair: true,
    })
  }

  /**
   * Ajoute une blessure avec débordement, y compris au-delà de la dernière case mortelle.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddWound(event, target) {
    if (!this.isEditable || this.document.system.dissolved) return
    const level = target.closest("[data-level]")?.dataset.level
    if (!SYSTEM.WOUND_LEVELS[level]) return
    return this.document.applyWoundOverflow(null, level)
  }

  /** Rend jouable une compagnie conservée après dissolution, une fois ses Effectifs corrigés. */
  static async #onReactivate() {
    if (!this.isEditable) return
    if (this.document.system.abilities.effectifs.max <= 0) {
      return ui.notifications.warn("CDG.company.cannotReactivate", { localize: true })
    }
    return this.document.update({ "system.state.dissolved": false })
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
    return this.document.update({ [`system.${key}.${index}.actorUuid`]: "" })
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
   * Dépose un acteur sur une ligne de roster (elle en hérite le nom, et le grade s'il s'agit d'un
   * personnage) ou n'importe où ailleurs dans la section — le roster étant vide au départ, exiger
   * de cliquer d'abord sur « + » avant de pouvoir glisser un acteur serait un détour inutile : on
   * ajoute alors une ligne. Tout le reste (objets d'inventaire, etc.) est délégué au socle commun.
   * @param {DragEvent} event
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Actor") return super._onDrop(event)
    if (!this.isEditable) return

    const row = event.target.closest?.("[data-roster-row]")
    const section = row ? null : event.target.closest?.("[data-roster]")
    if (!row && !section) return super._onDrop(event)

    const actor = await Actor.implementation.fromDropData(data)
    if (!actor) return
    const grade = this.constructor.#gradeOf(actor)

    if (row) {
      const { key, index } = this.constructor.#rosterRow(row)
      if (!key) return
      const updates = {
        [`system.${key}.${index}.actorUuid`]: actor.uuid,
        [`system.${key}.${index}.name`]: actor.name,
      }
      // Un PNJ (adversaire) n'a pas de grade au sens des règles : la ligne garde alors celui déjà
      // saisi à la main plutôt que de se faire vider.
      if (grade) updates[`system.${key}.${index}.grade`] = grade
      return this.document.update(updates)
    }

    const roster = section.dataset.roster
    const key = roster === "pj" ? "rosterPJ" : roster === "pnj" ? "rosterPNJ" : null
    if (!key) return
    return this.document.update({
      [`system.${key}`]: [...this.document.system[key], { actorUuid: actor.uuid, name: actor.name, grade, notes: "" }],
    })
  }

  /**
   * Le grade d'un personnage, prêt à afficher, ou une chaîne vide pour tout autre type d'acteur —
   * un adversaire n'a ni identité, ni grade (p. 121).
   * @param {CdgActor} actor
   * @returns {string}
   */
  static #gradeOf(actor) {
    const gradeId = actor.system.identity?.grade
    if (!gradeId) return ""
    const grade = SYSTEM.GRADES[gradeId]
    return grade ? game.i18n.localize(grade.label) : ""
  }

  // #endregion
}
