import { SYSTEM } from "../config/system.mjs"
import { computeKarma } from "../helpers/rules.mjs"
import CdgActorData from "./actor.mjs"
import { TraitValue } from "./schemas/trait-value.mjs"

export default class CdgCharacterData extends CdgActorData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Character"]

  static SKILLS = SYSTEM.SKILLS

  /** @override */
  static get PROTOTYPE_TOKEN() {
    return { actorLink: true, disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY, sight: { enabled: true, visionMode: "basic" } }
  }

  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    // En-tête de la fiche. Le surnom est le nom de l'acteur : les mercenaires n'emploient qu'entre
    // eux leur vrai nom, qu'un magicien pourrait retourner contre eux.
    schema.identity = new fields.SchemaField({
      vraiNom: new fields.StringField({ required: true, blank: true }),
      religion: new fields.StringField({ required: true, blank: true }),
      // La chaîne vide est un choix valide : un personnage fraîchement créé n'a pas encore de grade.
      grade: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.GRADES)] }),
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

    // Le karma n'est pas stocké : il se déduit des traits à chaque préparation (`#prepareKarma`).

    schema.combat = this.defineCombatSchema()

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
      biography: new fields.HTMLField(),
    })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  /**
   * Le karma ne dépend que des traits stockés : il est calculé dès la préparation de base, car
   * l'application des effets actifs lit `getRollData()` — karma compris — avant la préparation
   * dérivée.
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData()
    this.#prepareKarma()
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData()
    this.#preparePay()
    this.#prepareCombat()
    this.#prepareWealth()
    this.#prepareXp()
  }

  /** Totaux des vices et des vertus, karma, puis allégeance — voir `computeKarma`. */
  #prepareKarma() {
    this.karma = computeKarma(this.traits)
  }

  /** Solde mensuelle, en ducats, déduite du grade. */
  #preparePay() {
    this.identity.pay = SYSTEM.GRADES[this.identity.grade]?.pay ?? 0
  }

  /**
   * Défenses et initiative (voir `CdgActorData#_prepareCombat`), avec la règle du port d'armures :
   * si le rang du personnage dans la compétence est inférieur à celui qu'exige la catégorie de
   * l'armure, le malus de cette armure est doublé.
   */
  #prepareCombat() {
    const armor = this.parent.armor
    const required = armor ? (SYSTEM.ARMOR_CATEGORIES[armor.system.category]?.requiredRank ?? 0) : 0
    this._prepareCombat(!!armor && this.skills.portArmures.rank < required)
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
   * Données exposées aux formules de jet, karma compris.
   * @override
   */
  getRollData() {
    return { ...super.getRollData(), karma: this.karma.value }
  }
}
