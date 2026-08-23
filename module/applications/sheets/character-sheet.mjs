import { SYSTEM } from "../../config/system.mjs"
import CdgBaseActorSheet from "./base-actor-sheet.mjs"

/** Partiel des rangées d'écussons, partagé par plusieurs onglets. */
const RANK_SHIELDS = `${SYSTEM.PATH}/templates/shared/rank-shields.hbs`

export default class CdgCharacterSheet extends CdgBaseActorSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["character"],
    position: {
      width: 900,
      height: 940,
    },
    window: {
      contentClasses: ["character-content"],
    },
    actions: {
      setTrait: CdgCharacterSheet.#onSetTrait,
      clearInvokedTraits: CdgCharacterSheet.#onClearInvokedTraits,
      adjustPassion: CdgCharacterSheet.#onAdjustPassion,
      invokeTrait: CdgCharacterSheet.#onInvokeTrait,
    },
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/actors/character-header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    competences: { template: `${SYSTEM.PATH}/templates/actors/character-competences.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    personnalite: { template: `${SYSTEM.PATH}/templates/actors/character-personnalite.hbs`, scrollable: [""] },
    combat: { template: `${SYSTEM.PATH}/templates/actors/character-combat.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    equipement: { template: `${SYSTEM.PATH}/templates/actors/character-equipement.hbs`, scrollable: [""] },
    arcanums: { template: `${SYSTEM.PATH}/templates/actors/character-arcanums.hbs`, scrollable: [""] },
    biographie: { template: `${SYSTEM.PATH}/templates/actors/character-biographie.hbs`, scrollable: [""] },
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        {
          id: "competences",
          cssClass: "tabName",
        },
        { id: "personnalite", cssClass: "tabName" },
        { id: "combat", cssClass: "tabName" },
        { id: "equipement", cssClass: "tabName" },
        { id: "arcanums", cssClass: "tabName" },
        { id: "biographie", cssClass: "tabName" },
      ],
      initial: "competences",
      labelPrefix: "CDG.sheet.tabs",
    },
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()
    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML

    context.identity = this.document.system.identity
    context.karma = this.document.system.karma
    context.passion = this.document.system.passion
    context.xp = this.document.system.xp
    context.wealth = this.document.system.wealth

    // Les 17 couples de traits, prêts à afficher : libellés des deux côtés et valeur dominante.
    context.traitPairs = Object.values(SYSTEM.TRAIT_PAIRS).map((pair) => {
      const trait = this.document.system.traits[pair.id]
      return {
        ...pair,
        dominant: trait.dominant,
        value: trait.value,
        isVice: trait.dominant === SYSTEM.TRAIT_SIDES.vice.id,
        isVirtue: trait.dominant === SYSTEM.TRAIT_SIDES.virtue.id,
        invoked: this.document.system.passion.invokedThisSession.includes(pair.id),
      }
    })

    context.languages = Object.values(SYSTEM.LANGUAGES).map((language) => ({
      ...language,
      known: this.document.system.languages.includes(language.id),
    }))

    context.choiceGrades = SYSTEM.GRADES
    context.choiceRestConditions = SYSTEM.REST_CONDITIONS
    context.currencies = Object.values(SYSTEM.CURRENCIES)

    context.featureGroups = this.#prepareFeatureGroups()
    context.situationalModifiers = this.document.system.situationalModifiers.map((modifier) => ({
      ...modifier,
      situationLabel: SYSTEM.SITUATIONS[modifier.situation]?.label ?? "CDG.effect.anySituation",
    }))

    context.enrichedSpecialTraits = await enrichHTML(this.document.system.specialTraits)
    context.enrichedBiography = await enrichHTML(this.document.system.details.biography)

    return context
  }

  /**
   * Range les traits spéciaux par provenance.
   *
   * Un joueur cherche « ce que mon peuple me donne », pas une liste à plat. Les catégories vides
   * sont écartées : mieux vaut deux groupes remplis que quatre titres dont trois ne portent rien.
   * @returns {Object[]}
   */
  #prepareFeatureGroups() {
    return Object.values(SYSTEM.FEATURE_CATEGORIES)
      .map((category) => ({
        ...category,
        features: this.document.features.filter((feature) => feature.system.category === category.id),
      }))
      .filter((group) => group.features.length > 0)
  }

  /**
   * Fixe la valeur d'un trait de personnalité.
   *
   * Cliquer sur une case d'un côté rend ce côté dominant et lui donne cette valeur ; l'autre côté
   * retombe à zéro, puisqu'il n'y a pas de score neutre. Recliquer sur la case courante annule le
   * couple entier.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-pair`, `data-side` et `data-value`.
   */
  static async #onSetTrait(event, target) {
    if (!this.isEditable) return
    const pairId = target.dataset.pair
    const side = target.dataset.side
    const value = parseInt(target.dataset.value)
    if (!pairId || !side || isNaN(value)) return

    const trait = this.document.system.traits[pairId]
    const isSameCell = trait.dominant === side && trait.value === value

    return this.document.update({
      [`system.traits.${pairId}.dominant`]: isSameCell ? null : side,
      [`system.traits.${pairId}.value`]: isSameCell ? 0 : value,
    })
  }

  /**
   * Marque un trait comme invoqué pour la session, ou le libère. Un même trait ne peut servir
   * qu'une fois par session : c'est cette liste qui le rappelle au joueur.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-pair`.
   */
  static async #onInvokeTrait(event, target) {
    if (!this.isEditable) return
    const pairId = target.dataset.pair
    if (!pairId) return

    const invoked = new Set(this.document.system.passion.invokedThisSession)
    if (invoked.has(pairId)) invoked.delete(pairId)
    else invoked.add(pairId)

    return this.document.update({ "system.passion.invokedThisSession": [...invoked] })
  }

  /**
   * Vide la liste des traits invoqués : à faire en début de session.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClearInvokedTraits(event, target) {
    if (!this.isEditable) return
    return this.document.update({ "system.passion.invokedThisSession": [] })
  }

  /**
   * Gagne ou dépense un jeton de passion.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-delta`.
   */
  static async #onAdjustPassion(event, target) {
    if (!this.isEditable) return
    const delta = parseInt(target.dataset.delta)
    if (isNaN(delta)) return
    return this.document.update({ "system.passion.tokens": Math.max(0, this.document.system.passion.tokens + delta) })
  }
}
