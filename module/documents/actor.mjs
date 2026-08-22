import { SYSTEM } from "../config/system.mjs"

export default class CdgActor extends Actor {
  /** Tous les objets d'équipement, quel que soit le sous-type. */
  get equipments() {
    return this.itemTypes.equipment
  }

  /** Les armes, équipées ou non. */
  get weapons() {
    return this.equipments.filter((item) => item.system.isWeapon)
  }

  /**
   * L'armure portée. Un personnage n'en porte qu'une : s'il en a plusieurs d'équipées, la première
   * fait foi, et c'est à la fiche d'éviter d'en arriver là.
   */
  get armor() {
    return this.equipments.find((item) => item.system.isArmor && item.system.equipped) ?? null
  }

  /** Le bouclier porté, même règle que pour l'armure. */
  get shield() {
    return this.equipments.find((item) => item.system.isShield && item.system.equipped) ?? null
  }

  get arcanums() {
    return this.itemTypes.arcanum
  }

  /** Arcanums physiques : bonus passifs de +2 par rang. */
  get passiveArcanums() {
    return this.arcanums.filter((item) => item.system.isPassive)
  }

  get features() {
    return this.itemTypes.feature
  }

  get peuple() {
    return this.itemTypes.peuple[0] ?? null
  }

  get carriere() {
    return this.itemTypes.carriere[0] ?? null
  }

  /** @override */
  getRollData() {
    return this.system.getRollData?.() ?? {}
  }

  /**
   * Remet à zéro les compteurs qui ne valent que pour un round : esquives utilisées et parade.
   * Appelé à chaque fin de round par CdgCombat.
   * @returns {Promise<CdgActor|undefined>}
   */
  async resetRoundCounters() {
    if (this.system.combat === undefined) return
    if (this.system.combat.dodgesUsed === 0 && !this.system.combat.parryUsed) return
    return this.update({ "system.combat.dodgesUsed": 0, "system.combat.parryUsed": false })
  }

  /**
   * Applique le repos de fin de journée : chaque réserve regagne le nombre de points correspondant
   * au confort du repos, sans dépasser son maximum.
   *
   * `restBonus` se cumule au confort du repos, réserve par réserve : c'est par lui que le trait
   * orque Infatigable rend un point de Corps de plus, sans rien changer à la Vivacité ni à l'Esprit.
   * @param {string} conditionId Un identifiant de SYSTEM.REST_CONDITIONS.
   * @returns {Promise<CdgActor|undefined>}
   */
  async rest(conditionId) {
    const condition = SYSTEM.REST_CONDITIONS[conditionId]
    if (!condition) return

    const updates = {}
    for (const ability of Object.values(SYSTEM.ABILITIES)) {
      const pool = this.system.abilities[ability.id]
      updates[`system.abilities.${ability.id}.value`] = Math.min(pool.max, pool.value + condition.recovery + pool.restBonus)
    }
    return this.update(updates)
  }
}
