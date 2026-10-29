import { SYSTEM } from "../config/system.mjs"
import CdgRollDialog from "../applications/roll-dialog.mjs"
import CdgRoll from "../dice/cdg-roll.mjs"
import { resolveOutcome } from "../dice/roll-outcome.mjs"
import { createChatMessage } from "../helpers/chat.mjs"
import { adversaryEntry, battleWinner, canMove, fightConsequence, generalsResult, keptAdversaryDie, lossesWound, shiftWound } from "./battle-rules.mjs"
import { resolveOpposedOutcome } from "./opposition.mjs"

const { ForcedReplacement } = foundry.data.operators

/**
 * Les batailles (p. 51-54) : enjeu, modificateur de bataille, puis des tours de cinq phases jusqu'à
 * ce qu'un camp totalise trois points de victoire.
 *
 * Une seule bataille à la fois par compagnie franche, dans un drapeau de l'acteur compagnie. Comme
 * pour la confrontation, **le Meneur actif est le seul écrivain** : un joueur lui confie chaque
 * étape (requête `cdg.battleStep`), et les jets se rattachent à la bataille par un drapeau de leur
 * carte de test, que le Meneur lit à la création du message — puis de nouveau si le dé conservé
 * change ou si le joueur se dépasse.
 *
 * Les tables vivent dans `battle-rules.mjs` ; ce fichier les applique aux documents.
 */
export default class CdgBattle {
  /** Clé du drapeau de la compagnie qui porte la bataille en cours. */
  static FLAG = "battle"

  /** Clé du drapeau d'une carte de conséquences (phase 2). */
  static CARD_FLAG = "battleCard"

  /** Clé du drapeau d'un combat d'escarmouche ouvert par une bataille. */
  static SKIRMISH_FLAG = "battleSkirmish"

  /** Clé du drapeau des acteurs adverses importés pour une escarmouche, supprimés avec elle. */
  static TEMPORARY_FLAG = "battleTemporary"

  /** Compendium des adversaires de la table p. 52. */
  static PACK = `${SYSTEM.PACKAGE_ID}.pnjs`

  /** Réglage du monde qui remplace les profils de la table des adversaires. */
  static ADVERSARIES_SETTING = "battleAdversaries"

  static TEMPLATES = {
    card: `${SYSTEM.PATH}/templates/chat/battle-card.hbs`,
    recap: `${SYSTEM.PATH}/templates/chat/battle-recap.hbs`,
    start: `${SYSTEM.PATH}/templates/chat/battle-start.hbs`,
    consequences: `${SYSTEM.PATH}/templates/battle/consequences.hbs`,
  }

  /** File d'écriture par compagnie : deux jets qui arrivent ensemble ne s'écrasent pas. */
  static #queues = new Map()

  // #region État

  /**
   * La bataille en cours d'une compagnie, ou `null`.
   * @param {CdgActor} company
   * @returns {Object|null}
   */
  static getState(company) {
    return company?.getFlag(SYSTEM.PACKAGE_ID, this.FLAG) ?? null
  }

  /**
   * Les personnages joueurs du roster de la compagnie, résolus en acteurs du monde.
   * @param {CdgActor} company
   * @returns {CdgActor[]}
   */
  static rosterActors(company) {
    return company.system.rosterPJ
      .map((entry) => (entry.actorUuid ? fromUuidSync(entry.actorUuid) : null))
      .filter((actor) => actor?.documentName === "Actor" && actor.type === "character" && !actor.isToken)
  }

  /**
   * Prépare une nouvelle bataille à partir de la saisie du Meneur.
   * @param {CdgActor} company
   * @param {Object} setup
   * @returns {Object}
   */
  static #newState(company, setup) {
    const modifier = Math.clamp(Math.round(Number(setup.modifier) || 0), SYSTEM.BATTLE_MODIFIER_MIN, SYSTEM.BATTLE_MODIFIER_MAX)
    const members = {}
    for (const actor of this.rosterActors(company)) members[actor.id] = this.#newMember(null)
    return {
      id: foundry.utils.randomID(),
      stake: String(setup.stake ?? "").trim(),
      modifier,
      armyQuality: SYSTEM.BATTLE_ARMY_QUALITIES[setup.armyQuality] ? setup.armyQuality : "normal",
      general: this.#sanitizeGeneral(setup.general),
      chiefUuid: setup.chiefUuid || "",
      turn: 1,
      phase: SYSTEM.BATTLE_PHASES.location.id,
      points: { company: 0, enemy: 0 },
      members,
      generals: { company: null, enemy: null, result: null },
      losses: null,
      history: [],
      winner: null,
    }
  }

  /**
   * L'état d'un PJ pour un nouveau tour : il garde sa position, dont on part pour le déplacement.
   * @param {string|null} position
   * @returns {Object}
   */
  static #newMember(position) {
    return { position, previousPosition: position, fight: null, protection: null, adversary: null, tactique: null, exploitGranted: false, cardId: null }
  }

  /**
   * Le général adverse : un acteur adversaire, ou une saisie libre (nom, Esprit, rang de Tactique).
   * @param {Object} general
   * @returns {Object}
   */
  static #sanitizeGeneral(general = {}) {
    // Un PNJ déposé depuis le compendium n'est pas forcément résolu de façon synchrone : ses scores
    // ont été relevés au dépôt (voir `CdgBattleApp`), on ne garde de lui que son uuid pour le jet.
    return {
      actorUuid: general.actorUuid || "",
      name: String(general.name ?? "").trim() || game.i18n.localize("CDG.battle.general.defaultName"),
      esprit: Math.clamp(Number(general.esprit) || 10, 1, 30),
      tactique: Math.clamp(Number(general.tactique) || 0, 0, SYSTEM.MAX_RANK),
    }
  }

  // #endregion

  // #region Écriture (Meneur)

  /**
   * Confie une étape au Meneur actif — ou l'applique directement si l'on est Meneur.
   * @param {CdgActor} company
   * @param {Object} step
   * @returns {Promise<boolean>}
   */
  static async request(company, step) {
    const payload = { ...step, companyUuid: company.uuid }
    if (game.user.isGM) return this.applyStep(payload, game.user)
    if (!game.users.activeGM) {
      ui.notifications.error("CDG.confrontation.notif.noGM", { localize: true })
      return false
    }
    return game.users.activeGM.query("cdg.battleStep", payload)
  }

  /**
   * Requête `cdg.battleStep`, exécutée par le Meneur pour le compte d'un joueur.
   * @param {Object} step
   * @param {{user: User}} context
   * @returns {Promise<boolean>}
   */
  static async handleStepQuery(step, { user } = {}) {
    if (!game.user.isGM || !user) return false
    return CdgBattle.applyStep(step, user)
  }

  /**
   * Met l'étape dans la file de sa compagnie.
   * @param {Object} step
   * @param {User} user
   * @returns {Promise<boolean>}
   */
  static applyStep(step, user) {
    return this.#enqueue(step?.companyUuid, () => this.#applyStep(step, user))
  }

  static #enqueue(key, task) {
    const previous = this.#queues.get(key) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(task)
    this.#queues.set(key, next)
    next.finally(() => {
      if (this.#queues.get(key) === next) this.#queues.delete(key)
    })
    return next
  }

  /**
   * Applique une étape sur l'état relu de la compagnie. Tout est vérifié ici, côté Meneur : une
   * requête fabriquée à la main ne doit pas déplacer le PJ d'un autre joueur ni avancer les phases.
   * @param {Object} step
   * @param {User} user
   * @returns {Promise<boolean>}
   */
  static async #applyStep(step, user) {
    const company = await fromUuid(step?.companyUuid)
    if (company?.type !== "compagnie") return false

    if (step.type === "start") {
      if (!user.isGM || this.getState(company)) return false
      const state = this.#newState(company, step.setup ?? {})
      await this.#write(company, state)
      await this.#postStart(company, state)
      return true
    }

    const previous = this.getState(company)
    if (!previous) return false
    const state = foundry.utils.deepClone(previous)

    switch (step.type) {
      case "position": {
        const actor = game.actors.get(step.actorId)
        const member = state.members[step.actorId] ?? (this.rosterActors(company).includes(actor) ? this.#newMember(null) : null)
        if (!actor || !member || !SYSTEM.BATTLE_POSITIONS[step.position]) return false
        if (!user.isGM) {
          if (!actor.testUserPermission(user, "OWNER") || state.phase !== SYSTEM.BATTLE_PHASES.location.id) return false
          if (!canMove(member.previousPosition, step.position)) return false
        }
        member.position = step.position
        state.members[step.actorId] = member
        break
      }
      case "chief":
        if (!user.isGM) return false
        state.chiefUuid = step.chiefUuid || ""
        break
      case "phase":
        if (!user.isGM) return false
        if (step.direction < 0) this.#previousPhase(state)
        else if (!(await this.#nextPhase(company, state))) return true
        break
      case "points":
        if (!user.isGM || !["company", "enemy"].includes(step.side)) return false
        state.points[step.side] = Math.max(0, state.points[step.side] + Math.sign(step.delta))
        state.winner = battleWinner(state.points)
        break
      case "exploit": {
        const member = state.members[step.actorId]
        if (!user.isGM || !member || !this.exploitAvailable(member)) return false
        member.exploitGranted = !member.exploitGranted
        state.points.company = Math.max(0, state.points.company + (member.exploitGranted ? 1 : -1))
        state.winner = battleWinner(state.points)
        break
      }
      case "adversary": {
        const member = state.members[step.actorId]
        if (!user.isGM || !member?.fight?.combat) return false
        member.adversary = step.adversary
        break
      }
      case "skirmish": {
        const member = state.members[step.actorId]
        if (!user.isGM || !member?.adversary) return false
        member.adversary.skirmish = { ...member.adversary.skirmish, ...step.skirmish }
        break
      }
      case "result":
        if (!(await this.#applyResult(company, state, step.message))) return false
        break
      case "abandon":
        if (!user.isGM) return false
        await company.unsetFlag(SYSTEM.PACKAGE_ID, this.FLAG)
        return true
      default:
        return false
    }

    await this.#write(company, state)
    await this.#refreshCards(company, previous, state)
    return true
  }

  /**
   * Remplace la bataille entière : une simple fusion garderait les PJ sortis du roster.
   * @param {CdgActor} company
   * @param {Object} state
   */
  static async #write(company, state) {
    return company.update({ [`flags.${SYSTEM.PACKAGE_ID}.${this.FLAG}`]: ForcedReplacement.create(state) })
  }

  /**
   * Phase suivante. Une fois la victoire acquise, on passe directement aux pertes (les combats ont
   * eu lieu), puis la bataille se conclut au lieu d'ouvrir un nouveau tour.
   * @param {CdgActor} company
   * @param {Object} state
   * @returns {Promise<boolean>} `false` si la bataille vient d'être conclue (l'état n'existe plus).
   */
  static async #nextPhase(company, state) {
    const phases = Object.values(SYSTEM.BATTLE_PHASES).sort((a, b) => a.order - b.order)
    const index = phases.findIndex((phase) => phase.id === state.phase)
    const last = index === phases.length - 1

    if (last) {
      this.#closeTurn(state)
      if (state.winner) {
        await this.#conclude(company, state)
        return false
      }
      state.turn += 1
      state.phase = phases[0].id
      for (const [actorId, member] of Object.entries(state.members)) state.members[actorId] = this.#newMember(member.position)
      state.generals = { company: null, enemy: null, result: null }
      state.losses = null
      return true
    }

    state.phase = state.winner ? SYSTEM.BATTLE_PHASES.losses.id : phases[index + 1].id
    return true
  }

  /**
   * Phase précédente, pour revenir sur une erreur : rien de ce qui a été joué n'est défait.
   * @param {Object} state
   */
  static #previousPhase(state) {
    const phases = Object.values(SYSTEM.BATTLE_PHASES).sort((a, b) => a.order - b.order)
    const index = phases.findIndex((phase) => phase.id === state.phase)
    if (index > 0) state.phase = phases[index - 1].id
  }

  /**
   * Résume le tour qui s'achève dans l'historique, pour la carte et la page de journal finales.
   * @param {Object} state
   */
  static #closeTurn(state) {
    const members = Object.entries(state.members)
      .filter(([, member]) => member.position)
      .map(([actorId, member]) => ({
        name: game.actors.get(actorId)?.name ?? "?",
        position: member.position,
        fight: member.fight?.outcome ?? null,
        wound: member.protection ? member.protection.applied : null,
        adversary: member.adversary?.label ?? null,
        skirmish: member.adversary?.skirmish?.result ?? null,
        exploit: member.exploitGranted,
      }))
    state.history.push({
      turn: state.turn,
      members,
      generals: state.generals.result,
      losses: state.losses ? state.losses.applied : null,
      lossesRolled: !!state.losses,
      points: { ...state.points },
    })
  }

  // #endregion

  // #region Jets

  /**
   * Étiquette posée sur la carte d'un test de bataille, pour que le Meneur sache où le ranger.
   * @param {CdgActor} company
   * @param {Object} state
   * @param {string} kind `fight`, `protection`, `tactique`, `generalCompany`, `generalEnemy` ou `losses`.
   * @param {string} [actorId] Le PJ concerné, pour les jets de la phase 2.
   * @returns {Object}
   */
  static #tag(company, state, kind, actorId = null) {
    return { companyUuid: company.uuid, battleId: state.id, turn: state.turn, kind, actorId }
  }

  /**
   * Ouvre la fenêtre de jet en rattachant la carte à la bataille.
   * @param {CdgActor} actor
   * @param {Object} seed
   * @param {Object} tag
   * @returns {Promise<CdgRollDialog>}
   */
  static #openRoll(actor, seed, tag) {
    return CdgRollDialog.open(actor, { ...seed, postHandler: (test) => CdgRoll.post({ ...test, battle: tag }) })
  }

  /**
   * Phase 2 : test d'Esprit / Sens des batailles.
   * @param {CdgActor} company
   * @param {string} actorId
   */
  static rollFight(company, actorId) {
    const state = this.getState(company)
    const actor = game.actors.get(actorId)
    if (!state || !actor) return
    return this.#openRoll(actor, { abilityId: "esprit", skillId: "sensBatailles", lockedPair: true, qualityDomain: "skill" }, this.#tag(company, state, "fight", actorId))
  }

  /**
   * Phase 2 : encaisser la blessure de l'environnement, Corps / Protection — le rang de l'armure,
   * sans le malus des blessures déjà subies, comme à l'encaissement d'une escarmouche.
   * @param {CdgActor} company
   * @param {string} actorId
   */
  static rollProtection(company, actorId) {
    const state = this.getState(company)
    const actor = game.actors.get(actorId)
    if (!state || !actor) return
    return this.#openRoll(
      actor,
      {
        abilityId: "corps",
        rank: actor.armor?.system.protection.rank ?? 0,
        label: "CDG.battle.protectionTest",
        lockedPair: true,
        qualityDomain: "soak",
        toggles: { wound: false },
      },
      this.#tag(company, state, "protection", actorId),
    )
  }

  /**
   * Phase 2 : le test d'Esprit / Tactique dont dépend l'action d'éclat (soutien en réussite critique,
   * front en réussite).
   * @param {CdgActor} company
   * @param {string} actorId
   */
  static rollTactique(company, actorId) {
    const state = this.getState(company)
    const actor = game.actors.get(actorId)
    if (!state || !actor) return
    return this.#openRoll(actor, { abilityId: "esprit", skillId: "tactique", lockedPair: true, qualityDomain: "skill" }, this.#tag(company, state, "tactique", actorId))
  }

  /**
   * Le chef d'armée de la compagnie : un PJ désigné par le Meneur, ou à défaut la compagnie
   * elle-même.
   * @param {Object} state
   * @returns {CdgActor|null}
   */
  static chief(state) {
    const actor = state.chiefUuid ? fromUuidSync(state.chiefUuid) : null
    return actor?.type === "character" ? actor : null
  }

  /**
   * Phase 4, côté compagnie : Esprit / Tactique du PJ chef d'armée (malus selon sa position), ou
   * test de compagnie Effectifs / Tactique. Le modificateur de bataille s'applique dans les deux cas.
   * @param {CdgActor} company
   */
  static rollGeneralCompany(company) {
    const state = this.getState(company)
    if (!state) return
    const modifiers = []
    if (state.modifier) modifiers.push({ id: "battle", label: game.i18n.localize("CDG.battle.modifier"), value: state.modifier })
    const tag = this.#tag(company, state, "generalCompany")

    const chief = this.chief(state)
    if (chief) {
      const position = SYSTEM.BATTLE_POSITIONS[state.members[chief.id]?.position]
      if (position?.chiefMalus) {
        modifiers.push({ id: "chief", label: game.i18n.format("CDG.battle.chiefMalus", { position: game.i18n.localize(position.label) }), value: position.chiefMalus })
      }
      return this.#openRoll(chief, { abilityId: "esprit", skillId: "tactique", lockedPair: true, qualityDomain: "skill", extraModifiers: modifiers }, tag)
    }
    return this.#openRoll(company, { abilityId: "effectifs", skillId: "tactique", lockedPair: true, extraModifiers: modifiers }, tag)
  }

  /**
   * Phase 4, côté adverse : Esprit / Tactique du général adverse, au modificateur de bataille
   * inversé. Saisi à la main, il n'a pas de fiche : le jet part directement, sans fenêtre.
   * @param {CdgActor} company
   */
  static async rollGeneralEnemy(company) {
    const state = this.getState(company)
    if (!state || !game.user.isGM) return
    const tag = this.#tag(company, state, "generalEnemy")
    const mirror = -state.modifier
    const label = game.i18n.localize("CDG.battle.modifierMirror")

    const actor = state.general.actorUuid ? await fromUuid(state.general.actorUuid) : null
    if (actor) {
      const extraModifiers = mirror ? [{ id: "battle", label, value: mirror }] : []
      return this.#openRoll(actor, { abilityId: "esprit", skillId: "tactique", lockedPair: true, extraModifiers }, tag)
    }

    const { name, esprit, tactique } = state.general
    const rankEntry = SYSTEM.RANKS[tactique] ?? SYSTEM.RANKS[SYSTEM.DEFAULT_RANK]
    const abilityLabel = game.i18n.localize(SYSTEM.ABILITIES.esprit.label)
    const breakdown = [{ label: abilityLabel, value: esprit, base: true }]
    if (mirror) breakdown.push({ label, value: mirror, base: false })
    return CdgRoll.post({
      actorUuid: null,
      actorName: name,
      abilityId: "esprit",
      abilityLabel,
      abilityValue: esprit,
      skillId: "tactique",
      skillLabel: game.i18n.localize(SYSTEM.SKILLS.tactique.label),
      rank: tactique,
      dice: rankEntry.dice,
      keep: rankEntry.keep,
      sr: esprit + mirror,
      breakdown,
      effort: 0,
      passion: null,
      pushed: false,
      noPush: true,
      companyHealing: null,
      battle: tag,
    })
  }

  /**
   * Phase 5 : test de compagnie Effectifs / Bataille, au modificateur de pertes de l'opposition des
   * généraux.
   * @param {CdgActor} company
   */
  static rollLosses(company) {
    const state = this.getState(company)
    if (!state) return
    const lossModifier = state.generals.result?.lossModifier ?? 0
    const extraModifiers = lossModifier ? [{ id: "losses", label: game.i18n.localize("CDG.battle.lossModifier"), value: lossModifier }] : []
    return this.#openRoll(company, { abilityId: "effectifs", skillId: "bataille", lockedPair: true, extraModifiers }, this.#tag(company, state, "losses"))
  }

  /**
   * Branché sur la création et la mise à jour des messages : le Meneur actif range le résultat d'un
   * test de bataille. La carte d'origine d'un test dépassé est ignorée, c'est la relance qui compte.
   * @param {ChatMessage} message
   */
  static onRollMessage(message) {
    if (!game.users.activeGM?.isSelf) return
    const test = CdgRoll.getTest(message)
    if (!test?.battle || (test.pushed && !test.isPush)) return
    const company = fromUuidSync(test.battle.companyUuid)
    if (!company) return
    return this.applyStep({ type: "result", companyUuid: company.uuid, message: message.id }, game.user)
  }

  /**
   * Range un résultat de test dans la bataille. Un nouveau jet du même test (dépassement, dé changé
   * par le Meneur) remplace le précédent tant que la suite n'a pas été jouée.
   * @param {CdgActor} company
   * @param {Object} state Modifié sur place.
   * @param {string} messageId
   * @returns {Promise<boolean>}
   */
  static async #applyResult(company, state, messageId) {
    const message = game.messages.get(messageId)
    const test = message ? CdgRoll.getTest(message) : null
    const tag = test?.battle
    if (!tag || tag.battleId !== state.id || tag.turn !== state.turn) return false

    const outcome = resolveOutcome(test.results[test.keptIndex], test.sr)
    const phase = state.phase
    const fightPhases = [SYSTEM.BATTLE_PHASES.fights.id, SYSTEM.BATTLE_PHASES.exploits.id]
    const member = tag.actorId ? state.members[tag.actorId] : null
    const actor = tag.actorId ? game.actors.get(tag.actorId) : null

    switch (tag.kind) {
      case "fight": {
        if (!member?.position || !fightPhases.includes(phase) || member.protection || member.adversary || member.tactique) return false
        member.fight = { ...fightConsequence(member.position, outcome.outcome), outcome }
        if (!member.cardId) member.cardId = (await this.#postCard(company, state, tag.actorId))?.id ?? null
        return true
      }
      case "protection": {
        if (!member?.fight?.wound || !actor) return false
        const wound = shiftWound(member.fight.wound, outcome.outcome)
        const applied = await actor.applyWoundOverflow(member.protection?.applied ?? null, wound)
        member.protection = { outcome, wound, applied }
        return true
      }
      case "tactique":
        if (member?.fight?.exploit !== "test" || member.exploitGranted) return false
        member.tactique = { outcome }
        return true
      case "generalCompany":
      case "generalEnemy": {
        if (phase !== SYSTEM.BATTLE_PHASES.generals.id) return false
        state.generals[tag.kind === "generalCompany" ? "company" : "enemy"] = outcome
        const previous = state.generals.result
        if (previous) state.points[previous.side] -= previous.points
        state.generals.result = null
        if (state.generals.company && state.generals.enemy) {
          const opposed = resolveOpposedOutcome(state.generals.company, state.generals.enemy)
          state.generals.result = { ...generalsResult(opposed), outcome: opposed }
          state.points[state.generals.result.side] += state.generals.result.points
        }
        state.winner = battleWinner(state.points)
        return true
      }
      case "losses": {
        if (phase !== SYSTEM.BATTLE_PHASES.losses.id) return false
        const wound = lossesWound(outcome.outcome)
        const applied = await company.applyWoundOverflow(state.losses?.applied ?? null, wound)
        state.losses = { outcome, wound, applied }
        return true
      }
    }
    return false
  }

  /**
   * Libellé d'une issue dans une bataille : les tables des p. 52-54 ne lisent que les quatre
   * paliers — échec critique, échec, réussite, réussite critique —, pas « Oui, mais… » ni « Oui ».
   * @param {Object|null} outcome Le retour de `resolveOutcome`.
   * @returns {string|null}
   */
  static outcomeName(outcome) {
    return outcome ? game.i18n.localize(`CDG.battle.outcomes.${outcome.outcome}`) : null
  }

  /**
   * L'action d'éclat est-elle ouverte à ce PJ : acquise d'emblée, ou gagnée par un test d'Esprit /
   * Tactique réussi.
   * @param {Object} member
   * @returns {boolean}
   */
  static exploitAvailable(member) {
    return member?.fight?.exploit === "granted" || (member?.fight?.exploit === "test" && !!member.tactique?.outcome.success)
  }

  // #endregion

  // #region Adversaire et escarmouche

  /**
   * La table des adversaires en vigueur : les tranches du livre, dont les profils (des uuid
   * d'acteurs) viennent du réglage du monde s'il les a changés, du bestiaire du système sinon.
   * @returns {{min: number, max: number, label: string, actors: string[], custom: boolean}[]}
   */
  static adversaryTable() {
    const custom = game.settings.get(SYSTEM.PACKAGE_ID, this.ADVERSARIES_SETTING) ?? {}
    return SYSTEM.BATTLE_ADVERSARIES.map((entry) => {
      const key = this.adversaryKey(entry)
      const actors = Array.isArray(custom[key]) ? custom[key] : entry.actors.map((id) => `Compendium.${this.PACK}.Actor.${id}`)
      return { ...entry, actors, custom: Array.isArray(custom[key]) }
    })
  }

  /**
   * Clé d'une tranche dans le réglage : ses bornes, qui ne changent pas.
   * @param {{min: number, max: number}} entry
   * @returns {string}
   */
  static adversaryKey(entry) {
    return `${entry.min}-${entry.max}`
  }

  /**
   * Nom d'un profil de la table, sans charger le document (index du compendium ou acteur du monde).
   * @param {string} uuid
   * @returns {string}
   */
  static adversaryName(uuid) {
    return fromUuidSync(uuid)?.name ?? uuid
  }

  /**
   * Tire l'adversaire du PJ sur la table p. 52, selon la composition de l'armée adverse.
   * @param {CdgActor} company
   * @param {string} actorId
   */
  static async drawAdversary(company, actorId) {
    const state = this.getState(company)
    if (!state || !game.user.isGM || !state.members[actorId]?.fight?.combat) return
    const quality = SYSTEM.BATTLE_ARMY_QUALITIES[state.armyQuality]
    const roll = await new Roll(quality.formula).evaluate()
    const results = roll.dice[0].results.map((die) => die.result)
    const die = keptAdversaryDie(results, state.armyQuality)
    const entry = adversaryEntry(die, this.adversaryTable())
    // Une tranche modifiée par le Meneur porte le nom de ses profils, et non plus celui du livre.
    const label = entry.custom && entry.actors.length ? entry.actors.map((uuid) => this.adversaryName(uuid)).join(" / ") : game.i18n.localize(entry.label)

    await roll.toMessage({
      speaker: ChatMessage.implementation.getSpeaker({ actor: game.actors.get(actorId) }),
      flavor: game.i18n.format("CDG.battle.adversary.flavor", { die, adversary: label, army: game.i18n.localize(quality.label) }),
    })
    return this.request(company, { type: "adversary", actorId, adversary: { results, die, label, actors: entry.actors, skirmish: null } })
  }

  /**
   * Ouvre l'escarmouche d'un round contre l'adversaire tiré : une copie de son profil est importée
   * du compendium, son jeton posé à côté de celui du PJ s'il est sur la scène, et le combat démarré.
   * Copie, jeton et combat disparaissent à la fin du round (voir `onDeleteCombat`).
   * @param {CdgActor} company
   * @param {string} actorId
   * @param {string} adversaryUuid Le profil retenu, dans un compendium ou parmi les acteurs du monde.
   */
  static async startSkirmish(company, actorId, adversaryUuid) {
    const state = this.getState(company)
    const member = state?.members[actorId]
    const actor = game.actors.get(actorId)
    if (!game.user.isGM || !actor || !member?.adversary?.actors.includes(adversaryUuid) || member.adversary.skirmish) return

    const source = await fromUuid(adversaryUuid)
    if (source?.documentName !== "Actor") return ui.notifications.error("CDG.battle.notif.adversaryMissing", { localize: true })

    // Toujours une copie, même d'un acteur du monde : ses blessures ne doivent pas survivre à l'escarmouche.
    const data = source.pack ? game.actors.fromCompendium(source) : source.toObject()
    delete data._id
    delete data.folder
    const adversary = await Actor.implementation.create({
      ...data,
      flags: { ...data.flags, [SYSTEM.PACKAGE_ID]: { ...data.flags?.[SYSTEM.PACKAGE_ID], [this.TEMPORARY_FLAG]: true } },
    })

    const scene = canvas.scene
    const pcToken = scene ? actor.getActiveTokens(false, true).find((token) => token.parent === scene) : null
    let adversaryToken = null
    if (pcToken) {
      const size = scene.grid.size
      const data = await adversary.getTokenDocument({ x: pcToken.x + pcToken.width * size, y: pcToken.y })
      ;[adversaryToken] = await scene.createEmbeddedDocuments("Token", [data.toObject()])
    }

    const combat = await getDocumentClass("Combat").create({
      scene: pcToken ? scene.id : null,
      active: true,
      flags: {
        [SYSTEM.PACKAGE_ID]: {
          mode: SYSTEM.COMBAT_MODES.skirmish.id,
          [this.SKIRMISH_FLAG]: { companyUuid: company.uuid, actorId, adversaryActorId: adversary.id, tokenUuid: adversaryToken?.uuid ?? null },
        },
      },
    })
    await combat.createEmbeddedDocuments("Combatant", [
      pcToken ? { actorId, tokenId: pcToken.id, sceneId: scene.id } : { actorId },
      adversaryToken ? { actorId: adversary.id, tokenId: adversaryToken.id, sceneId: scene.id } : { actorId: adversary.id },
    ])
    await combat.startCombat()
    ui.combat.render({ force: true })

    return this.request(company, {
      type: "skirmish",
      actorId,
      skirmish: { status: "running", combatId: combat.id, name: adversary.name, adversaryUuid: (adversaryToken?.actor ?? adversary).uuid },
    })
  }

  /**
   * Ouvre la fiche de l'adversaire d'une escarmouche en cours — celle du jeton s'il est sur la
   * scène, puisque c'est lui qui encaisse —, pour lancer ses jets.
   * @param {CdgActor} company
   * @param {string} actorId Le PJ qu'il affronte.
   */
  static async openAdversary(company, actorId) {
    const uuid = this.getState(company)?.members[actorId]?.adversary?.skirmish?.adversaryUuid
    const adversary = uuid ? await fromUuid(uuid) : null
    return adversary?.sheet.render(true)
  }

  /**
   * Fin du round d'une escarmouche de bataille : la mêlée sépare les combattants (p. 52). Appelé par
   * `CdgCombat#nextRound` à la place du round suivant.
   * @param {CdgCombat} combat
   */
  static async endSkirmish(combat) {
    ui.notifications.info("CDG.battle.notif.skirmishOver", { localize: true })
    return combat.delete()
  }

  /**
   * Un combat d'escarmouche de bataille supprimé, à la fin de son round ou à la main : on note
   * l'issue, puis on retire le jeton et la copie de l'adversaire.
   * @param {CdgCombat} combat
   */
  static async onDeleteCombat(combat) {
    const data = combat.getFlag(SYSTEM.PACKAGE_ID, this.SKIRMISH_FLAG)
    if (!data || !game.users.activeGM?.isSelf) return

    const out = (actorId) => {
      const combatant = combat.combatants.find((entry) => entry.actorId === actorId)
      return !combatant || combatant.isDefeated || !!combatant.actor?.system.isDying
    }
    const result = out(data.adversaryActorId) ? "won" : out(data.actorId) ? "lost" : "separated"

    const company = await fromUuid(data.companyUuid)
    if (company && this.getState(company)?.members[data.actorId]?.adversary?.skirmish?.combatId === combat.id) {
      await this.applyStep({ type: "skirmish", companyUuid: company.uuid, actorId: data.actorId, skirmish: { status: "done", result } }, game.user)
    }

    const token = data.tokenUuid ? await fromUuid(data.tokenUuid) : null
    await token?.delete()
    const adversary = game.actors.get(data.adversaryActorId)
    if (adversary?.getFlag(SYSTEM.PACKAGE_ID, this.TEMPORARY_FLAG)) await adversary.delete()
  }

  // #endregion

  // #region Cartes et archives

  /**
   * Annonce le début de la bataille dans le tchat, avec de quoi ouvrir sa fenêtre.
   * @param {CdgActor} company
   * @param {Object} state
   */
  static async #postStart(company, state) {
    const content = await foundry.applications.handlebars.renderTemplate(this.TEMPLATES.start, {
      company,
      state,
      modifier: this.modifierLabel(state.modifier),
    })
    return createChatMessage(
      { speaker: ChatMessage.implementation.getSpeaker({ actor: company }), content, flags: { [SYSTEM.PACKAGE_ID]: { [this.CARD_FLAG]: { companyUuid: company.uuid } } } },
      { messageMode: "public" },
    )
  }

  /**
   * Libellé d'un modificateur de bataille : sa valeur signée, et le repère de la table s'il en est un.
   * @param {number} value
   * @returns {string}
   */
  static modifierLabel(value) {
    const preset = SYSTEM.BATTLE_MODIFIERS.find((entry) => entry.value === value)
    const signed = value > 0 ? `+${value}` : `${value}`
    return preset ? `${signed} (${game.i18n.localize(preset.label)})` : signed
  }

  /**
   * Ce qu'un PJ a vécu ce tour-ci et ce qu'il lui reste à faire, pour la fenêtre comme pour sa carte
   * de conséquences. Les boutons portent `data-requires` (`owner` ou `gm`) : chaque client masque
   * ceux qui ne le concernent pas (voir `filterButtons`).
   * @param {CdgActor} company
   * @param {Object} state
   * @param {string} actorId
   * @returns {Object|null}
   */
  static memberView(company, state, actorId) {
    const member = state.members[actorId]
    const actor = game.actors.get(actorId)
    if (!member || !actor) return null
    const fightPhase = [SYSTEM.BATTLE_PHASES.fights.id, SYSTEM.BATTLE_PHASES.exploits.id].includes(state.phase)
    const fight = member.fight
    const label = (outcome) => this.outcomeName(outcome)
    const woundLabel = (id) => (id ? game.i18n.localize(SYSTEM.WOUND_LEVELS[id].label) : game.i18n.localize("CDG.battle.noWound"))

    const view = {
      actorId,
      name: actor.name,
      img: actor.img,
      position: member.position,
      positionLabel: member.position ? game.i18n.localize(SYSTEM.BATTLE_POSITIONS[member.position].label) : null,
      positions: Object.values(SYSTEM.BATTLE_POSITIONS).map((position) => ({
        ...position,
        active: position.id === member.position,
        allowed: canMove(member.previousPosition, position.id),
      })),
      // Le bouton reste affiché mais grisé une fois le test lancé : une relance passe par « Se
      // dépasser » sur la carte du test, pas par un second jet.
      showFight: fightPhase && !!member.position,
      canRollFight: fightPhase && !!member.position && !member.fight,
      fight: fight ? { ...fight, label: label(fight.outcome) } : null,
    }
    if (!fight) return view

    view.consequences = {
      wound: fight.wound ? game.i18n.localize(SYSTEM.WOUND_LEVELS[fight.wound].label) : null,
      combat: fight.combat,
      exploit: fight.exploit,
    }
    if (fight.wound) {
      view.protection = member.protection ? { label: label(member.protection.outcome), wound: woundLabel(member.protection.applied) } : null
      view.canRollProtection = !member.protection
    }
    if (fight.combat) {
      const adversary = member.adversary
      view.canDraw = !adversary
      if (adversary) {
        view.adversary = {
          label: adversary.label,
          die: adversary.die,
          pending: adversary.actors.length === 0,
          skirmish: adversary.skirmish,
          skirmishResult: adversary.skirmish?.result ? game.i18n.localize(`CDG.battle.skirmish.${adversary.skirmish.result}`) : null,
          choices: adversary.skirmish ? [] : adversary.actors.map((uuid) => ({ uuid, name: this.adversaryName(uuid) })),
        }
      }
    }
    if (fight.exploit === "test") {
      view.tactique = member.tactique ? { label: label(member.tactique.outcome), success: member.tactique.outcome.success } : null
      view.canRollTactique = !member.tactique
    }
    view.exploitAvailable = this.exploitAvailable(member)
    view.exploitGranted = member.exploitGranted
    return view
  }

  /**
   * Phase 2 : la carte de conséquences d'un PJ, postée au premier résultat de son test.
   * @param {CdgActor} company
   * @param {Object} state
   * @param {string} actorId
   * @returns {Promise<ChatMessage>}
   */
  static async #postCard(company, state, actorId) {
    return createChatMessage(
      {
        speaker: ChatMessage.implementation.getSpeaker({ actor: game.actors.get(actorId) }),
        content: await this.#renderCard(company, state, actorId),
        flags: { [SYSTEM.PACKAGE_ID]: { [this.CARD_FLAG]: { companyUuid: company.uuid, actorId, battleId: state.id, turn: state.turn } } },
      },
      { messageMode: "public" },
    )
  }

  static async #renderCard(company, state, actorId) {
    return foundry.applications.handlebars.renderTemplate(this.TEMPLATES.card, { company, state, member: this.memberView(company, state, actorId) })
  }

  /**
   * Réécrit la carte de conséquences des PJ dont l'état a changé.
   * @param {CdgActor} company
   * @param {Object} previous
   * @param {Object} state
   */
  static async #refreshCards(company, previous, state) {
    if (previous.turn !== state.turn) return
    for (const [actorId, member] of Object.entries(state.members)) {
      if (!member.cardId || foundry.utils.equals(member, previous.members[actorId] ?? {})) continue
      const message = game.messages.get(member.cardId)
      if (message) await message.update({ content: await this.#renderCard(company, state, actorId) })
    }
  }

  /**
   * Conclut la bataille : carte récapitulative, page du journal des batailles de la compagnie, puis
   * la compagnie est libérée pour une prochaine bataille.
   * @param {CdgActor} company
   * @param {Object} state
   */
  static async #conclude(company, state) {
    const content = await foundry.applications.handlebars.renderTemplate(this.TEMPLATES.recap, this.recapContext(company, state))
    await createChatMessage({ speaker: ChatMessage.implementation.getSpeaker({ actor: company }), content }, { messageMode: "public" })
    await this.#archive(company, state, content)
    await company.unsetFlag(SYSTEM.PACKAGE_ID, this.FLAG)
  }

  /**
   * Contexte du récapitulatif, partagé par la carte de fin et la page de journal.
   * @param {CdgActor} company
   * @param {Object} state
   * @returns {Object}
   */
  static recapContext(company, state) {
    const wound = (id) => (id ? game.i18n.localize(SYSTEM.WOUND_LEVELS[id].label) : game.i18n.localize("CDG.battle.noWound"))
    const outcome = (result) => this.outcomeName(result)
    return {
      company,
      state,
      stake: state.stake || game.i18n.localize("CDG.battle.noStake"),
      winnerLabel: game.i18n.format(`CDG.battle.winner.${state.winner}`, { company: company.name, enemy: state.general.name }),
      modifier: this.modifierLabel(state.modifier),
      general: state.general.name,
      turns: state.history.map((turn) => ({
        ...turn,
        members: turn.members.map((member) => ({
          ...member,
          positionLabel: game.i18n.localize(SYSTEM.BATTLE_POSITIONS[member.position].label),
          fightLabel: outcome(member.fight),
          woundLabel: wound(member.wound),
          skirmishLabel: member.skirmish ? game.i18n.localize(`CDG.battle.skirmish.${member.skirmish}`) : null,
        })),
        generalsLabel: turn.generals
          ? game.i18n.format(`CDG.battle.generals.points.${turn.generals.side}`, { points: turn.generals.points, company: company.name, enemy: state.general.name })
          : null,
        lossesLabel: turn.lossesRolled ? wound(turn.losses) : null,
      })),
    }
  }

  /**
   * Ajoute la bataille au journal des batailles de la compagnie, créé au premier besoin et lisible
   * par les joueurs.
   * @param {CdgActor} company
   * @param {Object} state
   * @param {string} content
   */
  static async #archive(company, state, content) {
    let journal = game.journal.find((entry) => entry.getFlag(SYSTEM.PACKAGE_ID, "battleArchive") === company.uuid)
    journal ??= await JournalEntry.implementation.create({
      name: game.i18n.format("CDG.battle.journal.name", { company: company.name }),
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      flags: { [SYSTEM.PACKAGE_ID]: { battleArchive: company.uuid } },
    })
    const name = state.stake || game.i18n.format("CDG.battle.journal.page", { number: journal.pages.size + 1 })
    return journal.createEmbeddedDocuments("JournalEntryPage", [{ name, type: "text", text: { content } }])
  }

  // #endregion

  // #region Interactions

  /**
   * Masque, pour le client courant, les boutons qui ne le concernent pas : `owner` revient au
   * propriétaire du PJ (et au Meneur), `gm` au seul Meneur.
   * @param {HTMLElement} html
   */
  static filterButtons(html) {
    for (const button of html.querySelectorAll("[data-requires]")) {
      const actor = button.closest("[data-actor-id]") ? game.actors.get(button.closest("[data-actor-id]").dataset.actorId) : null
      const allowed = button.dataset.requires === "gm" ? game.user.isGM : !!actor?.isOwner
      if (allowed) continue
      // Une position se lit encore sur le bouton désactivé ; les autres boutons disparaissent.
      if (button.classList.contains("position")) button.disabled = true
      else button.remove()
    }
  }

  /**
   * Exécute une action d'un bouton de bataille, depuis la fenêtre ou une carte.
   * @param {CdgActor} company
   * @param {HTMLElement} target Porte `data-battle-action`, et au besoin `data-adversary-id`.
   */
  static runAction(company, target) {
    const actorId = target.closest("[data-actor-id]")?.dataset.actorId
    switch (target.dataset.battleAction) {
      case "rollFight":
        return this.rollFight(company, actorId)
      case "rollProtection":
        return this.rollProtection(company, actorId)
      case "rollTactique":
        return this.rollTactique(company, actorId)
      case "drawAdversary":
        return this.drawAdversary(company, actorId)
      case "startSkirmish":
        return this.startSkirmish(company, actorId, target.dataset.adversaryUuid)
      case "openAdversary":
        return this.openAdversary(company, actorId)
      case "grantExploit":
        return this.request(company, { type: "exploit", actorId })
      case "openBattle":
        return game.system.api.applications.CdgBattleApp.open(company)
    }
  }

  /**
   * Branche les boutons d'une carte de bataille. Appelé sur `renderChatMessageHTML`.
   * @param {ChatMessage} message
   * @param {HTMLElement} html
   */
  static activateListeners(message, html) {
    const data = message.getFlag(SYSTEM.PACKAGE_ID, this.CARD_FLAG)
    if (!data) return
    const company = fromUuidSync(data.companyUuid)
    const state = this.getState(company)
    // Une carte d'un tour révolu, ou d'une bataille close, n'a plus de bouton actif.
    const stale = data.actorId && (!state || state.id !== data.battleId || state.turn !== data.turn)
    if (!game.user.isGM) for (const element of html.querySelectorAll(".gm-only")) element.remove()
    this.filterButtons(html)
    for (const button of html.querySelectorAll("[data-battle-action]")) {
      if (stale || !company) {
        button.remove()
        continue
      }
      button.addEventListener("click", (event) => {
        event.preventDefault()
        this.runAction(company, event.currentTarget)
      })
    }
  }

  // #endregion
}
