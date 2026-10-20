import { SYSTEM } from "../../config/system.mjs"

/**
 * Un couple de traits de personnalité opposés.
 *
 * Un seul des deux traits est dominant et porte une valeur de 1 à 3 ; l'autre est inhibé et vaut 0.
 * `dominant` vaut donc `vice`, `virtue`, ou `null` tant que le joueur n'a pas tranché — il n'y a
 * pas de score neutre dans les règles, mais un personnage en cours de création peut n'avoir rien
 * choisi.
 */
export class TraitValue extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      dominant: new fields.StringField({
        required: true,
        nullable: true,
        initial: null,
        blank: false,
        choices: Object.keys(SYSTEM.TRAIT_SIDES),
      }),
      value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0, max: 3 }),
    }
  }
}
