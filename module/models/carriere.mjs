import { SYSTEM } from "../config/system.mjs"
import CdgItemData from "./item.mjs"

/**
 * La carrière du mercenaire : elle fixe l'ajustement de caractéristique de départ, les rangs de
 * compétences de base, les arcanums et l'équipement initial.
 *
 * Comme le peuple, elle sert de mémo à la création — rien n'est recopié automatiquement sur le
 * personnage.
 */
export default class CdgCarriereData extends CdgItemData {
  /** @override */
  static LOCALIZATION_PREFIXES = ["CDG.Carriere"]

  static defineSchema() {
    const fields = foundry.data.fields
    const schema = {}

    schema.abilityBonus = new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.ABILITIES)] })

    // Un aumônier ne peut pas rester sans allégeance spirituelle : "Aucune" reste ouvert à tout le
    // monde d'autre, sauf aux carrières qui l'excluent explicitement.
    schema.requiresReligion = new fields.BooleanField({ required: true, nullable: false, initial: false })

    // Un grade d'entrée (Chroniqueur, Émissaire, Officier) : offert, pas un plancher payant
    // comme un rang de compétence — la création doit donc le distinguer d'un achat.
    schema.startingGrade = new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.GRADES)] })

    // Certaines carrières (Officier) ouvrent l'accès à un grade normalement hors de portée à la
    // création — Lieutenant, dont `creationCost` vaut `null` dans `SYSTEM.GRADES` — moyennant un
    // coût de personnalisation qui leur est propre.
    schema.gradeUnlock = new fields.SchemaField({
      grade: new fields.StringField({ required: true, blank: true, initial: "", choices: ["", ...Object.keys(SYSTEM.GRADES)] }),
      cost: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 }),
    })

    // Rangs de compétences de départ : uniquement les compétences concernées, pas les 31.
    schema.skills = new fields.ArrayField(
      new fields.SchemaField({
        skill: new fields.StringField({ required: true, blank: false, choices: Object.keys(SYSTEM.SKILLS) }),
        rank: new fields.NumberField({ required: true, nullable: false, initial: 1, integer: true, min: 0, max: SYSTEM.MAX_RANK }),
      }),
    )

    // Argent de départ, en ducats. Contrairement au prix d'un équipement et à la bourse d'un
    // personnage, il ne porte pas les deux monnaies : le livre ne donne que des ducats ronds.
    schema.startingMoney = new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0, min: 0 })

    // Arcanums et équipement de départ : UUIDs des objets correspondants.
    schema.arcanums = new fields.ArrayField(new fields.DocumentUUIDField())
    schema.equipments = new fields.ArrayField(new fields.DocumentUUIDField())

    // Le choix laissé au joueur (arme, bouclier...) que la fiche ne sait pas modéliser : du texte
    // libre, déjà repris dans la description sous « Au choix », mais l'assistant de création en a
    // besoin en clair pour le rappeler à l'étape de l'équipement.
    schema.choices = new fields.ArrayField(new fields.HTMLField())

    return foundry.utils.mergeObject(super.defineSchema(), schema)
  }
}
