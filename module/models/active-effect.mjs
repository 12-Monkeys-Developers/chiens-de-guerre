import { SYSTEM } from "../config/system.mjs"

/**
 * Le modèle de données des ActiveEffect du système.
 *
 * En V14 l'ActiveEffect est devenu un document typé et ses `changes` vivent dans `system.changes` :
 * un système peut donc ajouter ses propres champs à un change. On en ajoute un seul, `situation`,
 * qui dit *quand* un bonus circonstanciel s'applique.
 *
 * Ce modèle remplace le modèle `base` du cœur plutôt que d'introduire un sous-type : tous les
 * effets du monde partagent la même forme, il n'y a pas de type à choisir dans l'interface, et
 * rien à déclarer dans system.json.
 */
export default class CdgActiveEffectData extends foundry.data.ActiveEffectTypeDataModel {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Effect"]

  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields
    const schema = super.defineSchema()

    // Le champ `type` du cœur est validé par une méthode statique privée, hors de portée d'une
    // sous-classe : on ne réécrit pas le schéma d'un change, on l'étend. C'est aussi le seul
    // moyen — un SchemaField refuse tout champ déjà rattaché à un parent, donc reconstruire
    // l'ArrayField à partir des champs existants lèverait une erreur.
    schema.changes.element.extendFields({
      situation: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
        choices: ["", ...Object.keys(SYSTEM.SITUATIONS)],
      }),
    })

    return schema
  }

  /**
   * Donne sa clé à un bonus circonstanciel.
   *
   * Le cœur écarte tout change dont le `key` est vide avant d'appeler le moindre handler. Or la
   * ligne de saisie d'un bonus circonstanciel ne demande pas de clé, puisqu'il ne vise aucun champ
   * de la fiche : sans ce garde-fou, un bonus fraîchement saisi serait silencieusement ignoré.
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData()
    for (const change of this.changes) {
      if (change.type === SYSTEM.SITUATIONAL_CHANGE_TYPE) change.key ||= SYSTEM.SITUATIONAL_CHANGE_KEY
    }
  }

  /**
   * Neutralise l'effet porté par un équipement qui n'est pas équipé.
   *
   * `ActiveEffect#isSuppressed` lit `this.system.isSuppressed` : c'est le crochet prévu par la V14,
   * et il vaut mieux que surcharger le getter du document, qui ferait perdre la prise en compte
   * des effets expirés.
   * @returns {boolean}
   */
  get isSuppressed() {
    const item = this.parent?.parent
    if (item?.documentName !== "Item") return false
    // Seul l'équipement se porte ou se pose ; un trait ou un arcanum n'a pas d'état équipé.
    return item.system.equipped === false
  }
}
