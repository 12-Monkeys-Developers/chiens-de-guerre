/**
 * Extrait les compendiums LevelDB de `packs/` vers les sources YAML de `src/packs/`.
 *
 * Sert à récupérer un contenu retouché dans Foundry : on édite dans le jeu, on extrait, on relit le
 * diff. Même précaution qu'à la compilation — fermer Foundry avant, sans quoi la base est verrouillée.
 */
import { extractPack } from "@foundryvtt/foundryvtt-cli"
import { promises as fs } from "node:fs"

const ROOT = process.cwd()
const packs = await fs.readdir(`${ROOT}/packs`)

for (const pack of packs) {
  if (pack.startsWith(".")) continue
  console.log(`Extraction de ${pack}`)
  await extractPack(`${ROOT}/packs/${pack}`, `${ROOT}/src/packs/${pack}`, { yaml: true })
}
