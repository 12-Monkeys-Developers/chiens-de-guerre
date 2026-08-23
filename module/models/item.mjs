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
}
