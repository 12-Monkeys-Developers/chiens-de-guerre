import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"
import { RANK_SHIELDS, SHARED_DESCRIPTION } from "./partials.mjs"

/** Les onglets qui décrivent un tour de magie, et qui ne valent donc que pour un mystique. */
const RANK_TABS = ["rank1", "rank2", "rank3"]

/** Le gabarit d'un onglet de rang, commun aux trois : le rang vient de `_preparePartContext`. */
const RANK_TEMPLATE = `${SYSTEM.PATH}/templates/items/arcanumrank.hbs`

export default class CdgArcanumSheet extends CdgBaseItemSheet {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["arcanum"],
  }

  /** @override */
  static PARTS = {
    header: { template: `${SYSTEM.PATH}/templates/items/shared/header.hbs` },
    tabs: { template: `${SYSTEM.PATH}/templates/items/arcanum-tabs.hbs`, templates: [RANK_SHIELDS] },
    main: { template: `${SYSTEM.PATH}/templates/items/arcanummain.hbs`, templates: [SHARED_DESCRIPTION], scrollable: [""] },
    ...Object.fromEntries(RANK_TABS.map((id) => [id, { template: RANK_TEMPLATE, scrollable: [""] }])),
  }

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        {
          id: "main",
          cssClass: "tabName",
        },
        // `rank` traverse `_prepareTabs`, qui recopie toute clé qu'il ne connaît pas : c'est lui
        // que le gabarit d'onglets rend en écussons.
        { id: "rank1", cssClass: "tabName", rank: 1 },
        { id: "rank2", cssClass: "tabName", rank: 2 },
        { id: "rank3", cssClass: "tabName", rank: 3 },
      ],
      initial: "main",
      labelPrefix: "CDG.sheet.tabs",
    },
  }

  /**
   * Un arcanum physique n'affiche pas d'onglet de rang.
   *
   * Il n'a pas de tours : son effet et ses variantes d'allégeance tiennent dans sa description, et
   * les trois onglets ne montreraient qu'un nom provisoire et des champs vides. Ils disparaissent
   * donc du sélecteur, et leurs gabarits ne sont même pas rendus.
   * @override
   */
  _prepareTabs(group) {
    if (!this.document.system.isPassive) return super._prepareTabs(group)

    // La nature d'un arcanum se change en cours de route : l'onglet ouvert peut être celui d'un
    // rang qui vient de disparaître, auquel cas plus aucun onglet ne serait actif.
    if (RANK_TABS.includes(this.tabGroups[group])) this.tabGroups[group] = "main"

    const tabs = super._prepareTabs(group)
    for (const id of RANK_TABS) delete tabs[id]
    return tabs
  }

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options)
    if (this.document.system.isPassive) for (const id of RANK_TABS) delete parts[id]
    return parts
  }

  /**
   * Change de nature en cours de route : les onglets de rang déjà rendus restent dans le DOM, car
   * `_configureRenderParts` ne fait que cesser de les produire. Le CSS les masque, mais autant ne
   * pas laisser traîner des champs qui n'appartiennent plus à cette fiche.
   * @inheritDoc
   */
  async _onRender(context, options) {
    await super._onRender(context, options)
    if (!this.document.system.isPassive) return
    // `section` explicitement : le lien du sélecteur porte le même `data-tab`.
    for (const id of RANK_TABS) this.element.querySelector(`section[data-tab="${id}"]`)?.remove()
  }

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext()

    context.isPassive = this.document.system.isPassive
    context.bonus = this.document.system.bonus
    context.choiceTypes = SYSTEM.ARCANUM_TYPES
    context.choiceSkills = SYSTEM.SKILLS
    context.allegiances = Object.values(SYSTEM.ALLEGIANCES)
    return context
  }

  /**
   * Un onglet de rang reçoit son tour tout préparé dans `spell` : données, champs du schéma pour `formInput`,
   * noms des champs du formulaire et textes enrichis.
   * @inheritDoc
   */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options)
    if (!RANK_TABS.includes(partId)) return context

    const number = RANK_TABS.indexOf(partId) + 1
    const data = this.document.system.ranks[number]
    const fields = this.document.system.schema.fields.ranks.fields[number].fields
    const path = `system.ranks.${number}`
    const enrich = (html) => foundry.applications.ux.TextEditor.implementation.enrichHTML(html ?? "")

    context.spell = {
      tab: partId,
      active: context.tabs?.[partId]?.active ?? false,
      path,
      data,
      fields,
      effectName: `${path}.effect`,
      enrichedEffect: await enrich(data.effect),
      variants: await Promise.all(
        Object.entries(data.variants).map(async ([key, variant]) => ({
          path: `${path}.variants.${key}`,
          label: variant.label,
          effect: variant.effect,
          effectName: `${path}.variants.${key}.effect`,
          field: fields.variants.fields[key].fields.effect,
          enriched: await enrich(variant.effect),
        })),
      ),
    }
    return context
  }
}
