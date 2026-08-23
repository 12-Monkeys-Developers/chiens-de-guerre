import { SYSTEM } from "../config/system.mjs"

/** Gabarit d'une ligne de change circonstanciel dans la fenêtre de configuration d'un effet. */
const SITUATIONAL_CHANGE_TEMPLATE = `${SYSTEM.PATH}/templates/effects/situational-change.hbs`

export default class CdgActiveEffect extends ActiveEffect {
  /**
   * Enregistre le type de change propre au système.
   *
   * À appeler dans le hook `init` et nulle part ailleurs : `ActiveEffect.CHANGE_TYPES` met son
   * résultat en cache dans une statique privée dès le premier accès, et la fenêtre de configuration
   * d'un effet ignore silencieusement les changes dont le type n'est pas enregistré.
   */
  static registerChangeTypes() {
    CONFIG.ActiveEffect.changeTypes[SYSTEM.SITUATIONAL_CHANGE_TYPE] = {
      label: "CDG.effect.types.situational",
      defaultPriority: 20,
      handler: CdgActiveEffect.collectSituationalChange,
      render: CdgActiveEffect.renderSituationalChange,
    }
  }

  /**
   * Recueille un bonus circonstanciel sans rien écrire sur l'acteur.
   *
   * C'est tout l'intérêt d'un type de change maison : « +2 aux tests visant à se montrer charmant »
   * ne peut pas s'appliquer d'office, parce que le système ne sait pas ce que le personnage
   * cherche à obtenir. Le bonus est donc empilé tel quel, et c'est le dialogue de jet qui le
   * proposera au joueur — pré-coché si la compétence lancée fait partie de celles de la situation.
   *
   * @param {Actor} actor L'acteur auquel l'effet s'applique.
   * @param {object} change Le change en cours d'application.
   */
  static collectSituationalChange(actor, change) {
    const modifiers = actor.system?.situationalModifiers
    if (!Array.isArray(modifiers)) return

    const value = Number(change.value)
    if (!Number.isFinite(value)) return

    modifiers.push({
      // Le nom de l'effet est le nom du trait : « Sophistiqué », « Volonté de fer ».
      label: change.effect?.name ?? "",
      value,
      situation: change.situation,
      skills: SYSTEM.SITUATIONS[change.situation]?.skills ?? [],
      effectUuid: change.effect?.uuid ?? null,
    })
  }

  /**
   * Dessine la ligne de saisie d'un bonus circonstanciel.
   *
   * La ligne du cœur demande un chemin de propriété, qui n'a aucun sens ici : un bonus
   * circonstanciel ne vise pas un champ de la fiche. On la remplace par le couple qui compte,
   * la valeur et la situation.
   *
   * @param {object} context Contexte de rendu fourni par ActiveEffectConfig#_renderChange.
   * @returns {Promise<string>}
   */
  static async renderSituationalChange(context) {
    const { change, index, fields } = context

    // _renderChange ne construit les chemins de formulaire que pour les champs du cœur.
    change.situationPath = `system.changes.${index}.situation`
    context.situations = Object.values(SYSTEM.SITUATIONS).reduce((choices, situation) => {
      choices[situation.id] = game.i18n.localize(situation.label)
      return choices
    }, {})
    context.situationField = fields.situation

    return foundry.applications.handlebars.renderTemplate(SITUATIONAL_CHANGE_TEMPLATE, context)
  }
}
