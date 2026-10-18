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
        // L'identifiant d'un grade de `SYSTEM.COMPANY_GRADES`, choisi dans une liste. Un ancien texte libre
        // qui ne correspond à aucun grade est conservé tel quel plutôt qu'effacé.
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

    // Une dissolution provoquée par un débordement mortel doit survivre même si les Effectifs sont
    // encore positifs. L'acteur reste conservé : le Meneur peut corriger la fiche puis le réactiver.
    schema.state = new fields.SchemaField({
      dissolved: new fields.BooleanField({ required: true, nullable: false, initial: false }),
    })

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }

  /** @inheritDoc */
  static migrateData(source) {
    // Le grade d'une ligne de roster était un texte libre (« Sergent », « Homme d'armes », ou le
    // libellé recopié d'un personnage déposé) : il devient l'identifiant du grade, qui s'écrit comme
    // son libellé sans casse, accents, espaces ni apostrophes.
    const normalize = (text) => text.normalize("NFD").replace(/[^a-z]/gi, "").toLowerCase()
    const ids = new Map(Object.keys(SYSTEM.COMPANY_GRADES).map((id) => [normalize(id), id]))
    for (const key of ["rosterPJ", "rosterPNJ"]) {
      for (const entry of source[key] ?? []) {
        if (!entry.grade || Object.hasOwn(SYSTEM.COMPANY_GRADES, entry.grade)) continue
        entry.grade = ids.get(normalize(entry.grade)) ?? entry.grade
      }
    }
    return super.migrateData(source)
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
    return this.state.dissolved || this.abilities.effectifs.max <= 0
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

    const effectifs = this.abilities.effectifs
    const currentMax = foundry.utils.getProperty(changes, "system.abilities.effectifs.max") ?? effectifs.baseMax ?? effectifs.max
    const currentValue = foundry.utils.getProperty(changes, "system.abilities.effectifs.value") ?? effectifs.value
    const nextMax = Math.max(0, currentMax - delta)
    const nextValue = Math.max(0, currentValue - delta)

    foundry.utils.setProperty(changes, "system.abilities.effectifs.max", nextMax)
    foundry.utils.setProperty(changes, "system.abilities.effectifs.value", Math.min(nextValue, nextMax))
    if (nextMax === 0) foundry.utils.setProperty(changes, "system.state.dissolved", true)
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
