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
  legere: { id: "legere", label: "CDG.equipment.armorCategories.legere", requiredRank: 1 },
  moyenne: { id: "moyenne", label: "CDG.equipment.armorCategories.moyenne", requiredRank: 2 },
  lourde: { id: "lourde", label: "CDG.equipment.armorCategories.lourde", requiredRank: 3 },
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
