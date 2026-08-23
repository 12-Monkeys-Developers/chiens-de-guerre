import { SYSTEM } from "../config/system.mjs"
import CdgItemData from "./item.mjs"
import { RankValue } from "./schemas/rank-value.mjs"

/**
 * Tout ce qui se porte ou se transporte : armes, armures, boucliers et le reste du barda.
 *
 * Le sous-type détermine les champs qui comptent — dégâts pour une arme, protection et catégorie
 * pour une armure, bonus de blocage pour un bouclier. Les autres restent à zéro et la fiche ne les
 * affiche pas.
 */
export default class CdgEquipmentData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Equipment"]

  static defineSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    schema.subtype = new fields.StringField({ required: true, blank: false, initial: SYSTEM.EQUIPMENT_SUBTYPES.misc.id, choices: Object.keys(SYSTEM.EQUIPMENT_SUBTYPES) })
    schema.equipped = new fields.BooleanField({ required: true, initial: false })
    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 })

    // Arme : les dégâts sont un rang de 0 à 3, comme une compétence — ce sont les dés opposés lors
    // de la résolution des dommages.
    schema.damage = new fields.EmbeddedDataField(RankValue, { nullable: false })
    schema.attack = new fields.SchemaField({
      ability: new fields.StringField({ required: true, blank: false, initial: "vivacite", choices: Object.keys(SYSTEM.ABILITIES) }),
      skill: new fields.StringField({ required: true, blank: false, initial: "melee", choices: Object.keys(SYSTEM.SKILLS) }),
    })

    // La catégorie dépend du sous-type. Pour une armure, elle fixe aussi le rang de Port d'armures
    // exigé ; celles des armes et boucliers sont descriptives à ce stade.
    const categoryIds = [...new Set(Object.values(SYSTEM.EQUIPMENT_CATEGORIES).flatMap((categories) => Object.keys(categories)))]
    schema.category = new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...categoryIds] })

    // Armure : protection en rangs.
    schema.protection = new fields.EmbeddedDataField(RankValue, { nullable: false })

    // Bouclier : bonus aux tests de parade.
    schema.blockBonus = new fields.NumberField({ ...requiredInteger, initial: 0 })

    // Armure comme bouclier ralentissent : malus saisi en négatif, tel qu'il est imprimé.
    schema.initMalus = new fields.NumberField({ ...requiredInteger, initial: 0, max: 0 })

    schema.price = new fields.SchemaField(
      Object.values(SYSTEM.CURRENCIES).reduce((obj, currency) => {
        obj[currency.id] = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 })
        return obj
      }, {}),
    )

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  get isWeapon() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.weapon.id
  }

  get isRangedWeapon() {
    return this.isWeapon && (SYSTEM.WEAPON_CATEGORIES[this.category]?.ranged ?? false)
  }

  get isArmor() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.armor.id
  }

  get isShield() {
    return this.subtype === SYSTEM.EQUIPMENT_SUBTYPES.shield.id
  }

  /** Prix total exprimé en deniers, pour comparer deux objets sans convertir à la main. */
  get priceInDeniers() {
    return Object.values(SYSTEM.CURRENCIES).reduce((total, currency) => total + this.price[currency.id] * currency.inBaseUnit, 0)
  }
}
