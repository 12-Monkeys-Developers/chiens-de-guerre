import { SYSTEM } from "../config/system.mjs"
import CdgItemData from "./item.mjs"

/**
 * Un pouvoir surnaturel, noté de 1 à 3.
 *
 * Physique, il est passif et donne +2 par rang sur une compétence ou un aspect du combat désigné
 * par `linkedSkill`. Mystique, il coûte des points d'Esprit et exige un test d'Esprit / Arcanum.
 */
export default class CdgArcanumData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Arcanum"]

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.arcanumType = new fields.StringField({ required: true, blank: false, initial: SYSTEM.ARCANUM_TYPES.physique.id, choices: Object.keys(SYSTEM.ARCANUM_TYPES) })
    schema.rank = new fields.NumberField({
      required: true,
      nullable: false,
      initial: SYSTEM.ARCANUM_MIN_RANK,
      integer: true,
      min: SYSTEM.ARCANUM_MIN_RANK,
      max: SYSTEM.ARCANUM_MAX_RANK,
    })

    schema.rankData = new fields.SchemaField({
      name1 : new fields.StringField({ required: true, blank: false, initial: "Nom_rang1", required: true, nullable: false }),
      effect1: new fields.HTMLField(),
      name2 : new fields.StringField({ required: true, blank: false, initial: "Nom_rang2", required: true, nullable: false }),
      effect2: new fields.HTMLField(),
      name3 : new fields.StringField({ required: true, blank: false, initial: "Nom_rang3", required: true, nullable: false }),
      effect3: new fields.HTMLField(),
    })

    // Arcanum physique : la compétence bonifiée. Vide si l'arcanum agit sur un aspect du combat qui
    // n'est pas une compétence de la liste, auquel cas `effect` le décrit.
    schema.linkedSkill = new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.SKILLS)] })

    // Arcanum mystique : points d'Esprit consommés à l'activation.
    schema.espritCost = new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  get isPassive() {
    return SYSTEM.ARCANUM_TYPES[this.arcanumType]?.passive ?? false
  }

  /** Bonus accordé par un arcanum physique : +2 par rang. Nul pour un arcanum mystique. */
  get bonus() {
    return this.isPassive ? this.rank * SYSTEM.PHYSICAL_BONUS_PER_RANK : 0
  }
}
