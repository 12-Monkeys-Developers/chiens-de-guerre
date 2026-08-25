import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"

/** Partiels partagés par les fiches d'objet. */
const SHARED_DESCRIPTION = `${SYSTEM.PATH}/templates/items/shared/description.hbs`

export default class CdgCarriereSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["carriere"],
    position: {
      height: 700,
    },
    actions: {
      addSkill: CdgCarriereSheet.#onAddSkill,
      removeSkill: CdgCarriereSheet.#onRemoveSkill,
      removeReference: CdgCarriereSheet.#onRemoveReference,
      editReference: CdgCarriereSheet.#onEditReference,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    main: { template: `${SYSTEM.PATH}/templates/items/carriere.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.choiceAbilities = SYSTEM.ABILITIES
    context.choiceSkills = SYSTEM.SKILLS

    // Une fois la carrière déposée, ces UUID désignent les objets créés sur le personnage, pas
    // ceux du compendium : c'est `CdgActor#grantOrigin` qui les réécrit après les avoir embarqués.
    // Un objet supprimé depuis laisse une entrée vide, filtrée ici plutôt que de casser l'affichage.
    const arcanums = await Promise.all(this.document.system.arcanums.map((uuid) => this.#resolve(uuid)))
    const equipments = await Promise.all(this.document.system.equipments.map((uuid) => this.#resolve(uuid)))
    context.arcanums = arcanums.filter((item) => item)
    context.equipments = equipments.filter((item) => item)

    return context
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)
    this.element.addEventListener("drop", this.#onDrop.bind(this))
    this.element.addEventListener("dragover", (event) => event.preventDefault())
  }

  /**
   * Ajoute un arcanum ou un équipement de départ déposé sur la fiche.
   * @param {DragEvent} event
   */
  async #onDrop(event) {
    if (!this.isEditable) return
    event.preventDefault()

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Item") return

    const item = await Item.implementation.fromDropData(data)
    if (!item) return

    const field = item.type === SYSTEM.ITEM_TYPE.arcanum ? "arcanums" : item.type === SYSTEM.ITEM_TYPE.equipment ? "equipments" : null
    if (!field) return
    if (this.document.system[field].includes(item.uuid)) return

    return this.document.update({ [`system.${field}`]: [...this.document.system[field], item.uuid] })
  }

  /**
   * Ajoute une ligne de compétence de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddSkill(event, target) {
    if (!this.isEditable) return
    // La première compétence non encore listée, pour éviter un doublon dès la création de la ligne.
    const used = new Set(this.document.system.skills.map((entry) => entry.skill))
    const available = Object.keys(SYSTEM.SKILLS).find((skill) => !used.has(skill))
    if (!available) return

    return this.document.update({ "system.skills": [...this.document.system.skills, { skill: available, rank: 1 }] })
  }

  /**
   * Retire une ligne de compétence de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-index`.
   */
  static async #onRemoveSkill(event, target) {
    if (!this.isEditable) return
    const index = parseInt(target.dataset.index)
    if (isNaN(index)) return

    const skills = [...this.document.system.skills]
    skills.splice(index, 1)
    return this.document.update({ "system.skills": skills })
  }

  /**
   * Résout une référence de la carrière, sans jamais lever.
   *
   * Sur une carrière embarquée, la référence vise un objet du personnage : `fromUuidSync` suffit et
   * évite un rendu asynchrone de plus. Ailleurs elle vise un compendium, qu'il faut charger. Dans
   * les deux cas un objet supprimé, ou un UUID devenu illisible, ne vaut pas une erreur — la ligne
   * disparaît simplement de la fiche, et le clic n'ouvre rien.
   * @param {string} uuid
   * @returns {Promise<CdgItem|null>}
   */
  async #resolve(uuid) {
    try {
      return (this.document.parent?.documentName === "Actor" ? fromUuidSync(uuid) : await fromUuid(uuid)) ?? null
    } catch {
      return null
    }
  }

  /**
   * Ouvre la fiche de l'arcanum ou de l'équipement — celle de l'objet du personnage quand la
   * carrière est embarquée. Si l'objet a été supprimé, il n'y a rien à ouvrir et rien à signaler.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`.
   */
  static async #onEditReference(event, target) {
    const item = await this.#resolve(target.dataset.uuid)
    return item?.sheet.render({ force: true })
  }

  /**
   * Retire un arcanum ou un équipement de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-field` et `data-uuid`.
   */
  static async #onRemoveReference(event, target) {
    if (!this.isEditable) return
    const field = target.dataset.field
    const uuid = target.dataset.uuid
    if (!field || !uuid) return

    return this.document.update({ [`system.${field}`]: this.document.system[field].filter((entry) => entry !== uuid) })
  }
}
