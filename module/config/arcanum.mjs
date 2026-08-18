/**
 * Les deux natures d'arcanum.
 *
 * Un arcanum physique est passif : il donne un bonus constant, de +2 par rang, sur une compétence
 * ou un aspect du combat. Un arcanum mystique est actif : il consomme des points d'Esprit et exige
 * un test d'Esprit / Arcanum pour être déclenché.
 */
export const ARCANUM_TYPES = {
  physique: { id: "physique", label: "CDG.arcanum.types.physique", passive: true },
  mystique: { id: "mystique", label: "CDG.arcanum.types.mystique", passive: false },
}

/** Bonus accordé par rang par un arcanum physique. */
export const PHYSICAL_BONUS_PER_RANK = 2

/** Rangs possibles d'un arcanum : de 1 à 3, contrairement aux compétences qui partent de 0. */
export const ARCANUM_MIN_RANK = 1
export const ARCANUM_MAX_RANK = 3
