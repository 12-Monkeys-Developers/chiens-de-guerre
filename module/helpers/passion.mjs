import { SYSTEM } from "../config/system.mjs"

/**
 * L'invocation de passion — règles p. 41 —, partagée par la fenêtre de test et celle d'initiative.
 *
 * Un trait n'est invocable que s'il est dominant, et une seule fois par session. Le bonus coûte un
 * jeton ; s'imposer le malus correspondant en rapporte un, ce qui reste toujours possible.
 *
 * Corrige le brouillon au passage : un trait choisi puis devenu indisponible ne doit pas rester
 * silencieusement dans la somme, et sans jeton le bonus bascule sur le malus.
 * @param {CdgActor} actor
 * @param {{passionPairId: string, passionMode: "bonus"|"malus"}} draft
 * @returns {Object}
 */
export function invocablePassions(actor, draft) {
  // Les adversaires et la compagnie n'ont ni traits de personnalité ni jetons.
  if (actor.type !== "character") return { available: false, choices: [], selected: null, value: 0 }

  const system = actor.system
  const invoked = new Set(system.passion.invokedThisSession)

  const choices = Object.values(SYSTEM.TRAIT_PAIRS)
    .map((pair) => ({ pair, trait: system.traits[pair.id] }))
    .filter(({ pair, trait }) => trait.dominant && trait.value > 0 && !invoked.has(pair.id))
    .map(({ pair, trait }) => {
      const label = game.i18n.localize(trait.dominant === SYSTEM.TRAIT_SIDES.vice.id ? pair.vice : pair.virtue)
      return { id: pair.id, label, value: trait.value, option: `${label} (${trait.value})` }
    })
    .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))

  if (draft.passionPairId && !choices.some((choice) => choice.id === draft.passionPairId)) draft.passionPairId = ""

  const tokens = system.passion.tokens
  const canSpend = tokens > 0
  if (!canSpend && draft.passionMode === "bonus") draft.passionMode = "malus"

  const selected = choices.find((choice) => choice.id === draft.passionPairId) ?? null
  const value = selected ? (draft.passionMode === "bonus" ? selected.value : -selected.value) : 0

  return { available: true, choices, selected, value, tokens, canSpend, mode: draft.passionMode }
}

/**
 * Ce que coûte ou rapporte la passion invoquée : un jeton, et le trait marqué pour la session.
 * @param {CdgActor} actor
 * @param {{id: string}|null} selected Le trait invoqué, tel que le renvoie `invocablePassions`.
 * @param {"bonus"|"malus"} mode
 * @returns {Object} Mise à jour à appliquer, vide si aucune passion n'est invoquée.
 */
export function passionUpdates(actor, selected, mode) {
  if (!selected) return {}
  return {
    "system.passion.tokens": actor.system.passion.tokens + (mode === "bonus" ? -1 : 1),
    "system.passion.invokedThisSession": [...actor.system.passion.invokedThisSession, selected.id],
  }
}
