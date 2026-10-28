import { SYSTEM } from "../config/system.mjs"
import CdgRollDialog from "../applications/roll-dialog.mjs"
import CdgRoll from "../dice/cdg-roll.mjs"
import { OUTCOMES, resolveOutcome } from "../dice/roll-outcome.mjs"
import { resolveOpposedOutcome, resolveWound } from "./opposition.mjs"

/**
 * La confrontation de combat (p. 44-45) : attaque, défense, dégâts, encaissement, dans un seul
 * message de chat mis à jour au fil des jets.
 *
 * Chaque étape est un test ordinaire — même lancer, même choix de dé, même dépassement que
 * `CdgRoll` — mais aucune n'a de carte à elle : les quatre vivent dans un seul flag de message,
 * sous `attackTest`/`defenseTest`/`damageTest`/`soakTest`. « Se dépasser » restant possible sur
 * chacune, l'opposition et la blessure sont recalculées à chaque changement plutôt que figées à
 * la première résolution, ce qui permet à un dépassement tardif de corriger un résultat déjà
 * affiché — y compris une blessure déjà posée sur la fiche (`#recomputeWound` en tient compte).
 *
 * Une fois la carte créée, seul le Meneur actif l'écrit : chaque joueur lance ses dés puis lui confie
 * l'étape (`applyStep`), qu'il fusionne dans l'état relu à jour, une étape après l'autre.
 */
export default class CdgConfrontation {
  /** Gabarit de la carte de chat. */
  static CHAT_TEMPLATE = `${SYSTEM.PATH}/templates/chat/confrontation-card.hbs`

  /** Clé du drapeau qui porte l'état de la confrontation dans le message. */
  static FLAG = "confrontation"

  /** Chemin complet du drapeau, pour les mises à jour de message. */
  static get FLAG_PATH() {
    return `flags.${SYSTEM.PACKAGE_ID}.${this.FLAG}`
  }

  // #region Ouverture

  /**
   * Ouvre le test d'attaque. Mono-cible : avec une cible désignée, c'est une confrontation
   * complète (carte partagée) ; sans aucune cible, un jet d'attaque ordinaire (test isolé,
   * message autonome) — cibler n'a jamais été obligatoire pour attaquer. Une sélection ambiguë
   * (plus d'une cible) reste bloquée : ce n'est ni l'un ni l'autre cas, pas un jet libre déguisé.
   * @param {CdgActor} actor L'attaquant.
   * @param {CdgItem} weapon L'arme employée, avec son couple caractéristique/compétence.
   * @returns {Promise<CdgRollDialog|null>}
   */
  static async start(actor, weapon) {
    const targets = game.user.targets
    if (targets.size > 1) {
      ui.notifications.warn(game.i18n.localize("CDG.confrontation.notif.needSingleTarget"))
      return null
    }
    const target = targets.size === 1 ? targets.first().actor : null

    if (!target) {
      // Prévenu dès l'ouverture, le joueur peut encore annuler et cibler ; les Meneurs ne le sont
      // qu'une fois le jet réellement lancé.
      ui.notifications.warn(game.i18n.format("CDG.confrontation.notif.noTarget", { name: actor.name }))
      return CdgRollDialog.open(actor, {
        abilityId: weapon.system.attack.ability,
        skillId: weapon.system.attack.skill,
        qualityDomain: "attack",
        afterRoll: () => this.#warnGMsNoTarget(actor),
      })
    }

    return CdgRollDialog.open(actor, {
      abilityId: weapon.system.attack.ability,
      skillId: weapon.system.attack.skill,
      lockedPair: true,
      qualityDomain: "attack",
      targetUuid: target.uuid,
      postHandler: (test) => this.#postAttack(test, actor, target, weapon),
    })
  }

  /**
   * Signale aux Meneurs connectés l'attaque sans cible d'un joueur : un test isolé, que ni défense, ni
   * dégâts, ni encaissement ne suivront. Le joueur a déjà eu sa notification ; un Meneur qui attaque
   * n'avertit que lui-même.
   * @param {CdgActor} actor
   */
  static #warnGMsNoTarget(actor) {
    if (game.user.isGM) return
    const data = { name: actor.name, user: game.user.name }
    for (const gm of game.users.filter((user) => user.isGM && user.active)) gm.query("cdg.noTargetWarning", data).catch(() => {})
  }

  /**
   * Côté Meneur : affiche l'avertissement d'une attaque sans cible lancée par un joueur.
   * @param {{name: string, user: string}} data
   */
  static handleNoTargetQuery({ name, user } = {}) {
    ui.notifications.warn(game.i18n.format("CDG.confrontation.notif.noTargetGM", { name, user }))
    return true
  }

  /**
   * Lance le test d'attaque et crée le message de la confrontation.
   * @param {Object} test
   * @param {CdgActor} actor
   * @param {CdgActor} target
   * @param {CdgItem} weapon
   * @returns {Promise<ChatMessage>}
   */
  static async #postAttack(test, actor, target, weapon) {
    const { roll, data } = await CdgRoll.roll(test)
    const state = {
      attackerUuid: actor.uuid,
      targetUuid: target.uuid,
      weaponUuid: weapon.uuid,
      attackTest: data,
      defenseMethod: null,
      defenseTest: null,
      opposition: null,
      damageTest: null,
      soakTest: null,
      woundId: null,
      appliedWoundId: null,
      woundResolved: false,
    }

    // Toujours publique, quel que soit le mode du tchat : la cible doit voir la carte pour s'y défendre.
    return ChatMessage.implementation.create({
      speaker: ChatMessage.implementation.getSpeaker({ actor }),
      content: await this.renderCard(state),
      rolls: [roll],
      flags: { [SYSTEM.PACKAGE_ID]: { [this.FLAG]: state } },
    })
  }

  // #endregion

  // #region Carte de chat

  /**
   * L'état de confrontation porté par un message, ou `null` si ce n'en est pas un.
   *
   * Toujours un clone : les gestionnaires de clic mutent librement l'objet reçu avant de le
   * repasser à `message.update()`, et muter la donnée du flag en place la rendrait indiscernable
   * de la valeur qu'on s'apprête à écrire, au risque que la mise à jour ne parte pas.
   * @param {ChatMessage} message
   * @returns {Object|null}
   */
  static getState(message) {
    const state = message.getFlag(SYSTEM.PACKAGE_ID, this.FLAG)
    return state ? foundry.utils.deepClone(state) : null
  }

  /**
   * Compose le contenu de la carte.
   * @param {Object} state
   * @returns {Promise<string>}
   */
  static async renderCard(state) {
    return foundry.applications.handlebars.renderTemplate(this.CHAT_TEMPLATE, this.cardContext(state))
  }

  /**
   * Contexte du gabarit : les acteurs impliqués, chaque sous-jet déjà lancé (rendu par
   * `CdgRoll.cardContext`, réutilisé tel quel) et les drapeaux d'affichage des boutons.
   * @param {Object} state
   * @returns {Object}
   */
  static cardContext(state) {
    const attacker = fromUuidSync(state.attackerUuid)
    const target = fromUuidSync(state.targetUuid)
    const weapon = fromUuidSync(state.weaponUuid)
    const attack = CdgRoll.cardContext(state.attackTest)

    const context = {
      state,
      attacker,
      target,
      weapon,
      attack,
      // Le test d'opposition compare toujours les deux jets, y compris un échec ou un
      // échec critique de l'attaquant : la cible se défend dans tous les cas.
      canChooseDefense: !state.defenseTest,
      parryBlocked: !!target?.system.combat.parryUsed,
      parryNeedsShield: !!weapon?.system.isRangedWeapon && !target?.shield,
      // Une confrontation résolue replie toutes ses phases : la carte cesse de grandir, et seuls le
      // verdict et la blessure restent à lire. Toujours dépliables à la main — `<details>`, pas masquées.
      resolved: this.isResolved(state),
      collapsePriorPhases: this.isResolved(state),
      SYSTEM,
    }

    if (state.defenseTest) {
      context.defense = CdgRoll.cardContext(state.defenseTest)
      context.defenseMethod = state.defenseMethod
    }

    if (state.opposition) {
      context.opposition = state.opposition
      context.canRollDamage = state.opposition.hit && !state.damageTest
      context.canRollSoak = state.opposition.hit && !state.soakTest
    }

    if (state.damageTest) context.damage = CdgRoll.cardContext(state.damageTest)
    if (state.soakTest) context.soak = CdgRoll.cardContext(state.soakTest)

    // Une fois les dégâts engagés, le coup est acquis : on ne se dépasse plus pour toucher ni pour
    // se défendre.
    if (this.#touchSettled(state)) {
      attack.canPush = false
      if (context.defense) context.defense.canPush = false
    }

    if (state.woundResolved) {
      context.woundResolved = true
      const woundOverflowed = !!state.appliedWoundId && state.appliedWoundId !== state.woundId
      context.woundLabel = woundOverflowed
        ? game.i18n.format(`CDG.confrontation.woundOverflow.${state.appliedWoundId}`, {
            wound: game.i18n.localize(SYSTEM.WOUND_LEVELS[state.woundId].label),
          })
        : state.appliedWoundId
          ? game.i18n.localize(SYSTEM.WOUND_LEVELS[state.appliedWoundId].label)
          : state.woundId
            ? game.i18n.localize("CDG.confrontation.woundSaturated")
            : game.i18n.localize("CDG.confrontation.noWound")
    }

    return context
  }

  // #endregion

  // #region Écriture par le Meneur

  /**
   * Une confrontation est résolue quand la blessure est appliquée, ou quand le coup a manqué : il n'y
   * a alors ni dégâts ni encaissement. Se dépasser sur un coup manqué peut la rouvrir.
   * @param {Object} state
   * @returns {boolean}
   */
  static isResolved(state) {
    return !!state.woundResolved || (!!state.opposition && !state.opposition.hit)
  }

  /**
   * Le stade des dégâts est atteint dès qu'un test de dégâts ou d'encaissement a été lancé.
   * @param {Object} state
   * @returns {boolean}
   */
  static #touchSettled(state) {
    return !!(state.damageTest || state.soakTest)
  }

  /** Les quatre sous-jets d'une confrontation, dans l'ordre de la carte. */
  static PHASES = ["attack", "defense", "damage", "soak"]

  /**
   * La file d'attente de chaque message : les étapes d'une même confrontation s'appliquent l'une
   * après l'autre, chacune sur l'état laissé par la précédente.
   * @type {Map<string, Promise>}
   */
  static #queues = new Map()

  /**
   * Fait écrire une étape de la confrontation par le Meneur actif.
   *
   * Le Meneur est le seul écrivain de la carte. Les dégâts de l'attaquant et l'encaissement de la
   * cible se lancent en même temps, sur deux postes : si chacun réécrivait tout l'état, le second à
   * arriver effacerait le jet du premier, lu avant son arrivée. Les dés restent lancés chez le joueur
   * — Dice So Nice, dépenses de réserve — ; seule l'écriture est confiée au Meneur, qui relit l'état
   * à jour et n'y fusionne que la phase reçue.
   * @param {Object} step Voir `applyStep`.
   * @returns {Promise<boolean>}
   */
  static async #submitStep(step) {
    if (game.user.isGM) return this.applyStep(step, game.user)
    if (!game.users.activeGM) {
      ui.notifications.error(game.i18n.localize("CDG.confrontation.notif.noGM"))
      return false
    }
    return game.users.activeGM.query("cdg.confrontationStep", step)
  }

  /**
   * Requête `cdg.confrontationStep`, exécutée par le Meneur actif pour le compte d'un joueur.
   * @param {Object} step
   * @param {{user: User}} context
   * @returns {Promise<boolean>}
   */
  static async handleStepQuery(step, { user } = {}) {
    if (!game.user.isGM || !user) return false
    return CdgConfrontation.applyStep(step, user)
  }

  /**
   * Met l'étape dans la file de son message.
   * @param {Object} step
   * @param {string} step.messageId Le message de la confrontation.
   * @param {"merge"|"push"|"keepDie"} step.type Nouveau sous-jet, dépassement, ou dé conservé changé.
   * @param {"attack"|"defense"|"damage"|"soak"} step.phase
   * @param {Object} [step.data] Le test lancé (`merge`, `push`).
   * @param {Object} [step.roll] Le jet, sérialisé, à joindre au message (`merge`, `push`).
   * @param {number} [step.index] Le dé à conserver (`keepDie`).
   * @param {string} [step.defenseMethod] `dodge` ou `parry` (`merge` de la défense).
   * @param {User} user L'utilisateur pour le compte de qui l'étape est écrite.
   * @returns {Promise<boolean>}
   */
  static applyStep(step, user) {
    const messageId = step?.messageId
    const previous = this.#queues.get(messageId) ?? Promise.resolve()
    const next = previous.catch(() => {}).then(() => this.#applyStep(step, user))
    this.#queues.set(messageId, next)
    next.finally(() => {
      if (this.#queues.get(messageId) === next) this.#queues.delete(messageId)
    })
    return next
  }

  /**
   * Applique une étape sur l'état relu du message.
   *
   * Tout est vérifié avant écriture : une requête fabriquée à la main ne doit ni viser un autre
   * message, ni écrire la phase de l'autre camp, ni écraser un sous-jet déjà lancé.
   * @param {Object} step
   * @param {User} user
   * @returns {Promise<boolean>}
   */
  static async #applyStep(step, user) {
    const message = game.messages.get(step?.messageId)
    const state = message ? this.getState(message) : null
    if (!state || !this.PHASES.includes(step.phase) || !this.#canAct(step.phase, state, user)) return false

    const key = `${step.phase}Test`
    const current = state[key]
    switch (step.type) {
      case "merge":
        if (current || !this.#isTest(step.data)) return false
        // Dégâts et encaissement ne se lancent qu'une fois le coup porté.
        if (["damage", "soak"].includes(step.phase) && !state.opposition?.hit) return false
        state[key] = step.data
        if (step.phase === "defense") state.defenseMethod = ["dodge", "parry"].includes(step.defenseMethod) ? step.defenseMethod : null
        break
      case "push":
        if (!current || current.pushed || !this.#isTest(step.data)) return false
        if (["attack", "defense"].includes(step.phase) && this.#touchSettled(state)) return false
        state[key] = { ...step.data, pushed: true, isPush: true }
        break
      case "keepDie": {
        const index = Number(step.index)
        if (!user.isGM || !current || !Number.isInteger(index) || index < 0 || index >= current.results.length) return false
        state[key] = { ...current, keptIndex: index }
        break
      }
      default:
        return false
    }

    this.#recomputeOpposition(state)
    await this.#recomputeWound(state)

    const rolls = step.roll ? [...message.rolls, Roll.fromData(step.roll)] : message.rolls
    await message.update({ content: await this.renderCard(state), rolls, [this.FLAG_PATH]: state })
    return true
  }

  /**
   * Un test lancé a-t-il la forme attendue : des dés, un indice de dé conservé parmi eux, un seuil ?
   * @param {Object} test
   * @returns {boolean}
   */
  static #isTest(test) {
    return (
      !!test &&
      Array.isArray(test.results) &&
      test.results.length > 0 &&
      Number.isInteger(test.keptIndex) &&
      test.keptIndex >= 0 &&
      test.keptIndex < test.results.length &&
      Number.isFinite(test.sr)
    )
  }

  // #endregion

  // #region Sous-jets

  /**
   * Lance un sous-jet et le confie au Meneur, qui le fusionne et recalcule tout ce qui en dépend.
   * @param {ChatMessage} message
   * @param {"attack"|"defense"|"damage"|"soak"} phase
   * @param {Object} test Le test préparé par la fenêtre de jet, pas encore lancé.
   * @param {Object} [extra] Champs propres à l'étape (ex. `defenseMethod`).
   * @returns {Promise<boolean>}
   */
  static async #mergeSubTest(message, phase, test, extra = {}) {
    const { roll, data } = await CdgRoll.roll(test)
    return this.#submitStep({ messageId: message.id, type: "merge", phase, data, roll: roll.toJSON(), ...extra })
  }

  /**
   * Recalcule l'issue de l'opposition attaque/défense (Phase 2), à chaque changement de l'un des
   * deux sous-jets — un dépassement tardif doit pouvoir la corriger, pas seulement la poser une
   * fois pour toutes.
   * @param {Object} state
   */
  static #recomputeOpposition(state) {
    if (!state.attackTest || !state.defenseTest) {
      state.opposition = null
      return
    }

    const attackOutcome = resolveOutcome(state.attackTest.results[state.attackTest.keptIndex], state.attackTest.sr)
    const defenseOutcome = resolveOutcome(state.defenseTest.results[state.defenseTest.keptIndex], state.defenseTest.sr)
    const result = resolveOpposedOutcome(attackOutcome, defenseOutcome)

    state.opposition = {
      result,
      hit: result === OUTCOMES.success.id || result === OUTCOMES.criticalSuccess.id,
      ignoreArmor: result === OUTCOMES.criticalSuccess.id,
    }
  }

  /**
   * Recalcule la gravité de la blessure (Phase 3) et l'applique sur la cible. Si un dépassement
   * change le résultat après une première application, la case précédente est libérée avant que
   * la nouvelle ne soit cochée — jamais les deux à la fois.
   *
   * Toujours exécuté par le Meneur (voir `applyStep`), qui peut écrire sur n'importe quelle cible,
   * PNJ synthétique d'un token non lié compris.
   * @param {Object} state
   */
  static async #recomputeWound(state) {
    // Ce qui est effectivement coché sur la cible en ce moment, pas seulement le dernier
    // `woundId` calculé : un dépassement tardif sur l'attaque ou la défense peut faire retomber
    // une confrontation déjà résolue (et déjà appliquée) à un raté, et il faut alors libérer la
    // case posée — pas seulement s'abstenir d'en cocher une nouvelle.
    const previousAppliedWoundId = state.woundResolved ? state.appliedWoundId : null
    const previousRawWoundId = state.woundResolved ? state.woundId : null

    if (!state.opposition?.hit || !state.damageTest || !state.soakTest) {
      state.woundId = null
      state.woundResolved = false
    } else {
      const damageOutcome = resolveOutcome(state.damageTest.results[state.damageTest.keptIndex], state.damageTest.sr)
      const soakOutcome = resolveOutcome(state.soakTest.results[state.soakTest.keptIndex], state.soakTest.sr)
      state.woundId = resolveWound(damageOutcome, soakOutcome)
      state.woundResolved = true
    }

    const newRawWoundId = state.woundResolved ? state.woundId : null
    if (newRawWoundId === previousRawWoundId) return // Rien n'a changé depuis la dernière application

    const target = await fromUuid(state.targetUuid)
    state.appliedWoundId = target ? await target.applyWoundOverflow(previousAppliedWoundId, newRawWoundId) : null
  }

  // #endregion

  // #region Interactions

  /**
   * Qui a le droit d'agir pour un sous-jet donné : l'attaquant pour l'attaque et les dégâts, la
   * cible pour la défense et l'encaissement — jamais l'autre, et toujours le Meneur.
   *
   * Vérifié deux fois : ici, pour décider quels boutons brancher ou masquer, et à nouveau par le
   * Meneur avant d'écrire l'étape, pour le compte de l'utilisateur qui la demande — masquer un bouton
   * ne fait qu'écarter l'affichage, un client modifié pourrait encore envoyer la requête.
   * @param {"attack"|"defense"|"damage"|"soak"} phase
   * @param {Object} state
   * @param {User} [user]
   * @returns {boolean}
   */
  static #canAct(phase, state, user = game.user) {
    if (user.isGM) return true
    return !!this.#phaseActor(phase, state)?.testUserPermission(user, "OWNER")
  }

  /**
   * L'acteur qui agit à cette étape : l'attaquant pour l'attaque et les dégâts, la cible sinon.
   * @param {"attack"|"defense"|"damage"|"soak"} phase
   * @param {Object} state
   * @returns {Actor|null}
   */
  static #phaseActor(phase, state) {
    return fromUuidSync(["attack", "damage"].includes(phase) ? state.attackerUuid : state.targetUuid) ?? null
  }

  /**
   * Le Meneur voit tous les boutons, pour débloquer une situation, mais ceux qui reviennent à un
   * joueur sont en retrait : ceux des PNJ, qu'il doit cliquer lui-même, ressortent d'emblée.
   * @param {HTMLButtonElement} button
   * @param {"attack"|"defense"|"damage"|"soak"} phase
   * @param {Object} state
   */
  static #markPlayerSide(button, phase, state) {
    if (game.user.isGM && this.#phaseActor(phase, state)?.hasPlayerOwner) button.classList.add("player-side")
  }

  /**
   * Branche les boutons de la carte. Appelé sur `renderChatMessageHTML`, comme `CdgRoll`, mais ne
   * fait rien sur un message qui ne porte pas de confrontation.
   * @param {ChatMessage} message
   * @param {HTMLElement} html
   */
  static activateListeners(message, html) {
    const state = this.getState(message)
    if (!state) return
    // Le message entier se repère comme clos dans le tchat, pas seulement la carte.
    html.classList.toggle("cdg-resolved", this.isResolved(state))

    for (const button of html.querySelectorAll("[data-action='keepDie']")) {
      if (!game.user.isGM) {
        button.disabled = true
        continue
      }
      button.addEventListener("click", (event) => this.#onKeepDie(event, message))
    }

    for (const button of html.querySelectorAll("[data-action='pushTest']")) {
      if (!this.#canAct(button.dataset.phase, state)) {
        button.style.display = "none"
        continue
      }
      this.#markPlayerSide(button, button.dataset.phase, state)
      button.addEventListener("click", (event) => this.#onPushTest(event, message))
    }

    for (const button of html.querySelectorAll("[data-action='chooseDefense']")) {
      if (!this.#canAct("defense", state)) {
        button.style.display = "none"
        continue
      }
      this.#markPlayerSide(button, "defense", state)
      button.addEventListener("click", (event) => this.#onChooseDefense(event, message))
    }

    const damageButton = html.querySelector("[data-action='rollDamage']")
    if (damageButton) {
      if (!this.#canAct("damage", state)) damageButton.style.display = "none"
      else {
        this.#markPlayerSide(damageButton, "damage", state)
        damageButton.addEventListener("click", () => this.#onRollDamage(message))
      }
    }

    const soakButton = html.querySelector("[data-action='rollSoak']")
    if (soakButton) {
      if (!this.#canAct("soak", state)) soakButton.style.display = "none"
      else {
        this.#markPlayerSide(soakButton, "soak", state)
        soakButton.addEventListener("click", () => this.#onRollSoak(message))
      }
    }
  }

  /**
   * Le Meneur outrepasse le dé conservé d'un sous-jet ; les calculs dérivés suivent.
   * @param {PointerEvent} event
   * @param {ChatMessage} message
   */
  static async #onKeepDie(event, message) {
    event.preventDefault()
    if (!game.user.isGM) return
    const button = event.currentTarget
    const index = parseInt(button.dataset.index)
    if (isNaN(index)) return
    return this.#submitStep({ messageId: message.id, type: "keepDie", phase: button.dataset.phase, index })
  }

  /**
   * Se dépasser sur un sous-jet de la confrontation — même coût, même limite d'une fois par test,
   * que sur un jet isolé (voir `CdgActor#spendPush`).
   * @param {PointerEvent} event
   * @param {ChatMessage} message
   */
  static async #onPushTest(event, message) {
    event.preventDefault()
    const phase = event.currentTarget.dataset.phase
    const state = this.getState(message)
    if (!state || !this.#canAct(phase, state)) return
    const test = state[`${phase}Test`]
    if (!test || test.pushed) return

    const actor = await fromUuid(["attack", "damage"].includes(phase) ? state.attackerUuid : state.targetUuid)
    if (!actor) return ui.notifications.warn(game.i18n.localize("CDG.roll.notif.actorMissing"))
    if (!(await actor.spendPush())) return

    const { roll, data } = await CdgRoll.roll({ ...test, pushed: true, isPush: true })
    return this.#submitStep({ messageId: message.id, type: "push", phase, data, roll: roll.toJSON() })
  }

  /**
   * La cible choisit sa défense — esquive ou parade — et ouvre le test correspondant.
   * @param {PointerEvent} event
   * @param {ChatMessage} message
   */
  static async #onChooseDefense(event, message) {
    const defense = event.currentTarget.dataset.defense
    if (!["dodge", "parry"].includes(defense)) return

    const state = this.getState(message)
    if (!state || !this.#canAct("defense", state)) return
    const target = await fromUuid(state.targetUuid)
    if (!target) return

    if (defense === "parry" && target.system.combat.parryUsed) {
      ui.notifications.warn(game.i18n.localize("CDG.combat.defense.parryAlreadyUsed"))
    }
    const dodgeCount = target.system.combat.dodgesUsed

    return CdgRollDialog.open(target, {
      abilityId: defense === "dodge" ? "vivacite" : "corps",
      skillId: defense === "dodge" ? "esquive" : "blocage",
      lockedPair: true,
      qualityDomain: defense === "parry" ? "parry" : null,
      postHandler: async (test) => {
        // La défense n'est décomptée que si le Meneur a bien retenu le jet.
        if (!(await this.#mergeSubTest(message, "defense", test, { defenseMethod: defense }))) return
        return defense === "dodge" ? target.update({ "system.combat.dodgesUsed": dodgeCount + 1 }) : target.update({ "system.combat.parryUsed": true })
      },
    })
  }

  /**
   * L'attaquant lance Corps/Dégâts avec le rang de l'arme employée.
   * @param {ChatMessage} message
   */
  static async #onRollDamage(message) {
    const state = this.getState(message)
    if (!state || !this.#canAct("damage", state)) return
    const attacker = await fromUuid(state.attackerUuid)
    const weapon = await fromUuid(state.weaponUuid)
    if (!attacker || !weapon) return

    return CdgRollDialog.open(attacker, {
      abilityId: "corps",
      rank: weapon.system.damage.rank,
      label: "CDG.combat.damageTest",
      lockedPair: true,
      qualityDomain: "damage",
      postHandler: (test) => this.#mergeSubTest(message, "damage", test),
    })
  }

  /**
   * La cible lance Corps/Protection avec le rang de son armure — 0 si l'opposition a ignoré
   * l'armure (réussite critique de l'attaquant).
   * @param {ChatMessage} message
   */
  static async #onRollSoak(message) {
    const state = this.getState(message)
    if (!state || !this.#canAct("soak", state)) return
    const target = await fromUuid(state.targetUuid)
    if (!target) return

    return CdgRollDialog.open(target, {
      abilityId: "corps",
      rank: state.opposition?.ignoreArmor ? 0 : (target.armor?.system.protection.rank ?? 0),
      label: "CDG.combat.soakTest",
      lockedPair: true,
      qualityDomain: "soak",
      toggles: { wound: false },
      postHandler: (test) => this.#mergeSubTest(message, "soak", test),
    })
  }

  // #endregion
}
