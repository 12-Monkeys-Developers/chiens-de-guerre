// Configuration
import { SYSTEM } from "./module/config/system.mjs"
globalThis.SYSTEM = SYSTEM

export * as elements from "./module/elements/_module.mjs"

// Import modules
import * as models from "./module/models/_module.mjs"
import * as documents from "./module/documents/_module.mjs"
import * as applications from "./module/applications/_module.mjs"
import * as dice from "./module/dice/_module.mjs"
import * as helpers from "./module/helpers/_module.mjs"

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
    // Raccourci de macro : `game.system.api.roll(actor)` ouvre la fenêtre de test.
    roll: (actor, seed) => applications.CdgRollDialog.open(actor, seed),
  }

  // Jets : la carte d'un test est reconstruite à chaque changement, il faut que le message sache
  // restaurer sa propre classe de jet. On enregistre à la suite, pas en tête : le premier de la
  // liste devient la classe de jet par défaut de toute la partie, y compris pour un `/r 1d6`.
  CONFIG.Dice.rolls.push(dice.CdgRoll)

  // Acteurs
  CONFIG.Actor.documentClass = documents.CdgActor
  CONFIG.Actor.dataModels = {
    character: models.CdgCharacterData,
    adversaire: models.CdgAdversaireData,
  }

  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet)
  foundry.documents.collections.Actors.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgCharacterSheet, { types: ["character"], makeDefault: true, label: "CDG.sheet.character" })
  foundry.documents.collections.Actors.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgAdversaireSheet, {
    types: ["adversaire"],
    makeDefault: true,
    label: "CDG.sheet.adversaire",
  })

  // Objets
  CONFIG.Item.documentClass = documents.CdgItem
  CONFIG.Item.dataModels = {
    equipment: models.CdgEquipmentData,
    arcanum: models.CdgArcanumData,
    feature: models.CdgFeatureData,
    peuple: models.CdgPeupleData,
    carriere: models.CdgCarriereData,
  }

  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet)
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgEquipmentSheet, { types: ["equipment"], makeDefault: true, label: "CDG.sheet.equipment" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgArcanumSheet, { types: ["arcanum"], makeDefault: true, label: "CDG.sheet.arcanum" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgFeatureSheet, { types: ["feature"], makeDefault: true, label: "CDG.sheet.feature" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgPeupleSheet, { types: ["peuple"], makeDefault: true, label: "CDG.sheet.peuple" })
  foundry.documents.collections.Items.registerSheet(SYSTEM.PACKAGE_ID, applications.CdgCarriereSheet, { types: ["carriere"], makeDefault: true, label: "CDG.sheet.carriere" })

  // Combat : la remise à zéro des esquives et de la parade en fin de round vit dans CdgCombat.
  CONFIG.Combat.documentClass = documents.CdgCombat
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 0,
  }

  helpers.registerHandlebarsHelpers()
  helpers.registerSystemSettings()

  console.info(helpers.Utils.log("Initialisé"))
})

Hooks.once("ready", function () {
  const debug = game.settings.get(SYSTEM.PACKAGE_ID, "debugMode")
  CONFIG.debug.cdg = {
    sheets: debug,
    combat: debug,
  }

  console.info(helpers.Utils.log(game.i18n.localize("CDG.notif.ready")))
})

// Les boutons d'une carte de test — choisir son dé, se dépasser — sont branchés à chaque rendu du
// message : le chat réécrit son contenu à la moindre mise à jour.
Hooks.on("renderChatMessageHTML", (message, html) => dice.CdgRoll.activateListeners(message, html))
