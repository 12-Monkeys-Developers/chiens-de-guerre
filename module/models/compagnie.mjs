import { SYSTEM } from "../config/system.mjs"
import CdgActorData from "./actor.mjs"

/**
 * Compagnie franche (p. 123-127) : « elle se comporte mécaniquement comme un personnage » — mêmes
 * caractéristiques/compétences/blessures que `CdgActorData`, mais son propre triptyque (Effectifs,
 * Logistique, Moral) et ses 18 compétences, plus ce qui n'a pas d'équivalent chez un personnage :
 * le roster des personnages joueurs et non joueurs, le journal des chroniques, des notes libres.
 */
export default class CdgCompagnieData extends CdgActorData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Compagnie"]

  /** @override */
  static ABILITIES = SYSTEM.COMPANY_ABILITIES

  /** @override */
  static SKILLS = SYSTEM.COMPANY_SKILLS

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    // Chaque ligne accepte un acteur réel glissé depuis la barre latérale (portrait, lien vers sa
    // fiche) ou une simple saisie de texte : `actorUuid` n'est posé que dans le premier cas, `name`
    // se pré-remplit alors mais reste éditable.
    const rosterEntry = () =>
      new fields.SchemaField({
        actorUuid: new fields.StringField({ required: true, blank: true }),
        name: new fields.StringField({ required: true, blank: true }),
        grade: new fields.StringField({ required: true, blank: true }),
        notes: new fields.StringField({ required: true, blank: true }),
      })

    schema.rosterPJ = new fields.ArrayField(rosterEntry())
    schema.rosterPNJ = new fields.ArrayField(rosterEntry())

    schema.chronicles = new fields.ArrayField(
      new fields.SchemaField({
        date: new fields.StringField({ required: true, blank: true }),
        event: new fields.StringField({ required: true, blank: true }),
      }),
    )

    schema.notes = new fields.HTMLField()

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  /** @inheritDoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false

    const updates = {
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      },
    }

    const stats = this.parent._stats
    if (!stats.duplicateSource && !stats.compendiumSource && !stats.exportSource) {
      if (!foundry.utils.hasProperty(data, "img")) {
        const img = SYSTEM.ACTOR_ICONS[this.parent.type]
        if (img) updates.img = img
      }
    }

    this.parent.updateSource(updates)
  }

  /**
   * Cases de blessure accordées par le rang de Cohésion (p. 126), au lieu de la Vigueur d'un
   * personnage.
   * @override
   */
  _getWoundSlots() {
    const cohesion = this.skills.cohesion?.rank ?? 0
    return SYSTEM.COMPANY_WOUND_SLOTS_BY_COHESION[cohesion] ?? SYSTEM.COMPANY_WOUND_SLOTS_BY_COHESION[0]
  }

  /**
   * La compagnie est dissoute quand ses Effectifs tombent à 0 (p. 125) : « la compagnie est
   * dissoute et cesse d'exister ». Un getter, jamais stocké, comme `isDying` pour un personnage.
   * @returns {boolean}
   */
  get dissolved() {
    return this.abilities.effectifs.max <= 0
  }

  /**
   * Chaque case de blessés mortels nouvellement cochée fait perdre 1 point d'Effectifs, en
   * permanence (p. 125) — à la différence d'un personnage, où la blessure mortelle bascule un
   * statut réversible (`isDying`) sans jamais toucher aux caractéristiques.
   * @override
   */
  async _preUpdate(changes, options, user) {
    const allowed = await super._preUpdate(changes, options, user)
    if (allowed === false) return false
    if (!foundry.utils.hasProperty(changes, "system.wounds.mortelle.value")) return

    const before = this.wounds.mortelle.value
    const after = foundry.utils.getProperty(changes, "system.wounds.mortelle.value")
    const delta = after - before
    if (delta <= 0) return

    const currentMax = foundry.utils.getProperty(changes, "system.abilities.effectifs.max") ?? this.abilities.effectifs.max
    foundry.utils.setProperty(changes, "system.abilities.effectifs.max", Math.max(0, currentMax - delta))
  }

  /**
   * Données exposées aux formules de jet.
   * @returns {Object}
   */
  getRollData() {
    const data = {}
    for (const ability of Object.values(SYSTEM.COMPANY_ABILITIES)) {
      data[ability.id] = this.abilities[ability.id].value
    }
    for (const skill of Object.values(SYSTEM.COMPANY_SKILLS)) {
      data[skill.id] = this.skills[skill.id].rank
    }
    data.blessures = this.wounds.malus
    return data
  }
}
