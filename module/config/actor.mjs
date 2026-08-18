/** Image par défaut posée sur un acteur nouvellement créé, par type. */
export const ACTOR_ICONS = {
  character: "icons/environment/people/commoner.webp",
  adversaire: "icons/creatures/abilities/mouth-teeth-human.webp",
}

/** Tailles de créature et échelle du token associée. */
export const SIZES = {
  petite: "CDG.size.petite",
  moyenne: "CDG.size.moyenne",
  grande: "CDG.size.grande",
  enorme: "CDG.size.enorme",
}

export const TOKEN_SIZE = {
  petite: { size: 1, scale: 0.75 },
  moyenne: { size: 1, scale: 1 },
  grande: { size: 2, scale: 1 },
  enorme: { size: 3, scale: 1 },
}
