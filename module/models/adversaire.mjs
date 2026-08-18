import { SYSTEM } from "../config/system.mjs"
import CdgActorData from "./actor.mjs"

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

    schema.combat = new fields.SchemaField({
      initiative: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      dodgesUsed: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: SYSTEM.MAX_TRACKED_DODGES }),
      parryUsed: new fields.BooleanField({ required: true, initial: false }),
    })

    schema.details = new fields.SchemaField({
      size: new fields.StringField({ required: true, blank: false, initial: "moyenne", choices: Object.keys(SYSTEM.SIZES) }),
      // Ce qui tient lieu de fiche de créature : nature, tactique, faiblesses.
      description: new fields.HTMLField(),
      notes: new fields.HTMLField(),
    })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
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

      const size = SYSTEM.TOKEN_SIZE[this.details.size] ?? SYSTEM.TOKEN_SIZE.moyenne
      foundry.utils.mergeObject(updates.prototypeToken, {
        width: size.size,
        height: size.size,
        texture: { scaleX: size.scale, scaleY: size.scale },
      })
    }

    this.parent.updateSource(updates)
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData()

    const used = Math.min(this.combat.dodgesUsed, SYSTEM.MAX_TRACKED_DODGES)
    this.combat.dodgeMalus = SYSTEM.DODGE_MALUS[used]
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
