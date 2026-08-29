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
 * affiché — y compris une blessure déjà posée sur la fiche (`#applyWound` en tient compte).
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
      return CdgRollDialog.open(actor, {
        abilityId: weapon.system.attack.ability,
        skillId: weapon.system.attack.skill,
      })
    }

    return CdgRollDialog.open(actor, {
      abilityId: weapon.system.attack.ability,
      skillId: weapon.system.attack.skill,
      lockedPair: true,
      targetUuid: target.uuid,
      postHandler: (test) => this.#postAttack(test, actor, target, weapon),
    })
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

    const context = {
      state,
      attacker,
      target,
      weapon,
      attack: CdgRoll.cardContext(state.attackTest),
      canChooseDefense: !state.defenseTest,
      parryBlocked: !!target?.system.combat.parryUsed,
      parryNeedsShield: !!weapon?.system.isRangedWeapon && !target?.shield,
      // La confrontation est close une fois l'encaissement résolu : les phases précédentes se
      // replient d'office pour que la carte cesse de grandir et de repousser hors champ ce qui
      // reste interactif. Toujours dépliables à la main malgré tout — `<details>`, pas masquées.
      collapsePriorPhases: state.woundResolved,
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

    if (state.woundResolved) {
      context.woundResolved = true
      context.woundLabel = state.appliedWoundId
        ? game.i18n.localize(SYSTEM.WOUND_LEVELS[state.appliedWoundId].label)
        : state.woundId
          ? game.i18n.localize("CDG.confrontation.woundSaturated")
          : game.i18n.localize("CDG.confrontation.noWound")
      context.woundOverflowed = !!state.appliedWoundId && state.appliedWoundId !== state.woundId
    }

    return context
  }

  /**
   * Réécrit la carte d'un message après un jet. Passe par `updateShared` : le message n'appartient
   * qu'à l'attaquant, pas à la cible.
   * @param {ChatMessage} message
   * @param {Object} state
   * @param {Roll} [newRoll] Le jet qui vient d'être ajouté, à conserver aux côtés des précédents.
   * @returns {Promise<ChatMessage>}
   */
  static async #refresh(message, state, newRoll) {
    const rolls = newRoll ? [...message.rolls, newRoll] : message.rolls
    return this.updateShared(message, { content: await this.renderCard(state), rolls, [this.FLAG_PATH]: state })
  }

  /**
   * Met à jour le message partagé, en tenant compte du fait que seuls l'auteur (l'attaquant) et le
   * Meneur peuvent écrire un `ChatMessage` — la cible doit passer par le Meneur actif, comme le
   * fait `co2`.
   * @param {ChatMessage} message
   * @param {Object} updateData
   * @returns {Promise<ChatMessage|void>}
   */
  static async updateShared(message, updateData) {
    if (game.user.isGM || message.isAuthor) return message.update(updateData)
    if (!game.users.activeGM) return ui.notifications.error(game.i18n.localize("CDG.confrontation.notif.noGM"))
    return game.users.activeGM.query("cdg.updateConfrontation", { messageId: message.id, updateData })
  }

  /**
   * Point d'entrée de la requête exécutée par le Meneur pour appliquer une blessure à un acteur
   * que le joueur ne possède pas (typiquement le PNJ synthétique d'un token non lié).
   *
   * Les niveaux sont vérifiés avant de toucher au document : une requête fabriquée à la main ne
   * doit pas pouvoir transformer des identifiants arbitraires en chemins de mise à jour.
   * @param {Object} request
   * @param {string} request.targetUuid
   * @param {string|null} request.previousWoundId
   * @param {string|null} request.newWoundId
   * @returns {Promise<string|null>}
   */
  static async handleApplyWoundQuery({ targetUuid, previousWoundId = null, newWoundId = null } = {}) {
    if (!game.user.isGM || typeof targetUuid !== "string") return null
    const validLevels = new Set(Object.keys(SYSTEM.WOUND_LEVELS))
    if ((previousWoundId !== null && !validLevels.has(previousWoundId)) || (newWoundId !== null && !validLevels.has(newWoundId))) return null

    const target = await fromUuid(targetUuid)
    if (!(target instanceof Actor)) return null
    return target.applyWoundOverflow(previousWoundId, newWoundId)
  }

  // #endregion

  // #region Sous-jets

  /**
   * Fusionne un sous-jet dans l'état de la confrontation, puis recalcule tout ce qui en dépend.
   * @param {ChatMessage} message
   * @param {"attack"|"defense"|"damage"|"soak"} phase
   * @param {Object} test Le test préparé par la fenêtre de jet, pas encore lancé.
   * @param {Object} [extra] Champs additionnels à fusionner dans l'état (ex. `defenseMethod`).
   * @returns {Promise<ChatMessage>}
   */
  static async #mergeSubTest(message, phase, test, extra = {}) {
    const { roll, data } = await CdgRoll.roll(test)
    const state = this.getState(message)
    state[`${phase}Test`] = data
    Object.assign(state, extra)

    this.#recomputeOpposition(state)
    await this.#recomputeWound(state)

    return this.#refresh(message, state, roll)
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

    state.appliedWoundId = await this.#applyWound(previousAppliedWoundId, newRawWoundId, state.targetUuid)
  }

  /**
   * Coche la nouvelle case de blessure sur la cible (avec débordement, voir
   * `CdgActor#applyWoundOverflow`) et libère l'ancienne, quand l'une ou l'autre (ou les deux)
   * existent — un dépassement peut aussi bien changer la gravité que faire disparaître une
   * blessure déjà posée.
   * @param {string|null} previousWoundId Case réellement cochée à libérer (débordement compris).
   * @param {string|null} newWoundId Gravité brute résolue par `resolveWound`.
   * @param {string} targetUuid
   * @returns {Promise<string|null>} La case réellement cochée pour `newWoundId`.
   */
  static async #applyWound(previousWoundId, newWoundId, targetUuid) {
    const target = await fromUuid(targetUuid)
    if (!target) return null
    if (game.user.isGM || target.isOwner) return target.applyWoundOverflow(previousWoundId, newWoundId)
    if (!game.users.activeGM) {
      ui.notifications.error(game.i18n.localize("CDG.confrontation.notif.noGM"))
      return null
    }
    return game.users.activeGM.query("cdg.applyWound", { targetUuid, previousWoundId, newWoundId })
  }

  // #endregion

  // #region Interactions

  /**
   * Qui a le droit d'agir pour un sous-jet donné : l'attaquant pour l'attaque et les dégâts, la
   * cible pour la défense et l'encaissement — jamais l'autre, et toujours le Meneur.
   *
   * Vérifié deux fois : ici, pour décider quels boutons brancher ou masquer, et à nouveau au tout
   * début de chaque gestionnaire — masquer un bouton ne fait qu'écarter l'affichage, un client
   * modifié pourrait encore déclencher l'action directement.
   * @param {"attack"|"defense"|"damage"|"soak"} phase
   * @param {Object} state
   * @returns {boolean}
   */
  static #canAct(phase, state) {
    if (game.user.isGM) return true
    const actorUuid = ["attack", "damage"].includes(phase) ? state.attackerUuid : state.targetUuid
    return !!fromUuidSync(actorUuid)?.isOwner
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
      button.addEventListener("click", (event) => this.#onPushTest(event, message))
    }

    for (const button of html.querySelectorAll("[data-action='chooseDefense']")) {
      if (!this.#canAct("defense", state)) {
        button.style.display = "none"
        continue
      }
      button.addEventListener("click", (event) => this.#onChooseDefense(event, message))
    }

    const damageButton = html.querySelector("[data-action='rollDamage']")
    if (damageButton) {
      if (!this.#canAct("damage", state)) damageButton.style.display = "none"
      else damageButton.addEventListener("click", () => this.#onRollDamage(message))
    }

    const soakButton = html.querySelector("[data-action='rollSoak']")
    if (soakButton) {
      if (!this.#canAct("soak", state)) soakButton.style.display = "none"
      else soakButton.addEventListener("click", () => this.#onRollSoak(message))
    }
  }

  /**
   * Le Meneur outrepasse le dé conservé d'un sous-jet et relance les calculs dérivés.
   * @param {PointerEvent} event
   * @param {ChatMessage} message
   */
  static async #onKeepDie(event, message) {
    event.preventDefault()
    if (!game.user.isGM) return
    const button = event.currentTarget
    const phase = button.dataset.phase
    const index = parseInt(button.dataset.index)
    const state = this.getState(message)
    const test = state?.[`${phase}Test`]
    if (!test || isNaN(index) || index === test.keptIndex) return

    state[`${phase}Test`] = { ...test, keptIndex: index }
    this.#recomputeOpposition(state)
    await this.#recomputeWound(state)

    return this.#refresh(message, state)
  }

  /**
   * Se dépasser sur un sous-jet de la confrontation — même coût, même limite d'une fois par test,
   * que sur un jet isolé (voir `CdgRoll`).
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

    const drained = Object.values(SYSTEM.ABILITIES).filter((ability) => actor.system.abilities[ability.id].value <= 1)
    if (drained.length > 0) {
      const names = drained.map((ability) => game.i18n.localize(ability.label)).join(", ")
      return ui.notifications.warn(game.i18n.format("CDG.roll.notif.cannotPush", { abilities: names }))
    }

    const updates = {}
    for (const ability of Object.values(SYSTEM.ABILITIES)) {
      updates[`system.abilities.${ability.id}.value`] = actor.system.abilities[ability.id].value - 1
    }
    await actor.update(updates)

    const { roll, data } = await CdgRoll.roll({ ...test, pushed: true, isPush: true })
    state[`${phase}Test`] = data
    this.#recomputeOpposition(state)
    await this.#recomputeWound(state)

    return this.#refresh(message, state, roll)
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
      postHandler: async (test) => {
        await this.#mergeSubTest(message, "defense", test, { defenseMethod: defense })
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
      toggles: { wound: false },
      postHandler: (test) => this.#mergeSubTest(message, "soak", test),
    })
  }

  // #endregion
}
