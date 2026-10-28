import { SYSTEM } from "../config/system.mjs"
import CdgActorData from "./actor.mjs"

const DEFAULT_WOUND_SLOTS = { legere: 2, grave: 1, mortelle: 1 }

/**
 * Adversaire : caractéristiques, compétences et blessures, sans la comptabilité du personnage
 * joueur (traits de personnalité, karma, passion, expérience, bourse).
 *
 * Volontairement pauvre à ce stade — il partage la fiche du personnage, dans une version allégée.
 */
export default class CdgAdversaireData extends CdgActorData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Adversaire"]

  /** @override */
  static SKILLS = SYSTEM.SKILLS

  /** @override */
  static get PROTOTYPE_TOKEN() {
    return { actorLink: false, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE }
  }

  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    schema.major = new fields.BooleanField({ required: true, nullable: false, initial: false })

    schema.woundSlots = new fields.SchemaField(
      Object.values(SYSTEM.WOUND_LEVELS).reduce((obj, level) => {
        obj[level.id] = new fields.NumberField({ ...requiredInteger, initial: DEFAULT_WOUND_SLOTS[level.id], min: 0 })
        return obj
      }, {}),
    )

    schema.combat = this.defineCombatSchema()

    schema.details = new fields.SchemaField({
      // Ce qui tient lieu de fiche de créature : nature, tactique, faiblesses.
      description: new fields.HTMLField(),
      special: new fields.HTMLField(),
      notes: new fields.HTMLField(),
    })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  /** @override */
  _getWoundSlots() {
    return this.woundSlots
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData()
    // Pas de règle de port d'armures ici : un adversaire porte ce que le MJ lui donne.
    this._prepareCombat()
  }
}
