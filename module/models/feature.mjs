import CdgItemData from "./item.mjs"

/**
 * Un trait spécial : trait de peuple (Industrieux, Volonté de fer, Infatigable...), don de la
 * carrière, ou particularité accordée par le MJ.
 *
 * Rien de mécanisé pour l'instant, la description fait foi.
 */
export default class CdgFeatureData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Feature"]
}
