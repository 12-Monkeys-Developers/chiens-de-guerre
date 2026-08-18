import { SYSTEM } from "../../config/system.mjs"

/**
 * Une caractéristique : un maximum, une réserve courante qui se vide en cours de partie, et le
 * nombre d'augmentations déjà achetées en expérience (les trois bulles de la fiche).
 *
 * `value` est la réserve, `max` le plafond. Un jet se fait contre la réserve courante, pas contre
 * le maximum : c'est ce qui rend l'usure du personnage sensible.
 */
export class PoolValue extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      max: new fields.NumberField({ required: true, nullable: false, initial: SYSTEM.ABILITY_MIN, integer: true, min: 0 }),
      value: new fields.NumberField({ required: true, nullable: false, initial: SYSTEM.ABILITY_MIN, integer: true, min: 0 }),
      improvements: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0, max: SYSTEM.ABILITY_MAX_IMPROVEMENTS }),
      bonuses: new fields.SchemaField({
        sheet: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      }),
    }
  }
}
