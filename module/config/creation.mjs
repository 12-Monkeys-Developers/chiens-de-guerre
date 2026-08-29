/**
 * Données propres à la création de personnage : les religions et le déroulé des neuf étapes de
 * l'assistant.
 *
 * La religion n'est pas un type d'objet : c'est une liste close que la fiche range dans un champ
 * texte libre (`system.identity.religion`). L'assistant y écrit le libellé traduit, pour que la
 * fiche l'affiche tel quel.
 *
 * L'ascendance, elle, est un vrai type d'objet (`CdgAscendanceData`) : chaque ascendance porte sa
 * propre compulsion fixe (`system.compulsion`/`compulsionDesc`), et son octroi passe par
 * `CdgActor#grantAscendance` — pas de liste close ici.
 */

/** Les trois cultes de l'Escannie, avec leur panthéon, leurs valeurs et leur credo. */
export const RELIGIONS = {
  tyvardisme: {
    id: "tyvardisme",
    label: "CDG.religions.tyvardisme.label",
    gods: "CDG.religions.tyvardisme.gods",
    values: "CDG.religions.tyvardisme.values",
    credo: "CDG.religions.tyvardisme.credo",
  },
  miravisme: {
    id: "miravisme",
    label: "CDG.religions.miravisme.label",
    gods: "CDG.religions.miravisme.gods",
    values: "CDG.religions.miravisme.values",
    credo: "CDG.religions.miravisme.credo",
  },
  caedisme: {
    id: "caedisme",
    label: "CDG.religions.caedisme.label",
    gods: "CDG.religions.caedisme.gods",
    values: "CDG.religions.caedisme.values",
    credo: "CDG.religions.caedisme.credo",
  },
}

/**
 * Le déroulé de l'assistant, dans l'ordre du guide de création.
 *
 * `template` est le nom du gabarit de l'étape, `icon` la pastille du bandeau de progression.
 * L'ordre du tableau fait foi : c'est lui qui numérote les étapes.
 */
export const CREATION_STEPS = [
  { id: "abilities", label: "CDG.creation.steps.abilities", icon: "fa-solid fa-hand-fist" },
  { id: "origine", label: "CDG.creation.steps.origine", icon: "fa-solid fa-place-of-worship" },
  { id: "carriere", label: "CDG.creation.steps.carriere", icon: "fa-solid fa-helmet-battle" },
  { id: "ascendance", label: "CDG.creation.steps.ascendance", icon: "fa-solid fa-eye" },
  { id: "competences", label: "CDG.creation.steps.competences", icon: "fa-solid fa-shield-halved" },
  { id: "traits", label: "CDG.creation.steps.traits", icon: "fa-solid fa-theater-masks" },
  { id: "personnalisation", label: "CDG.creation.steps.personnalisation", icon: "fa-solid fa-scale-balanced" },
  { id: "combat", label: "CDG.creation.steps.combat", icon: "fa-solid fa-swords" },
  { id: "identite", label: "CDG.creation.steps.identite", icon: "fa-solid fa-feather-pointed" },
]
