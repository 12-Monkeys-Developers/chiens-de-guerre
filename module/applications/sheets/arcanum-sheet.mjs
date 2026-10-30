import { SYSTEM } from "../../config/system.mjs"
import CdgBaseItemSheet from "./base-item-sheet.mjs"
import { RANK_SHIELDS, SHARED_DESCRIPTION } from "./partials.mjs"

/** Les onglets qui décrivent un tour de magie, et qui ne valent donc que pour un mystique. */
const RANK_TABS = ["rank1", "rank2", "rank3"]

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
    rank1: { template: `${SYSTEM.PATH}/templates/items/arcanumrank1.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    rank2: { template: `${SYSTEM.PATH}/templates/items/arcanumrank2.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
    rank3: { template: `${SYSTEM.PATH}/templates/items/arcanumrank3.hbs`, templates: [RANK_SHIELDS], scrollable: [""] },
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
    // Le corps du tour et ses deux variantes, pour chacun des trois rangs : neuf textes à enrichir.
    for (const rank of [1, 2, 3]) {
      for (const variant of ["", "a", "b"]) {
        const field = `effect${rank}${variant}`
        context[`enriched${field.charAt(0).toUpperCase()}${field.slice(1)}`] = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.document.system.rankData[field] ?? "",
        )
      }
    }

    return context
  }
}
