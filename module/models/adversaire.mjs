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

    schema.combat = new fields.SchemaField({
      initiative: new fields.SchemaField({
        bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      dodgesUsed: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      parryUsed: new fields.BooleanField({ required: true, initial: false }),
    })

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

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const updates = {
      prototypeToken: {
        actorLink: false,
        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE,
      },
    }

    const stats = this.parent._stats
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource) {
      if (!foundry.utils.hasProperty(data, "img")) {
        const img = SYSTEM.ACTOR_ICONS[this.parent.type]
        if (img) updates.img = img
      }
    }

    this.parent.updateSource(updates)
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData()

    this.combat.dodgeMalus = -2 * this.combat.dodgesUsed
    this.combat.canParry = !this.combat.parryUsed

    // Pas de règle de port d'armures ici : un adversaire porte ce que le MJ lui donne.
    const armor = this.parent.armor
    const shield = this.parent.shield
    this.combat.armorOverloaded = false
    this.combat.initiative.modifier = this.combat.initiative.bonus + (armor?.system.initMalus ?? 0) + (shield?.system.initMalus ?? 0)
    this.combat.blockBonus = shield?.system.blockBonus ?? 0
  }

  /**
   * Données exposées aux formules de jet.
   * @returns {Object}
   */
  getRollData() {
    const data = {}
    for (const ability of Object.values(SYSTEM.ABILITIES)) {
      data[ability.id] = this.abilities[ability.id].value
    }
    for (const skill of Object.values(SYSTEM.SKILLS)) {
      data[skill.id] = this.skills[skill.id].rank
    }
    data.blessures = this.wounds.malus
    return data
  }
}
