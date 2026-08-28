import { ARMOR_CATEGORIES, EQUIPMENT_SUBTYPES, SHIELD_CATEGORIES, WEAPON_CATEGORIES } from "../../module/config/equipment.mjs"

/** Nom affiché et identifiant de chaque catégorie d'arme. `naturelle` n'est pas un objet qu'on porte. */
const WEAPON_ITEMS = {
  legere: { slug: "armeccleg", name: "Arme de corps-à-corps légère", img: "icons/weapons/daggers/dagger-simple.webp" },
  moyenne: { slug: "armeccmoy", name: "Arme de corps-à-corps moyenne", img: "icons/weapons/swords/sword-guard-brass.webp" },
  lourde: { slug: "armecclou", name: "Arme de corps-à-corps lourde", img: "icons/weapons/axes/axe-double-broad.webp" },
  tirLegere: { slug: "armetirleg", name: "Arme de tir légère", img: "icons/weapons/slings/sling-leather-brown.webp" },
  tirMoyenne: { slug: "armetirmoy", name: "Arme de tir moyenne", img: "icons/weapons/bows/shortbow-recurve-brown.webp" },
  tirLourde: { slug: "armetirlou", name: "Arme de tir lourde", img: "icons/weapons/crossbows/crossbow-simple-brown.webp" },
  projectileImprovise: { slug: "projectile", name: "Projectile improvisé", img: "icons/weapons/thrown/rock-stone-grey.webp" },
}

const ARMOR_ITEMS = {
  legere: { slug: "armureleg", name: "Armure légère", img: "icons/equipment/chest/breastplate-leather-brown-belted.webp" },
  moyenne: { slug: "armuremoy", name: "Armure moyenne", img: "icons/equipment/chest/breastplate-scale-grey.webp" },
  lourde: { slug: "armurelou", name: "Armure lourde", img: "icons/equipment/chest/breastplate-collared-steel.webp" },
}

const SHIELD_ITEMS = {
  legere: { slug: "bouclierleg", name: "Bouclier léger", img: "icons/equipment/shield/buckler-wooden-boss-brown.webp" },
  lourde: { slug: "bouclierlou", name: "Bouclier lourd", img: "icons/equipment/shield/heater-steel-boss.webp" },
}

/** Descriptions supplémentaires, là où le livre précise une contrainte d'emploi. */
const WEAPON_NOTES = {
  tirLourde: "<p>Nécessite une action pour recharger.</p>",
}

/** Le matériel nommé en clair par les carrières. Prix inconnus tant que le chapitre équipement manque. */
const GEAR = [
  {
    slug: "paqerudit",
    name: "Paquetage d'érudit",
    img: "icons/sundries/books/book-stack.webp",
    description: "<p>Le nécessaire de celui dont l'outil de travail est le savoir : de quoi lire, écrire et se déplacer avec ses notes.</p>",
  },
  {
    slug: "paqsoldat",
    name: "Paquetage de soldat",
    img: "icons/containers/bags/pack-military-tan.webp",
    description: "<p>Le barda du combattant en campagne : de quoi camper, entretenir son équipement et tenir en ordre de marche.</p>",
  },
  {
    slug: "paqvoyageur",
    name: "Paquetage de voyageur",
    img: "icons/containers/bags/pack-simple-leather.webp",
    description: "<p>Le nécessaire de celui qui vit sur les routes : de quoi camper, s'orienter et subsister loin de toute étape.</p>",
  },
  {
    slug: "outilchirur",
    name: "Outils de chirurgie",
    img: "icons/tools/laboratory/vials-blue-pink.webp",
    description: "<p>Lames, aiguilles, fils et pinces du barbier-chirurgien.</p>",
  },
  {
    slug: "outilbricol",
    name: "Outils de bricolage",
    img: "icons/tools/smithing/hammer-mallet-wood.webp",
    description: "<p>De quoi bâtir, réparer et saper : marteau, scie, ciseaux, clous et cordages.</p>",
  },
  {
    slug: "outilcrocht",
    name: "Outils de crochetage",
    img: "icons/tools/hand/lockpicks-steel-grey.webp",
    description: "<p>Crochets et tendeurs, pour les serrures qu'on n'a pas été invité à ouvrir.</p>",
  },
  {
    slug: "matalchimie",
    name: "Matériel d'alchimie",
    img: "icons/tools/laboratory/alembic-glass-ball-blue.webp",
    description: "<p>Alambic, mortier, fioles et réchaud : de quoi préparer concoctions et élixirs.</p>",
  },
  {
    slug: "matdivinat",
    name: "Matériel de divination",
    img: "icons/sundries/gaming/rune-tiles.webp",
    description: "<p>Au choix du personnage : chapelet, jeu de cartes, pierres runiques, etc.</p>",
  },
  { slug: "cordegrapp", name: "Corde (20 m) et grappin", img: "icons/sundries/survival/rope-coiled-tan.webp", description: "<p>Vingt mètres de corde et son grappin.</p>" },
  { slug: "piedbiche", name: "Pied-de-biche", img: "icons/tools/hand/crowbar-iron-grey.webp", description: "<p>Barre de fer coudée, pour ce qui ne s'ouvre pas autrement.</p>" },
  {
    slug: "annalescomp",
    name: "Annales de la compagnie",
    img: "icons/sundries/books/book-worn-brown.webp",
    description: "<p>Le manuscrit où le chroniqueur consigne les faits et gestes de ses frères d'armes, transmis de chroniqueur en chroniqueur.</p>",
  },
  { slug: "chevalselle", name: "Cheval de selle", img: "icons/environment/creatures/horse-brown.webp", description: "<p>Monture de selle ordinaire.</p>" },
  {
    slug: "garguantsel",
    name: "Garguant de selle",
    img: "icons/environment/creatures/boar.webp",
    description: "<p>Monture de selle des nains, là où les autres peuples montent un cheval.</p>",
  },
]

/**
 * Construit un objet d'équipement d'une catégorie donnée, en reprenant les valeurs de référence de
 * la table correspondante — la même logique que `CdgItem#_preUpdate`, mais appliquée à la création.
 * @param {Object} entry Nom, slug et image de l'objet à produire.
 * @param {string} subtype Sous-type d'équipement.
 * @param {Object} category Ligne de la table de catégories.
 * @param {string} [note] Description supplémentaire.
 * @returns {Object}
 */
function fromCategory(entry, subtype, category, note = "") {
  const item = { ...entry, subtype, category: category.id, description: note, price: { ducat: category.price, denier: 0 } }
  if (subtype === EQUIPMENT_SUBTYPES.weapon.id) {
    item.damage = category.damage
    item.attack = { ability: category.ability, skill: category.skill }
  } else if (subtype === EQUIPMENT_SUBTYPES.armor.id) {
    item.protection = category.protection
    item.initMalus = category.initMalus
  } else if (subtype === EQUIPMENT_SUBTYPES.shield.id) {
    item.blockBonus = category.blockBonus
    item.initMalus = category.initMalus
  }
  return item
}

export const EQUIPEMENTS = [
  ...Object.entries(WEAPON_ITEMS).map(([id, entry]) => fromCategory(entry, EQUIPMENT_SUBTYPES.weapon.id, WEAPON_CATEGORIES[id], WEAPON_NOTES[id])),
  ...Object.entries(ARMOR_ITEMS).map(([id, entry]) => fromCategory(entry, EQUIPMENT_SUBTYPES.armor.id, ARMOR_CATEGORIES[id])),
  ...Object.entries(SHIELD_ITEMS).map(([id, entry]) => fromCategory(entry, EQUIPMENT_SUBTYPES.shield.id, SHIELD_CATEGORIES[id])),
  ...GEAR.map((entry) => ({ ...entry, subtype: EQUIPMENT_SUBTYPES.misc.id, category: "", price: { ducat: 0, denier: 0 } })),
]
