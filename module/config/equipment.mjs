/** Sous-types d'équipement. Chacun ouvre les champs qui lui sont propres sur la fiche d'objet. */
export const EQUIPMENT_SUBTYPES = {
  weapon: { id: "weapon", label: "CDG.equipment.subtypes.weapon" },
  armor: { id: "armor", label: "CDG.equipment.subtypes.armor" },
  shield: { id: "shield", label: "CDG.equipment.subtypes.shield" },
  misc: { id: "misc", label: "CDG.equipment.subtypes.misc" },
}

/**
 * Catégories d'armure. La valeur `requiredRank` est le rang exigé dans la compétence Port d'armures
 * pour porter l'armure sans pénalité : en dessous, le malus d'initiative de l'armure est doublé.
 */
export const ARMOR_CATEGORIES = {
  aucune: { id: "aucune", label: "CDG.equipment.armorCategories.aucune", requiredRank: 0, protection: 0, initMalus: 0, price: 0 },
  legere: { id: "legere", label: "CDG.equipment.armorCategories.legere", requiredRank: 1, protection: 1, initMalus: -1, price: 20 },
  moyenne: { id: "moyenne", label: "CDG.equipment.armorCategories.moyenne", requiredRank: 2, protection: 2, initMalus: -3, price: 100 },
  lourde: { id: "lourde", label: "CDG.equipment.armorCategories.lourde", requiredRank: 3, protection: 3, initMalus: -5, price: 300 },
}

/** Catégories descriptives des boucliers. */
export const SHIELD_CATEGORIES = {
  legere: { id: "legere", label: "CDG.equipment.shieldCategories.legere", blockBonus: 2, initMalus: 0, price: 5 },
  lourde: { id: "lourde", label: "CDG.equipment.shieldCategories.lourde", blockBonus: 4, initMalus: -2, price: 10 },
}

/** Catégories descriptives des armes. */
export const WEAPON_CATEGORIES = {
  naturelle: { id: "naturelle", label: "CDG.equipment.weaponCategories.naturelle", ranged: false, damage: 0, ability: "vivacite", skill: "melee", price: 0 },
  legere: { id: "legere", label: "CDG.equipment.weaponCategories.legere", ranged: false, damage: 1, ability: "vivacite", skill: "melee", price: 1 },
  moyenne: { id: "moyenne", label: "CDG.equipment.weaponCategories.moyenne", ranged: false, damage: 2, ability: "vivacite", skill: "melee", price: 10 },
  lourde: { id: "lourde", label: "CDG.equipment.weaponCategories.lourde", ranged: false, damage: 3, ability: "corps", skill: "melee", price: 20 },
  projectileImprovise: {
    id: "projectileImprovise",
    label: "CDG.equipment.weaponCategories.projectileImprovise",
    ranged: true,
    damage: 0,
    ability: "vivacite",
    skill: "tir",
    price: 0,
  },
  tirLegere: { id: "tirLegere", label: "CDG.equipment.weaponCategories.tirLegere", ranged: true, damage: 1, ability: "vivacite", skill: "tir", price: 1 },
  tirMoyenne: { id: "tirMoyenne", label: "CDG.equipment.weaponCategories.tirMoyenne", ranged: true, damage: 2, ability: "vivacite", skill: "tir", price: 10 },
  tirLourde: { id: "tirLourde", label: "CDG.equipment.weaponCategories.tirLourde", ranged: true, damage: 3, ability: "vivacite", skill: "tir", price: 25 },
}

/** Catégories proposées selon le sous-type d'équipement. */
export const EQUIPMENT_CATEGORIES = {
  [EQUIPMENT_SUBTYPES.weapon.id]: WEAPON_CATEGORIES,
  [EQUIPMENT_SUBTYPES.armor.id]: ARMOR_CATEGORIES,
  [EQUIPMENT_SUBTYPES.shield.id]: SHIELD_CATEGORIES,
  [EQUIPMENT_SUBTYPES.misc.id]: {},
}

/**
 * Les deux monnaies. La conversion est stricte : 1 ducat vaut 100 deniers.
 * `inBaseUnit` exprime chaque monnaie en deniers, l'unité de compte interne.
 */
export const CURRENCIES = {
  ducat: { id: "ducat", label: "CDG.currency.ducat", abbreviation: "CDG.currency.ducatShort", inBaseUnit: 100 },
  denier: { id: "denier", label: "CDG.currency.denier", abbreviation: "CDG.currency.denierShort", inBaseUnit: 1 },
}

/** Nombre de deniers dans un ducat. */
export const DENIERS_PER_DUCAT = CURRENCIES.ducat.inBaseUnit
