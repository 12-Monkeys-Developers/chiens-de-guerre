/**
 * Malus cumulatif appliqué aux esquives d'un même round : la première est gratuite, chaque esquive
 * supplémentaire coûte 2 points. L'index du tableau est le nombre d'esquives déjà utilisées.
 */
export const DODGE_MALUS = [0, -2, -4, -6, -8]

/** Nombre maximum d'esquives suivies par la fiche (les cases imprimées de 0 à -8). */
export const MAX_TRACKED_DODGES = DODGE_MALUS.length - 1

/** Chaque action entreprise pendant un round retire ce nombre de points d'initiative. */
export const INITIATIVE_ACTION_COST = 10

/** Un personnage ne peut tenter qu'une seule parade (blocage) par round. */
export const MAX_PARRY_PER_ROUND = 1
