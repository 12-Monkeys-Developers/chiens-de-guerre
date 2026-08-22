import { SYSTEM } from "../config/system.mjs"
import CdgItemData from "./item.mjs"

/**
 * Un trait spécial : trait de peuple (Industrieux, Volonté de fer, Infatigable...), don de la
 * carrière, ou particularité accordée par le MJ.
 *
 * Ce que le trait *fait* vit dans ses effets actifs, pas ici : un bonus permanent est un change
 * appliqué en phase `initial`, un bonus circonstanciel un change de type `cdg.situational` que le
 * dialogue de jet proposera. Le modèle ne porte donc que ce qu'aucun effet ne sait exprimer —
 * d'où vient le trait, le regard qu'il attire, et ce qu'il accorde à la création.
 */
export default class CdgFeatureData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Feature"]

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.category = new fields.StringField({
      required: true,
      blank: false,
      initial: SYSTEM.FEATURE_CATEGORIES.origine.id,
      choices: Object.keys(SYSTEM.FEATURE_CATEGORIES),
    })

    schema.suspicion = new fields.StringField({
      required: true,
      blank: false,
      initial: SYSTEM.FEATURE_SUSPICIONS.neutre.id,
      choices: Object.keys(SYSTEM.FEATURE_SUSPICIONS),
    })

    // Ce que le trait accorde au moment de la création, et qu'aucun effet actif ne peut porter :
    // l'assistant travaille sur un brouillon, pas sur un acteur, donc aucun effet n'existe encore.
    // Versatilité accorde ainsi 2 points de personnalisation, Industrieux 2 compétences au rang 1.
    schema.creationGrants = new fields.SchemaField({
      customizationPoints: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
      freeSkillRanks: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
    })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  /** Le trait pèse-t-il sur l'attitude des humains ? Sert à n'afficher le badge que s'il dit quelque chose. */
  get hasSuspicion() {
    return this.suspicion !== SYSTEM.FEATURE_SUSPICIONS.neutre.id
  }
}
