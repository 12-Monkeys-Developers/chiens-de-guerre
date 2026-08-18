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
}
