import { SYSTEM } from "../config/system.mjs"
import CdgActorData from "./actor.mjs"
import { TraitValue } from "./schemas/trait-value.mjs"

export default class CdgCharacterData extends CdgActorData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Character"]

  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    // En-tête de la fiche. Le surnom est le nom de l'acteur : les mercenaires n'emploient qu'entre
    // eux leur vrai nom, qu'un magicien pourrait retourner contre eux.
    schema.identity = new fields.SchemaField({
      vraiNom: new fields.StringField({ required: true, blank: true }),
      religion: new fields.StringField({ required: true, blank: true }),
      carriere: new fields.StringField({ required: true, blank: true }),
      // La chaîne vide est un choix valide : un personnage fraîchement créé n'a pas encore de grade.
      grade: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.GRADES)] }),
      ascendance: new fields.StringField({ required: true, blank: true }),
      compulsion: new fields.StringField({ required: true, blank: true }),
    })

    schema.traits = new fields.SchemaField(
      Object.values(SYSTEM.TRAIT_PAIRS).reduce((obj, pair) => {
        obj[pair.id] = new fields.EmbeddedDataField(TraitValue, { nullable: false })
        return obj
      }, {}),
    )

    // Jetons de passion. `invokedThisSession` retient les couples déjà invoqués : un même trait ne
    // peut servir qu'une fois par session. La liste est vidée à la main par le joueur ou le MJ.
    schema.passion = new fields.SchemaField({
      tokens: new fields.NumberField({ ...requiredInteger, initial: SYSTEM.BASE_PASSION_TOKENS, min: 0 }),
      invokedThisSession: new fields.ArrayField(new fields.StringField()),
    })

    schema.karma = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      vices: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      virtues: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    })

    schema.combat = new fields.SchemaField({
      initiative: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      dodgesUsed: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: SYSTEM.MAX_TRACKED_DODGES }),
      parryUsed: new fields.BooleanField({ required: true, initial: false }),
    })

    schema.languages = new fields.ArrayField(new fields.StringField())

    // Bloc « Traits spéciaux » de la page 2 : saisie libre, car ces traits viennent du peuple, de
    // la carrière ou de l'Oblitéré qui a apposé la Marque, et n'ont pas de forme commune.
    schema.specialTraits = new fields.HTMLField()

    schema.xp = new fields.SchemaField({
      total: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      spent: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    })

    schema.wealth = new fields.SchemaField(
      Object.values(SYSTEM.CURRENCIES).reduce((obj, currency) => {
        obj[currency.id] = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
        return obj
      }, {}),
    )

    schema.details = new fields.SchemaField({
      size: new fields.StringField({ required: true, blank: false, initial: "moyenne", choices: Object.keys(SYSTEM.SIZES) }),
      biography: new fields.SchemaField({
        private: new fields.HTMLField(),
        public: new fields.HTMLField(),
      }),
      notes: new fields.SchemaField({
        private: new fields.HTMLField(),
        public: new fields.HTMLField(),
      }),
    })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const updates = {
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        sight: { enabled: true, visionMode: "basic" },
      },
    }

    const stats = this.parent._stats
    // Un acteur dupliqué, importé d'un compendium ou réimporté garde son image et son token.
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
    this.#prepareKarma()
    this.#preparePay()
    this.#prepareDodge()
    this.#prepareInitiativeModifier()
    this.#prepareWealth()
    this.#prepareXp()
  }

  /**
   * Totaux des vices et des vertus, karma, puis allégeance.
   *
   * Le karma est la différence vertus moins vices ; l'allégeance est la tranche dans laquelle il
   * tombe : Obscurité jusqu'à -3, Balance entre -2 et 2, Lumière à partir de 3.
   */
  #prepareKarma() {
    let vices = 0
    let virtues = 0
    for (const pair of Object.values(SYSTEM.TRAIT_PAIRS)) {
      const trait = this.traits[pair.id]
      vices += trait.viceValue
      virtues += trait.virtueValue
    }

    this.karma = {
      vices,
      virtues,
      value: virtues - vices,
    }

    // Les tranches sont ordonnées par maximum croissant ; la dernière a un maximum nul et ramasse
    // tout ce qui dépasse.
    const allegiance = Object.values(SYSTEM.ALLEGIANCES).find((a) => a.max === null || this.karma.value <= a.max)
    this.karma.allegiance = allegiance.id
    this.karma.allegianceLabel = allegiance.label
  }

  /** Solde mensuelle, en ducats, déduite du grade. */
  #preparePay() {
    this.identity.pay = SYSTEM.GRADES[this.identity.grade]?.pay ?? 0
  }

  /**
   * Malus de la prochaine esquive du round. La première est gratuite, chaque esquive supplémentaire
   * coûte 2 points de plus que la précédente.
   */
  #prepareDodge() {
    const used = Math.min(this.combat.dodgesUsed, SYSTEM.MAX_TRACKED_DODGES)
    this.combat.dodgeMalus = SYSTEM.DODGE_MALUS[used]
    this.combat.canParry = !this.combat.parryUsed
  }

  /**
   * Modificateur total d'initiative : le bonus saisi sur la fiche, plus les malus de l'armure et du
   * bouclier portés.
   *
   * Règle du port d'armures : si le rang du personnage dans la compétence est inférieur à celui
   * qu'exige la catégorie de l'armure, le malus de cette armure est doublé.
   */
  #prepareInitiativeModifier() {
    const armor = this.parent.armor
    const shield = this.parent.shield

    let armorMalus = 0
    let armorOverloaded = false
    if (armor) {
      const required = SYSTEM.ARMOR_CATEGORIES[armor.system.category]?.requiredRank ?? 0
      armorOverloaded = this.skills.portArmures.rank < required
      armorMalus = armor.system.initMalus * (armorOverloaded ? 2 : 1)
    }

    const shieldMalus = shield ? shield.system.initMalus : 0

    this.combat.armorOverloaded = armorOverloaded
    this.combat.initiative.modifier = this.combat.initiative.bonus + armorMalus + shieldMalus
    this.combat.blockBonus = shield ? shield.system.blockBonus : 0
  }

  /** Fortune totale exprimée en deniers, pour comparer deux bourses sans se tromper de monnaie. */
  #prepareWealth() {
    this.wealth.totalInDeniers = Object.values(SYSTEM.CURRENCIES).reduce((total, currency) => total + this.wealth[currency.id] * currency.inBaseUnit, 0)
  }

  /** Expérience restante. */
  #prepareXp() {
    this.xp.available = this.xp.total - this.xp.spent
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
    data.karma = this.karma.value
    data.blessures = this.wounds.malus
    return data
  }
}
