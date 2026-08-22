# Changelog

## Non publié

### Traits spéciaux et effets actifs

- Les bonus des traits passent désormais par les effets actifs de Foundry V14. Un modèle de données
  maison remplace le modèle `base` du cœur et ajoute à chaque modification un champ `situation`.
- Nouveau type de modification, **Bonus circonstanciel** : il n'écrit rien sur la fiche et vient
  alimenter la liste que le dialogue de jet propose à cocher. C'est ce qui permet de saisir
  « +2 aux tests visant à se montrer charmant » sans que le système l'applique à tort.
- Les bonus permanents s'appliquent réellement : ajustement de caractéristique du peuple, case de
  blessure grave supplémentaire (Ex-immortel), point de Corps regagné en plus au repos (Infatigable),
  vision dans le noir du token (Vision thermographique).
- Une valeur imposée par un effet passe en lecture seule sur la fiche, même en mode édition.
- Les traits spéciaux portent une provenance et un axe de suspicion, et sont regroupés par provenance
  sur la fiche de personnage.
- Les fiches d'objet permettent de créer, modifier, activer et supprimer un effet, avec le résumé de
  ce qu'il fait en clair.

### Compendiums

- Deux compendiums livrés avec le système : les 8 peuples et leurs 17 traits spéciaux, effets
  compris. Sources YAML versionnées dans `src/packs/`, compilées par `npm run YMLtoLDB`.

## 0.1.0

Première version du système.

- Manifeste, chaîne de compilation LESS et arborescence du projet.
- Types d'acteur : personnage, adversaire.
- Types d'objet : équipement (arme / armure / bouclier / divers), arcanum, trait, peuple, carrière.
- Fiche de personnage complète et éditable, reprenant les deux pages de la fiche papier :
  en-tête d'identité, caractéristiques (réserve, maximum, améliorations), 31 compétences,
  17 couples de traits de personnalité, karma et allégeance calculés, jetons de passion,
  initiative, esquives utilisées, blessures, inventaire, bourse, arcanums, langues, expérience.
- Calculs dérivés : totaux vices/vertus, karma, allégeance, cases de blessures selon le rang de
  Vigueur, malus global de blessure, modificateur d'initiative (doublé si le rang de Port d'armures
  est insuffisant), solde mensuelle selon le grade.
- Remise à zéro automatique des esquives et de la parade à la fin de chaque round.
