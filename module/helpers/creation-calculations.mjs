/**
 * Calcule le prix cumulé d'un passage de rang.
 * @param {number} from Rang de départ.
 * @param {number} to Rang visé.
 * @param {Object<number, number>} rankCosts Coût de chaque cran.
 */
export function skillCost(from, to, rankCosts) {
  let cost = 0
  for (let rank = from + 1; rank <= to; rank++) cost += rankCosts[rank] ?? 0
  return cost
}

/**
 * Calcule le budget de compétences après les planchers et les ouvertures gratuites.
 * @param {Object} options Données du budget.
 * @param {string[]} options.skillIds Identifiants des compétences.
 * @param {Object<string, number>} options.skills Rangs finaux.
 * @param {Object<string, number>} options.grantedSkills Rangs plancher.
 * @param {number} options.freeSkillRanks Ouvertures gratuites.
 * @param {Object<number, number>} options.rankCosts Coût de chaque cran.
 */
export function skillBudget({ skillIds, skills, grantedSkills, freeSkillRanks, rankCosts }) {
  let gross = 0
  let eligibleOpenings = 0
  for (const id of skillIds) {
    const granted = grantedSkills[id] ?? 0
    const rank = skills[id] ?? granted
    gross += skillCost(granted, rank, rankCosts)
    if (granted === 0 && rank > 0) eligibleOpenings++
  }
  const freeUsed = Math.min(freeSkillRanks, eligibleOpenings)
  return { total: Math.max(0, gross - freeUsed), freeUsed, freeRemaining: freeSkillRanks - freeUsed }
}

/**
 * Calcule une enveloppe de personnalisation et son dépassement.
 * @param {number} base Enveloppe normale.
 * @param {number} bonus Points supplémentaires.
 * @param {Object<string, number>} spendings Dépenses par poste.
 */
export function customizationBudget(base, bonus, spendings) {
  const total = base + bonus
  const spent = Object.values(spendings).reduce((sum, cost) => sum + cost, 0)
  const remaining = total - spent
  return { total, spent, remaining, over: Math.max(0, -remaining) }
}

/**
 * Compte les traits renseignés, promus et maîtrisés.
 * @param {Object[]} traits Traits du brouillon.
 * @param {number} total Nombre de couples attendus.
 */
export function traitQuotas(traits, total) {
  return {
    count: traits.filter((trait) => trait.dominant !== null && trait.value > 0).length,
    total,
    promoted: traits.filter((trait) => trait.value >= 2).length,
    mastered: traits.filter((trait) => trait.value >= 3).length,
  }
}
