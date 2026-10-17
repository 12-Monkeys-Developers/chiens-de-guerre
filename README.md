# Chiens de guerre — système Foundry VTT

Système de jeu **Chiens de guerre** pour Foundry Virtual Tabletop.

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

## Crédits

Chiens de guerre est un jeu de rôle écrit par ses auteurs et publié par son éditeur. Ce système est une implémentation non officielle pour Foundry VTT.

<h2>Mentions Légales</h2>

<h2>Communauté</h2>

<p>Rejoignez-nous sur le serveur <a href="https://discord.com/invite/pPSDNJk">Discord francophone dédié à Foundry Virtual Tabletop</a></p>
<p>Nous serons ravis d'avoir vos retours sur le système, des signalements de bug, des idées d'amélioration, ou simplement des encouragements !</p>

<h2>Licences</h2>
<ul>
<li>Le code HTML, CSS et Javascript de ce projet est placé sous <a href="https://choosealicense.com/licenses/gpl-3.0/">licence GNU General Public License v3.0</a></li>

<li>Le support de Foundry VTT est couvert par la licence suivante : <a href="https://foundryvtt.com/article/license/">Accord de licence limitée pour le développement de modules du 17/02/2021</a>.</li>
</ul>