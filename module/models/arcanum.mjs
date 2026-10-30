import { SYSTEM } from "../config/system.mjs"
import CdgItemData from "./item.mjs"

/**
 * Le coût en Esprit d'un rang, une valeur par allégeance.
 * @param {Object} fields `foundry.data.fields`
 * @returns {SchemaField}
 */
function costByAllegiance(fields) {
  return new fields.SchemaField(
    Object.values(SYSTEM.ALLEGIANCES).reduce((obj, allegiance) => {
      obj[allegiance.id] = new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 })
      return obj
    }, {}),
  )
}

/**
 * Une variante d'un tour : son intitulé, recopié du livre, et ce qui change pour cette voie.
 * @param {Object} fields `foundry.data.fields`
 * @returns {SchemaField}
 */
function variantSchema(fields) {
  return new fields.SchemaField({
    label: new fields.StringField({ required: true, blank: true, nullable: false, initial: "" }),
    effect: new fields.HTMLField(),
  })
}

/**
 * Le tour d'un rang : nom, coût par allégeance, effet commun et deux variantes.
 * @param {Object} fields `foundry.data.fields`
 * @param {number} rank
 * @returns {SchemaField}
 */
function rankSchema(fields, rank) {
  return new fields.SchemaField({
    name: new fields.StringField({ required: true, blank: false, nullable: false, initial: `Nom_rang${rank}` }),
    cost: costByAllegiance(fields),
    effect: new fields.HTMLField(),
    variants: new fields.SchemaField({ a: variantSchema(fields), b: variantSchema(fields) }),
  })
}

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

    // Chaque rang couvre un tour de magie distinct (p. 92) : son nom, ce qu'il coûte en Esprit — un
    // montant par allégeance, le livre faisant payer l'Obscurité plus cher sur plusieurs pouvoirs —
    // ce que le tour fait, puis ses deux variantes.
    //
    // `effect` porte le texte commun au tour, celui que le livre imprime avant les puces
    // d'allégeance ; les variantes `a` et `b` ne portent que ce qui change d'une voie à l'autre.
    //
    // Les variantes ne sont pas indexées par allégeance : le livre les regroupe librement, tantôt
    // « Lumière / Balance » contre « Obscurité », tantôt « Balance / Obscurité » contre « Lumière ».
    // Leur intitulé est donc du texte, recopié tel qu'il est imprimé.
    //
    // Les rangs sont des sous-schémas nommés `1` à `3`, pas un tableau : un `ArrayField` serait
    // remplacé en entier à chaque mise à jour, et le formulaire, qui ne renvoie que les champs
    // présents, effacerait ceux d'un éditeur fermé ou d'un onglet absent.
    schema.ranks = new fields.SchemaField(Object.fromEntries(Array.from({ length: SYSTEM.ARCANUM_MAX_RANK }, (unused, index) => [index + 1, rankSchema(fields, index + 1)])))

    // Arcanum physique : la compétence bonifiée. Vide si l'arcanum agit sur un aspect du combat qui
    // n'est pas une compétence de la liste, auquel cas `effect` le décrit.
    schema.linkedSkill = new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.SKILLS)] })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  get isPassive() {
    return SYSTEM.ARCANUM_TYPES[this.arcanumType]?.passive ?? false
  }

  /** Bonus accordé par un arcanum physique : +2 par rang. Nul pour un arcanum mystique. */
  get bonus() {
    return this.isPassive ? this.rank * SYSTEM.PHYSICAL_BONUS_PER_RANK : 0
  }

  /**
   * L'allégeance qui fixe les coûts : celle du personnage qui porte l'arcanum.
   *
   * Un arcanum de compendium n'a pas de porteur ; ses coûts sont alors lus en Balance, la voie
   * médiane, plutôt que de n'afficher aucun chiffre sur la fiche de l'objet.
   * @returns {string}
   */
  get allegiance() {
    return this.parent?.parent?.system?.karma?.allegiance ?? SYSTEM.ALLEGIANCES.balance.id
  }

  /**
   * Ce que coûte l'activation d'un rang, pour l'allégeance du porteur.
   * @param {number} rank
   * @returns {number}
   */
  activationCost(rank) {
    return this.ranks[rank]?.cost[this.allegiance] ?? 0
  }

  /**
   * Les tours que le personnage sait lancer : un par rang maîtrisé, du premier au sien.
   *
   * Chaque rang est un pouvoir à part entière, et le personnage garde l'usage des précédents : un
   * pratiquant de rang 2 choisit entre le tour de rang 1 et celui de rang 2, à des coûts distincts.
   * Vide pour un arcanum physique, qui n'a rien à activer.
   * @returns {{rank: number, name: string, cost: number}[]}
   */
  get activations() {
    if (this.isPassive) return []
    return Array.from({ length: this.rank }, (unused, index) => index + 1).map((rank) => ({
      rank,
      name: this.ranks[rank].name,
      cost: this.activationCost(rank),
    }))
  }
}
