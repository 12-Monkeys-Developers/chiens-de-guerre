/**
 * Génère les compendiums `arcanums`, `equipements`, `carrieres`, `ascendances` et `pnjs` à partir de
 * `tools/data/`.
 *
 *     node tools/build-compendiums.mjs [--force]
 *
 * Produit deux choses à partir des mêmes données, pour qu'elles ne puissent pas diverger :
 *
 * - les sources YAML de `src/packs/`, à compiler ensuite avec `npm run YMLtoLDB` ;
 * - `tools/out/macro-compendiums.js`, une macro Foundry autonome qui peuple les compendiums d'un
 *   monde sans rien recompiler.
 *
 * Les identifiants sont déterministes (préfixe + slug complété à 16 caractères) : recompiler ne
 * casse jamais les UUID qu'une carrière pointe vers ses arcanums et son équipement.
 *
 * Sans `--force`, un fichier déjà présent est laissé tel quel. Les packs seront retouchés en jeu
 * puis réextraits par `npm run LDBtoYML` ; un générateur qui écrase par défaut effacerait ce
 * travail sans prévenir.
 */
import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import YAML from "js-yaml"

import { ABILITIES, ALLEGIANCES, SKILLS } from "../module/config/character.mjs"
import { EQUIPMENT_CATEGORIES, EQUIPMENT_SUBTYPES } from "../module/config/equipment.mjs"
import { ARCANUM_MAX_RANK, ARCANUM_MIN_RANK, ARCANUM_TYPES } from "../module/config/arcanum.mjs"
import { ITEM_ICONS } from "../module/config/item.mjs"
import { MAX_RANK } from "../module/config/ranks.mjs"
import { ARCANUMS } from "./data/arcanums.mjs"
import { CARRIERES } from "./data/carrieres.mjs"
import { EQUIPEMENTS } from "./data/equipements.mjs"
import { ASCENDANCES } from "./data/ascendances.mjs"
import { PNJS } from "./data/pnjs.mjs"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const PACKAGE_ID = "chiens-de-guerre"
const FORCE = process.argv.includes("--force")

/**
 * Packs à réécrire, quand on ne veut pas tout régénérer.
 *
 * `--force` seul écrase tous les packs générés, y compris ce qui a été retouché dans Foundry puis
 * réextrait par `LDBtoYML`. Reprendre un seul chapitre du livre ne doit pas coûter ce travail-là :
 * `--only=arcanums` limite la casse au pack visé.
 */
const ONLY = process.argv
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",")
  .filter(Boolean)

/** Les cinq packs produits, avec le préfixe d'identifiant de leurs documents. */
const PACKS = {
  arcanums: { label: "Arcanums", prefix: "cdgar" },
  equipements: { label: "Équipement", prefix: "cdgeq" },
  carrieres: { label: "Carrières", prefix: "cdgca" },
  ascendances: { label: "Ascendances", prefix: "cdgas" },
  pnjs: { label: "Bestiaire — PNJ / Créatures", prefix: "cdgpn" },
}

/** Préfixe de l'effet actif qui porte l'ajustement de caractéristique, comme sur les peuples. */
const EFFECT_PREFIX = "cdgea"

/** Longueur d'un identifiant Foundry. */
const ID_LENGTH = 16

/**
 * Identifiant déterministe d'un document : préfixe de cinq caractères, puis le slug ramené à onze.
 *
 * Le slug est écrit à la main dans les fichiers de données, jamais dérivé du nom affiché : deux
 * armes nommées « Arme de corps-à-corps légère » et « ... moyenne » produiraient sinon le même
 * identifiant, et la CLI en écraserait une sans le dire.
 * @param {string} prefix
 * @param {string} slug
 * @returns {string}
 */
function makeId(prefix, slug) {
  const normalized = slug
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  return (prefix + normalized.slice(0, ID_LENGTH - prefix.length)).padEnd(ID_LENGTH, "0")
}

/**
 * ID d'acteur lisible complété par une empreinte, pour distinguer les variantes de même préfixe.
 * @param {string} slug
 * @returns {string}
 */
function makePnjId(slug) {
  const normalized = slug
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
  let hash = 2166136261
  for (const character of normalized) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return `${PACKS.pnjs.prefix}${normalized.slice(0, 7).padEnd(7, "0")}${(hash >>> 0).toString(36).slice(-4).padStart(4, "0")}`
}

/**
 * Nom de fichier attendu par la CLI, pour qu'un aller-retour `LDBtoYML` ne renomme rien.
 * @param {string} name
 * @param {string} id
 * @returns {string}
 */
function fileNameFor(name, id) {
  return `${name.replace(/[^a-zA-Z0-9А-я]/g, "_")}_${id}.yml`
}

/**
 * Assemble un paragraphe HTML par entrée, en échappant le strict nécessaire.
 * @param {string[]} paragraphs
 * @returns {string}
 */
function toParagraphs(paragraphs) {
  return paragraphs.map((text) => `<p>${text}</p>`).join("")
}

/**
 * La description d'une carrière : le texte du livre, puis ce que le modèle de données ne sait pas
 * porter — les choix d'équipement et le bloc « Spécial ». L'argent de départ n'y figure plus : il a
 * son champ, `system.startingMoney`, et la fiche l'affiche à côté de la caractéristique augmentée.
 * @param {Object} carriere
 * @returns {string}
 */
function carriereDescription(carriere) {
  let html = toParagraphs(carriere.description)
  if (carriere.choices?.length) html += `<h4>Au choix</h4><ul>${carriere.choices.map((choice) => `<li>${choice}</li>`).join("")}</ul>`
  if (carriere.special) html += `<h4>Spécial</h4><p>${carriere.special}</p>`
  return html
}

/**
 * Enveloppe commune à tous les documents d'objet produits.
 * @param {Object} data
 * @param {string} data.id
 * @param {string} data.name
 * @param {string} data.type
 * @param {string} data.img
 * @param {Object} data.system
 * @returns {Object}
 */
function itemDocument({ id, name, type, img, system }) {
  return { _id: id, name, type, img, system, effects: [], folder: null, sort: 0, flags: {}, _key: `!items!${id}` }
}

/**
 * Retire les clés LevelDB avant d'embarquer un objet dans un acteur.
 * @param {Object} document
 * @param {string} actorId
 * @param {number} index
 * @returns {Object}
 */
function embeddedDocument(document, actorId, index) {
  const id = makeId("cdgpi", `${actorId.slice(5, 12)}${index.toString(36).padStart(4, "0")}`)
  const { _key: unused, ...embedded } = document
  embedded._id = id
  embedded._key = `!actors.items!${actorId}.${id}`
  return embedded
}

/**
 * Normalise le texte riche d'un profil.
 * @param {string|string[]} value
 * @returns {string}
 */
function normalizeDescription(value) {
  if (Array.isArray(value)) return toParagraphs(value)
  return value ?? ""
}

/**
 * Construit un équipement embarqué depuis sa notation compacte.
 * @param {Object} entry
 * @returns {Object}
 */
function equipmentFromPnj(entry) {
  const category = entry.category ?? ""
  const defaults = EQUIPMENT_CATEGORIES[entry.subtype]?.[category] ?? {}
  return buildEquipement({
    ...defaults,
    ...entry,
    slug: entry.slug ?? entry.name,
    description: normalizeDescription(entry.description),
    damage: entry.damage ?? defaults.damage ?? 0,
    protection: entry.protection ?? defaults.protection ?? 0,
    blockBonus: entry.blockBonus ?? defaults.blockBonus ?? 0,
    initMalus: entry.initMalus ?? defaults.initMalus ?? 0,
    attack:
      typeof entry.attack === "string"
        ? { ability: defaults.ability ?? "vivacite", skill: entry.attack }
        : (entry.attack ?? (defaults.ability && defaults.skill ? { ability: defaults.ability, skill: defaults.skill } : undefined)),
    price: entry.price ?? { ducat: defaults.price ?? 0, denier: 0 },
  })
}

/**
 * Construit ou reprend un Arcanum destiné à être embarqué.
 * @param {Object|string} entry
 * @returns {Object}
 */
function arcanumFromPnj(entry) {
  const descriptor = typeof entry === "string" ? { slug: entry } : entry
  const source = ARCANUMS.find((arcanum) => arcanum.slug === descriptor.slug)
  const document = source
    ? buildArcanum(source)
    : buildArcanum({
        slug: descriptor.slug ?? descriptor.name,
        name: descriptor.name,
        description: normalizeDescription(descriptor.description),
        arcanumType: descriptor.arcanumType ?? "physique",
        linkedSkill: descriptor.linkedSkill ?? "",
      })
  document.system.rank = descriptor.rank ?? 1
  return document
}

/**
 * Construit un Actor adversaire autonome, objets inclus.
 * @param {Object} pnj
 * @returns {Object}
 */
function buildPnj(pnj) {
  const id = makePnjId(pnj.slug)
  const skills = Object.fromEntries(Object.keys(SKILLS).map((skill) => [skill, { rank: 0, bonuses: { sheet: 0 } }]))
  const listedSkills = Array.isArray(pnj.skills) ? pnj.skills.map(({ skill, rank }) => [skill, rank]) : Object.entries(pnj.skills ?? {})
  for (const [skill, rank] of listedSkills) skills[skill].rank = rank

  const equipmentEntries = pnj.equipments ??
    pnj.equipment ?? [
      ...(pnj.weapons ?? []).map((entry) => ({ subtype: "weapon", ...entry })),
      ...(pnj.armor ? [{ subtype: "armor", ...pnj.armor }] : []),
      ...(pnj.shield ? [{ subtype: "shield", ...pnj.shield }] : []),
    ]
  const equipment = equipmentEntries.map((entry) => {
    const document = equipmentFromPnj(entry)
    document.system.equipped = entry.equipped ?? true
    return document
  })
  // Une seule arme tenue évite d'activer artificiellement le combat à deux armes.
  let heldWeapon = false
  for (const item of equipment) {
    if (item.system.subtype !== "weapon") continue
    item.system.equipped = !heldWeapon && item.system.equipped
    heldWeapon ||= item.system.equipped
  }
  const arcanums = (pnj.arcanums ?? []).map(arcanumFromPnj)
  const items = [...equipment, ...arcanums].map((item, index) => embeddedDocument(item, id, index))
  const equipmentInitiative = equipment
    .filter((item) => item.system.equipped && ["armor", "shield"].includes(item.system.subtype))
    .reduce((total, item) => total + (item.system.initMalus ?? 0), 0)

  const abilities = Object.fromEntries(
    Object.keys(ABILITIES).map((ability) => {
      const value = pnj.abilities[ability]
      return [ability, { value, max: value, improvements: 0, bonuses: { sheet: 0 }, restBonus: 0 }]
    }),
  )
  return {
    _id: id,
    name: pnj.name,
    type: "adversaire",
    img: pnj.img ?? "icons/svg/mystery-man.svg",
    system: {
      abilities,
      skills,
      wounds: Object.fromEntries(["legere", "grave", "mortelle"].map((level) => [level, { value: 0, bonus: 0 }])),
      combat: { initiative: { bonus: pnj.initiative - equipmentInitiative }, dodgesUsed: 0, parryUsed: false },
      major: pnj.major ?? false,
      details: { description: normalizeDescription(pnj.description), notes: "", special: normalizeDescription(pnj.special) },
    },
    prototypeToken: { actorLink: false, disposition: -1 },
    items,
    effects: [],
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: { [PACKAGE_ID]: { sourcePage: pnj.page } },
    _key: `!actors!${id}`,
  }
}

/**
 * Vérifie les invariants du document final, après normalisation des objets embarqués.
 * @param {Object[]} documents
 */
function validatePnjDocuments(documents) {
  const errors = []
  for (const [index, actor] of documents.entries()) {
    const source = PNJS[index]
    const embeddedIds = actor.items.map((item) => item._id)
    if (new Set(embeddedIds).size !== embeddedIds.length) errors.push(`${actor.name} : identifiant d'objet embarqué en double`)
    const equipmentMalus = actor.items
      .filter((item) => item.type === "equipment" && item.system.equipped && ["armor", "shield"].includes(item.system.subtype))
      .reduce((total, item) => total + item.system.initMalus, 0)
    const finalInitiative = actor.system.combat.initiative.bonus + equipmentMalus
    if (finalInitiative !== source.initiative) errors.push(`${actor.name} : initiative finale ${finalInitiative}, attendue ${source.initiative}`)
  }
  if (errors.length) throw new Error(`Bestiaire invalide :\n${errors.map((error) => `  ✗ ${error}`).join("\n")}`)
}

/**
 * Un coût d'activation vide : une valeur par allégeance, toutes à zéro tant que le chapitre des
 * Arcanums n'a pas été dépouillé. Le schéma les attend toutes les trois.
 * @returns {Record<string, number>}
 */
function emptyCost() {
  return Object.fromEntries(Object.keys(ALLEGIANCES).map((allegiance) => [allegiance, 0]))
}

/**
 * Les trois rangs en ébauche : un nom provisoire, des coûts nuls, et deux variantes dont seul
 * l'intitulé est amorcé — le livre oppose presque toujours ces deux-là, le reste viendra du
 * chapitre des Arcanums.
 * @returns {Object}
 */
function emptyRankData() {
  return [1, 2, 3].reduce((rankData, rank) => {
    rankData[`name${rank}`] = `Rang ${rank}`
    rankData[`cost${rank}`] = emptyCost()
    rankData[`effect${rank}`] = ""
    rankData[`label${rank}a`] = "Lumière / Balance"
    rankData[`effect${rank}a`] = ""
    rankData[`label${rank}b`] = "Obscurité"
    rankData[`effect${rank}b`] = ""
    return rankData
  }, {})
}

/**
 * Un arcanum, tel que le chapitre des Arcanums le décrit.
 *
 * Un arcanum physique n'a pas de tours par rang : ses trois onglets restent à leur ébauche, tout
 * son texte étant dans la description. Un mystique remplit les trois, chacun avec son nom, ses
 * coûts par allégeance et ses deux variantes.
 *
 * `rankData.nameN` refuse le vide dans le schéma : un rang non renseigné garde son libellé
 * provisoire plutôt que de faire échouer la validation.
 * @param {Object} arcanum
 * @returns {Object}
 */
function buildArcanum(arcanum) {
  const rankData = emptyRankData()
  for (const [index, rank] of (arcanum.ranks ?? []).entries()) {
    const position = index + 1
    if (rank.name) rankData[`name${position}`] = rank.name
    rankData[`cost${position}`] = { ...rankData[`cost${position}`], ...rank.cost }
    rankData[`effect${position}`] = rank.effect ?? ""
    for (const [variantIndex, variant] of rank.variants.entries()) {
      const suffix = ["a", "b"][variantIndex]
      if (!suffix) continue
      rankData[`label${position}${suffix}`] = variant.label
      rankData[`effect${position}${suffix}`] = variant.text
    }
  }

  return itemDocument({
    id: makeId(PACKS.arcanums.prefix, arcanum.slug),
    name: arcanum.name,
    type: "arcanum",
    img: ITEM_ICONS.arcanum,
    system: {
      description: arcanum.description ?? `<p>${arcanum.summary}</p>`,
      arcanumType: arcanum.arcanumType,
      rank: ARCANUM_MIN_RANK,
      rankData,
      linkedSkill: arcanum.linkedSkill ?? "",
    },
  })
}

/**
 * Un objet d'équipement générique. Les champs qui ne concernent pas le sous-type restent à leur
 * valeur neutre : la fiche ne les affiche pas, mais le schéma les attend.
 * @param {Object} equipement
 * @returns {Object}
 */
function buildEquipement(equipement) {
  return itemDocument({
    id: makeId(PACKS.equipements.prefix, equipement.slug),
    name: equipement.name,
    type: "equipment",
    img: equipement.img ?? ITEM_ICONS.equipment,
    system: {
      description: equipement.description ?? "",
      subtype: equipement.subtype,
      equipped: false,
      quantity: 1,
      damage: { rank: equipement.damage ?? 0, bonuses: { sheet: 0 } },
      attack: equipement.attack ?? { ability: "vivacite", skill: "melee" },
      category: equipement.category,
      protection: { rank: equipement.protection ?? 0, bonuses: { sheet: 0 } },
      blockBonus: equipement.blockBonus ?? 0,
      initMalus: equipement.initMalus ?? 0,
      price: equipement.price,
    },
  })
}

/**
 * Une carrière, avec son effet actif d'ajustement de caractéristique.
 *
 * Cet effet n'est pas décoratif : `CdgActor#grantOrigin` n'applique délibérément pas
 * `system.abilityBonus`, qui n'est qu'un mémo pour l'assistant de création. Sans l'effet, le +1 de
 * la carrière ne s'appliquerait jamais.
 * @param {Object} carriere
 * @param {(slug: string) => string} arcanumUuid
 * @param {(slug: string) => string} equipementUuid
 * @returns {Object}
 */
function buildCarriere(carriere, arcanumUuid, equipementUuid) {
  const id = makeId(PACKS.carrieres.prefix, carriere.slug)
  const img = carriere.img ?? ITEM_ICONS.carriere
  const document = itemDocument({
    id,
    name: carriere.name,
    type: "carriere",
    img,
    system: {
      description: carriereDescription(carriere),
      abilityBonus: carriere.abilityBonus,
      startingMoney: carriere.startingMoney ?? 0,
      skills: carriere.skills.map((entry) => ({ skill: entry.skill, rank: entry.rank })),
      arcanums: carriere.arcanums.map(arcanumUuid),
      equipments: carriere.equipments.map(equipementUuid),
    },
  })

  const effectId = makeId(EFFECT_PREFIX, carriere.slug)
  document.effects = [
    {
      _id: effectId,
      name: "Ajustement de caractéristique",
      img,
      type: "base",
      transfer: true,
      disabled: false,
      system: {
        changes: [{ key: `system.abilities.${carriere.abilityBonus}.max`, type: "add", value: 1, phase: "initial" }],
      },
      _key: `!items.effects!${id}.${effectId}`,
    },
  ]
  return document
}

/**
 * Une ascendance. `arcanumBonus` part toujours vide : c'est un choix de joueur, fait sur la fiche
 * une fois l'ascendance posée sur un personnage, jamais figé à l'écriture du compendium.
 * @param {Object} ascendance
 * @param {(slug: string) => string} arcanumUuid
 * @returns {Object}
 */
function buildAscendance(ascendance, arcanumUuid) {
  return itemDocument({
    id: makeId(PACKS.ascendances.prefix, ascendance.slug),
    name: ascendance.name,
    type: "ascendance",
    img: ascendance.img ?? ITEM_ICONS.ascendance,
    system: {
      description: toParagraphs(ascendance.description),
      compulsion: ascendance.compulsion ?? "",
      compulsionDesc: ascendance.compulsionDesc ? `<p>${ascendance.compulsionDesc}</p>` : "",
      arcanumChoices: ascendance.arcanumChoices.map(arcanumUuid),
      arcanumBonus: "",
    },
  })
}

/**
 * Refuse tout ce que la CLI accepterait en silence pour produire un compendium faux : un rang hors
 * bornes, une compétence qui n'existe pas, deux documents qui se disputent le même identifiant.
 */
function validate() {
  const errors = []
  const seen = new Map()

  const claim = (id, what) => {
    if (seen.has(id)) errors.push(`Identifiant en double : ${id} — ${seen.get(id)} et ${what}`)
    else seen.set(id, what)
  }

  for (const arcanum of ARCANUMS) {
    claim(makeId(PACKS.arcanums.prefix, arcanum.slug), `arcanum ${arcanum.name}`)
    if (!(arcanum.arcanumType in ARCANUM_TYPES)) errors.push(`Arcanum ${arcanum.name} : nature inconnue « ${arcanum.arcanumType} »`)
    if (arcanum.linkedSkill && !(arcanum.linkedSkill in SKILLS)) errors.push(`Arcanum ${arcanum.name} : compétence inconnue « ${arcanum.linkedSkill} »`)
    if (arcanum.ranks && arcanum.ranks.length !== ARCANUM_MAX_RANK) errors.push(`Arcanum ${arcanum.name} : ${arcanum.ranks.length} rang(s) au lieu de ${ARCANUM_MAX_RANK}`)
    for (const [index, rank] of (arcanum.ranks ?? []).entries()) {
      if (rank.variants.length > 2) errors.push(`Arcanum ${arcanum.name}, rang ${index + 1} : ${rank.variants.length} variantes, la fiche n'en affiche que deux`)
      for (const [allegiance, amount] of Object.entries(rank.cost ?? {})) {
        if (!(allegiance in ALLEGIANCES)) errors.push(`Arcanum ${arcanum.name}, rang ${index + 1} : allégeance inconnue « ${allegiance} »`)
        if (!Number.isInteger(amount) || amount < 0) errors.push(`Arcanum ${arcanum.name}, rang ${index + 1} : coût invalide en ${allegiance}`)
      }
    }
  }

  const categoryIds = new Set(Object.values(EQUIPMENT_CATEGORIES).flatMap((categories) => Object.keys(categories)))
  const equipementSlugs = new Set()
  for (const equipement of EQUIPEMENTS) {
    claim(makeId(PACKS.equipements.prefix, equipement.slug), `équipement ${equipement.name}`)
    equipementSlugs.add(equipement.slug)
    if (!(equipement.subtype in EQUIPMENT_SUBTYPES)) errors.push(`Équipement ${equipement.name} : sous-type inconnu « ${equipement.subtype} »`)
    if (equipement.category && !categoryIds.has(equipement.category)) errors.push(`Équipement ${equipement.name} : catégorie inconnue « ${equipement.category} »`)
    // Le schéma plafonne le malus d'initiative à 0 : il se saisit en négatif, tel qu'il est imprimé.
    if ((equipement.initMalus ?? 0) > 0) errors.push(`Équipement ${equipement.name} : malus d'initiative positif`)
    for (const field of ["damage", "protection"]) {
      const rank = equipement[field] ?? 0
      if (!Number.isInteger(rank) || rank < 0 || rank > MAX_RANK) errors.push(`Équipement ${equipement.name} : ${field} hors bornes`)
    }
    if (equipement.attack && (!(equipement.attack.ability in ABILITIES) || !(equipement.attack.skill in SKILLS))) {
      errors.push(`Équipement ${equipement.name} : couple caractéristique / compétence inconnu`)
    }
  }

  const arcanumSlugs = new Set(ARCANUMS.map((arcanum) => arcanum.slug))
  for (const carriere of CARRIERES) {
    claim(makeId(PACKS.carrieres.prefix, carriere.slug), `carrière ${carriere.name}`)
    if (!(carriere.abilityBonus in ABILITIES)) errors.push(`Carrière ${carriere.name} : caractéristique inconnue « ${carriere.abilityBonus} »`)
    for (const entry of carriere.skills) {
      if (!(entry.skill in SKILLS)) errors.push(`Carrière ${carriere.name} : compétence inconnue « ${entry.skill} »`)
      if (!Number.isInteger(entry.rank) || entry.rank < 0 || entry.rank > MAX_RANK) errors.push(`Carrière ${carriere.name} : rang hors bornes pour ${entry.skill}`)
    }
    const duplicates = carriere.skills.map((entry) => entry.skill).filter((skill, index, all) => all.indexOf(skill) !== index)
    if (duplicates.length) errors.push(`Carrière ${carriere.name} : compétence listée deux fois — ${[...new Set(duplicates)].join(", ")}`)
    if (!Number.isInteger(carriere.startingMoney ?? 0) || (carriere.startingMoney ?? 0) < 0) errors.push(`Carrière ${carriere.name} : argent de départ invalide`)
    for (const slug of carriere.arcanums) if (!arcanumSlugs.has(slug)) errors.push(`Carrière ${carriere.name} : arcanum inconnu « ${slug} »`)
    for (const slug of carriere.equipments) if (!equipementSlugs.has(slug)) errors.push(`Carrière ${carriere.name} : équipement inconnu « ${slug} »`)
  }

  for (const ascendance of ASCENDANCES) {
    claim(makeId(PACKS.ascendances.prefix, ascendance.slug), `ascendance ${ascendance.name}`)
    if (ascendance.arcanumChoices.length > 4) errors.push(`Ascendance ${ascendance.name} : ${ascendance.arcanumChoices.length} arcanums candidats, la fiche en plafonne 4`)
    const duplicateChoices = ascendance.arcanumChoices.filter((slug, index, all) => all.indexOf(slug) !== index)
    if (duplicateChoices.length) errors.push(`Ascendance ${ascendance.name} : arcanum candidat listé deux fois — ${[...new Set(duplicateChoices)].join(", ")}`)
    for (const slug of ascendance.arcanumChoices) if (!arcanumSlugs.has(slug)) errors.push(`Ascendance ${ascendance.name} : arcanum inconnu « ${slug} »`)
  }

  if (PNJS.length !== 44) errors.push(`Bestiaire : ${PNJS.length} profils au lieu de 44`)
  for (const pnj of PNJS) {
    claim(makePnjId(pnj.slug), `PNJ ${pnj.name}`)
    if (!Number.isInteger(pnj.page) || pnj.page < 49 || pnj.page > 75) errors.push(`PNJ ${pnj.name} : page source invalide`)
    if (!Number.isInteger(pnj.initiative)) errors.push(`PNJ ${pnj.name} : initiative imprimée invalide`)
    for (const ability of Object.keys(ABILITIES)) {
      if (!Number.isInteger(pnj.abilities?.[ability]) || pnj.abilities[ability] < 0) errors.push(`PNJ ${pnj.name} : caractéristique ${ability} invalide`)
    }
    const listedSkills = Array.isArray(pnj.skills) ? pnj.skills.map(({ skill, rank }) => [skill, rank]) : Object.entries(pnj.skills ?? {})
    for (const [skill, rank] of listedSkills) {
      if (!(skill in SKILLS)) errors.push(`PNJ ${pnj.name} : compétence inconnue « ${skill} »`)
      if (!Number.isInteger(rank) || rank < 0 || rank > MAX_RANK) errors.push(`PNJ ${pnj.name} : rang hors bornes pour ${skill}`)
    }
    const equipment = pnj.equipments ?? pnj.equipment ?? [...(pnj.weapons ?? []), ...(pnj.armor ? [pnj.armor] : []), ...(pnj.shield ? [pnj.shield] : [])]
    for (const entry of equipment) {
      if (!entry.name) errors.push(`PNJ ${pnj.name} : équipement sans nom`)
      if (entry.category && !categoryIds.has(entry.category)) errors.push(`PNJ ${pnj.name} : catégorie inconnue « ${entry.category} »`)
    }
    for (const entry of pnj.arcanums ?? []) {
      const descriptor = typeof entry === "string" ? { slug: entry, rank: 1 } : entry
      if (!arcanumSlugs.has(descriptor.slug) && !descriptor.name) errors.push(`PNJ ${pnj.name} : arcanum inconnu « ${descriptor.slug} »`)
      if (!Number.isInteger(descriptor.rank) || descriptor.rank < ARCANUM_MIN_RANK || descriptor.rank > ARCANUM_MAX_RANK) errors.push(`PNJ ${pnj.name} : rang d'arcanum invalide`)
    }
    if (!pnj.description) errors.push(`PNJ ${pnj.name} : description absente`)
  }

  if (errors.length) {
    for (const error of errors) console.error(`  ✗ ${error}`)
    throw new Error(`${errors.length} erreur(s) dans tools/data/ — rien n'a été écrit.`)
  }
}

/**
 * Écrit les documents d'un pack, un fichier YAML par document. Sans `--force`, un fichier déjà
 * présent est conservé ; hors de `--only`, le pack entier est laissé de côté.
 * @param {string} pack
 * @param {Object[]} documents
 * @returns {Promise<{written: number, skipped: number}>}
 */
async function writePack(pack, documents) {
  if (ONLY && !ONLY.includes(pack)) {
    console.log(`  ${PACKS[pack].label.padEnd(12)} ignoré (--only)`)
    return { written: 0, skipped: 0 }
  }

  const dir = path.join(ROOT, "src", "packs", pack)
  await fs.mkdir(dir, { recursive: true })

  let written = 0
  let skipped = 0
  for (const document of documents) {
    const file = path.join(dir, fileNameFor(document.name, document._id))
    if (
      !FORCE &&
      (await fs.access(file).then(
        () => true,
        () => false,
      ))
    ) {
      skipped++
      continue
    }
    await fs.writeFile(file, YAML.dump(document))
    written++
  }
  console.log(`  ${pack.padEnd(12)} ${String(written).padStart(3)} écrit(s)${skipped ? `, ${skipped} conservé(s)` : ""}`)
  return { written, skipped }
}

/**
 * La macro autonome, données comprises.
 *
 * Elle ne peut pas réutiliser les UUID des YAML : dans un monde, les documents vivent dans des
 * compendiums de monde, sous d'autres identifiants de pack. Les carrières y transportent donc les
 * slugs de leurs arcanums et de leur équipement, et la macro résout après création.
 * @param {Object[]} arcanums
 * @param {Object[]} equipements
 * @param {Object[]} carrieres
 * @param {Object[]} ascendances
 * @param {Object[]} pnjs
 * @returns {string}
 */
function buildMacro(arcanums, equipements, carrieres, ascendances, pnjs) {
  const strip = (document) => {
    const { _key, ...rest } = document
    if (rest.effects?.length) rest.effects = rest.effects.map(({ _key: _, ...effect }) => effect)
    if (rest.items?.length) rest.items = rest.items.map(({ _key: _, ...item }) => item)
    return rest
  }
  const payload = {
    arcanums: ARCANUMS.map((arcanum, index) => ({ slug: arcanum.slug, doc: strip(arcanums[index]) })),
    equipements: EQUIPEMENTS.map((equipement, index) => ({ slug: equipement.slug, doc: strip(equipements[index]) })),
    carrieres: CARRIERES.map((carriere, index) => {
      const doc = strip(carrieres[index])
      // Les UUID du système ne valent rien dans un monde : la macro les recalculera après avoir créé
      // les arcanums et l'équipement, à partir des slugs transportés à côté.
      doc.system = { ...doc.system, arcanums: [], equipments: [] }
      return { doc, arcanums: carriere.arcanums, equipments: carriere.equipments }
    }),
    ascendances: ASCENDANCES.map((ascendance, index) => {
      const doc = strip(ascendances[index])
      doc.system = { ...doc.system, arcanumChoices: [] }
      return { doc, arcanumChoices: ascendance.arcanumChoices }
    }),
    pnjs: pnjs.map(strip),
  }

  return `/**
 * Crée les compendiums Arcanums, Équipement, Carrières, Ascendances et PNJ de Chiens de guerre
 * dans le monde courant.
 *
 * GÉNÉRÉ PAR tools/build-compendiums.mjs — ne pas modifier à la main : toute retouche serait perdue à
 * la prochaine génération. Corriger tools/data/ et relancer le script.
 *
 * À coller dans une macro de type script, exécutée par un MJ. Relancer la macro ne crée pas de
 * doublon : un document déjà présent est laissé tel quel.
 */
const DATA = ${JSON.stringify(payload, null, 2)}

const PACKS = {
  arcanums: { name: "cdg-arcanums", label: "Arcanums (CDG)" },
  equipements: { name: "cdg-equipements", label: "Équipement (CDG)" },
  carrieres: { name: "cdg-carrieres", label: "Carrières (CDG)" },
  ascendances: { name: "cdg-ascendances", label: "Ascendances (CDG)" },
  pnjs: { name: "cdg-pnjs", label: "Bestiaire — PNJ / Créatures (CDG)", type: "Actor" },
}

if (!game.user.isGM) {
  ui.notifications.error("Seul un MJ peut créer des compendiums.")
  return
}

/**
 * Récupère le compendium de monde, ou le crée, et s'assure qu'il est déverrouillé.
 * @param {{name: string, label: string}} descriptor
 * @returns {Promise<CompendiumCollection>}
 */
async function getPack(descriptor) {
  let pack = game.packs.get(\`world.\${descriptor.name}\`)
  if (!pack) pack = await foundry.documents.collections.CompendiumCollection.createCompendium({ type: descriptor.type ?? "Item", name: descriptor.name, label: descriptor.label })
  if (pack.locked) await pack.configure({ locked: false })
  return pack
}

/**
 * Crée les documents absents du pack, en conservant leurs identifiants.
 * @param {CompendiumCollection} pack
 * @param {Object[]} documents
 * @returns {Promise<{created: number, skipped: number}>}
 */
async function createMissing(pack, documents, implementation = Item.implementation) {
  const index = await pack.getIndex()
  const missing = documents.filter((document) => !index.has(document._id))
  if (missing.length) await implementation.createDocuments(missing, { pack: pack.collection, keepId: true })
  return { created: missing.length, skipped: documents.length - missing.length }
}

const arcanumPack = await getPack(PACKS.arcanums)
const equipementPack = await getPack(PACKS.equipements)
const carrierePack = await getPack(PACKS.carrieres)
const ascendancePack = await getPack(PACKS.ascendances)
const pnjPack = await getPack(PACKS.pnjs)

const counts = { created: 0, skipped: 0 }
const tally = (result) => {
  counts.created += result.created
  counts.skipped += result.skipped
}

tally(await createMissing(arcanumPack, DATA.arcanums.map((entry) => entry.doc)))
tally(await createMissing(equipementPack, DATA.equipements.map((entry) => entry.doc)))

// Les UUID sont reconstruits depuis les packs de ce monde, jamais depuis ceux du système : la macro
// doit fonctionner là où le système est installé sans ses compendiums.
const uuids = new Map()
for (const entry of DATA.arcanums) uuids.set(entry.slug, arcanumPack.getUuid(entry.doc._id))
for (const entry of DATA.equipements) uuids.set(entry.slug, equipementPack.getUuid(entry.doc._id))

const carrieres = DATA.carrieres.map((entry) => {
  const document = foundry.utils.deepClone(entry.doc)
  document.system.arcanums = entry.arcanums.map((slug) => uuids.get(slug))
  document.system.equipments = entry.equipments.map((slug) => uuids.get(slug))
  return document
})
tally(await createMissing(carrierePack, carrieres))

const ascendances = DATA.ascendances.map((entry) => {
  const document = foundry.utils.deepClone(entry.doc)
  document.system.arcanumChoices = entry.arcanumChoices.map((slug) => uuids.get(slug))
  return document
})
tally(await createMissing(ascendancePack, ascendances))
tally(await createMissing(pnjPack, DATA.pnjs, Actor.implementation))

ui.notifications.info(\`Chiens de guerre : \${counts.created} document(s) créé(s), \${counts.skipped} déjà présent(s).\`)
`
}

/**
 * Produit la macro autonome consacrée au bestiaire.
 * @param {Object[]} pnjs
 * @returns {string}
 */
function buildPnjMacro(pnjs) {
  const documents = pnjs.map((document) => {
    const actor = structuredClone(document)
    delete actor._key
    actor.items = actor.items.map((item) => {
      delete item._key
      return item
    })
    return actor
  })
  return `/** Macro générée : crée le bestiaire Chiens de guerre dans le monde courant. */
const DATA = ${JSON.stringify(documents, null, 2)}
if (!game.user.isGM) {
  ui.notifications.error("Seul un MJ peut créer le bestiaire.")
  return
}
const descriptor = { type: "Actor", name: "cdg-pnjs", label: "Bestiaire — PNJ / Créatures (CDG)" }
let pack = game.packs.get(\`world.\${descriptor.name}\`)
if (!pack) pack = await foundry.documents.collections.CompendiumCollection.createCompendium(descriptor)
if (pack.locked) await pack.configure({ locked: false })
const index = await pack.getIndex()
const missing = DATA.filter((document) => !index.has(document._id))
if (missing.length) await Actor.implementation.createDocuments(missing, { pack: pack.collection, keepId: true })
ui.notifications.info(\`Chiens de guerre : \${missing.length} PNJ créé(s), \${DATA.length - missing.length} déjà présent(s).\`)
`
}

validate()
console.log("Génération des compendiums")

const arcanumDocuments = ARCANUMS.map(buildArcanum)
const equipementDocuments = EQUIPEMENTS.map(buildEquipement)

const uuidFor = (pack, prefix) => (slug) => `Compendium.${PACKAGE_ID}.${pack}.Item.${makeId(prefix, slug)}`
const carriereDocuments = CARRIERES.map((carriere) => buildCarriere(carriere, uuidFor("arcanums", PACKS.arcanums.prefix), uuidFor("equipements", PACKS.equipements.prefix)))
const ascendanceDocuments = ASCENDANCES.map((ascendance) => buildAscendance(ascendance, uuidFor("arcanums", PACKS.arcanums.prefix)))
const pnjDocuments = PNJS.map(buildPnj)
validatePnjDocuments(pnjDocuments)

await writePack("arcanums", arcanumDocuments)
await writePack("equipements", equipementDocuments)
await writePack("carrieres", carriereDocuments)
await writePack("ascendances", ascendanceDocuments)
await writePack("pnjs", pnjDocuments)

const macroPath = path.join(ROOT, "tools", "out", "macro-compendiums.js")
await fs.mkdir(path.dirname(macroPath), { recursive: true })
await fs.writeFile(macroPath, buildMacro(arcanumDocuments, equipementDocuments, carriereDocuments, ascendanceDocuments, pnjDocuments))
console.log(`  macro        ${path.relative(ROOT, macroPath)}`)
const pnjMacroPath = path.join(ROOT, "tools", "out", "macro-pnjs.js")
await fs.writeFile(pnjMacroPath, buildPnjMacro(pnjDocuments))
console.log(`  macro        ${path.relative(ROOT, pnjMacroPath)}`)

if (!FORCE) console.log("\nLes fichiers déjà présents ont été conservés. Relancer avec --force pour les régénérer.")
if (ONLY) console.log(`Seul(s) le(s) pack(s) ${ONLY.join(", ")} ont été considérés.`)
console.log("Compiler ensuite avec `npm run YMLtoLDB`, Foundry fermé.")
