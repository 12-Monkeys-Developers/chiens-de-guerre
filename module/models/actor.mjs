import { SYSTEM } from "../config/system.mjs"
import { PoolValue } from "./schemas/pool-value.mjs"
import { RankValue } from "./schemas/rank-value.mjs"

/**
 * Socle commun aux personnages et aux adversaires : les trois caractéristiques, les compétences
 * et les blessures. Tout ce qui relève de la fiche de joueur (traits de personnalité, passion,
 * karma, bourse, expérience) vit dans CdgCharacterData.
 */
export default class CdgActorData extends foundry.abstract.TypeDataModel {
  /**
   * Les caractéristiques et compétences du type d'acteur courant.
   *
   * Personnage et adversaire partagent le triptyque Corps/Vivacité/Esprit ; la compagnie franche
   * (p. 123) a le sien (Effectifs/Logistique/Moral) et ses propres compétences. Surcharger ces deux
   * accesseurs suffit à faire varier `defineSchema()` sans dupliquer le reste du socle.
   */
  static ABILITIES = SYSTEM.ABILITIES

  static SKILLS = SYSTEM.SKILLS

  /**
   * Réglages du jeton prototype posés à la création d'un acteur de ce type (`_preCreate`).
   * @type {Object}
   */
  static get PROTOTYPE_TOKEN() {
    return {}
  }

  /**
   * Le bloc `combat` des types qui se battent (personnage, adversaire) : bonus d'initiative saisi,
   * esquives et parade du round. La compagnie n'en a pas.
   * @returns {SchemaField}
   */
  static defineCombatSchema() {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    return new fields.SchemaField({
      initiative: new fields.SchemaField({
        bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      }),
      dodgesUsed: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      parryUsed: new fields.BooleanField({ required: true, initial: false }),
    })
  }

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.abilities = new fields.SchemaField(
      Object.values(this.ABILITIES).reduce((obj, ability) => {
        obj[ability.id] = new fields.EmbeddedDataField(PoolValue, { label: ability.label, nullable: false })
        return obj
      }, {}),
    )

    schema.skills = new fields.SchemaField(
      Object.values(this.SKILLS).reduce((obj, skill) => {
        obj[skill.id] = new fields.EmbeddedDataField(RankValue, { label: skill.label, nullable: false })
        return obj
      }, {}),
    )

    // Nombre de cases cochées par gravité. Le nombre de cases disponibles est dérivé du rang de
    // Vigueur (cf. prepareDerivedData), il n'est donc pas stocké.
    schema.wounds = new fields.SchemaField({
      ...Object.values(SYSTEM.WOUND_LEVELS).reduce((obj, level) => {
        obj[level.id] = new fields.SchemaField({
          value: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true, min: 0 }),
          // Cases accordées en plus de celles que donne la Vigueur. Cible d'effet : le trait
          // Ex-immortel des Nains de cendres ajoute ainsi une case de blessure grave.
          bonus: new fields.NumberField({ required: true, nullable: false, initial: 0, integer: true }),
        })
        return obj
      }, {}),
      // Distinct du fait que les cases mortelles soient toutes cochées (`isDying`) : ce drapeau ne
      // gouverne que le rappel de fin de round, posé automatiquement quand la dernière se coche, mais
      // décochable à la main (stabilisation) sans que la blessure elle-même ne guérisse.
      dying: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    })

    return schema
  }

  /**
   * Jeton prototype propre au type d'acteur, et image par défaut — sauf pour un acteur dupliqué,
   * importé d'un compendium ou réimporté, qui garde son image.
   * @inheritDoc
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const updates = { prototypeToken: this.constructor.PROTOTYPE_TOKEN }
    const stats = this.parent._stats
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource && !foundry.utils.hasProperty(data, "img")) {
      const img = SYSTEM.ACTOR_ICONS[this.parent.type]
      if (img) updates.img = img
    }
    this.parent.updateSource(updates)
  }

  /**
   * Ouvre la corbeille où les effets déposent leurs bonus circonstanciels.
   *
   * Elle doit exister avant que les effets s'appliquent. L'ordre de la V14 le garantit :
   * `system.prepareBaseData()` précède `prepareEmbeddedDocuments()`, qui déclenche la phase
   * `initial`. Ce n'est pas un champ de schéma — rien n'est persisté, tout est reconstruit à
   * chaque préparation.
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData()
    this.situationalModifiers = []
  }

  /** @override */
  prepareDerivedData() {
    this.slug = this.parent.name.slugify({ strict: true })
    this.#prepareAbilities()
    this.#prepareWounds()
  }

  /**
   * Ajoute au maximum de chaque caractéristique le bonus posé par les effets actifs.
   *
   * `max` reste la base éditable par le joueur — un effet ne la réécrit jamais, il vise `bonus`
   * (voir `PoolValue`). La base est gardée de côté sous `baseMax` avant d'être augmentée, pour que
   * la fiche puisse toujours l'éditer sans jamais resaisir le total déjà bonifié.
   */
  #prepareAbilities() {
    for (const ability of Object.values(this.abilities)) {
      ability.baseMax = ability.max
      ability.max = ability.baseMax + ability.bonus
    }
  }

  /**
   * Défenses du round et modificateur d'initiative, pour les types qui ont un bloc `combat`.
   *
   * La première esquive du round est gratuite, chaque esquive supplémentaire coûte 2 points de plus
   * que la précédente. Le malus d'initiative de l'armure est doublé quand elle est trop lourde pour
   * le porteur (`armorOverloaded`, que seul le personnage évalue).
   * @param {boolean} [armorOverloaded]
   * @protected
   */
  _prepareCombat(armorOverloaded = false) {
    if (!this.combat) return
    const armor = this.parent.armor
    const shield = this.parent.shield

    this.combat.dodgeMalus = -2 * this.combat.dodgesUsed
    this.combat.canParry = !this.combat.parryUsed
    this.combat.armorOverloaded = armorOverloaded
    const armorMalus = (armor?.system.initMalus ?? 0) * (armorOverloaded ? 2 : 1)
    this.combat.initiative.modifier = this.combat.initiative.bonus + armorMalus + (shield?.system.initMalus ?? 0)
    this.combat.blockBonus = shield?.system.blockBonus ?? 0
  }

  /**
   * Données exposées aux formules de jet : chaque caractéristique (sa réserve) et chaque compétence
   * (son rang) du type d'acteur, plus le malus de blessure.
   * @returns {Object}
   */
  getRollData() {
    const data = {}
    for (const ability of Object.values(this.constructor.ABILITIES)) data[ability.id] = this.abilities[ability.id].value
    for (const skill of Object.values(this.constructor.SKILLS)) data[skill.id] = this.skills[skill.id].rank
    data.blessures = this.wounds.malus
    return data
  }

  /**
   * Nombre de cases de blessure accordées par les règles propres au type d'acteur.
   * Les adversaires surchargent cette méthode pour utiliser les valeurs saisies sur leur fiche.
   * @returns {{legere: number, grave: number, mortelle: number}}
   * @protected
   */
  _getWoundSlots() {
    const vigueur = this.skills.vigueur?.rank ?? 0
    return SYSTEM.WOUND_SLOTS_BY_VIGUEUR[vigueur] ?? SYSTEM.WOUND_SLOTS_BY_VIGUEUR[0]
  }

  /**
   * Calcule le nombre de cases de blessure disponibles selon le type d'acteur, puis le malus global
   * infligé par la blessure la plus grave cochée.
   *
   * Le malus ne se cumule pas d'un niveau à l'autre : seule la gravité la plus élevée compte.
   */
  #prepareWounds() {
    const slots = this._getWoundSlots()

    let worst = null
    for (const level of Object.values(SYSTEM.WOUND_LEVELS)) {
      const wound = this.wounds[level.id]
      // `bonus` est posé par les effets en phase `initial`, donc avant ce calcul : les cases
      // accordées par un trait s'ajoutent à la capacité de base avant que `value` soit rognée.
      wound.max = slots[level.id] + wound.bonus
      // Une baisse de capacité peut laisser plus de cases cochées que disponibles.
      wound.value = Math.min(wound.value, wound.max)
      if (wound.value > 0 && (worst === null || level.order > worst.order)) worst = level
    }

    this.wounds.worst = worst?.id ?? null
    this.wounds.malus = worst?.malus ?? 0
  }

  /**
   * Le personnage est mourant : toutes ses cases de blessure mortelle sont cochées (p. 46). Il doit
   * réussir un test de Corps / Vigueur à chaque round, ou être stabilisé par un allié.
   * @returns {boolean}
   */
  get isDying() {
    const { value, max } = this.wounds.mortelle
    return max > 0 && value >= max
  }

  /**
   * Initialise ou efface le drapeau `wounds.dying`, qui gouverne le rappel de fin de round, dès que
   * les cases de blessure mortelle deviennent toutes cochées ou cessent de l'être — quel que soit le
   * chemin d'écriture (automatique ou case cochée à la main sur la fiche), pour n'avoir qu'un seul
   * endroit qui porte cette règle.
   *
   * Le drapeau part dans la même écriture que la blessure ; le statut Foundry « Inconscient », qui
   * est un effet actif à part entière, est posé ou retiré juste avant.
   * @override
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user)
    if (allowed === false) return false
    if (!foundry.utils.hasProperty(changes, "system.wounds.mortelle.value")) return
    // Les blessures mortelles d'une compagnie réduisent ses Effectifs et peuvent la dissoudre ;
    // elles ne rendent pas une entité collective inconsciente ou mourante.
    if (this.parent.type === "compagnie") return

    const { max } = this.wounds.mortelle
    const wasMortal = this.isDying
    const isMortal = max > 0 && foundry.utils.getProperty(changes, "system.wounds.mortelle.value") >= max
    if (wasMortal === isMortal) return

    // Le statut est attendu avant que la blessure ne s'écrive : qui attend la mise à jour (carte de
    // confrontation, fiche) trouve l'acteur inconscient en même temps que sa dernière case cochée.
    await this.parent.toggleStatusEffect("unconscious", { active: isMortal })
    foundry.utils.setProperty(changes, "system.wounds.dying", isMortal)
  }
}
