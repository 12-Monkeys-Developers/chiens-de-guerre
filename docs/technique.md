# Notes techniques

## Active Effects

Un **Active Effect** est un document attaché à un acteur, ou à un objet porté par un acteur. Il contient une liste de **changes**. Chaque change vise une propriété de l'acteur (`system.abilities.corps.bonus`, par exemple) et la modifie : ajout, multiplication, remplacement, etc.

Ces changes s'appliquent pendant la préparation des données de l'acteur. Rien n'est écrit en dur dans les données d'origine : quand on retire l'objet ou qu'on désactive l'effet, le bonus disparaît. Foundry s'en sert aussi pour les états affichés sur les jetons (étourdi, à terre…), avec une durée possible.

Tous les Active Effects du système sont dans les compendiums : **31 effets** au total, sur 15 carrières, 8 peuples et 8 traits. Aucun n'est porté par une ascendance, un arcanum, un équipement ou un PNJ.

### Données des compendiums

#### Carrières : ajustement de caractéristique (15 effets)

Chaque effet s'appelle « Ajustement de caractéristique » et ajoute +1 à `system.abilities.<x>.bonus`.

| Caractéristique | Carrières |
|---|---|
| **Esprit** | Aumônier, Barbier-chirurgien, Chroniqueur, Devin, Enchanteur, Ingénieur de bataille, Nécromant, Émissaire |
| **Vivacité** | Détrousseur, Maître d'armes, Tireur d'élite, Éclaireur |
| **Corps** | Fantassin lourd, Officier, Troupe de choc |

#### Peuples : ajustement de caractéristique (8 effets)

Même mécanisme : +1 à `system.abilities.<x>.bonus`.

| Caractéristique | Peuples |
|---|---|
| **Esprit** | Aduaton, Darguanite, Escannien |
| **Vivacité** | Elfe putride, Tolènien |
| **Corps** | Nain de cendres, Orque, Tuhéen |

#### Traits (8 effets)

| Trait | Change | Effet |
|---|---|---|
| Ex-immortel | `add system.wounds.grave.bonus 1` | une case de blessure grave en plus |
| Infatigable | `add system.abilities.corps.restBonus 1` | +1 Corps récupéré au repos |
| Vision thermographique | `override token.sight.visionMode darkvision` | vision dans le noir du jeton |
| Raffiné | `cdg.situational +2` | situation `arts` |
| Sophistiqué | `cdg.situational +2` | situation `charme` |
| Théâtral | `cdg.situational +2` | situation `comedie` |
| Volonté de fer | `cdg.situational +1` | situation `endurance` |
| Mort-vivant végétal | `cdg.situational −4` | situation `socialTout` |

### Code du système

**Modèle et document**

- `cdg.mjs` : branche `CdgActiveEffect` et `CdgActiveEffectData`, puis enregistre le type de change `cdg.situational`.
- `module/models/active-effect.mjs` :
  - ajoute un champ `situation` à chaque change ;
  - `prepareBaseData` donne une clé par défaut aux changes circonstanciels, que le cœur ignorerait sinon ;
  - `isSuppressed` neutralise l'effet d'un **équipement non équipé**. Ce mécanisme existe, mais aucun équipement du compendium n'a d'effet pour l'instant.
- `module/documents/active-effect.mjs` : le gestionnaire du type `cdg.situational` empile le bonus dans `system.situationalModifiers` sans rien écrire sur l'acteur. Il remplace aussi la ligne de saisie de la fenêtre de configuration (valeur et situation, sans chemin de propriété).

**Effets des changes**

- `module/models/actor.mjs` : `ability.max = baseMax + bonus`, pour les ajustements des peuples et des carrières.
- `module/models/actor.mjs` : `wound.max = slots + bonus`, pour Ex-immortel.
- `module/documents/actor.mjs` : `restBonus` s'ajoute à la récupération au repos, pour Infatigable.
- `module/applications/roll-dialog.mjs` : la fenêtre de jet propose les bonus circonstanciels, pré-cochés si la compétence lancée correspond à la situation.
- `module/applications/sheets/character-sheet.mjs` : la fiche de personnage liste ces bonus circonstanciels.

**Lecture et affichage**

- `module/applications/sheets/base-actor-sheet.mjs` (`_prepareAbilityMaxTooltips`) : infobulle de chaque caractéristique, avec l'origine de chaque bonus, par exemple « +1 Aumônier (Carrière) ».
- `module/documents/actor.mjs` (`grantOrigin`) : n'applique **pas** `system.abilityBonus`, puisque l'effet transféré s'en charge déjà. Le lire doublerait le bonus.
- `module/applications/character-creation.mjs` (`#projectCreationEffects`) : l'assistant projette les bonus de blessures des traits pour son aperçu.
- `module/applications/character-creation.mjs` (`#originWarnings`) : l'assistant avertit si un peuple ou une carrière a un mémo `abilityBonus` sans l'effet correspondant.

**Édition**

- `module/applications/sheets/base-item-sheet.mjs` : section des effets sur les fiches d'objet, avec création (`transfer: true` imposé), ouverture, activation et suppression.

**Statuts du cœur**, qui sont aussi des Active Effects

- `module/models/actor.mjs` : « inconscient » est posé ou retiré quand toutes les cases de blessure mortelle sont cochées ou décochées.
- `module/combat/dying-prompt.mjs` : « mort » est posé quand le personnage meurt.
