## 0.7.0

### Guide du système

- Nouveau compendium **Guide du système**, ouvert aux joueurs en lecture : dix pages illustrées de captures d'écran, de l'assistant de création au combat en
  confrontation, en passant par la fiche, les objets, les PNJ, la compagnie franche, les tests, les macros et le tableau de bord du meneur.

### Fiche de personnage

- Le portrait retrouve l'**étendard gris déchiré** de la fiche imprimée.
- Le **nom du personnage** s'écrit à l'encre, en lettres pleines détachées du fond par un halo parchemin, au lieu de lettres claires cernées de noir qui se perdaient dans les éclaboussures.
- Les lignes vides de l'en-tête disent « Déposez un Peuple », « Déposez une Carrière », « Déposez une Ascendance ».
- Le **karma** s'écrit comme les totaux de vices et de vertus qui le précèdent, au lieu de petites capitales.
- Le **repos** de fin de journée quitte l'onglet Équipement pour la fin de l'onglet Combat.
- **Fenêtre de jet** : la liste des compétences s'écrit plus petit ; dépliée, elle ne déborde plus largement de la fenêtre.
- **Fiche de PNJ** : les bandeaux Arcanums et Spécial ne mordent plus la liste des armes.
- **Fiche de PNJ** : le malus courant et l'état « Mourant » s'affichent sous les blessures, sur leur propre ligne, au lieu d'être repoussés hors de vue dans une fenêtre étroite ; sans malus, la ligne n'apparaît pas.
- **Tableau de bord des joueurs** : en thème sombre, le tableau gardait les couleurs grises de Foundry sur le parchemin et ses intitulés s'y perdaient ; il a maintenant le même aspect qu'en thème clair.
- **Création de compagnie** : les compteurs de l'étape Compétences se lisent « Rang 3 : 0 / 5 ».
- **Compagnie** : le grade d'un membre se choisit dans une liste qui suit la hiérarchie de la compagnie (Capitaine, Lieutenant, Sergent, Duplicator, Homme d'armes, Valet, ou aucun) au lieu d'un champ libre.
- **Compagnie** : un acteur glissé sur la fiche n'était accepté que sur le titre ou les lignes d'une liste du roster, et ignoré sans message partout ailleurs.
  Chaque liste couvre désormais toute sa colonne ; lâché ailleurs sur la fiche, un personnage rejoint les personnages joueurs et un adversaire les non joueurs.
  Un acteur déjà présent au roster le signale.
- **Compagnie** : un acteur lié au roster perdait son lien, et son portrait, dès que la fiche passait en mode Écriture puis revenait en Lecture : le formulaire réécrivait la ligne sans lui.
- **Compagnie** : « Délier cet acteur » vidait toute la liste au lieu de délier la seule ligne visée ; les autres lignes, le nom, le grade et les notes de la ligne sont désormais conservés.
- **Combat** : un PNJ dont toutes les cases de blessure mortelle sont cochées est hors de combat. Grisé dans le suivi, il ne prend plus la main et n'a plus
  d'initiative à lancer, au lieu de jouer ses actions inconscient jusqu'à ce que le Meneur le marque vaincu. Décocher une case le ramène dans le round.
- **Carrière** : la fiche de la carrière d'un personnage rangeait parfois un arcanum de départ parmi l'équipement, et inversement (environ une fois sur six, selon l'ordre dans lequel Foundry renvoyait les objets embarqués). Les références sont désormais établies d'après des identifiants fixés avant la création. Un personnage déjà touché garde sa fiche de carrière mélangée.
- **Barre latérale** : l'onglet Chiens de guerre porte un étendard au lieu des épées croisées, qui étaient déjà l'icône du suivi de combat.
- **Guide du système** : les titres calligraphiés sont plus grands, et plus clairs en thème sombre.
- **Thème sombre** : les titres des textes riches (« Lumière / Balance », « Obscurité » des arcanums…) prenaient la couleur claire de Foundry et disparaissaient sur le parchemin ; ils sont désormais à l'encre.

### Personnages prétirés

- Les cinq prétirés (Châtaigne, Fringant, Gueule-de-Caillou, Fêlée, Vérole) ont leur dessin de la fiche du livre : en pied sur la fiche, en buste sur le token (`assets/images/pretires/`).

### Corrections

- **Bestiaire** : 25 PNJ et créatures (Troll, Ogre, Goule, Loup, Ours, Officiers, Archers, Duellistes, Guerriers de choc…) pointaient vers des icônes absentes de Foundry V14 et s'affichaient sans portrait. Elles sont remplacées par des icônes du cœur, dans le générateur comme dans les sources du compendium.
- **Bandeaux calligraphiés** : les bandeaux redessinés étaient déclarés avec les dimensions d'une autre image ; leur lame tombait trop bas et mordait la première ligne de la section (Chroniques et Notes de la compagnie, sections des fiches d'objet). Leur position est désormais calculée sur les dimensions réelles de chaque fichier, et les titres sur deux lignes ont la hauteur qu'il leur faut. Le bandeau « Caractéristiques » ne sort plus de la fiche.
- **Fenêtre d'initiative** : les titres « Initiative » et « Modificateurs » étaient blancs sur le parchemin.
- **Suivi de combat, duel** : le type de duel, le nombre de touches et la case « Duel formel » étaient presque illisibles sur le fond sombre de la barre latérale.
- **Fiche de compagnie** : les noms et les notes des membres ne sont plus coupés (les notes passent sur une seconde ligne), le grade a la place de s'écrire en édition, le nom de la compagnie reste centré en édition, et le « + » des personnages non joueurs n'est plus caché sous son bandeau.
- **Fiche de personnage, mode édition** : l'ascendance ne déborde plus sur les onglets.
- **Assistant de création** : à l'étape 8, le bandeau « Bourse » ne recouvre plus le montant.
- **Personnage mourant** : l'état Mourant (et le statut Inconscient) n'est plus posé dès la première case de blessure mortelle cochée, mais seulement quand elles le sont toutes (p. 46).
- **Jet de survie** : le malus de blessure ne s'applique plus au test de Corps / Vigueur du mourant ; la ligne reste dans la fenêtre de jet, décochée.
- **Combat** : un joueur qui terminait la dernière action du round (ou un échange de duel) ne pouvait pas faire passer au round suivant : les initiatives n'étaient pas remises à zéro. Le passage se fait désormais par le Meneur connecté, en une seule fois.
- **Confrontation** : quand l'attaquant lançait les dégâts et la cible l'encaissement au même moment, l'un des deux jets pouvait disparaître de la carte. Le Meneur connecté écrit désormais chaque étape à la suite, sans en perdre aucune.
- **Ascendance** : un bonus d'arcanum posé sur un arcanum de la carrière lui faisait oublier sa carrière ; retirer la carrière laissait alors l'arcanum sur la fiche. Les deux provenances sont désormais tenues à part. Un personnage déjà touché garde l'ancien lien.
- **Visibilité des jets** : les cartes de test suivent le mode choisi dans le tchat (public, MJ seulement, à l'aveugle, pour soi), qu'elles ignoraient ; un dépassement sort dans le même mode que le jet d'origine. La carte de confrontation reste publique, puisque la cible doit y répondre.
- **Compagnie** : une compétence ou une caractéristique glissée de la fiche de compagnie vers la barre de macros ne créait rien ; la macro est désormais créée, vise cette compagnie et garde le couple imposé.
- **Compagnie** : une compagnie ne peut plus être ajoutée à un combat, où elle n'a ni Vivacité ni initiative.

## 0.6.2

### Fiches

- Le nom d'un personnage est de nouveau éditable, et la longueur est augmentée. Un nom encore trop long se coupe en « … » (le nom complet apparaît en info-bulle) au lieu de passer à la ligne et de repousser le portrait sur les compétences.
- Les compétences ne se déposent dans la hotbar qu'en mode Édition : en lecture, on ne peut plus en saisir une par mégarde en cliquant sur son nom. Les caractéristiques, elles, restent saisissables en permanence.

### Fenêtre de jet

- Le volet **Modificateurs** est déplié à l'ouverture, et le reste : cliquer sur un point d'effort, choisir une passion ou cocher un bonus ne le replie plus.
  Son état est mémorisé par la fenêtre tant qu'elle est ouverte ; s'il est replié à la main, il le reste.

## 0.6.1
- Ajout du répertoire assets dans la release

## 0.6.0

### PNJ et bestiaire

- Le type technique `adversaire` est désormais présenté comme **PNJ / Créature**. Sa fiche reprend le bloc de statistiques du livre : compétences renseignées, Arcanums, équipement et initiative, blessures et règles spéciales sur un même écran.
- En édition, les 31 compétences restent accessibles ; en lecture, seules celles dont le rang est non nul sont affichées.
- La distinction **PNJ majeur** applique la règle d'effort du bestiaire : les autres PNJ ne peuvent investir aucun point de caractéristique.

### Traits spéciaux et effets actifs

- Les bonus des traits passent désormais par les effets actifs de Foundry V14. Un modèle de données maison remplace le modèle `base` du cœur et ajoute à chaque modification un champ `situation`.
- Nouveau type de modification, **Bonus circonstanciel** : il n'écrit rien sur la fiche et vient alimenter la liste que le dialogue de jet propose à cocher.
  C'est ce qui permet de saisir « +2 aux tests visant à se montrer charmant » sans que le système l'applique à tort.
- Les bonus permanents s'appliquent réellement : ajustement de caractéristique du peuple, case de blessure grave supplémentaire (Ex-immortel), point de Corps regagné en plus au repos (Infatigable), vision dans le noir du token (Vision thermographique).
- Une valeur imposée par un effet passe en lecture seule sur la fiche, même en mode édition.
- Les traits spéciaux portent une provenance et un axe de suspicion, et sont regroupés par provenance sur la fiche de personnage.
- Les fiches d'objet permettent de créer, modifier, activer et supprimer un effet, avec le résumé de ce qu'il fait en clair.

### Compendiums

- Deux compendiums livrés avec le système : les **8 peuples** et leurs **17 traits spéciaux**, effets compris.
- Trois compendiums de plus : les **15 carrières**, les **22 arcanums** qu'elles accordent et les **25 équipements génériques** de leur barda de départ. Déposer une carrière sur un personnage monte ses rangs de compétence, lui crée ses arcanums et son équipement, et applique son ajustement de caractéristique.
- Les **22 arcanums sont complets** (p. 92 à 109) : description du livre, `linkedSkill` des quatre physiques qui bonifient une compétence de la liste, et pour chacun des 13 mystiques les trois tours de magie — nom, coût en Esprit par allégeance, et les deux variantes avec leur intitulé.
- Un arcanum mystique **s'active depuis la fiche**, une baguette par rang maîtrisé : le test part sur l'Esprit avec la poignée du rang maîtrisé, et l'Esprit n'est débité qu'une fois le jet lancé, le seuil se calculant avant la dépense (p. 92).
- L'**argent de départ** d'une carrière a désormais son champ, en ducats, au lieu d'une phrase en fin de description. La fiche l'affiche à droite de la caractéristique augmentée, et les 15 carrières du compendium portent le montant du livre — 60 D pour l'émissaire, le maître d'armes et l'officier, 30 D pour les douze autres.
- Déposer une carrière **verse cet argent** dans la bourse du personnage, en s'ajoutant à ce qu'elle contenait. Le retirer ne le reprend que si la bourse vaut encore exactement le montant versé : au-delà, impossible de dire ce qui en venait encore.

## 0.1.0

Première version du système.

- Manifeste, chaîne de compilation LESS et arborescence du projet.
- Types d'acteur : personnage, adversaire.
- Types d'objet : équipement (arme / armure / bouclier / divers), arcanum, trait, peuple, carrière.
- Fiche de personnage complète et éditable, reprenant les deux pages de la fiche papier : en-tête d'identité, caractéristiques (réserve, maximum, améliorations), 31 compétences, 17 couples de traits de personnalité, karma et allégeance calculés, jetons de passion, initiative, esquives utilisées, blessures, inventaire, bourse, arcanums, langues, expérience.
- Calculs dérivés : totaux vices/vertus, karma, allégeance, cases de blessures selon le rang de Vigueur, malus global de blessure, modificateur d'initiative   (doublé si le rang de Port d'armures est insuffisant), solde mensuelle selon le grade.
- Remise à zéro automatique des esquives et de la parade à la fin de chaque round.
