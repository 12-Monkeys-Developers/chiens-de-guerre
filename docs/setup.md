# Notes de mise en place

Ce document consigne les choix faits pendant l'amorçage du système, et ce qui reste à trancher.
Il complète le `README.md`, qui décrit l'état courant, et le `CHANGELOG.md`, qui liste les livraisons.

## Choix structurants

- **Organisation reprise de `co2`** : config centralisée dans un objet `SYSTEM`, DataModels Foundry,
  fiches ApplicationV2 + Handlebars, LESS compilé par gulp.
- **Identifiants** : paquet `chiens-de-guerre`, préfixe de code `cdg`, namespace i18n `CDG.`,
  classe CSS racine `.cdg`.
- **Les bonus des traits passent par les effets actifs** (voir la section dédiée plus bas). Les
  arcanums physiques, eux, portent toujours leur `linkedSkill` et leur bonus calculé (+2 par rang)
  sans passer par un effet : c'est le dialogue de jet qui va les chercher directement.
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

## Les traits spéciaux et les effets actifs

Les 33 traits spéciaux accordés par les 8 peuples se rangent en trois régimes, et chacun demande un
traitement différent. C'est l'ossature de l'implémentation, et la raison pour laquelle un seul
mécanisme n'aurait pas suffi.

| Régime | Exemples | Traitement |
| --- | --- | --- |
| **Permanent** | +1 Esprit, Ex-immortel, Infatigable | Un change appliqué automatiquement, en phase `initial` |
| **Circonstanciel chiffré** | Sophistiqué +2, Volonté de fer +1, Mort-vivant végétal −4 | Un change de type `cdg.situational`, **jamais appliqué d'office** |
| **Narratif** | Citoyen supérieur, Apostat, Vision nocturne | Aucun change : une description et un axe de suspicion |

### Pourquoi les circonstanciels ne s'appliquent pas

« +2 aux tests visant à se montrer charmant » ne désigne pas une compétence mais une *intention* :
le même Baratin peut servir à séduire ou à maquiller un inventaire. Le système ne peut donc pas
décider seul, et un bonus circonstanciel qui s'appliquerait d'office serait faux la moitié du temps.

Ces bonus sont donc portés par un **type de change propre au système**, `cdg.situational`, enregistré
dans `CONFIG.ActiveEffect.changeTypes` (`module/documents/active-effect.mjs`). Son `handler` n'écrit
rien sur l'acteur : il empile le bonus dans `actor.system.situationalModifiers`, d'où la fiche le
lit pour l'afficher en pense-bête et le dialogue de jet pour le proposer à cocher — pré-coché quand
la compétence lancée figure parmi celles de la situation, mais toujours décochable.

Le vocabulaire des situations est clos, dans `module/config/situations.mjs`. Il contient une entrée
`penombre` qu'aucun trait livré n'emploie : elle est là pour les traits maison, la Vision nocturne
relevant du jugement du meneur plutôt que d'un modificateur chiffré.

### Les points d'atterrissage des bonus permanents

Un change ne peut viser qu'un champ déclaré dans un schéma. Trois champs existent pour cela :

| Champ | Alimenté par | Lu par |
| --- | --- | --- |
| `system.abilities.<carac>.max` | l'ajustement du peuple | l'affichage, verrouillé via `actor.overrides` |
| `system.abilities.<carac>.restBonus` | Infatigable | `CdgActor#rest()` |
| `system.wounds.<gravité>.bonus` | Ex-immortel | `#prepareWounds` |

Tous ces changes sont en phase **`initial`**, c'est-à-dire appliqués avant `prepareDerivedData` :
les calculs dérivés voient donc déjà la valeur corrigée. La phase **`final`**, qui s'exécute après
`prepareDerivedData`, n'est utilisée par aucun trait — elle est là pour le jour où un effet devra
modifier une valeur elle-même dérivée.

### Deux choix qui méritent d'être rappelés

- **La Vision thermographique pilote le token** (`token.sight.visionMode` → `darkvision`) ; la Vision
  nocturne, non. La règle dit qu'un orque est aveugle dans l'obscurité totale, ce que le mode
  `darkvision` de Foundry contredirait. Un nain de cendres, lui, « voit aussi bien de jour que dans
  l'obscurité totale, sans distinguer les couleurs » : c'est exactement `darkvision`.
- **Versatilité et Industrieux ne peuvent pas être des effets.** Ce sont des règles de création, et
  l'assistant travaille sur un brouillon : aucun acteur n'existe encore, donc aucun effet. Ils sont
  portés par `feature.system.creationGrants`, que l'assistant devra lire — c'est le seul raccord à
  faire quand la branche `creation-personnage` sera fusionnée.

### Le modèle de données

`CdgActiveEffectData` (`module/models/active-effect.mjs`) **remplace le modèle `base` du cœur** au
lieu d'introduire un sous-type : tous les effets partagent la même forme, il n'y a pas de type à
choisir dans l'interface, et rien à déclarer dans `system.json`. Il ajoute un champ `situation` à
chaque change, via `extendFields` — et non en reconstruisant le schéma, ce qui échouerait, un
`SchemaField` refusant tout champ déjà rattaché à un parent.

## Les compendiums

Deux packs livrés avec le système : `peuples` (8 objets) et `traits` (17 objets, les traits partagés
n'étant écrits qu'une fois). Les sources YAML de `src/packs/` sont la référence versionnée ;
`packs/` est un produit de compilation, ignoré par git.

```
npm run YMLtoLDB    # src/packs/ → packs/   (avant de lancer Foundry)
npm run LDBtoYML    # packs/ → src/packs/   (après avoir retouché dans le jeu)
```

Deux pièges :

- **Fermer Foundry avant de compiler.** Un `LEVEL_ITERATOR_NOT_OPEN`, ou un « Permission denied »
  qui n'a pas de sens, signifie que Foundry tourne et verrouille la base. Ne jamais supprimer
  `packs/` pour s'en sortir.
- **Chaque document YAML doit porter son `_key`** : `!items!<id>` pour un objet,
  `!items.effects!<idObjet>.<idEffet>` pour un effet embarqué. Sans lui la CLI ignore le fichier
  **en silence** et produit un compendium vide sans le moindre message.

Les identifiants sont écrits à la main (`cdgtr…` pour un trait, `cdgpe…` pour un peuple) pour que les
UUID d'un peuple vers ses traits restent stables d'une compilation à l'autre.

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
- **L'ajustement de caractéristique d'un peuple est écrit deux fois** : dans
  `peuple.system.abilityBonus`, que l'assistant de création lit pour ses budgets avant qu'aucun
  acteur n'existe, et dans un effet actif qui l'applique en jeu. Les deux sont écrits côte à côte
  dans le même fichier YAML, mais rien ne garantit qu'ils restent d'accord. À revoir à la fusion de
  `creation-personnage` : soit l'assistant apprend à lire l'effet, soit une validation signale
  l'écart sur la fiche de peuple.
- **Le bonus de faction des Tuhéens** : le livre donne « +1 Corps » dans le récapitulatif, le guide
  d'intégration mentionne un choix entre Corps, Vivacité et Esprit selon la faction. Le compendium
  retient +1 Corps.

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
