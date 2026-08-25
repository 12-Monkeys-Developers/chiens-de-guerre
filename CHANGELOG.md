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
- Trois compendiums de plus, générés par `npm run build:carrieres` depuis `tools/data/` : les
  **15 carrières** (p. 84 à 89), les **22 arcanums** qu'elles accordent et les **25 équipements
  génériques** de leur barda de départ. Déposer une carrière sur un personnage monte ses rangs de
  compétence, lui crée ses arcanums et son équipement, et applique son ajustement de
  caractéristique.
- Les **22 arcanums sont complets** (p. 92 à 109) : description du livre, `linkedSkill` des quatre
  physiques qui bonifient une compétence de la liste, et pour chacun des 13 mystiques les trois
  tours de magie — nom, coût en Esprit par allégeance, et les deux variantes avec leur intitulé.
- Un arcanum mystique **s'active depuis la fiche**, une baguette par rang maîtrisé : le test part
  sur l'Esprit avec la poignée du rang maîtrisé, et l'Esprit n'est débité qu'une fois le jet lancé,
  le seuil se calculant avant la dépense (p. 92).
- `npm run build:carrieres` accepte `--only=<pack>` : reprendre un chapitre du livre n'oblige plus
  à réécrire les trois compendiums, donc à perdre ce qui a été retouché en jeu.
- `tools/build-carrieres.mjs` produit aussi `tools/out/macro-carrieres.js`, une macro autonome qui
  crée les mêmes contenus dans les compendiums d'un monde, sans recompiler les packs du système.
- L'**argent de départ** d'une carrière a désormais son champ, en ducats, au lieu d'une phrase en
  fin de description. La fiche l'affiche à droite de la caractéristique augmentée, et les
  15 carrières du compendium portent le montant du livre — 60 D pour l'émissaire, le maître d'armes
  et l'officier, 30 D pour les douze autres.
- Déposer une carrière **verse cet argent** dans la bourse du personnage, en s'ajoutant à ce qu'elle
  contenait. Le retirer ne le reprend que si la bourse vaut encore exactement le montant versé :
  au-delà, impossible de dire ce qui en venait encore.

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
