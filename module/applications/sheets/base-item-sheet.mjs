import { SYSTEM } from "../../config/system.mjs"
import Utils from "../../helpers/utils.mjs"

const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api

/**
 * Socle des fiches d'objet : en-tête commun (image, nom), description, et l'action de
 * réglage des rangs partagée avec les fiches d'acteur.
 */
export default class CdgBaseItemSheet extends HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["cdg", "item"],
    position: {
      width: 560,
      height: 620,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      editImage: CdgBaseItemSheet.#onEditImage,
      setRank: CdgBaseItemSheet.#onSetRank,
      createEffect: CdgBaseItemSheet.#onCreateEffect,
      editEffect: CdgBaseItemSheet.#onEditEffect,
      deleteEffect: CdgBaseItemSheet.#onDeleteEffect,
      toggleEffect: CdgBaseItemSheet.#onToggleEffect,
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.effects = this.#prepareEffects()

    context.item = this.document
    context.system = this.document.system
    context.source = this.document.toObject()
    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields
    context.isEditable = this.isEditable
    context.SYSTEM = SYSTEM

    context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.description ?? "")

    if (CONFIG.debug.cdg?.sheets) console.debug(Utils.log(`${this.constructor.name} - contexte`), context)

    return context
  }

  /**
   * Les effets portés par l'objet, chacun résumé en une phrase lisible.
   *
   * Un effet transféré s'applique à l'acteur qui porte l'objet ; sans transfert il ne vaut que pour
   * l'objet lui-même. La distinction est affichée, parce qu'un trait oublié sans transfert ne
   * produit rien et que rien à l'écran ne le dirait autrement.
   * @returns {Object[]}
   */
  #prepareEffects() {
    return this.document.effects.map((effect) => ({
      id: effect.id,
      name: effect.name,
      img: effect.img,
      disabled: effect.disabled,
      transfer: effect.transfer,
      changes: effect.system.changes.map((change) => this.#describeChange(change)),
    }))
  }

  /**
   * Met un change en français.
   * @param {Object} change
   * @returns {string}
   */
  #describeChange(change) {
    const value = Number(change.value)
    const signed = Number.isFinite(value) && value > 0 ? `+${value}` : `${change.value}`

    if (change.type === SYSTEM.SITUATIONAL_CHANGE_TYPE) {
      const situation = SYSTEM.SITUATIONS[change.situation]
      const label = situation ? game.i18n.localize(situation.label) : game.i18n.localize("CDG.effect.anySituation")
      return game.i18n.format("CDG.effect.summary.situational", { value: signed, situation: label })
    }

    return game.i18n.format("CDG.effect.summary.permanent", { value: signed, key: change.key })
  }

  /**
   * Crée un effet vide sur l'objet et ouvre sa fenêtre de configuration.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCreateEffect(event, target) {
    if (!this.isEditable) return
    const [effect] = await this.document.createEmbeddedDocuments("ActiveEffect", [
      {
        name: this.document.name,
        img: this.document.img,
        // Un effet créé sur un objet doit valoir pour son porteur : c'est le cas de tous les
        // traits, et l'oubli du transfert est l'erreur de saisie la plus coûteuse à diagnostiquer.
        transfer: true,
      },
    ])
    return effect?.sheet.render({ force: true })
  }

  /**
   * Ouvre la fenêtre de configuration d'un effet.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-effect-id`.
   */
  static async #onEditEffect(event, target) {
    const effect = this.document.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)
    return effect?.sheet.render({ force: true })
  }

  /**
   * Supprime un effet, après confirmation.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-effect-id`.
   */
  static async #onDeleteEffect(event, target) {
    if (!this.isEditable) return
    const effect = this.document.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)
    if (!effect) return
    return effect.deleteDialog()
  }

  /**
   * Active ou désactive un effet sans le supprimer.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-effect-id`.
   */
  static async #onToggleEffect(event, target) {
    if (!this.isEditable) return
    const effect = this.document.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)
    return effect?.update({ disabled: !effect.disabled })
  }

  /**
   * Choisit l'image de l'objet.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onEditImage(event, target) {
    if (!this.isEditable) return
    const current = foundry.utils.getProperty(this.document, "img")
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: "image",
      callback: (path) => this.document.update({ img: path }),
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  /**
   * Fixe un rang en cliquant sur un écusson ; recliquer sur le cran courant redescend d'un.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-target` et `data-rank`.
   */
  static async #onSetRank(event, target) {
    if (!this.isEditable) return
    const path = target.dataset.target
    const clicked = parseInt(target.dataset.rank)
    if (!path || isNaN(clicked)) return

    const current = foundry.utils.getProperty(this.document, path)
    const value = current === clicked ? clicked - 1 : clicked
    return this.document.update({ [path]: Math.max(0, value) })
  }
}
