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

Hooks.once("init", async function () {
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
    // Raccourci de macro : `game.system.api.roll(actor)` ouvre la fenêtre de test.
    roll: (actor, seed) => applications.CdgRollDialog.open(actor, seed),
  }

  // Partiel du corps d'un test, partagé par une carte de test isolé et chaque sous-jet d'une carte
  // de confrontation : il doit être préchargé pour qu'un `{{> "chemin/vers/le/partiel.hbs"}}` le
  // trouve au rendu, `renderTemplate` ne le résolvant pas tout seul depuis un simple chemin.
  await foundry.applications.handlebars.loadTemplates([`${SYSTEM.PATH}/templates/chat/partials/test-body.hbs`])

  // Confrontation de combat : la cible n'étant jamais l'auteure du message d'attaque, elle ne peut
  // pas le mettre à jour elle-même (seuls l'auteur et le Meneur le peuvent) — elle passe par une
  // requête au Meneur actif, sur le même principe que `co2`.
  CONFIG.queries["cdg.updateConfrontation"] = ({ messageId, updateData }) => game.messages.get(messageId)?.update(updateData)
  CONFIG.queries["cdg.applyWound"] = combat.CdgConfrontation.handleApplyWoundQuery

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
  CONFIG.ui.combat = applications.CdgCombatTracker
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

// Même principe pour la carte de confrontation ; les deux hooks ne se marchent pas dessus, chacun
// ignorant les messages qui ne portent pas son propre drapeau.
Hooks.on("renderChatMessageHTML", (message, html) => combat.CdgConfrontation.activateListeners(message, html))

// Et pour le rappel de fin de round d'un personnage mourant.
Hooks.on("renderChatMessageHTML", (message, html) => combat.CdgDyingPrompt.activateListeners(message, html))
