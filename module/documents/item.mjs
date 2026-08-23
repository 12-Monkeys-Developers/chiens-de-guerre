import { SYSTEM } from "../config/system.mjs"

export default class CdgItem extends Item {
  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    // Image par défaut selon le type, sauf pour un objet dupliqué ou importé qui garde la sienne.
    const stats = this._stats
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource && !foundry.utils.hasProperty(data, "img")) {
      const img = SYSTEM.ITEM_ICONS[this.type]
      if (img) this.updateSource({ img })
    }
  }

  /** @inheritDoc */
  async _preUpdate(changed, options, user) {
    const allowed = await super._preUpdate(changed, options, user)
    if (allowed === false) return false

    // Changer la catégorie applique les valeurs de référence du tableau d'équipement. Elles restent
    // ensuite librement modifiables jusqu'au prochain changement de catégorie.
    const categoryChanged = foundry.utils.hasProperty(changed, "system.category") || Object.hasOwn(changed, "system.category")
    const categoryId = foundry.utils.getProperty(changed, "system.category") ?? changed["system.category"]
    const subtype = foundry.utils.getProperty(changed, "system.subtype") ?? changed["system.subtype"] ?? this.system.subtype
    if (this.type !== SYSTEM.ITEM_TYPE.equipment || !categoryChanged || categoryId === this.system.category) return

    const category = SYSTEM.EQUIPMENT_CATEGORIES[subtype]?.[categoryId]
    if (!category) return

    if (subtype === SYSTEM.EQUIPMENT_SUBTYPES.armor.id) {
      foundry.utils.setProperty(changed, "system.protection.rank", category.protection)
      foundry.utils.setProperty(changed, "system.initMalus", category.initMalus)
    } else if (subtype === SYSTEM.EQUIPMENT_SUBTYPES.weapon.id) {
      foundry.utils.setProperty(changed, "system.damage.rank", category.damage)
      foundry.utils.setProperty(changed, "system.attack.ability", category.ability)
      foundry.utils.setProperty(changed, "system.attack.skill", category.skill)
    } else if (subtype === SYSTEM.EQUIPMENT_SUBTYPES.shield.id) {
      foundry.utils.setProperty(changed, "system.blockBonus", category.blockBonus)
      foundry.utils.setProperty(changed, "system.initMalus", category.initMalus)
    } else return

    foundry.utils.setProperty(changed, "system.price.ducat", category.price)
    foundry.utils.setProperty(changed, "system.price.denier", 0)
  }
}
