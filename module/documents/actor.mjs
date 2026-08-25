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

  /** Les armes actuellement tenues, utilisées par le combat à deux armes et les contrôles de duel. */
  get heldWeapons() {
    return this.weapons.filter((item) => item.system.equipped)
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

  /**
   * Nom du drapeau qui relie un objet accordé à l'origine qui l'a posé.
   *
   * Un drapeau plutôt qu'un champ de schéma : la provenance ne concerne que ce personnage-ci, et
   * `system.category` d'un trait dit d'où il vient *en général*, pas quel objet précis l'a accordé.
   * @type {string}
   */
  static GRANT_FLAG = "grantedBy"

  /**
   * Les objets que cette origine a accordés à ce personnage.
   * @param {CdgItem} origin Un objet de type `peuple` ou `carriere` embarqué.
   * @returns {CdgItem[]}
   */
  grantedBy(origin) {
    return this.items.filter((item) => item.getFlag(SYSTEM.PACKAGE_ID, CdgActor.GRANT_FLAG) === origin.id)
  }

  /**
   * Pose une origine sur le personnage et lui accorde ce qu'elle porte.
   *
   * Un peuple ou une carrière ne référence ses traits, arcanums et équipements que par UUID : c'est
   * ici qu'ils deviennent de vrais objets du personnage, chacun marqué de la provenance pour qu'on
   * sache les retirer ensemble.
   *
   * L'ajustement de caractéristique n'est **pas** appliqué ici : les objets de compendium portent
   * déjà un effet actif `transfer: true` sur `abilities.<x>.max`, et `system.abilityBonus` n'est
   * plus qu'un mémo pour l'assistant de création. Le lire doublerait le bonus.
   * @param {CdgItem} item L'origine déposée, encore extérieure au personnage.
   * @returns {Promise<CdgItem|undefined>} L'origine embarquée.
   */
  async grantOrigin(item) {
    if (!SYSTEM.ORIGIN_TYPES.includes(item.type)) return
    const typeLabel = game.i18n.localize(`TYPES.Item.${item.type}`)

    // Un adversaire n'a ni identité, ni langues, ni rangs achetés : rien où poser une origine.
    if (this.type !== "character") return ui.notifications.warn(game.i18n.format("CDG.origin.notForAdversaire", { type: typeLabel }))

    const existing = this[item.type]
    if (existing) return ui.notifications.warn(game.i18n.format("CDG.origin.alreadyPresent", { type: typeLabel, name: existing.name }))

    const [origin] = await this.createEmbeddedDocuments("Item", [item.toObject()])
    if (!origin) return

    const details = []
    const created = []
    const createdFields = []
    let missing = 0

    const groups = CdgActor.#grantGroups(item)
    for (const group of groups) {
      let count = 0
      for (const uuid of group.uuids) {
        const granted = await fromUuid(uuid)
        if (!granted) {
          missing++
          continue
        }
        const data = granted.toObject()
        foundry.utils.setProperty(data, `flags.${SYSTEM.PACKAGE_ID}.${CdgActor.GRANT_FLAG}`, origin.id)
        created.push(data)
        createdFields.push(group.field)
        count++
      }
      if (count > 0) details.push(game.i18n.format(group.label, { count }))
    }
    const embedded = created.length > 0 ? await this.createEmbeddedDocuments("Item", created) : []

    // La copie de l'origine doit désormais référencer les objets qui viennent d'être embarqués,
    // jamais leurs modèles du monde ou du compendium. L'ordre de createEmbeddedDocuments est celui
    // des données reçues, ce qui permet de reconstruire chaque tableau sans recherche fragile.
    const embeddedByField = Object.fromEntries(groups.map((group) => [group.field, []]))
    embedded.forEach((document, index) => embeddedByField[createdFields[index]].push(document.uuid))
    await origin.update(Object.fromEntries(Object.entries(embeddedByField).map(([field, uuids]) => [`system.${field}`, uuids])))

    const updates =
      item.type === SYSTEM.ITEM_TYPE.peuple ? this.#grantLanguages(item, details) : { ...this.#grantSkillRanks(item, details), ...this.#grantStartingMoney(item, details) }
    if (!foundry.utils.isEmpty(updates)) await this.update(updates)

    if (missing > 0) ui.notifications.warn(game.i18n.format("CDG.origin.missingGrant", { name: item.name, count: missing }))
    ui.notifications.info(
      details.length > 0
        ? game.i18n.format("CDG.origin.appliedWith", { name: item.name, details: details.join(", ") })
        : game.i18n.format("CDG.origin.applied", { name: item.name }),
    )
    return origin
  }

  /**
   * Ce qu'une origine accorde, groupé pour pouvoir en rendre compte au joueur.
   * @param {CdgItem} item
   * @returns {{field: string, uuids: string[], label: string}[]}
   */
  static #grantGroups(item) {
    if (item.type === SYSTEM.ITEM_TYPE.peuple) return [{ field: "features", uuids: item.system.features, label: "CDG.origin.grantFeatures" }]
    return [
      { field: "arcanums", uuids: item.system.arcanums, label: "CDG.origin.grantArcanums" },
      { field: "equipments", uuids: item.system.equipments, label: "CDG.origin.grantEquipments" },
    ]
  }

  /**
   * Les langues du peuple s'ajoutent à celles déjà connues, sans jamais en retirer.
   * @param {CdgItem} item
   * @param {string[]} details Complété au passage, pour le message de fin.
   * @returns {Object} Mise à jour à appliquer, éventuellement vide.
   */
  #grantLanguages(item, details) {
    const languages = new Set(this.system.languages)
    const before = languages.size
    for (const language of item.system.languages) languages.add(language)
    if (languages.size === before) return {}
    details.push(game.i18n.format("CDG.origin.grantLanguages", { count: languages.size - before }))
    return { "system.languages": [...languages] }
  }

  /**
   * Les rangs de la carrière sont un plancher, pas une consigne : un rang que le personnage a monté
   * plus haut de lui-même n'est jamais rabaissé.
   * @param {CdgItem} item
   * @param {string[]} details Complété au passage, pour le message de fin.
   * @returns {Object} Mise à jour à appliquer, éventuellement vide.
   */
  #grantSkillRanks(item, details) {
    const updates = {}
    let raised = 0
    for (const entry of item.system.skills) {
      const current = this.system.skills[entry.skill]?.rank ?? 0
      if (entry.rank <= current) continue
      updates[`system.skills.${entry.skill}.rank`] = entry.rank
      raised++
    }
    if (raised > 0) details.push(game.i18n.format("CDG.origin.grantSkillRanks", { count: raised }))
    return updates
  }

  /**
   * Verse l'argent de départ de la carrière dans la bourse du personnage.
   *
   * Un versement, pas une valeur imposée : le personnage garde ce qu'il avait déjà, comme les
   * langues d'un peuple s'ajoutent à celles qu'il parlait.
   * @param {CdgItem} item
   * @param {string[]} details Complété au passage, pour le message de fin.
   * @returns {Object} Mise à jour à appliquer, éventuellement vide.
   */
  #grantStartingMoney(item, details) {
    const amount = item.system.startingMoney ?? 0
    if (amount <= 0) return {}

    details.push(game.i18n.format("CDG.origin.grantMoney", { amount }))
    return { "system.wealth.ducat": this.system.wealth.ducat + amount }
  }

  /**
   * Retire une origine et ce qu'elle avait accordé, après confirmation.
   *
   * Les langues et les rangs de compétence, eux, restent : rien ne distingue plus ce qui venait de
   * l'origine de ce que le personnage a gagné depuis. La confirmation le dit, plutôt que de laisser
   * croire à une annulation complète. L'argent de départ fait exception, mais à une condition
   * stricte — voir `#revokedStartingMoney`.
   * @param {CdgItem} item L'origine embarquée à retirer.
   * @returns {Promise<CdgItem[]|undefined>}
   */
  async revokeOrigin(item) {
    if (!SYSTEM.ORIGIN_TYPES.includes(item.type)) return

    const granted = this.grantedBy(item)
    const refund = this.#revokedStartingMoney(item)
    const content =
      (granted.length > 0
        ? game.i18n.format("CDG.origin.removeContent", { name: item.name, count: granted.length })
        : game.i18n.format("CDG.origin.removeContentAlone", { name: item.name })) + (refund > 0 ? game.i18n.format("CDG.origin.removeMoney", { amount: refund }) : "")

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.format("CDG.origin.removeTitle", { type: game.i18n.localize(`TYPES.Item.${item.type}`) }) },
      content,
    })
    if (!confirmed) return

    if (refund > 0) await this.update({ "system.wealth.ducat": this.system.wealth.ducat - refund })
    return this.deleteEmbeddedDocuments("Item", [item.id, ...granted.map((entry) => entry.id)])
  }

  /**
   * L'argent de départ à reprendre au retrait d'une carrière — rien, la plupart du temps.
   *
   * On ne le reprend que si la bourse vaut exactement ce que la carrière avait versé : le
   * personnage n'a alors ni dépensé ni gagné depuis, et poser puis retirer une carrière ne doit
   * pas laisser de trace. Dès que le montant a bougé, on n'y touche plus — impossible de dire ce
   * qui, dans cette bourse, venait encore de la carrière.
   * @param {CdgItem} item
   * @returns {number} Un nombre de ducats, 0 s'il n'y a rien à reprendre.
   */
  #revokedStartingMoney(item) {
    const amount = item.system.startingMoney ?? 0
    if (amount <= 0) return 0
    // Seul un personnage a une bourse : le retrait passe aussi par les fiches d'adversaire.
    return this.system.wealth?.ducat === amount ? amount : 0
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
