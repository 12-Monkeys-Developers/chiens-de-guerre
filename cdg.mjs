// Configuration
import { SYSTEM } from "./module/config/system.mjs"
globalThis.SYSTEM = SYSTEM

export * as elements from "./module/elements/_module.mjs"

// Import modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"
import * as combat from "./module/combat/_module.mjs"
import * as dice from "./module/dice/_module.mjs"
import * as helpers from "./module/helpers/_module.mjs"

// Le hook reste synchrone : le cœur appelle `init` sans l'attendre, si bien que tout ce qui suivrait
// un `await` s'exécuterait après lui — et après l'`init` des modules, qui trouveraient CONFIG vide.
Hooks.once("init", function () {
  console.info(SYSTEM.ASCII)
  console.info(helpers.Utils.log("Initialisation..."))

  game.system.CONST = SYSTEM

  // API du système
  game.system.api = {
    applications,
    models,
    documents,
    helpers,
    dice,
    combat,
    macros: helpers.CdgMacros,
    // Raccourci de macro : `game.system.api.roll(actor)` ouvre la fenêtre de test.
    roll: (actor, seed) => applications.CdgRollDialog.open(actor, seed),
  }

  // Confrontation de combat : le Meneur actif est le seul à écrire la carte partagée, chaque joueur
  // lui confie l'étape qu'il vient de lancer (voir `CdgConfrontation#applyStep`).
  CONFIG.queries["cdg.confrontationStep"] = combat.CdgConfrontation.handleStepQuery
  // Attaque d'un joueur sans cible : les Meneurs en sont avertis par une notification.
  CONFIG.queries["cdg.noTargetWarning"] = combat.CdgConfrontation.handleNoTargetQuery
  // Bataille : comme la confrontation, le Meneur actif est le seul à écrire son état.
  CONFIG.queries["cdg.battleStep"] = combat.CdgBattle.handleStepQuery
  // Passage au round suivant, que seul le Meneur peut écrire.
  CONFIG.queries["cdg.nextRound"] = documents.CdgCombat.handleNextRoundQuery

  // Jets : la carte d'un test est reconstruite à chaque changement, il faut que le message sache
  // restaurer sa propre classe de jet. On enregistre à la suite, pas en tête : le premier de la
  // liste devient la classe de jet par défaut de toute la partie, y compris pour un `/r 1d6`.
  CONFIG.Dice.rolls.push(dice.CdgRoll)

  // Effets actifs. L'enregistrement du type de change doit rester dans `init` : le cœur met en
  // cache la table des types dès le premier accès, et sa fenêtre de configuration écarte
  // silencieusement les changes dont le type lui est inconnu.
  CONFIG.ActiveEffect.documentClass = documents.CdgActiveEffect
  CONFIG.ActiveEffect.dataModels.base = models.CdgActiveEffectData
  documents.CdgActiveEffect.registerChangeTypes()

  // Acteurs
  CONFIG.Actor.documentClass = documents.CdgActor
  CONFIG.Actor.dataModels = {
    character: models.CdgCharacterData,
    adversaire: models.CdgAdversaireData,
    compagnie: models.CdgCompagnieData,
  }

  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet)
  foundry.documents.collections.Actors.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgCharacterSheet, { types: ["character"], makeDefault: true, label: "CDG.sheet.character" })
  foundry.documents.collections.Actors.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgAdversaireSheet, {
    types: ["adversaire"],
    makeDefault: true,
    label: "CDG.sheet.adversaire",
  })
  foundry.documents.collections.Actors.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgCompagnieSheet, {
    types: ["compagnie"],
    makeDefault: true,
    label: "CDG.sheet.compagnie",
  })

  // Objets
  CONFIG.Item.documentClass = documents.CdgItem
  CONFIG.Item.dataModels = {
    equipment: models.CdgEquipmentData,
    arcanum: models.CdgArcanumData,
    ascendance: models.CdgAscendanceData,
    feature: models.CdgFeatureData,
    peuple: models.CdgPeupleData,
    carriere: models.CdgCarriereData,
  }

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet)
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgEquipmentSheet, { types: ["equipment"], makeDefault: true, label: "CDG.sheet.equipment" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgArcanumSheet, { types: ["arcanum"], makeDefault: true, label: "CDG.sheet.arcanum" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgAscendanceSheet, { types: ["ascendance"], makeDefault: true, label: "CDG.sheet.ascendance" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgFeatureSheet, { types: ["feature"], makeDefault: true, label: "CDG.sheet.feature" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgPeupleSheet, { types: ["peuple"], makeDefault: true, label: "CDG.sheet.peuple" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgCarriereSheet, { types: ["carriere"], makeDefault: true, label: "CDG.sheet.carriere" })

  // Combat : la remise à zéro des esquives et de la parade en fin de round vit dans CdgCombat.
  CONFIG.Combat.documentClass = documents.CdgCombat

  // Tchat : le portrait du locuteur dans l'en-tête des messages.
  CONFIG.ChatMessage.documentClass = documents.CdgChatMessage
  CONFIG.ui.combat = applications.CdgCombatTracker
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 0,
  }

  // Onglet du système dans la barre latérale : tableau de bord des joueurs et assistants de
  // création. « Chiens de guerre » désigne des mercenaires, pas des chiens au sens propre : l'onglet
  // porte l'étendard de la compagnie franche. Les épées croisées étaient déjà l'icône du suivi de
  // combat de Foundry, deux onglets plus haut.
  CONFIG.ui.sidebar.TABS.cdg = {
    active: false,
    icon: "fa-solid fa-flag-swallowtail",
    tooltip: SYSTEM.SYSTEM_DESCRIPTION,
  }
  CONFIG.ui.cdg = applications.CdgSidebarMenu

  helpers.registerHandlebarsHelpers()
  helpers.registerSystemSettings()

  // Partiel du corps d'un test, partagé par une carte de test isolé et chaque sous-jet d'une carte
  // de confrontation : il doit être préchargé pour qu'un `{{> "chemin/vers/le/partiel.hbs"}}` le
  // trouve au rendu, `renderTemplate` ne le résolvant pas tout seul depuis un simple chemin. Lancé
  // sans l'attendre, en dernier : il n'en faut le résultat qu'au rendu des cartes, bien après `ready`.
  foundry.applications.handlebars.loadTemplates([`${SYSTEM.PATH}/templates/chat/partials/test-body.hbs`, combat.CdgBattle.TEMPLATES.consequences])

  console.info(helpers.Utils.log("Initialisé"))
})

Hooks.once("ready", function () {
  const debug = game.settings.get(SYSTEM.PACKAGE_ID, "debugMode")
  CONFIG.debug.cdg = {
    sheets: debug,
    combat: debug,
  }

  // Tableau de bord des joueurs : un singleton, jamais ouvert d'office — seul le bouton de la
  // barre latérale le fait apparaître.
  game.system.partySheet = new applications.CdgPartySheet()

  console.info(helpers.Utils.log(game.i18n.localize("CDG.notif.ready")))
})

// Les boutons d'une carte de test — choisir son dé, se dépasser — sont branchés à chaque rendu du
// message : le chat réécrit son contenu à la moindre mise à jour.
Hooks.on("renderChatMessageHTML", (message, html) => dice.CdgRoll.activateListeners(message, html))

// Même principe pour la carte de confrontation ; les deux hooks ne se marchent pas dessus, chacun
// ignorant les messages qui ne portent pas son propre drapeau.
Hooks.on("renderChatMessageHTML", (message, html) => combat.CdgConfrontation.activateListeners(message, html))

// Et pour le rappel de fin de round d'un personnage mourant.
Hooks.on("renderChatMessageHTML", (message, html) => combat.CdgDyingPrompt.activateListeners(message, html))

// Et pour les cartes de bataille (début, conséquences de la phase 2).
Hooks.on("renderChatMessageHTML", (message, html) => combat.CdgBattle.activateListeners(message, html))

// Le Meneur range dans la bataille le résultat de chaque test qui lui est rattaché, y compris après
// un changement de dé conservé ou un dépassement.
Hooks.on("createChatMessage", (message) => combat.CdgBattle.onRollMessage(message))
Hooks.on("updateChatMessage", (message) => combat.CdgBattle.onRollMessage(message))

// Fin d'une escarmouche de bataille : issue notée, jeton et copie de l'adversaire retirés.
Hooks.on("deleteCombat", (combatDocument) => combat.CdgBattle.onDeleteCombat(combatDocument))

// Une compagnie franche ne prend pas part à un combat.
Hooks.on("preCreateCombatant", (combatant) => documents.CdgCombat.onPreCreateCombatant(combatant))

// Les payloads enrichis par les fiches deviennent des macros de jet dans la barre utilisateur.
Hooks.on("hotbarDrop", (bar, data, slot) => {
  if (!data?.cdgMacro) return true
  helpers.CdgMacros.createMacro(data, slot)
  return false
})
