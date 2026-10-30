/**
 * Génère la source YAML du compendium du guide (src/packs/guide) à partir des pages HTML de guide/html/fr/.
 *
 * Dans les pages, `@@page:<fichier>@@` devient un lien vers la page du guide, et `@@img:<nom>@@` le chemin de la
 * capture assets/guide/<nom>.webp. Les identifiants sont fixes pour que les liens et les mises à jour restent
 * stables : `npm run guide`, puis `npm run YMLtoLDB` (Foundry fermé).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs"
import yaml from "js-yaml"

const SYSTEM_ID = "chiens-de-guerre"
const PACK = "guide"
const JOURNAL_ID = "cdgGuide77vg8wUz"
const JOURNAL_NAME = "Guide du système"

/** Pages dans l'ordre du guide : fichier HTML, identifiant de page, titre */
const PAGES = [
  { file: "introduction", id: "TWCq1YGI98mlv6ez", title: "Introduction" },
  { file: "options", id: "GmNyKHhl8NNxO3ep", title: "Réglages" },
  { file: "creation", id: "2wzFoVxI1eErVbzz", title: "Créer un Marqué" },
  { file: "personnage", id: "uzA4Ui46yz5MRj5Z", title: "La fiche de personnage" },
  { file: "objets", id: "Bd0TlcBOLfPaZzt9", title: "Objets et origines" },
  { file: "pnj", id: "Mhbx3hlIt28jYB7U", title: "PNJ et créatures" },
  { file: "compagnie", id: "atUkWWFtqc9vxOlx", title: "La compagnie franche" },
  { file: "jets", id: "IVgxzdiSc9kXDRd9", title: "Les tests" },
  { file: "combat", id: "GdA29X6mS3ScAj1f", title: "Le combat" },
  { file: "batailles", id: "Bt7kQw2RzN4xLm9c", title: "Les batailles" },
  { file: "outils", id: "d6qJxIR42RlaHXOi", title: "Macros et outils du meneur" },
]

let missing = 0

const pageLink = (file) => {
  const page = PAGES.find((p) => p.file === file)
  if (!page) throw new Error(`Page inconnue : ${file}`)
  return `@UUID[Compendium.${SYSTEM_ID}.${PACK}.JournalEntry.${JOURNAL_ID}.JournalEntryPage.${page.id}]{${page.title}}`
}
const imagePath = (name) => {
  const path = `assets/guide/${name}.webp`
  if (!existsSync(path)) {
    console.warn(`Image absente : ${path}`)
    missing++
  }
  return `systems/${SYSTEM_ID}/${path}`
}

const pages = PAGES.map((page, index) => {
  const content = readFileSync(`guide/html/fr/${page.file}.html`, "utf-8")
    .replace(/@@page:([a-z-]+)@@/g, (_, file) => pageLink(file))
    .replace(/@@img:([a-z0-9-]+)@@/g, (_, name) => imagePath(name))
    .trimEnd()
  return {
    _id: page.id,
    name: page.title,
    type: "text",
    title: { show: false, level: 1 },
    image: {},
    text: { format: 1, content },
    video: { controls: true, volume: 0.5 },
    src: null,
    system: {},
    sort: (index + 1) * 100000,
    ownership: { default: -1 },
    flags: {},
    _key: `!journal.pages!${JOURNAL_ID}.${page.id}`,
  }
})

const journal = {
  _id: JOURNAL_ID,
  name: JOURNAL_NAME,
  pages,
  folder: null,
  sort: 0,
  ownership: { default: 0 },
  flags: {},
  _key: `!journal!${JOURNAL_ID}`,
}

const dir = `src/packs/${PACK}`
if (existsSync(dir)) for (const f of readdirSync(dir)) rmSync(`${dir}/${f}`)
mkdirSync(dir, { recursive: true })
const fileName = `${dir}/Guide_du_systeme_${JOURNAL_ID}.yml`
writeFileSync(fileName, yaml.dump(journal, { lineWidth: -1, noRefs: true }))
console.log(`${fileName} : ${pages.length} pages`)
if (missing) console.warn(`${missing} image(s) absente(s)`)
