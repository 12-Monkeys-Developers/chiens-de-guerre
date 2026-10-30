import CdgInitiativeDialog from "../applications/initiative-dialog.mjs"
import { SYSTEM } from "../config/system.mjs"
import CdgBattle from "../combat/battle.mjs"
import CdgDyingPrompt from "../combat/dying-prompt.mjs"
import { askActiveGM } from "../helpers/gm-writer.mjs"
import Utils from "../helpers/utils.mjs"

/** Combat Foundry adapté aux cadences d'escarmouche et de duel. */
export default class CdgCombat extends Combat {
  get cdgMode() {
    const mode = this.getFlag(SYSTEM.PACKAGE_ID, "mode")
    return SYSTEM.COMBAT_MODES[mode] ? mode : SYSTEM.COMBAT_MODES.skirmish.id
  }

  get duelSettings() {
    const type = this.getFlag(SYSTEM.PACKAGE_ID, "duel.type")
    const target = Number(this.getFlag(SYSTEM.PACKAGE_ID, "duel.target"))
    return {
      type: SYSTEM.DUEL_TYPES[type] ? type : SYSTEM.DUEL_TYPES.plaisance.id,
      target: SYSTEM.DUEL_TOUCH_TARGETS.includes(target) ? target : 1,
      formal: this.getFlag(SYSTEM.PACKAGE_ID, "duel.formal") !== false,
      attackerOverride: this.getFlag(SYSTEM.PACKAGE_ID, "duel.attackerOverride") ?? null,
    }
  }

  /**
   * Un combattant hors de combat ne compte plus pour l'initiative du round et ne prend plus la main :
   * vaincu (marqué par le Meneur), ou adversaire dont toutes les cases de blessure mortelle sont
   * cochées — inconscient, il ne se relèvera pas de lui-même, et le rappel de survie ne vaut que
   * pour les personnages des joueurs. Décocher une case le fait revenir dans le round.
   * @param {Combatant} combatant
   * @returns {boolean}
   */
  static isOut(combatant) {
    if (combatant.isDefeated) return true
    const actor = combatant.actor
    return actor?.type === "adversaire" && !!actor.system.isDying
  }

  /**
   * Une compagnie franche n'a ni Vivacité ni initiative : elle ne prend pas part à un combat, et la
   * fenêtre d'initiative n'aurait rien à lui faire lancer. Branché sur `preCreateCombatant`.
   * @param {Combatant} combatant
   * @returns {boolean|void} `false` pour empêcher la création.
   */
  static onPreCreateCombatant(combatant) {
    if (combatant.actor?.type !== "compagnie") return
    ui.notifications.warn(game.i18n.format("CDG.combat.companyCannotFight", { name: combatant.actor.name }))
    return false
  }

  get activeCombatants() {
    return this.combatants.filter((combatant) => !this.constructor.isOut(combatant))
  }

  get duelists() {
    const combatants = this.activeCombatants
    return combatants.length === 2 ? combatants : []
  }

  get initiativesReady() {
    const combatants = this.cdgMode === SYSTEM.COMBAT_MODES.duel.id ? this.duelists : this.activeCombatants
    return combatants.length > 0 && combatants.every((combatant) => Number.isFinite(combatant.initiative))
  }

  get duelAttackerId() {
    if (!this.initiativesReady || this.duelists.length !== 2) return null
    const [first, second] = this.duelists
    if (first.initiative === second.initiative) return this.duelSettings.attackerOverride
    return first.initiative > second.initiative ? first.id : second.id
  }

  get duelTied() {
    return this.initiativesReady && this.duelists[0]?.initiative === this.duelists[1]?.initiative && !this.duelAttackerId
  }

  touchesFor(combatant) {
    return Number(combatant?.getFlag(SYSTEM.PACKAGE_ID, "duelTouches")) || 0
  }

  async setCdgMode(mode) {
    if (this.started) {
      ui.notifications.warn("CDG.combat.modeLocked", { localize: true })
      return this
    }
    if (!SYSTEM.COMBAT_MODES[mode] || mode === this.cdgMode) return this
    await this.setFlag(SYSTEM.PACKAGE_ID, "mode", mode)
    await this.resetAll({ updateTurn: false })
    await this.update({ turn: null })
    return this
  }

  async setDuelSetting(key, value) {
    if (this.started && key !== "attackerOverride") {
      ui.notifications.warn("CDG.combat.modeLocked", { localize: true })
      return this
    }
    if (key === "type" && !SYSTEM.DUEL_TYPES[value]) return this
    if (key === "target") {
      value = Number(value)
      if (!SYSTEM.DUEL_TOUCH_TARGETS.includes(value)) return this
    }
    if (key === "formal") value = value === true || value === "true"
    await this.setFlag(SYSTEM.PACKAGE_ID, `duel.${key}`, value)
    return this
  }

  async adjustDuelTouches(combatantId, delta) {
    const combatant = this.combatants.get(combatantId)
    if (!combatant || !game.user.isGM) return this
    const touches = Math.max(0, this.touchesFor(combatant) + delta)
    await combatant.setFlag(SYSTEM.PACKAGE_ID, "duelTouches", touches)
    Utils.debug("combat", `Duel : ${combatant.name} a ${touches} touche(s)`)
    const settings = this.duelSettings
    if (settings.type === SYSTEM.DUEL_TYPES.plaisance.id && touches >= settings.target) {
      ui.notifications.info(game.i18n.format("CDG.combat.duel.victory", { name: combatant.name, touches }))
    }
    return this
  }

  async assignDuelAttacker(combatantId) {
    if (!this.duelists.some((combatant) => combatant.id === combatantId)) return this
    Utils.debug("combat", `Duel à égalité : ${this.combatants.get(combatantId)?.name} désigné attaquant`)
    await this.setDuelSetting("attackerOverride", combatantId)
    return this.activateHighestInitiative()
  }

  /** @override */
  async startCombat() {
    this.#warnDuelConfiguration()
    // Les initiatives lancées avant le début (depuis une fiche) sont conservées ; si chacun a déjà
    // la sienne, le premier tour revient aussitôt à la plus haute.
    await super.startCombat()
    Utils.debug(
      "combat",
      `Début du combat (${this.cdgMode}) : initiatives déjà lancées`,
      Object.fromEntries(this.combatants.map((combatant) => [combatant.name, combatant.initiative])),
    )
    await this.update({ turn: null })
    return this.activateHighestInitiative()
  }

  /** @override */
  async rollInitiative(ids) {
    if (!this.started) {
      ui.notifications.warn("CDG.combat.initiative.notStarted", { localize: true })
      return this
    }
    const individual = typeof ids === "string"
    ids = typeof ids === "string" ? [ids] : ids
    const combatants = ids.map((id) => this.combatants.get(id)).filter((combatant) => combatant?.isOwner && combatant.actor)
    if (individual && combatants.length === 1) {
      await CdgInitiativeDialog.open(combatants[0])
      return this
    }
    for (const combatant of combatants) await CdgInitiativeDialog.rollDefault(combatant)
    return this
  }

  async activateHighestInitiative() {
    if (!this.started || !this.initiativesReady) return this
    this.setupTurns()

    let combatant
    if (this.cdgMode === SYSTEM.COMBAT_MODES.duel.id) {
      if (!this.duelAttackerId) {
        await this.update({ turn: null })
        return this
      }
      combatant = this.combatants.get(this.duelAttackerId)
    } else combatant = this.turns.find((turn) => !this.constructor.isOut(turn) && turn.initiative > 0)

    const turn = combatant ? this.turns.findIndex((entry) => entry.id === combatant.id) : null
    const out = this.combatants.filter((entry) => this.constructor.isOut(entry)).map((entry) => entry.name)
    Utils.debug("combat", `La main passe à ${combatant?.name ?? "personne"}${out.length ? ` (hors de combat : ${out.join(", ")})` : ""}`)
    if (turn !== this.turn) await this.update({ turn })
    return this
  }

  /** @override */
  async nextTurn() {
    if (!this.started) return this.nextRound()
    if (this.cdgMode === SYSTEM.COMBAT_MODES.duel.id) return this.completeDuelExchange()
    return this.completeSkirmishAction()
  }

  async completeSkirmishAction() {
    const combatant = this.combatant
    if (!combatant || !Number.isFinite(combatant.initiative)) return this
    const before = combatant.initiative
    await combatant.update({ initiative: before - SYSTEM.INITIATIVE_ACTION_COST })
    this.setupTurns()
    const next = this.turns.find((turn) => !this.constructor.isOut(turn) && turn.initiative > 0)
    Utils.debug(
      "combat",
      `Fin d'action de ${combatant.name} : initiative ${before} → ${combatant.initiative}, ${next ? `main à ${next.name}` : "plus personne de positif, nouveau round"}`,
    )
    if (!next) return this.nextRound()
    await this.update({ turn: this.turns.findIndex((turn) => turn.id === next.id) })
    return this
  }

  async completeDuelExchange() {
    if (!this.duelAttackerId) {
      ui.notifications.warn("CDG.combat.duel.noAttacker", { localize: true })
      return this
    }
    return this.nextRound()
  }

  /**
   * Passe au round suivant : initiatives remises à zéro, plus personne n'a la main, et l'attaquant
   * désigné d'un duel à égalité est oublié.
   *
   * Tout part en une seule écriture, sur le modèle de `Combat#nextRound` du cœur (même hook
   * `combatRound`, même avance du temps) : enchaîner le round, les combattants puis le tour laissait
   * voir un tour fugitivement à 0.
   *
   * Seul le Meneur peut l'écrire — réinitialiser tous les combattants et toucher aux drapeaux du
   * combat lui sont réservés. Un joueur qui clôt le round par sa dernière action le lui demande.
   * @override
   */
  async nextRound() {
    await askActiveGM("cdg.nextRound", { combatId: this.id }, { apply: () => this.#advanceRound(), category: "combat", label: "Demande de nouveau round" })
    return this
  }

  /**
   * L'écriture du round suivant, par le Meneur (voir `nextRound`).
   */
  async #advanceRound() {
    // Escarmouche ouverte par une bataille : un seul round, puis la mêlée sépare les combattants (p. 52).
    if (this.started && this.round >= 1 && this.getFlag(SYSTEM.PACKAGE_ID, CdgBattle.SKIRMISH_FLAG)) return CdgBattle.endSkirmish(this)

    const nextRound = this.round + 1
    Utils.debug("combat", `Round ${nextRound} : initiatives remises à zéro`)
    const advanceTime = this.getTimeDelta(this.round, this.turn, nextRound, null)
    // Comme `Combat#resetAll` : la remise à zéro est posée sur la source locale, puis la liste
    // complète des combattants est envoyée sans calcul de différence.
    for (const combatant of this.combatants) combatant.updateSource({ initiative: null })
    const updateData = {
      round: nextRound,
      turn: null,
      combatants: this.combatants.toObject(),
      [`flags.${SYSTEM.PACKAGE_ID}.duel.attackerOverride`]: null,
    }
    const updateOptions = { direction: 1, worldTime: { delta: advanceTime }, diff: false }
    Hooks.callAll("combatRound", this, updateData, updateOptions)
    await this.update(updateData, updateOptions)
  }

  /**
   * Requête `cdg.nextRound`, exécutée par le Meneur actif pour le compte d'un joueur.
   *
   * N'est accepté que le joueur qui pouvait déjà clore le round depuis le suivi : le propriétaire du
   * combattant qui a la main (escarmouche) ou d'un des deux duellistes (duel).
   * @param {{combatId: string}} data
   * @param {{user: User}} context
   * @returns {Promise<boolean>}
   */
  static async handleNextRoundQuery({ combatId } = {}, { user } = {}) {
    if (!game.user.isGM) return false
    const combat = game.combats.get(combatId)
    if (!combat?.started || !user) {
      Utils.debug("combat", `Nouveau round refusé à ${user?.name} : combat introuvable ou pas commencé`)
      return false
    }
    const candidates = combat.cdgMode === SYSTEM.COMBAT_MODES.duel.id ? combat.duelists : [combat.combatant].filter(Boolean)
    if (!user.isGM && !candidates.some((combatant) => combatant.testUserPermission(user, "OWNER"))) {
      Utils.debug(
        "combat",
        `Nouveau round refusé à ${user.name} : il ne possède pas ${candidates.map((combatant) => combatant.name).join(" ni ") || "le combattant qui a la main"}`,
      )
      return false
    }
    await combat.nextRound()
    return true
  }

  /** @override */
  async _onEndRound(context) {
    await super._onEndRound(context)
    if (game.settings.get(SYSTEM.PACKAGE_ID, "autoResetRoundCounters")) {
      for (const combatant of this.combatants) await combatant.actor?.resetRoundCounters()
      Utils.debug("combat", "Fin de round : esquives et parade réinitialisées")
    }
    await CdgDyingPrompt.postForCombat(this)
  }

  #warnDuelConfiguration() {
    if (this.cdgMode !== SYSTEM.COMBAT_MODES.duel.id) return
    if (this.activeCombatants.length !== 2) ui.notifications.warn("CDG.combat.duel.warnings.participants", { localize: true })
    if (!this.duelSettings.formal) return
    for (const combatant of this.activeCombatants) {
      const actor = combatant.actor
      if (!actor) continue
      const weapon = actor.heldWeapons?.[0]
      const invalidWeapon = actor.heldWeapons?.length !== 1 || !SYSTEM.WEAPON_CATEGORIES[weapon?.system.category]?.formalDuel
      if (actor.armor || actor.shield || invalidWeapon) {
        ui.notifications.warn(game.i18n.format("CDG.combat.duel.warnings.equipment", { name: combatant.name }))
      }
    }
  }
}
