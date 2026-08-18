# Chiens de guerre — système Foundry VTT

Système de jeu **Chiens de guerre** pour Foundry Virtual Tabletop (v14).

## État

Première passe : le système est **installable et éditable**. On crée un personnage, on saisit tout ce
que porte la fiche papier (caractéristiques, compétences, traits de personnalité, blessures,
arcanums, équipement, bourse), et ça persiste.

Le moteur de jet (seuil de réussite, poignée de dés par rang) n'est pas encore implémenté : les jets
se font pour l'instant à la main.

## Développement

```bash
npm install
npm run compile    # compile styles/cdg.less → css/cdg.css
npm run watch      # recompile à chaque modification
npx eslint .
```

## Structure

| Répertoire | Rôle |
| --- | --- |
| `module/config/` | Constantes du jeu, agrégées dans l'objet global `SYSTEM` |
| `module/models/` | DataModels Foundry des acteurs, des objets et des schémas partagés |
| `module/documents/` | Classes de documents étendues (`CdgActor`, `CdgItem`, `CdgCombat`) |
| `module/applications/` | Fiches d'acteur et d'objet (ApplicationV2) |
| `module/helpers/` | Utilitaires, helpers Handlebars, réglages |
| `module/elements/` | Composants web personnalisés |
| `templates/` | Gabarits Handlebars |
| `styles/` | Sources LESS, compilées vers `css/cdg.css` |
| `ui/` | Visuels du système (fonds, bannières, logo) |
| `lang/` | Traductions |

Le répertoire `source/` (PDF des règles, fiche de personnage, images extraites) n'est pas versionné :
c'est de la matière première. Les visuels réellement utilisés sont copiés dans `ui/`.

## Crédits

Chiens de guerre est un jeu de rôle écrit par ses auteurs et publié par son éditeur. Ce système est
une implémentation non officielle pour Foundry VTT.

L'organisation du code reprend celle du système
[Chroniques Oubliées 2e édition](https://github.com/BlackBookEditions/foundry-co2).
