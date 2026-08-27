import { SYSTEM } from "../config/system.mjs"
import CdgItemData from "./item.mjs"

export default class CdgAscendanceData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Ascendance"]

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.arcanumBonus = new fields.StringField({ required: true, blank: true, initial: ""})
    schema.compulsion = new fields.StringField({ required: true, blank: true, initial: ""})
    schema.compulsionDesc =  new fields.HTMLField()

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }
}
