import { SYSTEM } from "../../config/system.mjs"
import CdgMacros from "../../helpers/macros.mjs"
import Utils from "../../helpers/utils.mjs"
import CdgRollDialog from "../roll-dialog.mjs"

const { sheets } = foundry.applications
const { HandlebarsApplicationMixin } = foundry.applications.api
const { DragDrop } = foundry.applications.ux

/**
 * Socle des fiches d'acteur.
 *
 * Reprend de co2 le double mode consultation / édition (l'interrupteur dans la barre de titre), les
 * getters de permission et le glisser-déposer, sans la machinerie de capacités, de voies et
 * d'actions qui n'a pas d'équivalent ici.
 */
export default class CdgBaseActorSheet extends HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /**
   * Les deux modes de la fiche.
   * @enum {number}
   */
  static SHEET_MODES = { EDIT: 0, PLAY: 1 }

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["cdg", "actor"],
    position: {
      width: 860,
      height: 900,
    },
    form: {
      submitOnChange: true,
    },
    window: {
      resizable: true,
    },
    actions: {
      editImage: CdgBaseActorSheet.#onEditImage,
      createItem: CdgBaseActorSheet.#onCreateItem,
      editItem: CdgBaseActorSheet.#onEditItem,
      deleteItem: CdgBaseActorSheet.#onDeleteItem,
      toggleEquipped: CdgBaseActorSheet.#onToggleEquipped,
      setRank: CdgBaseActorSheet.#onSetRank,
      setWound: CdgBaseActorSheet.#onSetWound,
      setDodges: CdgBaseActorSheet.#onSetDodges,
      toggleParry: CdgBaseActorSheet.#onToggleParry,
      toggleDying: CdgBaseActorSheet.#onToggleDying,
      adjustPool: CdgBaseActorSheet.#onAdjustPool,
      toggleLanguage: CdgBaseActorSheet.#onToggleLanguage,
      rest: CdgBaseActorSheet.#onRest,
      rollTest: CdgBaseActorSheet.#onRollTest,
      rollWeapon: CdgBaseActorSheet.#onRollWeapon,
      rollDefense: CdgBaseActorSheet.#onRollDefense,
      rollInitiative: CdgBaseActorSheet.#onRollInitiative,
      rollDamage: CdgBaseActorSheet.#onRollDamage,
      rollSoak: CdgBaseActorSheet.#onRollSoak,
      removeOrigin: CdgBaseActorSheet.#onRemoveOrigin,
      removeAscendance: CdgBaseActorSheet.#onRemoveAscendance,
      activateArcanum: CdgBaseActorSheet.#onActivateArcanum,
    },
  }

  /**
   * Le mode courant de la fiche.
   * @type {number}
   */
  _sheetMode = this.constructor.SHEET_MODES.PLAY

  get isPlayMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.PLAY
  }

  get isEditMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.EDIT
  }

  get isObserver() {
    return this.document.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
  }

  /** Vue limitée : le joueur voit la fiche sans pouvoir la lire en entier. */
  get isLimitedView() {
    return this.isVisible && !this.isObserver && !this.isEditable
  }

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options)

    new DragDrop.implementation({
      dragSelector: ".draggable",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element)

    this._renderModeToggle(this.element)
  }

  /**
   * Ajoute l'interrupteur consultation / édition dans la barre de titre.
   * @param {HTMLElement} element
   */
  _renderModeToggle(element) {
    const header = element.querySelector(".window-header")
    const existing = header.querySelector(".mode-slider")

    if (this.isEditable && !existing) {
      const toggle = document.createElement("cdg-toggle-switch")
      toggle.checked = this.isEditMode
      toggle.classList.add("mode-slider")
      toggle.dataset.tooltip = "CDG.ui.sheetModeEdit"
      toggle.setAttribute("aria-label", game.i18n.localize("CDG.ui.sheetModeEdit"))
      toggle.addEventListener("change", this._onSheetChangeLock.bind(this))
      toggle.addEventListener("dblclick", (event) => event.stopPropagation())
      toggle.addEventListener("pointerdown", (event) => event.stopPropagation())
      header.prepend(toggle)
    } else if (this.isEditable) {
      existing.checked = this.isEditMode
    } else if (existing) {
      existing.remove()
    }
  }

  /**
   * Bascule entre consultation et édition.
   * @param {Event} event
   */
  async _onSheetChangeLock(event) {
    event.preventDefault()
    const toggle = event.currentTarget
    this._sheetMode = toggle.checked ? this.constructor.SHEET_MODES.EDIT : this.constructor.SHEET_MODES.PLAY
    await this.submit()
    this.render()
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.actor = this.document
    context.system = this.document.system
    context.source = this.document.toObject()
    context.fields = this.document.schema.fields
    context.systemFields = this.document.system.schema.fields

    context.unlocked = this.isEditMode
    context.locked = this.isPlayMode
    context.viewLimited = this.isLimitedView
    context.isEditable = this.isEditable

    context.abilities = this.document.system.abilities
    context.skills = this.document.system.skills
    context.wounds = this.document.system.wounds
    context.combat = this.document.system.combat
    context.initiativeModifierTooltip = this._prepareInitiativeModifierTooltip()
    context.canDualWield = this.document.canDualWield
    context.dualWieldInitiativeBonus = this.document.dualWieldInitiativeBonus
    context.abilityMaxTooltips = this._prepareAbilityMaxTooltips()
    context.details = this.document.system.details

    // Constantes utilisées par les gabarits : rangées d'écussons, listes de choix.
    context.SYSTEM = SYSTEM
    context.skillColumns = [1, 2].map((column) => Object.values(SYSTEM.SKILLS).filter((skill) => skill.column === column))
    context.woundLevels = Object.values(SYSTEM.WOUND_LEVELS)

    // Inventaire regroupé par sous-type, dans l'ordre d'affichage de la fiche.
    context.weapons = this.document.weapons
    context.armors = this.document.equipments.filter((item) => item.system.isArmor)
    context.shields = this.document.equipments.filter((item) => item.system.isShield)
    context.gear = this.document.equipments.filter((item) => item.system.subtype === SYSTEM.EQUIPMENT_SUBTYPES.misc.id)
    context.arcanums = this.document.arcanums
    context.features = this.document.features

    // Peuple et carrière ne sont pas de l'inventaire : ils s'affichent sur leur ligne de l'en-tête.
    context.ascendance = this.document.ascendance
    context.peuple = this.document.peuple
    context.carriere = this.document.carriere

    if (CONFIG.debug.cdg?.sheets) console.debug(Utils.log(`${this.constructor.name} - contexte`), context)

    return context
  }

  /**
   * Dit d'où vient le badge de bonus affiché à côté du maximum de chaque caractéristique.
   *
   * Le badge à lui seul ne dit pas d'où il vient : l'ajustement d'une carrière, celui d'un peuple
   * et un effet posé à la main se ressemblent tous une fois appliqués. L'origine qui parle est donc
   * l'objet porteur — « Aumônier (Carrière) », et non le nom de l'effet, qui vaut « Ajustement de
   * caractéristique » sur les quinze carrières.
   * @returns {Record<string, string>} Une info-bulle HTML par caractéristique concernée.
   */
  _prepareAbilityMaxTooltips() {
    const signed = (value) => (value > 0 ? `+${value}` : `${value}`)
    const lines = {}

    for (const effect of this.document.appliedEffects) {
      // Un effet posé à même l'acteur n'a pas d'objet porteur : il donne alors son propre nom.
      const item = effect.parent?.documentName === "Item" ? effect.parent : null
      const origin = foundry.utils.escapeHTML(item?.name ?? effect.name)
      const kind = item ? ` (${game.i18n.localize(`TYPES.Item.${item.type}`)})` : ""

      for (const change of effect.system.changes) {
        const ability = change.key?.match(/^system\.abilities\.(\w+)\.bonus$/)?.[1]
        if (!(ability in this.document.system.abilities)) continue

        const value = Number(change.value)
        // Seul un bonus se signe ; une valeur imposée s'écrit telle quelle, précédée du signe égal.
        const amount = change.type === "add" && Number.isFinite(value) ? signed(value) : `= ${foundry.utils.escapeHTML(String(change.value))}`
        lines[ability] ??= []
        lines[ability].push(`<strong>${amount}</strong> ${origin}${kind}`)
      }
    }

    const header = game.i18n.localize("CDG.ui.abilityBonusSource")
    return Object.fromEntries(Object.entries(lines).map(([ability, sources]) => [ability, `${header}<br>${sources.join("<br>")}`]))
  }

  /**
   * Explique le modificateur avec les mêmes objets et la même règle de surcharge que le modèle.
   *
   * La compagnie franche n'a pas de schéma `combat` (pas d'initiative, ni d'armes) : rien à
   * expliquer, et ses gabarits ne lisent d'ailleurs jamais `initiativeModifierTooltip`.
   * @returns {string|null}
   */
  _prepareInitiativeModifierTooltip() {
    const actor = this.document
    if (!actor.system.combat) return null
    const signed = (value) => (value > 0 ? `+${value}` : `${value}`)
    const lines = [`${game.i18n.localize("CDG.label.long.initiativeBonus")} : <strong>${signed(actor.system.combat.initiative.bonus)}</strong>`]

    if (actor.armor) {
      const multiplier = actor.system.combat.armorOverloaded ? 2 : 1
      const value = actor.armor.system.initMalus * multiplier
      const doubled = multiplier === 2 ? ` ${game.i18n.localize("CDG.combat.initiative.doubledArmor")}` : ""
      lines.push(`${game.i18n.localize("CDG.equipment.subtypes.armor")} — ${foundry.utils.escapeHTML(actor.armor.name)}${doubled} : <strong>${signed(value)}</strong>`)
    }

    if (actor.shield) {
      lines.push(
        `${game.i18n.localize("CDG.equipment.subtypes.shield")} — ${foundry.utils.escapeHTML(actor.shield.name)} : <strong>${signed(actor.shield.system.initMalus)}</strong>`,
      )
    }

    lines.push(`${game.i18n.localize("CDG.combat.initiative.total")} : <strong>${signed(actor.system.combat.initiative.modifier)}</strong>`)
    return `<strong>${game.i18n.localize("CDG.combat.initiative.breakdown")}</strong><br>${lines.join("<br>")}`
  }

  // #region Actions

  /**
   * Choisit l'image de l'acteur.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onEditImage(event, target) {
    if (!this.isEditable) return
    const current = foundry.utils.getProperty(this.document, "img")
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {}
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => this.document.update({ img: path, "prototypeToken.texture.src": path }),
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  /**
   * Crée un objet du type demandé et ouvre sa fiche.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-type`, et `data-subtype` pour un équipement.
   */
  static async #onCreateItem(event, target) {
    if (!this.isEditable) return
    const type = target.dataset.type
    if (!type) return

    const itemData = {
      name: game.i18n.format("CDG.ui.newItem", { type: game.i18n.localize(`TYPES.Item.${type}`) }),
      type,
    }
    if (target.dataset.subtype) itemData.system = { subtype: target.dataset.subtype }

    const [item] = await this.document.createEmbeddedDocuments("Item", [itemData])
    return item?.sheet.render(true)
  }

  /**
   * Ouvre la fiche d'un objet.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-item-id`.
   */
  static async #onEditItem(event, target) {
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    return item?.sheet.render(true)
  }

  /**
   * Supprime un objet, après confirmation.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-item-id`.
   */
  static async #onDeleteItem(event, target) {
    if (!this.isEditable) return
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    if (!item) return

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CDG.ui.deleteItemTitle") },
      content: `<p>${game.i18n.format("CDG.ui.deleteItemContent", { name: foundry.utils.escapeHTML(item.name) })}</p>`,
    })
    if (confirmed) return item.delete()
  }

  /**
   * Équipe ou déséquipe un objet. Une armure ou un bouclier chasse celui qui était porté : les
   * règles n'en prévoient qu'un de chaque, et le calcul du malus d'initiative en dépend.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-item-id`.
   */
  static async #onToggleEquipped(event, target) {
    if (!this.isEditable) return
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    if (!item || item.type !== SYSTEM.ITEM_TYPE.equipment) return

    const equipping = !item.system.equipped
    const exclusive = item.system.isArmor || item.system.isShield

    if (equipping && exclusive) {
      const others = this.document.equipments.filter((other) => other.id !== item.id && other.system.equipped && other.system.subtype === item.system.subtype)
      if (others.length > 0) {
        await this.document.updateEmbeddedDocuments(
          "Item",
          others.map((other) => ({ _id: other.id, "system.equipped": false })),
        )
      }
    }

    return item.update({ "system.equipped": equipping })
  }

  /**
   * Fixe un rang en cliquant sur un écusson. Recliquer sur l'écusson courant redescend d'un cran,
   * ce qui évite d'avoir à passer par le mode édition pour corriger une erreur de saisie.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-target` (le chemin du rang) et `data-rank`.
   */
  static async #onSetRank(event, target) {
    if (!this.isEditable) return
    const path = target.dataset.target
    const clicked = parseInt(target.dataset.rank)
    if (!path || isNaN(clicked)) return

    const current = foundry.utils.getProperty(this.document, path)
    const value = current === clicked ? clicked - 1 : clicked
    return this.document.update({ [path]: Math.max(0, value) })
  }

  /**
   * Coche ou décoche une case de blessure. Même logique que les écussons : recliquer sur la
   * dernière case cochée la libère.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-level` et `data-box` (le rang de la case, à partir de 1).
   */
  static async #onSetWound(event, target) {
    if (!this.isEditable) return
    const level = target.dataset.level
    const box = parseInt(target.dataset.box)
    if (!level || isNaN(box)) return

    const current = this.document.system.wounds[level].value
    const value = current === box ? box - 1 : box
    return this.document.update({ [`system.wounds.${level}.value`]: Math.max(0, value) })
  }

  /**
   * Fixe le nombre d'esquives utilisées dans le round.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-count`.
   */
  static async #onSetDodges(event, target) {
    if (!this.isEditable) return
    const clicked = parseInt(target.dataset.count)
    if (isNaN(clicked)) return

    const current = this.document.system.combat.dodgesUsed
    const value = current === clicked ? clicked - 1 : clicked
    return this.document.update({ "system.combat.dodgesUsed": Math.max(0, value) })
  }

  /**
   * Bascule le drapeau « mourant » — décochable à la main une fois le personnage stabilisé, sans
   * que la case de blessure mortelle elle-même ne soit affectée.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onToggleDying(event, target) {
    if (!this.isEditable) return
    return this.document.update({ "system.wounds.dying": !this.document.system.wounds.dying })
  }

  /**
   * Marque la parade du round comme utilisée, ou la rend.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onToggleParry(event, target) {
    if (!this.isEditable) return
    return this.document.update({ "system.combat.parryUsed": !this.document.system.combat.parryUsed })
  }

  /**
   * Dépense ou rend un point de réserve d'une caractéristique. Clic gauche pour dépenser, clic
   * droit pour rendre — c'est le geste le plus fréquent de la partie, il ne doit pas passer par un
   * champ de saisie.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-ability` et `data-delta`.
   */
  static async #onAdjustPool(event, target) {
    if (!this.isEditable) return
    const ability = target.dataset.ability
    const delta = parseInt(target.dataset.delta)
    if (!ability || isNaN(delta)) return

    const pool = this.document.system.abilities[ability]
    const value = Math.clamp(pool.value + delta, 0, pool.max)
    return this.document.update({ [`system.abilities.${ability}.value`]: value })
  }

  /**
   * Coche ou décoche une langue maîtrisée.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-language`.
   */
  static async #onToggleLanguage(event, target) {
    if (!this.isEditable) return
    const language = target.dataset.language
    if (!language) return

    const known = new Set(this.document.system.languages)
    if (known.has(language)) known.delete(language)
    else known.add(language)

    return this.document.update({ "system.languages": [...known] })
  }

  /**
   * Applique un repos de fin de journée.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-condition`.
   */
  static async #onRest(event, target) {
    if (!this.isEditable) return
    return this.document.rest(target.dataset.condition)
  }

  /**
   * Ouvre la fenêtre de test. Le couple caractéristique / compétence n'est qu'une présélection :
   * cliquer sur une compétence laisse la caractéristique libre, et inversement.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte, ou est contenu dans, un `data-skill` ou un `data-ability`.
   */
  static async #onRollTest(event, target) {
    return CdgMacros.rollTest(target.closest("[data-ability]")?.dataset.ability ?? null, target.closest("[data-skill]")?.dataset.skill ?? null, this.document)
  }

  /**
   * Ouvre la confrontation de combat associée à une arme, contre l'unique cible désignée sur le
   * canevas. `#onRollDefense`/`#onRollDamage`/`#onRollSoak` restent des jets libres, indépendants
   * de toute confrontation, pour un usage hors de ce cycle.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte, ou est contenu dans, un `data-item-id`.
   */
  static async #onRollWeapon(event, target) {
    const weapon = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    if (!weapon?.system.isWeapon) return
    return CdgMacros.rollWeapon(weapon.uuid, weapon.name)
  }

  /**
   * Lance une esquive ou une parade et consomme ensuite la défense correspondante.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollDefense(event, target) {
    return CdgMacros.rollDefense(target.dataset.defense, this.document)
  }

  /** Ouvre l'initiative du combattant correspondant à cette fiche. */
  static async #onRollInitiative() {
    return CdgMacros.rollInitiative(this.document)
  }

  /**
   * Lance Corps / Dégâts avec le rang de l'arme.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollDamage(event, target) {
    const weapon = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    if (!weapon?.system.isWeapon) return
    return CdgMacros.rollDamage(weapon.uuid, weapon.name)
  }

  /**
   * Active un rang d'arcanum mystique : test d'Esprit, puis dépense.
   *
   * Deux rangs différents entrent en jeu, et les confondre fausserait le test. La poignée de dés
   * vient du rang **maîtrisé** dans l'arcanum — l'exemple du livre (p. 92) fait lancer 2d20 à un
   * pratiquant de rang 2 qui déclenche pourtant son tour de rang 1. Le coût, lui, est celui du
   * rang **lancé**.
   *
   * L'Esprit n'est débité qu'après le jet, parce que le seuil de réussite se calcule avant la
   * dépense (p. 92) : le débiter d'abord baisserait le seuil du test qu'il paie.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-rank`, et est contenu dans un `data-item-id`.
   */
  static async #onActivateArcanum(event, target) {
    const arcanum = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    const rank = parseInt(target.dataset.rank)
    if (arcanum?.type !== SYSTEM.ITEM_TYPE.arcanum || arcanum.system.isPassive || !Number.isInteger(rank)) return

    const cost = arcanum.system.activationCost(rank)
    const esprit = this.document.system.abilities.esprit
    const name = arcanum.system.rankData[`name${rank}`]
    if (cost > esprit.value) {
      return ui.notifications.warn(game.i18n.format("CDG.arcanum.notEnoughEsprit", { name, cost, value: esprit.value }))
    }

    return CdgRollDialog.open(this.document, {
      abilityId: "esprit",
      rank: arcanum.system.rank,
      label: game.i18n.format("CDG.arcanum.activationTest", { arcanum: arcanum.name, rank, name }),
      lockedPair: true,
      afterRoll: async () => {
        if (cost <= 0) return
        // La réserve est relue : le jet a pu la faire bouger, un effort d'Esprit par exemple.
        const current = this.document.system.abilities.esprit.value
        await this.document.update({ "system.abilities.esprit.value": Math.max(0, current - cost) })
        ui.notifications.info(game.i18n.format("CDG.arcanum.spent", { name, cost }))
      },
    })
  }

  /** Lance Corps / Protection avec l'armure actuellement portée. */
  static async #onRollSoak() {
    return CdgMacros.rollSoak(this.document)
  }

  /**
   * Retire un peuple ou une carrière, et ce qu'il avait accordé.
   *
   * Distinct de `deleteItem`, qui ne supprimerait que l'objet lui-même et laisserait ses traits
   * orphelins sur la fiche.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte, ou est contenu dans, un `data-item-id`.
   */
  static async #onRemoveOrigin(event, target) {
    if (!this.isEditable) return
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    if (!item) return
    return this.document.revokeOrigin(item)
  }

  static async #onRemoveAscendance(event, target) {
    if (!this.isEditable) return
    const item = this.document.items.get(target.closest("[data-item-id]")?.dataset.itemId)
    if (!item) return
    return this.document.revokeAscendance(item)
  }

  // #endregion

  // #region Glisser-déposer

  _canDragStart() {
    return this.isEditable
  }

  _canDragDrop() {
    return this.isEditable
  }

  /**
   * Démarre le glissement d'un objet de la fiche.
   * @param {DragEvent} event
   */
  _onDragStart(event) {
    const target = event.currentTarget
    const macroType = target.dataset.cdgMacro
    if (macroType === "test") {
      event.dataTransfer.setData(
        "text/plain",
        JSON.stringify({
          type: "cdg.macro",
          cdgMacro: "test",
          // Une compagnie a ses propres caractéristiques et compétences : la macro doit savoir dans
          // quelles tables chercher leur libellé, et viser cette compagnie-là plutôt que l'acteur
          // sélectionné, qui est d'ordinaire le personnage du joueur.
          actorType: this.document.type,
          actorUuid: this.document.type === "compagnie" ? this.document.uuid : null,
          abilityId: target.closest("[data-ability]")?.dataset.ability ?? null,
          skillId: target.closest("[data-skill]")?.dataset.skill ?? null,
        }),
      )
      return
    }
    if (macroType === "defense") {
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "cdg.macro", cdgMacro: "defense", defense: target.dataset.defense }))
      return
    }
    if (macroType === "initiative") {
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "cdg.macro", cdgMacro: "initiative" }))
      return
    }
    if (macroType === "soak") {
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "cdg.macro", cdgMacro: "soak" }))
      return
    }

    const itemId = event.currentTarget.closest("[data-item-id]")?.dataset.itemId
    const item = this.document.items.get(itemId)
    if (!item) return
    const dragData = item.toDragData()
    // Le type Item reste intact afin qu'une arme puisse toujours être déposée sur une autre fiche.
    if (item.system.isWeapon) Object.assign(dragData, { cdgMacro: "weapon", name: item.name, img: item.img })
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData))
  }

  _onDragOver(event) {}

  /**
   * Dépose un objet sur la fiche.
   * @param {DragEvent} event
   */
  async _onDrop(event) {
    if (!this.isEditable) return
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Item") return

    const item = await Item.implementation.fromDropData(data)
    if (!item) return

    // Peuple, carrière, ascendance et équipement ne se déposent qu'en mode édition (écriture) :
    // modifier l'inventaire d'un personnage n'est pas un geste de consultation.
    const dropRequiresEditMode = SYSTEM.ORIGIN_TYPES.includes(item.type) || item.type === SYSTEM.ITEM_TYPE.ascendance || item.type === SYSTEM.ITEM_TYPE.equipment
    if (dropRequiresEditMode && !this.isEditMode) return

    // Réorganisation interne : l'objet appartient déjà à cet acteur, il n'y a rien à copier.
    if (item.parent?.uuid === this.document.uuid) return

    // Une origine ne se copie pas telle quelle : elle accorde aussi ce qu'elle référence.
    if (SYSTEM.ORIGIN_TYPES.includes(item.type)) return this.document.grantOrigin(item)

    if (item.type === SYSTEM.ITEM_TYPE.ascendance) return this.document.grantAscendance(item)

    return this.document.createEmbeddedDocuments("Item", [item.toObject()])
  }

  // #endregion
}
