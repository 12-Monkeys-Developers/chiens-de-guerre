import { SYSTEM } from "../config/system.mjs"
import CdgItemData from "./item.mjs"

/**
 * Le peuple d'origine : Aduatons, Tolèniens, Darguanites, Tuhéens...
 *
 * Il fixe l'ajustement de caractéristique, les traits spéciaux et les langues de départ. Déposé sur
 * un personnage, il lui accorde ses traits et ses langues (`CdgActor#grantOrigin`) ; l'ajustement
 * passe par l'effet actif qu'il porte, `abilityBonus` n'étant qu'un mémo pour l'assistant de création.
 */
export default class CdgPeupleData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Peuple"]

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    // Caractéristique augmentée de +1 par le peuple. Les Tuhéens la choisissent selon leur faction,
    // d'où la chaîne vide.
    schema.abilityBonus = new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.ABILITIES)] })

    // Traits accordés : UUIDs d'objets de type `feature`.
    schema.features = new fields.ArrayField(new fields.DocumentUUIDField())

    schema.languages = new fields.ArrayField(new fields.StringField({ choices: Object.keys(SYSTEM.LANGUAGES) }))

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }
}
