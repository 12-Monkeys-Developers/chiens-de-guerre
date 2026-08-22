/**
 * Compile les sources YAML de `src/packs/` vers les compendiums LevelDB de `packs/`.
 *
 * Les sources sont la référence versionnée ; `packs/` est un produit de compilation, ignoré par git.
 *
 * Si la compilation échoue sur `LEVEL_ITERATOR_NOT_OPEN` ou sur un « Permission denied » qui n'a
 * pas de sens, c'est que Foundry tourne et verrouille la base : fermer Foundry et relancer. Ne
 * jamais supprimer le dossier `packs/` pour s'en sortir.
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli"
import { promises as fs } from "node:fs"

const ROOT = process.cwd()
const packs = await fs.readdir(`${ROOT}/src/packs`)

for (const pack of packs) {
  if (pack.startsWith(".")) continue
  console.log(`Compilation de ${pack}`)
  await compilePack(`${ROOT}/src/packs/${pack}`, `${ROOT}/packs/${pack}`, { yaml: true })
}
