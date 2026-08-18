/**
 * Socle commun à tous les objets : une description et une origine, pour retrouver d'où sort un
 * objet ramassé six séances plus tôt.
 */
export default class CdgItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      description: new fields.HTMLField(),
      origin: new fields.StringField({ required: true, blank: true }),
    }
  }

  /** @override */
  prepareDerivedData() {
    this.slug = this.parent.name.slugify({ strict: true })
  }
}
