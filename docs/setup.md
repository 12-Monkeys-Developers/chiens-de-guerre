# Notes de mise en place

Ce document consigne les choix faits pendant l'amorçage du système, et ce qui reste à trancher.
Il complète le `README.md`, qui décrit l'état courant, et le `CHANGELOG.md`, qui liste les livraisons.

## Choix structurants

- **Organisation reprise de `co2`** : config centralisée dans un objet `SYSTEM`, DataModels Foundry,
  fiches ApplicationV2 + Handlebars, LESS compilé par gulp.
- **Identifiants** : paquet `chiens-de-guerre`, préfixe de code `cdg`, namespace i18n `CDG.`,
  classe CSS racine `.cdg`.
- **Pas de système de modificateurs** : les bonus sont saisis à la main. Les arcanums physiques
  portent leur `linkedSkill` et leur bonus calculé (+2 par rang), mais rien ne les applique
  automatiquement à la compétence — c'est le premier chantier du jour où on branchera les modificateurs.
- **La poignée de dés n'est pas un `kh`/`kl` de Foundry.** Le système est « en dessous », mais le
  meilleur dé n'est ni le plus grand ni le plus petit : c'est le plus grand qui reste sous le seuil,
  puisque la qualité de la réussite est le score du dé. `module/config/ranks.mjs` donne donc `dice`
  (le nombre de d20) et `keep` (`worst` au rang 0, `single` au rang 1, `choice` aux rangs 2 et 3) ;
  la poignée est lancée brute et le dé conservé est désigné après coup — imposé par le système au
  rang 0, choisi par le joueur ensuite. Toute la casuistique de résolution tient dans
  `module/dice/roll-outcome.mjs`, volontairement pur : il n'importe rien de Foundry et se teste
  hors du jeu.
- **Blessures stockées en compteur**, pas en tableau de booléens : `system.wounds.<niveau>.value`
  est le nombre de cases cochées, `max` est dérivé du rang de Vigueur. Un compteur se met à jour
  d'un seul champ, là où un tableau imposerait de réécrire la collection entière à chaque clic.
- **Thème clair uniquement.** Aucun bloc `.theme-dark` ni `prefers-color-scheme`. Toutes les
  couleurs passent par les variables de `styles/palette.less` : ajouter un thème sombre consistera à
  les y redéfinir, sans toucher aux feuilles des fiches.

## Habillage

Les visuels viennent de `source/`, qui n'est pas versionné. Ceux réellement utilisés ont été copiés
et recompressés dans `ui/`, qui l'est :

| `ui/` | Provenance | Emploi |
| --- | --- | --- |
| `parchemin.webp` | page 171 du PDF, image 4 | Fond de toutes les fenêtres du système |
| `banniere.webp` | page 171, image 1 (fond blanc rendu transparent) | Étendard déchiré autour du portrait |
| `bataille-large.webp` | page 173, image 4 | Bandeau d'en-tête de la fiche de personnage, très atténué |
| `bataille-panoramique.webp` | page 171, image 2 | Fond du système à l'écran de configuration |
| `logo_cdg.webp` | découpe du titre de la fiche page 1 | Logo |
| `pause_cdg.webp` | même découpe, plus petite | Écran de pause |

Deux éléments de la fiche papier sont **dessinés en CSS** plutôt qu'extraits en image :

- les **écussons de rang** (`styles/elements/rank-shields.less`), pour rester nets à toute taille ;
- les **bandeaux de titre de section** (`styles/typo.less`), parce que les bandeaux imprimés portent
  leur texte en dur et ne sont donc pas réutilisables comme fond générique.

## À trancher

- **Nombre de cases de blessure** (`WOUND_SLOTS_BY_VIGUEUR` dans `module/config/character.mjs`).
  Le guide d'intégration (§6.A) donne 1 case de chaque, plus les cases accordées par la Vigueur ;
  la fiche imprimée montre 2 légères, 2 graves, 1 mortelle. La table retenue est
  2/1/1 aux rangs 0 et 1, 2/2/1 au rang 2, 3/2/1 au rang 3. À confirmer sur les règles.
- **Traits de personnalité invoqués** : la liste `passion.invokedThisSession` se vide à la main via
  le bouton de l'onglet Personnalité. Il n'existe pas de notion de session dans Foundry sur laquelle
  s'accrocher pour le faire automatiquement.

## Vérifications passées

- `npm run compile` : `css/cdg.css` produit sans erreur LESS.
- `npx eslint .` : aucune erreur. Restent deux avertissements dans
  `module/elements/slide-toggle.mjs`, repris tel quel de co2 (lectures de `offsetHeight` destinées à
  forcer un recalcul de mise en page, que la règle `no-unused-expressions` ne peut pas distinguer).
- Tous les gabarits Handlebars se précompilent.
- Tous les chemins de gabarits référencés dans le code existent, et aucun gabarit n'est orphelin.
- Toutes les clés de traduction employées dans le code et les gabarits existent dans `lang/fr.json`.
- `git status` : rien de `source/` n'est suivi, tout `ui/` l'est.

**Reste à faire : l'essai en jeu.** Rien n'a encore été ouvert dans Foundry.
