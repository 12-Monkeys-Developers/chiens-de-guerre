/** Les six types d'objet du système. */
export const ITEM_TYPE = {
  equipment: "equipment",
  arcanum: "arcanum",
  ascendance: "ascendance",
  feature: "feature",
  peuple: "peuple",
  carriere: "carriere",
}

/**
 * Les types d'objet qui décrivent d'où vient un personnage.
 *
 * Ils ne se comportent pas comme le reste de l'inventaire : on n'en porte qu'un de chaque, et les
 * déposer accorde au personnage ce qu'ils référencent — d'où l'aiguillage propre dans le dépôt.
 */
export const ORIGIN_TYPES = [ITEM_TYPE.peuple, ITEM_TYPE.carriere]

/**
 * D'où vient un trait spécial. Sert à regrouper les traits sur la fiche : un joueur cherche
 * « ce que mon peuple me donne », pas une liste à plat.
 */
export const FEATURE_CATEGORIES = {
  origine: { id: "origine", label: "CDG.feature.categories.origine" },
  carriere: { id: "carriere", label: "CDG.feature.categories.carriere" },
  marque: { id: "marque", label: "CDG.feature.categories.marque" },
  autre: { id: "autre", label: "CDG.feature.categories.autre" },
}

/**
 * Le regard que les humains portent sur le porteur du trait.
 *
 * Six traits d'origine ne disent rien d'autre que la facilité avec laquelle on soupçonne le
 * personnage d'être Marqué : Citoyen supérieur d'un côté, Ennemi mortel des hommes de l'autre.
 * Rien n'en est automatisé — c'est au meneur de jouer l'attitude des PNJ. L'échelle existe pour
 * que la fiche l'affiche d'un coup d'œil au lieu de la noyer dans une description.
 */
export const FEATURE_SUSPICIONS = {
  favorable: { id: "favorable", label: "CDG.feature.suspicions.favorable" },
  neutre: { id: "neutre", label: "CDG.feature.suspicions.neutre" },
  defavorable: { id: "defavorable", label: "CDG.feature.suspicions.defavorable" },
  hostile: { id: "hostile", label: "CDG.feature.suspicions.hostile" },
}

/** Image par défaut posée sur un objet nouvellement créé, par type. */
export const ITEM_ICONS = {
  equipment: "icons/containers/bags/pack-leather-brown.webp",
  arcanum: "icons/magic/symbols/runes-star-blue.webp",
  ascendance: "icons/magic/unholy/hand-marked-pink.webp",
  feature: "icons/sundries/scrolls/scroll-plain-tan.webp",
  peuple: "icons/environment/people/group.webp",
  carriere: "icons/skills/trades/smithing-anvil-silver-red.webp",
}
