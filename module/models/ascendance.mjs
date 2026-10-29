import CdgItemData from "./item.mjs"

export default class CdgAscendanceData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Ascendance"]

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    // Jusqu'à 4 arcanums candidats, glissés-déposés à l'écriture du compendium ; `arcanumBonus`
    // pointe vers l'UUID de celui effectivement choisi par le joueur, parmi cette liste.
    schema.arcanumChoices = new fields.ArrayField(new fields.DocumentUUIDField())
    schema.arcanumBonus = new fields.StringField({ required: true, blank: true, initial: "" })
    schema.compulsion = new fields.StringField({ required: true, blank: true, initial: "" })
    schema.compulsionDesc = new fields.HTMLField()

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }
}
