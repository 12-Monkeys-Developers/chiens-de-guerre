import Utils from "../helpers/utils.mjs"

/**
 * Socle commun à tous les objets : une description
 */
export default class CdgItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      description: new fields.HTMLField(),
    }
  }

  /** @override */
  prepareDerivedData() {
    this.slug = this.parent.name.slugify({ strict: true })
  }

  /** Une description à montrer, ou seulement le paragraphe vide que laisse un éditeur refermé ? */
  get hasDescription() {
    return Utils.hasText(this.description)
  }
}
