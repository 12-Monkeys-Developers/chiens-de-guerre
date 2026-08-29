import { SYSTEM } from "../config/system.mjs"
import CdgConfrontation from "../combat/confrontation.mjs"
import CdgInitiativeDialog from "../applications/initiative-dialog.mjs"
import CdgRollDialog from "../applications/roll-dialog.mjs"

/** Création et exécution des raccourcis de la barre de macros. */
export default class CdgMacros {
  /**
   * Crée (ou réutilise) la macro décrite par un dépôt, puis l'affecte au slot demandé.
   * @param {Object} dropData
   * @param {number} slot
   */
  static async createMacro(dropData, slot) {
    const macroData = this.#macroData(dropData)
    if (!macroData) return null

    const existing = game.macros.find((macro) => macro.author?.isSelf && macro.name === macroData.name && macro.command === macroData.command)
    const macro = existing ?? (await Macro.create(macroData))
    if (macro) await game.user.assignHotbarMacro(macro, slot)
    return macro
  }

  /**
   * Décrit la macro correspondant au payload CDG.
   * @param {Object} dropData
   * @returns {Object|null}
   */
  static #macroData(dropData) {
    const common = {
      type: "script",
      scope: "actor",
      flags: { [SYSTEM.PACKAGE_ID]: { macro: dropData.cdgMacro } },
    }

    switch (dropData.cdgMacro) {
      case "weapon":
        return {
          ...common,
          name: game.i18n.format("CDG.macro.weapon", { name: dropData.name }),
          img: dropData.img,
          command: [
            `if (game.keyboard.isModifierActive("SHIFT")) game.system.api.macros.rollDamage(${JSON.stringify(dropData.uuid)}, ${JSON.stringify(dropData.name)})`,
            `else game.system.api.macros.rollWeapon(${JSON.stringify(dropData.uuid)}, ${JSON.stringify(dropData.name)})`,
          ].join("\n"),
        }
      case "test": {
        const isAbility = !!dropData.abilityId
        const id = dropData.abilityId ?? dropData.skillId
        const definition = isAbility ? SYSTEM.ABILITIES[id] : SYSTEM.SKILLS[id]
        if (!id || !definition) return null
        const label = game.i18n.localize(definition.label)
        return {
          ...common,
          name: game.i18n.format(isAbility ? "CDG.macro.ability" : "CDG.macro.skill", { name: label }),
          img: "icons/svg/dice-target.svg",
          command: `game.system.api.macros.rollTest(${JSON.stringify(dropData.abilityId ?? null)}, ${JSON.stringify(dropData.skillId ?? null)})`,
        }
      }
      case "defense":
        if (!["dodge", "parry"].includes(dropData.defense)) return null
        return {
          ...common,
          name: game.i18n.localize(`CDG.combat.defense.${dropData.defense}`),
          img: "icons/svg/dice-target.svg",
          command: `game.system.api.macros.rollDefense(${JSON.stringify(dropData.defense)})`,
        }
      case "initiative":
        return {
          ...common,
          name: game.i18n.localize("CDG.combat.initiative.title"),
          img: "icons/svg/dice-target.svg",
          command: "game.system.api.macros.rollInitiative()",
        }
      case "soak":
        return {
          ...common,
          name: game.i18n.localize("CDG.combat.soakTest"),
          img: "icons/svg/dice-target.svg",
          command: "game.system.api.macros.rollSoak()",
        }
      default:
        return null
    }
  }

  /**
   * Retourne l'acteur du token ou de l'acteur actuellement sélectionné.
   * @param {Object} options
   * @param {boolean} options.warn Afficher un avertissement quand aucun acteur n'est sélectionné.
   */
  static selectedActor({ warn = true } = {}) {
    const speaker = ChatMessage.getSpeaker()
    let actor = speaker.token ? game.actors.tokens[speaker.token] : null
    actor ??= game.actors.get(speaker.actor)
    if (!actor && warn) ui.notifications.warn("CDG.macro.noActor", { localize: true })
    return actor ?? null
  }

  /**
   * Ouvre un test de caractéristique ou de compétence sur l'acteur sélectionné.
   * @param {string|null} abilityId
   * @param {string|null} skillId
   * @param {Actor|null} actor
   * @param {Object} [options]
   * @param {boolean} [options.lockedPair] Empêche de changer de caractéristique — les compétences
   *   de compagnie franche (p. 124) n'ont, à la différence de celles du personnage, qu'un seul
   *   couple possible.
   */
  static async rollTest(abilityId = null, skillId = null, actor = null, { lockedPair = false } = {}) {
    actor ??= this.selectedActor()
    if (!actor) return null
    return CdgRollDialog.open(actor, { abilityId, skillId, qualityDomain: "skill", lockedPair })
  }

  /**
   * Résout et valide l'arme liée à un jet, avec repli par nom sur l'acteur sélectionné.
   * @param {string} itemUuid
   * @param {string} itemName
   */
  static async #resolveWeapon(itemUuid, itemName) {
    let weapon = itemUuid ? await fromUuid(itemUuid) : null
    if (!weapon) {
      const actor = this.selectedActor()
      if (!actor) return null
      weapon = actor.items.find((item) => item.name === itemName && item.system.isWeapon)
    }
    if (!weapon?.system.isWeapon) {
      ui.notifications.warn(game.i18n.format("CDG.macro.weaponMissing", { name: itemName }))
      return null
    }
    if (!weapon.system.equipped) {
      ui.notifications.warn("CDG.combat.weapon.notEquipped", { localize: true })
      return null
    }
    return weapon
  }

  /**
   * Lance l'attaque de l'arme liée, avec repli par nom sur l'acteur sélectionné.
   * @param {string} itemUuid
   * @param {string} itemName
   */
  static async rollWeapon(itemUuid, itemName) {
    const weapon = await this.#resolveWeapon(itemUuid, itemName)
    if (!weapon) return null
    return CdgConfrontation.start(weapon.parent, weapon)
  }

  /**
   * Ouvre le jet de dégâts (Corps / rang de l'arme), indépendamment de toute confrontation.
   * @param {string} itemUuid
   * @param {string} itemName
   */
  static async rollDamage(itemUuid, itemName) {
    const weapon = await this.#resolveWeapon(itemUuid, itemName)
    if (!weapon) return null
    return CdgRollDialog.open(weapon.parent, {
      abilityId: "corps",
      rank: weapon.system.damage.rank,
      label: "CDG.combat.damageTest",
      lockedPair: true,
      qualityDomain: "damage",
    })
  }

  /**
   * Ouvre une esquive ou une parade, puis consomme la défense après le jet.
   * @param {"dodge"|"parry"} defense
   * @param {Actor|null} actor
   */
  static async rollDefense(defense, actor = null) {
    if (!["dodge", "parry"].includes(defense)) return null
    actor ??= this.selectedActor()
    if (!actor) return null
    if (defense === "parry" && actor.system.combat.parryUsed) ui.notifications.warn("CDG.combat.defense.parryAlreadyUsed", { localize: true })
    const dodgeCount = actor.system.combat.dodgesUsed
    return CdgRollDialog.open(actor, {
      abilityId: defense === "dodge" ? "vivacite" : "corps",
      skillId: defense === "dodge" ? "esquive" : "blocage",
      lockedPair: true,
      qualityDomain: defense === "parry" ? "parry" : null,
      afterRoll: () => (defense === "dodge" ? actor.update({ "system.combat.dodgesUsed": dodgeCount + 1 }) : actor.update({ "system.combat.parryUsed": true })),
    })
  }

  /**
   * Ouvre le dialogue d'initiative du combattant correspondant à l'acteur.
   * @param {Actor|null} actor
   */
  static async rollInitiative(actor = null) {
    actor ??= this.selectedActor()
    if (!actor) return null
    const combat = game.combat
    if (!combat) return ui.notifications.warn("CDG.macro.noCombat", { localize: true })
    if (!combat.started) return ui.notifications.warn("CDG.combat.initiative.notStarted", { localize: true })

    const candidates = combat.combatants.filter((combatant) => combatant.actor && (combatant.actor.uuid === actor.uuid || combatant.actor.id === actor.id))
    let combatant = candidates.find((entry) => entry.actor.uuid === actor.uuid)
    if (!combatant && candidates.length === 1) combatant = candidates[0]
    if (!combatant && candidates.length > 1) {
      const selected = this.selectedActor({ warn: false })
      combatant = candidates.find((entry) => entry.actor.uuid === selected?.uuid)
    }
    if (!combatant) return ui.notifications.warn(game.i18n.format("CDG.macro.noCombatant", { name: actor.name }))
    if (!combatant.isOwner) return ui.notifications.warn(game.i18n.format("CDG.macro.combatantPermission", { name: combatant.name }))
    return CdgInitiativeDialog.open(combatant)
  }

  /**
   * Lance Corps / Protection avec l'armure actuellement portée.
   * @param {Actor|null} actor
   */
  static async rollSoak(actor = null) {
    actor ??= this.selectedActor()
    if (!actor) return null
    return CdgRollDialog.open(actor, {
      abilityId: "corps",
      rank: actor.armor?.system.protection.rank ?? 0,
      label: "CDG.combat.soakTest",
      lockedPair: true,
      qualityDomain: "soak",
      toggles: { wound: false },
    })
  }
}
