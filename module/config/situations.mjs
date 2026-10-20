/**
 * Le type de change qui porte un bonus circonstanciel.
 *
 * Un change de ce type n'écrit jamais rien sur la fiche : il est recueilli pour le dialogue de jet.
 * Le nom doit rester une suite de segments alphanumériques séparés par des points, seule forme
 * qu'accepte la validation du cœur.
 */
export const SITUATIONAL_CHANGE_TYPE = "cdg.situational"

/**
 * Le `key` porté par un change circonstanciel.
 *
 * Il ne désigne aucun champ réel — un bonus circonstanciel vise le seuil de réussite, qui se
 * calcule au moment du jet. La valeur n'a besoin d'être que non vide et stable : le cœur écarte
 * les changes dont le `key` est vide avant même d'appeler le handler.
 */
export const SITUATIONAL_CHANGE_KEY = "system.modifiers.sr"

/**
 * Les situations dans lesquelles un bonus circonstanciel s'applique.
 *
 * Les traits de peuple ne bonifient pas des compétences mais des *intentions* : « se montrer
 * charmant » n'est pas une compétence, c'est ce que le personnage cherche à obtenir. Un même
 * bonus peut donc tomber sur Baratin, Éloquence ou Étiquette selon la scène, et il ne tombe pas
 * dès que l'une de ces compétences est employée à autre chose.
 *
 * D'où la liste close ci-dessous : elle nomme les intentions, pas les compétences. `skills`
 * n'énumère que les compétences par lesquelles l'intention passe le plus souvent, et ne sert
 * qu'à pré-cocher le bonus dans le dialogue de jet. Le dernier mot reste au meneur.
 */
export const SITUATIONS = {
  charme: {
    id: "charme",
    label: "CDG.situations.charme",
    skills: ["baratin", "eloquence", "etiquette", "autorite", "empathie"],
  },
  comedie: {
    id: "comedie",
    label: "CDG.situations.comedie",
    skills: ["baratin", "eloquence", "escamotage"],
  },
  // Le malus social permanent des Elfes putrides : toute interaction, quelle qu'en soit l'intention.
  socialTout: {
    id: "socialTout",
    label: "CDG.situations.socialTout",
    skills: ["baratin", "eloquence", "etiquette", "autorite", "empathie", "commerce"],
  },
  arts: {
    id: "arts",
    label: "CDG.situations.arts",
    skills: ["artsArtisanats", "erudition", "religionsLegendes", "sciencesNaturelles"],
  },
  // Endurer ou persévérer, y compris l'encaissement d'une blessure — qui se joue en Corps / Vigueur.
  endurance: {
    id: "endurance",
    label: "CDG.situations.endurance",
    skills: ["vigueur", "volonte", "athletisme"],
  },
  // Aucune compétence type : la pénombre pénalise selon ce que la scène impose, pas selon le test.
  penombre: {
    id: "penombre",
    label: "CDG.situations.penombre",
    skills: [],
  },
}
