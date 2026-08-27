import { SYSTEM } from "../../config/system.mjs"

/**
 * Une caractéristique : un maximum, une réserve courante qui se vide en cours de partie, et le
 * nombre d'augmentations déjà achetées en expérience (les trois bulles de la fiche).
 *
 * `value` est la réserve, `max` le plafond. Un jet se fait contre la réserve courante, pas contre
 * le maximum : c'est ce qui rend l'usure du personnage sensible.
 *
 * `max` stocke la base saisie par le joueur, jamais touchée par un effet — `bonus` porte ce que
 * les effets ajoutent. `CdgActorData#prepareDerivedData` les additionne dans `max` à la volée, en
 * gardant la base de côté sous `baseMax` : la fiche édite toujours la base, jamais le total dérivé.
 */
export class PoolValue extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    return {
      max: new fields.NumberField({ required: true, nullable: false, initial: SYSTEM.ABILITY_MIN, integer: true, min: 0 }),
      value: new fields.NumberField({ required: true, nullable: false, initial: SYSTEM.ABILITY_MIN, integer: true, min: 0 }),
      improvements: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0, max: SYSTEM.ABILITY_MAX_IMPROVEMENTS }),
      // Points accordés en plus du maximum saisi par le joueur. Cible d'effet : l'ajustement de
      // caractéristique d'un peuple ou d'une carrière s'ajoute ainsi au Corps, à la Vivacité ou à
      // l'Esprit sans jamais réécrire la base — voir `CdgActorData#prepareDerivedData`.
      bonus: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      bonuses: new fields.SchemaField({
        sheet: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
      }),
      // Points regagnés en plus lors du repos quotidien. Cible d'effet : le trait orque
      // Infatigable ajoute ainsi +1 au seul Corps, sans toucher aux deux autres réserves.
      restBonus: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
    }
  }
}
