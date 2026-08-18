import { SYSTEM } from "../config/system.mjs"
import { PoolValue } from "./schemas/pool-value.mjs"
import { RankValue } from "./schemas/rank-value.mjs"

/**
 * Socle commun aux personnages et aux adversaires : les trois caractéristiques, les compétences
 * et les blessures. Tout ce qui relève de la fiche de joueur (traits de personnalité, passion,
 * karma, bourse, expérience) vit dans CdgCharacterData.
 */
export default class CdgActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.abilities = new fields.SchemaField(
      Object.values(SYSTEM.ABILITIES).reduce((obj, ability) => {
        obj[ability.id] = new fields.EmbeddedDataField(PoolValue, { label: ability.label, nullable: false })
        return obj
      }, {}),
    )

    schema.skills = new fields.SchemaField(
      Object.values(SYSTEM.SKILLS).reduce((obj, skill) => {
        obj[skill.id] = new fields.EmbeddedDataField(RankValue, { label: skill.label, nullable: false })
        return obj
      }, {}),
    )

    // Nombre de cases cochées par gravité. Le nombre de cases disponibles est dérivé du rang de
    // Vigueur (cf. prepareDerivedData), il n'est donc pas stocké.
    schema.wounds = new fields.SchemaField(
      Object.values(SYSTEM.WOUND_LEVELS).reduce((obj, level) => {
        obj[level.id] = new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
        })
        return obj
      }, {}),
    )

    return schema
  }

  /** @override */
  prepareDerivedData() {
    this.slug = this.parent.name.slugify({ strict: true })
    this.#prepareWounds()
  }

  /**
   * Calcule le nombre de cases de blessure disponibles à partir du rang de Vigueur, puis le malus
   * global infligé par la blessure la plus grave cochée.
   *
   * Le malus ne se cumule pas d'un niveau à l'autre : seule la gravité la plus élevée compte.
   */
  #prepareWounds() {
    const vigueur = this.skills.vigueur?.rank ?? 0
    const slots = SYSTEM.WOUND_SLOTS_BY_VIGUEUR[vigueur] ?? SYSTEM.WOUND_SLOTS_BY_VIGUEUR[0]

    let worst = null
    for (const level of Object.values(SYSTEM.WOUND_LEVELS)) {
      const wound = this.wounds[level.id]
      wound.max = slots[level.id]
      // Une baisse du rang de Vigueur peut laisser plus de cases cochées que disponibles.
      wound.value = Math.min(wound.value, wound.max)
      if (wound.value > 0 && (worst === null || level.order > worst.order)) worst = level
    }

    this.wounds.worst = worst?.id ?? null
    this.wounds.malus = worst?.malus ?? 0
  }

  /**
   * Le personnage est mourant : une blessure mortelle est cochée. Il doit réussir un test de
   * Corps / Vigueur à chaque round, ou être stabilisé par un allié.
   * @returns {boolean}
   */
  get isDying() {
    return this.wounds.mortelle.value > 0
  }
}
