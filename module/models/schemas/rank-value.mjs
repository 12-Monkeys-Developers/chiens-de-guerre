import { SYSTEM } from "../../config/system.mjs"

/**
 * Un rang de 0 à 3, dessiné sur la fiche par une rangée d'écussons.
 *
 * Sert aux compétences, aux dégâts d'une arme et à la protection d'une armure : partout où la fiche
 * papier imprime trois écussons à noircir.
 */
export class RankValue extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      rank: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0, max: SYSTEM.MAX_RANK }),
    }
  }

  /** Poignée de dés correspondant au rang, par exemple `2d20` au rang 2 (lancée brute, voir `SYSTEM.RANKS`). */
  get formula() {
    return SYSTEM.RANKS[this.rank]?.formula ?? SYSTEM.RANKS[SYSTEM.DEFAULT_RANK].formula
  }
}
