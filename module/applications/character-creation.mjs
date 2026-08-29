import { SYSTEM } from "../config/system.mjs"
import { customizationBudget, skillBudget, traitQuotas } from "../helpers/creation-calculations.mjs"
import Utils from "../helpers/utils.mjs"

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api
const { DragDrop, TextEditor } = foundry.applications.ux

/** Racine des gabarits de l'assistant. */
const TEMPLATES = `${SYSTEM.PATH}/templates/creation`

/**
 * Assistant de création de personnage : les neuf étapes du guide, dans une seule fenêtre.
 *
 * Rien n'est écrit dans le monde avant le dernier bouton : tout vit dans `#draft` jusqu'à
 * `Forger le Marqué`. On peut donc revenir en arrière, tout reprendre, ou fermer la fenêtre sans
 * laisser d'acteur à moitié rempli derrière soi.
 *
 * Les choix du joueur et ce qu'accordent le peuple et la carrière sont tenus séparés : `#draft`
 * ne contient que la saisie, `#derived` recalcule à chaque rendu les valeurs finales. Changer de
 * carrière en cours de route ne laisse donc aucun résidu de la précédente.
 */
export default class CdgCharacterCreation extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "cdg-character-creation",
    tag: "form",
    // "themed"/"theme-light" : le visuel de l'assistant (parchemin, bandeaux calligraphiés) est
    // pensé pour un thème clair — il doit y rester même si Foundry est réglé en thème sombre pour
    // les applications, sans quoi le cœur de Foundry ré-assombrit les contrôles natifs par-dessus.
    classes: ["cdg", "creation", "themed", "theme-light"],
    position: {
      width: 900,
      height: 800,
    },
    window: {
      title: "CDG.creation.title",
      icon: "fa-solid fa-user-plus",
      resizable: true,
      contentClasses: ["creation-content"],
    },
    form: {
      handler: CdgCharacterCreation.#onChangeForm,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      goToStep: CdgCharacterCreation.#onGoToStep,
      previousStep: CdgCharacterCreation.#onPreviousStep,
      nextStep: CdgCharacterCreation.#onNextStep,
      adjustAbility: CdgCharacterCreation.#onAdjustAbility,
      toggleImprovement: CdgCharacterCreation.#onToggleImprovement,
      addArcanum: CdgCharacterCreation.#onAddArcanum,
      setArcanumRank: CdgCharacterCreation.#onSetArcanumRank,
      setAscendanceArcanumBonus: CdgCharacterCreation.#onSetAscendanceArcanumBonus,
      adjustMoney: CdgCharacterCreation.#onAdjustMoney,
      setSkillRank: CdgCharacterCreation.#onSetSkillRank,
      setTrait: CdgCharacterCreation.#onSetTrait,
      toggleLanguage: CdgCharacterCreation.#onToggleLanguage,
      pickImage: CdgCharacterCreation.#onPickImage,
      removeItem: CdgCharacterCreation.#onRemoveItem,
      clearPeuple: CdgCharacterCreation.#onClearPeuple,
      clearCarriere: CdgCharacterCreation.#onClearCarriere,
      clearAscendance: CdgCharacterCreation.#onClearAscendance,
      create: CdgCharacterCreation.#onCreate,
      reset: CdgCharacterCreation.#onReset,
    },
  }

  /** @override */
  static PARTS = {
    steps: { template: `${TEMPLATES}/steps.hbs` },
    body: { template: `${TEMPLATES}/step-abilities.hbs`, scrollable: [""] },
    footer: { template: `${TEMPLATES}/footer.hbs` },
  }

  /**
   * Index de l'étape affichée, à partir de 0.
   * @type {number}
   */
  #step = 0

  /**
   * Index de l'étape la plus avancée atteinte. Les pastilles du bandeau au-delà restent inertes :
   * on ne saute pas la moitié du guide d'un clic.
   * @type {number}
   */
  #maxStep = 0

  /**
   * La saisie du joueur, et elle seule.
   * @type {Object}
   */
  #draft = CdgCharacterCreation.#blankDraft()

  /**
   * Valeurs recalculées à chaque rendu à partir de `#draft`, du peuple et de la carrière.
   * @type {Object}
   */
  #derived = {}

  /** Le peuple choisi, résolu depuis son UUID. @type {Item|null} */
  #peupleItem = null

  /** La carrière choisie, résolue depuis son UUID. @type {Item|null} */
  #carriereItem = null

  /** L'ascendance choisie, résolue depuis son UUID. @type {Item|null} */
  #ascendanceItem = null

  /** Les objets déposés sur l'assistant, résolus depuis leurs UUID. @type {Item[]} */
  #droppedItems = []

  /** Les traits spéciaux accordés par le peuple, résolus pour leurs bonus de création. @type {Item[]} */
  #originFeatures = []

  /**
   * L'équipement de départ accordé par la carrière, résolu pour l'aperçu de l'étape 8 — recalculé
   * à chaque rendu depuis la carrière courante, jamais copié dans `#draft.items` : changer de
   * carrière fait donc disparaître l'équipement de l'ancienne et apparaître celui de la nouvelle
   * sans rien à retirer ou rajouter à la main.
   * @type {Item[]}
   */
  #carriereEquipments = []

  /**
   * Les arcanums accordés par la carrière, résolus uniquement pour savoir si un candidat du bonus
   * d'ascendance (ci-dessous) est déjà possédé — `CdgActor#grantOrigin` les embarque avant
   * `grantAscendance`, ils comptent donc bien comme « déjà là » au moment du bonus.
   * @type {Item[]}
   */
  #carriereArcanums = []

  /**
   * Les arcanums candidats au bonus de l'ascendance (`system.arcanumChoices`), résolus pour
   * l'étape 7 — recalculés à chaque rendu depuis l'ascendance courante, comme l'équipement de
   * carrière ci-dessus.
   * @type {Item[]}
   */
  #ascendanceArcanumChoices = []

  /** Documents déjà résolus pendant la vie de l'assistant. @type {Map<string, Item>} */
  #documentCache = new Map()

  /** Listes de choix indexées par type et signature des collections. @type {Map<string, Object>} */
  #choiceCache = new Map()

  /** Empêche deux clics de créer deux acteurs. */
  #creating = false

  /* -------------------------------------------- */
  /*  Brouillon                                   */
  /* -------------------------------------------- */

  /**
   * Un brouillon vierge : les caractéristiques au plancher conseillé, tout le reste à zéro.
   * @returns {Object}
   */
  static #blankDraft() {
    return {
      name: "",
      vraiNom: "",
      img: SYSTEM.ACTOR_ICONS.character,
      // Toutes au plancher : le compteur de l'étape 1 affiche alors la totalité des points restants.
      abilities: Object.keys(SYSTEM.ABILITIES).reduce((obj, id) => {
        obj[id] = SYSTEM.ABILITY_MIN
        return obj
      }, {}),
      peuple: { name: "", uuid: "" },
      religion: "",
      languages: [],
      carriere: { name: "", uuid: "" },
      grade: "duplicator",
      ascendance: { name: "", uuid: "" },
      // Le candidat d'arcanum choisi parmi ceux de l'ascendance, pour le bonus gratuit — distinct
      // des arcanums achetés en personnalisation (`arcanumRanks`).
      ascendanceArcanumBonus: "",
      passionTokens: SYSTEM.BASE_PASSION_TOKENS,
      skills: Object.keys(SYSTEM.SKILLS).reduce((obj, id) => {
        obj[id] = 0
        return obj
      }, {}),
      traits: Object.keys(SYSTEM.TRAIT_PAIRS).reduce((obj, id) => {
        obj[id] = { dominant: null, value: 0 }
        return obj
      }, {}),
      // Augmentations achetées avec les points de personnalisation : 0 ou 1 par caractéristique.
      improvements: Object.keys(SYSTEM.ABILITIES).reduce((obj, id) => {
        obj[id] = 0
        return obj
      }, {}),
      // Rang de chaque arcanum acquis, indexé par UUID. Ceux qu'accorde la carrière n'y figurent
      // pas : ils sont offerts et gardent le rang inscrit sur leur fiche.
      arcanumRanks: {},
      // Points de personnalisation investis dans le pécule de départ.
      moneyPoints: 0,
      wealth: Object.keys(SYSTEM.CURRENCIES).reduce((obj, id) => {
        obj[id] = 0
        return obj
      }, {}),
      marque: "",
      histoire: "",
      items: [],
    }
  }

  /* -------------------------------------------- */
  /*  Rendu                                       */
  /* -------------------------------------------- */

  /** L'étape courante, telle que décrite dans la configuration. */
  get currentStep() {
    return SYSTEM.CREATION_STEPS[this.#step]
  }

  /** @override */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options)
    // Une seule zone de contenu, dont le gabarit suit l'étape courante : les neuf étapes partagent
    // le même emplacement, entre le bandeau de progression et le pied de navigation.
    parts.body.template = `${TEMPLATES}/step-${this.currentStep.id}.hbs`
    return parts
  }

  /** @override */
  async _prepareContext(options) {
    await this.#resolveDocuments()
    this.#computeDerived()

    const statuses = SYSTEM.CREATION_STEPS.map((step, index) => this.#stepStatus(index))

    // Une étape n'est achevée que si elle a été atteinte : les étapes 7 et 8 n'exigent aucune
    // saisie et sont valides d'entrée de jeu, mais les compter avant de les avoir vues gonflerait
    // la progression dès l'ouverture de l'assistant.
    const reached = SYSTEM.CREATION_STEPS.map((step, index) => index <= this.#maxStep)
    const achieved = statuses.map((status, index) => status.complete && reached[index])
    const completed = achieved.filter(Boolean).length

    const context = {
      SYSTEM,
      draft: this.#draft,
      derived: this.#derived,
      step: this.currentStep,
      stepIndex: this.#step,
      stepNumber: this.#step + 1,
      stepCount: SYSTEM.CREATION_STEPS.length,
      isFirstStep: this.#step === 0,
      isLastStep: this.#step === SYSTEM.CREATION_STEPS.length - 1,
      status: statuses[this.#step],
      steps: SYSTEM.CREATION_STEPS.map((step, index) => ({
        ...step,
        index,
        number: index + 1,
        active: index === this.#step,
        reachable: reached[index],
        complete: achieved[index],
      })),
      completedCount: completed,
      progress: Math.round((completed / SYSTEM.CREATION_STEPS.length) * 100),
      incompleteSteps: SYSTEM.CREATION_STEPS.filter((step, index) => !statuses[index].complete),
      originWarnings: this.#derived.originWarnings,
      creating: this.#creating,
    }

    if (CONFIG.debug.cdg?.sheets) console.debug(Utils.log(`${this.constructor.name} - contexte`), context)
    return context
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options)
    if (partId !== "body") return context

    switch (this.currentStep.id) {
      case "abilities":
        context.abilities = Object.values(SYSTEM.ABILITIES)
        break

      case "origine":
        context.religions = Object.values(SYSTEM.RELIGIONS)
        context.languages = Object.values(SYSTEM.LANGUAGES).map((language) => {
          const granted = this.#derived.grantedLanguages.includes(language.id)
          const known = this.#derived.languages.includes(language.id)
          return {
            ...language,
            known,
            granted,
            // Une langue non offerte et pas encore apprise n'est cliquable que si les points suivent.
            disabled: granted || (!known && SYSTEM.CUSTOMIZATION_COSTS.language > this.#derived.customizationRemaining),
          }
        })
        context.languageCost = SYSTEM.CUSTOMIZATION_COSTS.language
        context.peupleChoices = await this.#itemChoices(SYSTEM.ITEM_TYPE.peuple)
        context.peupleItem = this.#peupleItem
        context.originWarnings = this.#peupleItem ? this.#originWarnings(this.#peupleItem) : []
        context.enrichedPeuple = this.#peupleItem ? await TextEditor.implementation.enrichHTML(this.#peupleItem.system.description) : ""
        // Même en-tête que le début de la fiche de peuple (`templates/items/peuple.hbs`) : la
        // caractéristique augmentée, puis les traits accordés.
        context.peupleAbilityBonusLabel = SYSTEM.ABILITIES[this.#peupleItem?.system.abilityBonus]
          ? game.i18n.localize(SYSTEM.ABILITIES[this.#peupleItem.system.abilityBonus].label)
          : ""
        context.originFeatures = this.#originFeatures
        break

      case "carriere":
        context.grades = Object.values(SYSTEM.GRADES).map((grade) => ({
          ...grade,
          selected: this.#draft.grade === grade.id,
          // Un grade sans prix de création n'est pas accessible ; un grade payant exige les points.
          unavailable: grade.creationCost === null,
          tooExpensive: grade.creationCost > this.#derived.customizationRemaining + this.#derived.gradeCost,
        }))
        context.carriereChoices = await this.#itemChoices(SYSTEM.ITEM_TYPE.carriere)
        context.carriereItem = this.#carriereItem
        context.originWarnings = this.#carriereItem ? this.#originWarnings(this.#carriereItem) : []
        context.enrichedCarriere = this.#carriereItem ? await TextEditor.implementation.enrichHTML(this.#carriereItem.system.description) : ""
        break

      case "ascendance":
        context.ascendanceChoices = await this.#itemChoices(SYSTEM.ITEM_TYPE.ascendance)
        context.ascendanceItem = this.#ascendanceItem
        context.enrichedAscendance = this.#ascendanceItem ? await TextEditor.implementation.enrichHTML(this.#ascendanceItem.system.description) : ""
        context.enrichedCompulsion = this.#ascendanceItem ? await TextEditor.implementation.enrichHTML(this.#ascendanceItem.system.compulsionDesc) : ""
        break

      case "competences":
        context.ranks = Object.values(SYSTEM.RANKS)
        context.rankCosts = Object.entries(SYSTEM.SKILL_RANK_COST).map(([rank, cost]) => ({
          rank: Number(rank),
          cost,
          // Le rang 3 est hors de portée à cette étape : la table le dit plutôt que de le chiffrer.
          reserved: Number(rank) > SYSTEM.CREATION_MAX_SKILL_RANK,
        }))
        context.skillColumns = [1, 2, 3].map((column) =>
          Object.values(SYSTEM.SKILLS)
            .filter((skill) => skill.column === column)
            .map((skill) => this.#skillContext(skill)),
        )
        break

      case "traits":
        context.traitPairs = Object.values(SYSTEM.TRAIT_PAIRS).map((pair) => this.#traitContext(pair))
        break

      case "personnalisation":
        context.costs = SYSTEM.CUSTOMIZATION_COSTS
        context.abilities = Object.values(SYSTEM.ABILITIES).map((ability) => ({
          ...ability,
          score: this.#derived.abilities[ability.id],
          bought: this.#draft.improvements[ability.id] > 0,
          disabled: this.#draft.improvements[ability.id] === 0 && SYSTEM.CUSTOMIZATION_COSTS.abilityImprovement > this.#derived.customizationRemaining,
        }))
        context.skillColumns = [1, 2, 3].map((column) =>
          Object.values(SYSTEM.SKILLS)
            .filter((skill) => skill.column === column)
            .map((skill) => this.#skillContext(skill)),
        )
        // Un même écran pour tous les arcanums déjà en main : ceux de la carrière d'abord (rang
        // plancher verrouillé, mais libre d'être monté avec des points), puis ceux achetés à partir
        // de zéro. « Ajouter un arcanum » ne sert plus qu'à en acquérir un tout nouveau.
        context.arcanums = [
          ...this.#carriereArcanums.map((item) => this.#arcanumContext(item, item.system.rank)),
          ...this.#droppedItems.filter((item) => item.type === SYSTEM.ITEM_TYPE.arcanum).map((item) => this.#arcanumContext(item, 0)),
        ]
        context.arcanumChoices = (await this.#itemChoices(SYSTEM.ITEM_TYPE.arcanum)).filter(
          (choice) => !this.#draft.items.includes(choice.uuid) && !this.#carriereItem?.system.arcanums.includes(choice.uuid),
        )
        context.ascendanceArcanumOptions = this.#ascendanceArcanumOptions()
        context.gradeLabel = SYSTEM.GRADES[this.#draft.grade] ? game.i18n.localize(SYSTEM.GRADES[this.#draft.grade].label) : ""
        context.spendings = [
          { id: "abilities", label: "CDG.creation.personnalisation.lineAbilities", cost: this.#derived.customization.abilities },
          { id: "skills", label: "CDG.creation.personnalisation.lineSkills", cost: this.#derived.customization.skills },
          { id: "arcanums", label: "CDG.creation.personnalisation.lineArcanums", cost: this.#derived.customization.arcanums },
          { id: "languages", label: "CDG.creation.personnalisation.lineLanguages", cost: this.#derived.customization.languages, step: 1 },
          { id: "grade", label: "CDG.creation.personnalisation.lineGrade", cost: this.#derived.customization.grade, step: 2 },
          { id: "money", label: "CDG.creation.personnalisation.lineMoney", cost: this.#derived.customization.money },
        ]
        break

      case "combat":
        context.woundLevels = Object.values(SYSTEM.WOUND_LEVELS)
        context.carriereEquipments = this.#carriereEquipments
        context.items = this.#droppedItems
        break

      case "identite":
        context.recap = this.#recap()
        break
    }

    return context
  }

  /**
   * Le dépôt d'objets est branché une seule fois : la fenêtre survit à ses rendus, un branchement
   * par rendu empilerait les écouteurs et créerait l'objet déposé en autant d'exemplaires.
   * @inheritDoc
   */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options)

    new DragDrop.implementation({
      dropSelector: ".creation-content",
      permissions: { drop: () => true },
      callbacks: { drop: this.#onDrop.bind(this) },
    }).bind(this.element)
  }

  /* -------------------------------------------- */
  /*  Documents référencés                        */
  /* -------------------------------------------- */

  /**
   * Résout les UUID du brouillon en documents. Un objet effacé du monde entre deux rendus
   * disparaît simplement de l'assistant, sans le casser.
   */
  async #resolveDocuments() {
    this.#peupleItem = this.#draft.peuple.uuid ? await this.#resolveDocument(this.#draft.peuple.uuid) : null
    this.#carriereItem = this.#draft.carriere.uuid ? await this.#resolveDocument(this.#draft.carriere.uuid) : null
    this.#ascendanceItem = this.#draft.ascendance.uuid ? await this.#resolveDocument(this.#draft.ascendance.uuid) : null

    const features = await Promise.all((this.#peupleItem?.system.features ?? []).map((uuid) => this.#resolveDocument(uuid)))
    this.#originFeatures = features.filter((item) => item?.type === SYSTEM.ITEM_TYPE.feature)

    const equipments = await Promise.all((this.#carriereItem?.system.equipments ?? []).map((uuid) => this.#resolveDocument(uuid)))
    this.#carriereEquipments = equipments.filter((item) => item?.type === SYSTEM.ITEM_TYPE.equipment)

    const carriereArcanums = await Promise.all((this.#carriereItem?.system.arcanums ?? []).map((uuid) => this.#resolveDocument(uuid)))
    this.#carriereArcanums = carriereArcanums.filter((item) => item?.type === SYSTEM.ITEM_TYPE.arcanum)

    const ascendanceChoices = await Promise.all((this.#ascendanceItem?.system.arcanumChoices ?? []).map((uuid) => this.#resolveDocument(uuid)))
    this.#ascendanceArcanumChoices = ascendanceChoices.filter((item) => item?.type === SYSTEM.ITEM_TYPE.arcanum)
    // Un choix devenu invalide (ascendance changée, candidat retiré du monde) ne doit pas rester
    // silencieusement actif : la fiche finale n'appliquerait alors aucun bonus, sans que rien ne
    // le signale ici.
    if (this.#draft.ascendanceArcanumBonus && !this.#ascendanceArcanumChoices.some((item) => item.uuid === this.#draft.ascendanceArcanumBonus)) {
      this.#draft.ascendanceArcanumBonus = ""
    }

    const resolved = await Promise.all(this.#draft.items.map((uuid) => this.#resolveDocument(uuid)))
    this.#droppedItems = resolved.filter((item) => item !== null)
    this.#draft.items = this.#droppedItems.map((item) => item.uuid)
  }

  /**
   * Résout un UUID, en abandonnant toute entrée de cache dont la collection a perdu le document.
   * @param {string} uuid UUID du document.
   */
  async #resolveDocument(uuid) {
    const cached = this.#documentCache.get(uuid)
    if (cached) {
      const collection = cached.pack ? game.packs.get(cached.pack)?.index : game.items
      if (collection?.has(cached.id)) return cached
      this.#documentCache.delete(uuid)
    }
    const document = await fromUuid(uuid)
    if (document) this.#documentCache.set(uuid, document)
    return document
  }

  /**
   * Les objets d'un type disponibles dans le monde et dans les compendiums, prêts pour un `select`.
   * @param {string} type Un type d'objet du système.
   * @returns {Promise<Array<{uuid: string, name: string}>>}
   */
  async #itemChoices(type) {
    const packs = game.packs.filter((pack) => pack.documentName === "Item")
    await Promise.all(packs.map((pack) => pack.getIndex()))
    const signature = `${game.items.size}|${packs.map((pack) => `${pack.collection}:${pack.index.size}`).join("|")}`
    const cached = this.#choiceCache.get(type)
    if (cached?.signature === signature) return cached.choices

    const choices = game.items.filter((item) => item.type === type).map((item) => ({ uuid: item.uuid, name: item.name }))
    for (const pack of packs) {
      const index = pack.index
      for (const entry of index) {
        if (entry.type !== type) continue
        choices.push({ uuid: entry.uuid, name: `${entry.name} (${pack.metadata.label})` })
      }
    }

    choices.sort((a, b) => a.name.localeCompare(b.name))
    this.#choiceCache.set(type, { signature, choices })
    return choices
  }

  /* -------------------------------------------- */
  /*  Calculs                                     */
  /* -------------------------------------------- */

  /**
   * Recalcule tout ce qui découle du brouillon : bonus du peuple et de la carrière, valeurs
   * finales, karma, initiative, cases de blessure, solde.
   */
  #computeDerived() {
    const derived = {}

    // Certains traits de peuple n'agissent qu'au cours de la création, avant qu'un acteur et ses
    // effets actifs existent. Le modèle `creationGrants` est leur source unique.
    derived.creationGrants = this.#originFeatures.reduce(
      (grants, feature) => {
        grants.customizationPoints += feature.system.creationGrants.customizationPoints
        grants.freeSkillRanks += feature.system.creationGrants.freeSkillRanks
        return grants
      },
      { customizationPoints: 0, freeSkillRanks: 0 },
    )

    // Caractéristiques : la saisie de l'étape 1, plus +1 par bonus de peuple ou de carrière.
    derived.abilityBonuses = {}
    derived.abilityImprovements = {}
    derived.abilities = {}
    for (const ability of Object.values(SYSTEM.ABILITIES)) {
      let bonus = 0
      if (this.#peupleItem?.system.abilityBonus === ability.id) bonus += 1
      if (this.#carriereItem?.system.abilityBonus === ability.id) bonus += 1
      derived.abilityBonuses[ability.id] = bonus
      // L'augmentation achetée en points de personnalisation vaut +1, comme une augmentation
      // d'expérience : elle dépasse légitimement le plafond de saisie de la création.
      derived.abilityImprovements[ability.id] = this.#draft.improvements[ability.id]
      derived.abilities[ability.id] = this.#draft.abilities[ability.id] + bonus + derived.abilityImprovements[ability.id]
    }
    derived.abilityTotal = Object.values(derived.abilities).reduce((total, value) => total + value, 0)

    // Le budget de création ne porte que sur la saisie du joueur : les bonus du peuple et de la
    // carrière viennent par-dessus et ne se prennent pas sur ces points.
    derived.pointsSpent = Object.values(this.#draft.abilities).reduce((total, value) => total + value, 0)
    derived.pointsRemaining = SYSTEM.ABILITY_POINTS_TOTAL - derived.pointsSpent
    derived.pointsOver = Math.max(0, -derived.pointsRemaining)
    derived.pointsWithinBounds = Object.values(this.#draft.abilities).every((value) => value >= SYSTEM.ABILITY_MIN && value <= SYSTEM.ABILITY_MAX)

    // Compétences : la carrière garantit un rang plancher, le joueur peut monter au-dessus.
    derived.grantedSkills = {}
    for (const entry of this.#carriereItem?.system.skills ?? []) {
      derived.grantedSkills[entry.skill] = Math.max(derived.grantedSkills[entry.skill] ?? 0, entry.rank)
    }
    derived.skills = {}
    for (const skill of Object.values(SYSTEM.SKILLS)) {
      derived.skills[skill.id] = Math.max(this.#draft.skills[skill.id], derived.grantedSkills[skill.id] ?? 0)
    }
    derived.trainedCount = Object.values(derived.skills).filter((rank) => rank > 0).length

    // Budget de compétences : seuls les crans qui dépassent le plancher de la carrière se paient.
    // Industrieux offre l'ouverture de deux compétences distinctes ; comme chaque ouverture vaut
    // exactement un point, aucune sélection supplémentaire n'est nécessaire.
    const skillCosts = skillBudget({
      skillIds: Object.keys(SYSTEM.SKILLS),
      skills: derived.skills,
      grantedSkills: derived.grantedSkills,
      freeSkillRanks: derived.creationGrants.freeSkillRanks,
      rankCosts: SYSTEM.SKILL_RANK_COST,
    })
    derived.skillPointsSpent = skillCosts.total
    derived.freeSkillRanksUsed = skillCosts.freeUsed
    derived.freeSkillRanksRemaining = skillCosts.freeRemaining
    derived.skillPointsRemaining = SYSTEM.SKILL_POINTS_TOTAL - derived.skillPointsSpent
    // Au-delà des 10 points de l'étape, les crans supplémentaires se paient en personnalisation :
    // c'est ainsi qu'une compétence atteint le rang 3, hors de portée de la première enveloppe.
    derived.skillOverflow = Math.max(0, -derived.skillPointsRemaining)
    derived.skillEnvelopeUsed = Math.min(derived.skillPointsSpent, SYSTEM.SKILL_POINTS_TOTAL)
    derived.rank3Skills = Object.values(derived.skills).filter((rank) => rank >= SYSTEM.MAX_RANK).length

    // Langues : celles cochées, plus celles que le peuple donne d'office.
    derived.grantedLanguages = this.#peupleItem?.system.languages ?? []
    derived.languages = [...new Set([...this.#draft.languages, ...derived.grantedLanguages])]

    // Karma et allégeance, mêmes règles que sur la fiche.
    let vices = 0
    let virtues = 0
    for (const pair of Object.values(SYSTEM.TRAIT_PAIRS)) {
      const trait = this.#draft.traits[pair.id]
      if (trait.dominant === SYSTEM.TRAIT_SIDES.vice.id) vices += trait.value
      if (trait.dominant === SYSTEM.TRAIT_SIDES.virtue.id) virtues += trait.value
    }
    const karmaValue = virtues - vices
    const allegiance = Object.values(SYSTEM.ALLEGIANCES).find((entry) => entry.max === null || karmaValue <= entry.max)
    derived.karma = { vices, virtues, value: karmaValue, allegianceLabel: allegiance.label }

    // Quotas de la procédure : un dominant par couple, puis 5 à 10 traits au rang 2 ou plus, dont
    // 0 à 2 au rang 3. Un trait au rang 3 est passé par le rang 2 : il compte dans les deux.
    const quotas = traitQuotas(Object.values(this.#draft.traits), Object.keys(SYSTEM.TRAIT_PAIRS).length)
    derived.traitCount = quotas.count
    derived.traitsTotal = quotas.total
    derived.traitsMissing = quotas.total - quotas.count
    derived.traitsPromoted = quotas.promoted
    derived.traitsMastered = quotas.mastered

    // Combat : cases de blessure.
    const baseWounds = SYSTEM.WOUND_SLOTS_BY_VIGUEUR[derived.skills.vigueur] ?? SYSTEM.WOUND_SLOTS_BY_VIGUEUR[0]
    derived.effectBonuses = this.#projectCreationEffects()
    derived.woundSlots = Object.fromEntries(Object.values(SYSTEM.WOUND_LEVELS).map((level) => [level.id, baseWounds[level.id] + (derived.effectBonuses.wounds[level.id] ?? 0)]))
    derived.originWarnings = [this.#peupleItem, this.#carriereItem].filter(Boolean).flatMap((origin) => this.#originWarnings(origin))

    // Identité, telle qu'elle sera écrite sur la fiche. « Aucune » est un choix à part entière —
    // il achève l'étape comme les trois cultes — mais laisse le champ (texte libre) vide sur la
    // fiche, exactement comme un Marqué qui n'a encore rien choisi.
    derived.religionLabel = this.#draft.religion && SYSTEM.RELIGIONS[this.#draft.religion] ? game.i18n.localize(SYSTEM.RELIGIONS[this.#draft.religion].label) : ""
    derived.pay = SYSTEM.GRADES[this.#draft.grade]?.pay ?? 0

    this.#computeCustomization(derived)

    this.#derived = derived
  }

  /**
   * Projette le petit sous-ensemble d'effets nécessaire aux aperçus de l'assistant.
   * Le moteur Foundry reste seul responsable de leur application sur l'acteur final.
   */
  #projectCreationEffects() {
    const wounds = {}
    for (const feature of this.#originFeatures) {
      for (const effect of feature.effects) {
        if (!effect.transfer || effect.disabled) continue
        for (const change of effect.system.changes) {
          const match = /^system\.wounds\.([^.]+)\.bonus$/.exec(change.key)
          const value = Number(change.value)
          if (!match || change.type !== "add" || change.phase !== "initial" || !Number.isFinite(value)) continue
          if (!SYSTEM.WOUND_LEVELS[match[1]]) continue
          wounds[match[1]] = (wounds[match[1]] ?? 0) + value
        }
      }
    }
    return { wounds, hasWoundBonuses: Object.values(wounds).some((value) => value !== 0) }
  }

  /**
   * Avertit lorsqu'un mémo de bonus de caractéristique n'a pas l'effet actif correspondant.
   * @param {Item} origin Peuple ou carrière inspecté.
   */
  #originWarnings(origin) {
    const ability = origin.system.abilityBonus
    if (!ability) return []
    // Les objets de compendium portent l'ajustement de caractéristique sur `.bonus`, pas `.max` :
    // `CdgActorData#prepareDerivedData` l'y ajoute en donnée dérivée (cf. `module/models/actor.mjs`).
    const key = `system.abilities.${ability}.bonus`
    const valid = origin.effects.some(
      (effect) =>
        effect.transfer &&
        !effect.disabled &&
        effect.system.changes.some((change) => change.key === key && change.type === "add" && change.phase === "initial" && Number(change.value) === 1),
    )
    if (valid) return []
    return [
      game.i18n.format("CDG.creation.originWarning", {
        origin: origin.name,
        ability: game.i18n.localize(SYSTEM.ABILITIES[ability]?.label ?? ability),
      }),
    ]
  }

  /**
   * Un arcanum en main à l'étape 7 : son rang payé et l'état de ses trois écussons.
   *
   * Le rang 3 est fermé en début de partie. Redescendre rembourse les points, jusqu'au plancher.
   * @param {CdgItem} item
   * @param {number} [floor] Rang déjà acquis gratuitement (carrière) — 0 pour un arcanum acheté
   *   depuis zéro. Verrouillé et sans coût jusque-là ; seul ce qui le dépasse se paie.
   * @returns {Object}
   */
  #arcanumContext(item, floor = 0) {
    const rank = this.#derived.arcanumRanks[item.uuid] ?? floor
    const remaining = this.#derived.customizationRemaining
    const cost = SYSTEM.CUSTOMIZATION_COSTS.arcanumRank
    const maxRank = Math.max(SYSTEM.CREATION_MAX_ARCANUM_RANK, floor)

    const shields = Array.fromRange(SYSTEM.ARCANUM_MAX_RANK, SYSTEM.ARCANUM_MIN_RANK).map((step) => {
      const isFloor = step <= floor
      const reserved = step > maxRank && !isFloor
      const affordable = (step - rank) * cost <= remaining

      let tooltip
      if (isFloor) tooltip = game.i18n.localize("CDG.creation.personnalisation.arcanumFloor")
      else if (reserved) tooltip = game.i18n.localize("CDG.creation.personnalisation.arcanumRank3")
      else if (step === rank) tooltip = game.i18n.format("CDG.creation.personnalisation.arcanumCurrent", { rank })
      else if (affordable) tooltip = game.i18n.format("CDG.creation.personnalisation.arcanumSet", { rank: step, cost: (step - rank) * cost })
      else tooltip = game.i18n.format("CDG.creation.personnalisation.arcanumTooExpensive", { cost: (step - rank) * cost, remaining: Math.max(0, remaining) })

      return { step, filled: rank >= step, floor: isFloor, disabled: isFloor || reserved || step === rank || !affordable, tooltip }
    })

    return {
      uuid: item.uuid,
      name: item.name,
      img: item.img,
      type: game.i18n.localize(SYSTEM.ARCANUM_TYPES[item.system.arcanumType]?.label ?? ""),
      rank,
      cost: (rank - floor) * cost,
      removable: floor === 0,
      shields,
    }
  }

  /**
   * Rang déjà accordé gratuitement par la carrière pour cet arcanum, ou 0.
   * @param {string} uuid
   * @returns {number}
   */
  #carriereArcanumFloor(uuid) {
    return this.#carriereArcanums.find((item) => item.uuid === uuid)?.system.rank ?? 0
  }

  /**
   * Les candidats du bonus d'arcanum de l'ascendance (p. 123, `system.arcanumChoices`) : gratuit,
   * distinct des arcanums achetés plus haut sur ce même écran. Chaque candidat déjà possédé (par
   * la carrière ou par un achat) propose de monter d'un rang plutôt que de l'acquérir au rang 1 —
   * exactement ce que fera `CdgActor#updateArcanumBonus` une fois le personnage créé.
   *
   * `CdgActor#grantArcanumBonus` ne plafonne, lui, qu'au rang 3 absolu (`ARCANUM_MAX_RANK`) : il
   * sert aussi hors création, où ce plafond ne vaut plus. C'est donc ici, et seulement ici, qu'un
   * candidat déjà au rang 2 est fermé — le monter romprait « on ne commence pas la partie avec un
   * Arcanum au rang 3 ».
   * @returns {Object[]}
   */
  #ascendanceArcanumOptions() {
    if (!this.#ascendanceArcanumChoices.length) return []

    // Le moteur retrouve un arcanum déjà possédé par son nom (`CdgActor#grantArcanumBonus`) : la
    // carrière est déjà embarquée au moment du bonus, l'aperçu doit donc en tenir compte lui aussi.
    const ownedRanks = new Map()
    for (const item of this.#carriereArcanums) ownedRanks.set(item.name, item.system.rank)
    for (const item of this.#droppedItems) {
      if (item.type !== SYSTEM.ITEM_TYPE.arcanum) continue
      ownedRanks.set(item.name, this.#derived.arcanumRanks[item.uuid] ?? SYSTEM.ARCANUM_MIN_RANK)
    }

    return this.#ascendanceArcanumChoices.map((item) => {
      const ownedRank = ownedRanks.get(item.name) ?? null
      return {
        uuid: item.uuid,
        name: item.name,
        img: item.img,
        owned: ownedRank !== null,
        capped: ownedRank !== null && ownedRank >= SYSTEM.CREATION_MAX_ARCANUM_RANK,
        selected: this.#draft.ascendanceArcanumBonus === item.uuid,
      }
    })
  }

  /**
   * Le détail des points de personnalisation : ce que chaque poste coûte, et ce qu'il reste.
   *
   * Les langues et le grade se décident aux étapes 2 et 3, les compétences à l'étape 5 ; leurs
   * dépassements retombent tous ici, dans la même bourse de 15 points.
   * @param {Object} derived L'objet des valeurs dérivées, complété sur place.
   */
  #computeCustomization(derived) {
    const costs = SYSTEM.CUSTOMIZATION_COSTS

    // Langues achetées : celles cochées à la main, déduction faite de celles offertes par le peuple.
    derived.boughtLanguages = this.#draft.languages.filter((id) => !derived.grantedLanguages.includes(id))

    // Arcanums acquis : ceux de la carrière sont déjà là jusqu'à leur rang (plancher gratuit), et
    // le joueur peut investir des points pour les monter plus haut, en plus de ceux qu'il ajoute
    // lui-même à partir de zéro. Le coût ne porte que sur ce qui dépasse le plancher de chacun.
    derived.arcanumRanks = {}
    let arcanumCost = 0
    const arcanumUuids = new Set([
      ...this.#carriereArcanums.map((item) => item.uuid),
      ...this.#droppedItems.filter((item) => item.type === SYSTEM.ITEM_TYPE.arcanum).map((item) => item.uuid),
    ])
    for (const uuid of arcanumUuids) {
      const floor = this.#carriereArcanumFloor(uuid)
      const maxRank = Math.max(SYSTEM.CREATION_MAX_ARCANUM_RANK, floor)
      const rank = Math.clamp(this.#draft.arcanumRanks[uuid] ?? floor, floor, maxRank)
      derived.arcanumRanks[uuid] = rank
      arcanumCost += (rank - floor) * costs.arcanumRank
    }
    derived.arcanumCost = arcanumCost

    derived.improvementCount = Object.values(this.#draft.improvements).reduce((total, count) => total + count, 0)
    derived.gradeCost = SYSTEM.GRADES[this.#draft.grade]?.creationCost ?? 0

    derived.customization = {
      abilities: derived.improvementCount * costs.abilityImprovement,
      skills: derived.skillOverflow,
      arcanums: derived.arcanumCost,
      languages: derived.boughtLanguages.length * costs.language,
      grade: derived.gradeCost,
      money: this.#draft.moneyPoints,
    }

    const budget = customizationBudget(SYSTEM.CUSTOMIZATION_POINTS_TOTAL, derived.creationGrants.customizationPoints, derived.customization)
    derived.customizationSpent = budget.spent
    derived.customizationTotal = budget.total
    derived.customizationRemaining = budget.remaining
    derived.customizationOver = budget.over

    // Pécule : ce qui a été saisi à la main, plus ce que les points achètent.
    derived.boughtDucats = this.#draft.moneyPoints * costs.ducatsPerPoint
    derived.wealth = {
      ducat: this.#draft.wealth.ducat + derived.boughtDucats,
      denier: this.#draft.wealth.denier,
    }
  }

  /**
   * Un couple de traits de l'étape 6 : le côté dominant, son rang, et l'état des six cases.
   *
   * Comme pour les compétences, les quotas sont arbitrés ici : une case sait si elle est cochée,
   * si le clic la ferait sortir des quotas, et ce qu'il faut en dire au joueur.
   * @param {Object} pair Une entrée de SYSTEM.TRAIT_PAIRS.
   * @returns {Object}
   */
  #traitContext(pair) {
    const trait = this.#draft.traits[pair.id]
    const boxes = (side) =>
      Array.fromRange(3, 1).map((value) => {
        const isCurrentCell = trait.dominant === side && trait.value === value
        // Recliquer sur la case courante libère le couple : ce geste-là ne bute sur aucun quota.
        const promoted = this.#derived.traitsPromoted - (trait.value >= 2 ? 1 : 0) + (!isCurrentCell && value >= 2 ? 1 : 0)
        const mastered = this.#derived.traitsMastered - (trait.value >= 3 ? 1 : 0) + (!isCurrentCell && value >= 3 ? 1 : 0)

        let tooltip
        let disabled = false
        if (isCurrentCell) tooltip = game.i18n.localize("CDG.creation.traits.clearTooltip")
        else if (mastered > SYSTEM.TRAIT_RANK3_MAX) {
          disabled = true
          tooltip = game.i18n.format("CDG.creation.traits.rank3Full", { max: SYSTEM.TRAIT_RANK3_MAX })
        } else if (promoted > SYSTEM.TRAIT_RANK2_MAX) {
          disabled = true
          tooltip = game.i18n.format("CDG.creation.traits.rank2Full", { max: SYSTEM.TRAIT_RANK2_MAX })
        } else {
          tooltip = game.i18n.format("CDG.creation.traits.setTooltip", {
            trait: game.i18n.localize(pair[side]),
            rank: value,
          })
        }

        return {
          side,
          value,
          filled: trait.dominant === side && trait.value >= value,
          disabled,
          tooltip,
        }
      })

    return {
      ...pair,
      dominant: trait.dominant,
      value: trait.value,
      isVice: trait.dominant === SYSTEM.TRAIT_SIDES.vice.id,
      isVirtue: trait.dominant === SYSTEM.TRAIT_SIDES.virtue.id,
      viceBoxes: boxes(SYSTEM.TRAIT_SIDES.vice.id),
      virtueBoxes: boxes(SYSTEM.TRAIT_SIDES.virtue.id),
    }
  }

  /**
   * Une ligne de compétence de l'étape 5 : le rang courant, le plancher de la carrière, et l'état
   * de chacun des trois écussons.
   *
   * Toute la règle de coût est décidée ici plutôt que dans le gabarit : un écusson sait s'il est
   * cliquable, ce qu'il coûte, et pourquoi il ne l'est pas.
   * @param {Object} skill Une entrée de SYSTEM.SKILLS.
   * @returns {Object}
   */
  #skillContext(skill) {
    const granted = this.#derived.grantedSkills[skill.id] ?? 0
    const rank = this.#derived.skills[skill.id]
    // Deux étapes manient les mêmes écussons, avec deux bourses et deux plafonds de rang.
    const custom = this.currentStep.id === "personnalisation"
    const remaining = custom ? this.#derived.customizationRemaining : this.#derived.skillPointsRemaining
    const maxRank = custom ? SYSTEM.MAX_RANK : SYSTEM.CREATION_MAX_SKILL_RANK
    const spent = this.#derived.skillPointsSpent
    const overflow = (total) => Math.max(0, total - SYSTEM.SKILL_POINTS_TOTAL)

    const shields = Array.fromRange(SYSTEM.MAX_RANK, 1).map((step) => {
      const isFloor = step <= granted
      const isReserved = step > maxRank && !isFloor

      // En personnalisation, seul ce qui déborde des 10 points de l'étape 5 se paie ; à l'étape 5,
      // chaque cran se paie plein pot sur l'enveloppe de compétences.
      const projectedSkills = { ...this.#derived.skills, [skill.id]: step }
      const projected = this.#skillBudget(projectedSkills).total
      const cost = custom ? overflow(projected) - overflow(spent) : projected - spent
      const affordable = cost <= remaining
      // Une seule compétence peut finir la création au rang 3.
      const rank3Full = step >= SYSTEM.MAX_RANK && rank < SYSTEM.MAX_RANK && this.#derived.rank3Skills >= SYSTEM.CREATION_MAX_RANK3_SKILLS

      let tooltip
      if (isFloor) tooltip = game.i18n.localize("CDG.creation.competences.floorTooltip")
      else if (isReserved) tooltip = game.i18n.localize("CDG.creation.competences.reservedTooltip")
      else if (step <= rank) tooltip = game.i18n.format("CDG.creation.competences.lowerTooltip", { rank: step })
      else if (rank3Full) tooltip = game.i18n.format("CDG.creation.competences.rank3Full", { max: SYSTEM.CREATION_MAX_RANK3_SKILLS })
      else if (affordable) tooltip = game.i18n.format("CDG.creation.competences.raiseTooltip", { rank: step, cost })
      else tooltip = game.i18n.format("CDG.creation.competences.tooExpensive", { cost, remaining: Math.max(0, remaining) })

      return {
        step,
        filled: rank >= step,
        floor: isFloor,
        reserved: isReserved,
        // Redescendre est toujours permis : cela rend les points investis.
        disabled: isFloor || isReserved || (step > rank && (!affordable || rank3Full)),
        tooltip,
      }
    })

    return { ...skill, rank, granted, shields }
  }

  /**
   * Recalcule le budget global pour une projection de rangs.
   * @param {Object<string, number>} skills Rangs projetés.
   */
  #skillBudget(skills) {
    return skillBudget({
      skillIds: Object.keys(SYSTEM.SKILLS),
      skills,
      grantedSkills: this.#derived.grantedSkills,
      freeSkillRanks: this.#derived.creationGrants.freeSkillRanks,
      rankCosts: SYSTEM.SKILL_RANK_COST,
    })
  }

  /**
   * L'état d'une étape : complète ou non, et ce qui manque le cas échéant.
   * @param {number} index
   * @returns {{complete: boolean, message: string}}
   */
  #stepStatus(index) {
    // `format` plutôt que `localize` : le message des caractéristiques rappelle les bornes, et un
    // message sans variable traverse `format` sans dommage.
    const missing = (key, data = {}) => ({
      complete: false,
      message: game.i18n.format(`CDG.creation.missing.${key}`, { min: SYSTEM.ABILITY_MIN, max: SYSTEM.ABILITY_MAX, total: SYSTEM.ABILITY_POINTS_TOTAL, ...data }),
    })
    const done = { complete: true, message: "" }

    switch (SYSTEM.CREATION_STEPS[index].id) {
      case "abilities":
        // Les points doivent être placés jusqu'au dernier, et aucune caractéristique ne peut sortir
        // des bornes de la création.
        if (!this.#derived.pointsWithinBounds) return missing("abilitiesBounds")
        if (this.#derived.pointsRemaining > 0) return missing("abilitiesRemaining", { points: this.#derived.pointsRemaining })
        if (this.#derived.pointsRemaining < 0) return missing("abilitiesOver", { points: -this.#derived.pointsRemaining })
        return done

      case "origine":
        if (!this.#draft.peuple.name) return missing("peuple")
        if (!this.#draft.religion) return missing("religion")
        if (this.#derived.languages.length === 0) return missing("languages")
        return done

      case "carriere":
        if (!this.#draft.carriere.name) return missing("carriere")
        if (SYSTEM.GRADES[this.#draft.grade]?.creationCost === null) return missing("gradeUnavailable")
        return done

      case "ascendance":
        if (!this.#draft.ascendance.name) return missing("ascendance")
        return done

      case "competences":
        if (this.#derived.freeSkillRanksRemaining > 0) return missing("freeSkillRanks", { points: this.#derived.freeSkillRanksRemaining })
        if (this.#derived.skillPointsRemaining > 0) return missing("skillPointsRemaining", { points: this.#derived.skillPointsRemaining })
        return done

      case "traits":
        if (this.#derived.traitsMissing > 0) return missing("traitsDominant", { count: this.#derived.traitsMissing })
        if (this.#derived.traitsPromoted < SYSTEM.TRAIT_RANK2_MIN) return missing("traitsRank2Low", { count: SYSTEM.TRAIT_RANK2_MIN - this.#derived.traitsPromoted })
        if (this.#derived.traitsPromoted > SYSTEM.TRAIT_RANK2_MAX) return missing("traitsRank2High", { count: this.#derived.traitsPromoted - SYSTEM.TRAIT_RANK2_MAX })
        if (this.#derived.traitsMastered > SYSTEM.TRAIT_RANK3_MAX) return missing("traitsRank3High", { count: this.#derived.traitsMastered - SYSTEM.TRAIT_RANK3_MAX })
        return done

      case "personnalisation":
        if (this.#derived.rank3Skills > SYSTEM.CREATION_MAX_RANK3_SKILLS) return missing("rank3Skills", { max: SYSTEM.CREATION_MAX_RANK3_SKILLS })
        if (this.#derived.customizationRemaining > 0) return missing("customizationRemaining", { points: this.#derived.customizationRemaining })
        if (this.#derived.customizationRemaining < 0) return missing("customizationOver", { points: this.#derived.customizationOver })
        return done

      case "combat":
        return done

      case "identite":
        return this.#draft.name.trim() ? done : missing("name")
    }

    return done
  }

  /**
   * Le récapitulatif affiché à la dernière étape.
   * @returns {Array<{label: string, value: string}>}
   */
  #recap() {
    const lines = [
      { label: "CDG.label.long.peuple", value: this.#draft.peuple.name },
      { label: "CDG.label.long.religion", value: this.#derived.religionLabel },
      { label: "CDG.label.long.carriere", value: this.#draft.carriere.name },
      { label: "CDG.label.long.grade", value: this.#draft.grade ? game.i18n.localize(SYSTEM.GRADES[this.#draft.grade].label) : "" },
      { label: "CDG.label.long.ascendance", value: this.#draft.ascendance.name },
      { label: "CDG.label.long.compulsion", value: this.#ascendanceItem?.system.compulsion ?? "" },
      {
        label: "CDG.creation.personnalisation.ascendanceArcanumTitle",
        value: this.#ascendanceArcanumChoices.find((item) => item.uuid === this.#draft.ascendanceArcanumBonus)?.name ?? "",
      },
      {
        label: "CDG.label.long.abilities",
        value: Object.values(SYSTEM.ABILITIES)
          .map((ability) => `${game.i18n.localize(ability.label)} ${this.#derived.abilities[ability.id]}`)
          .join(" · "),
      },
      { label: "CDG.label.long.skills", value: game.i18n.format("CDG.creation.recap.trainedSkills", { count: this.#derived.trainedCount }) },
      {
        label: "CDG.creation.recap.freeSkillRanks",
        value: this.#derived.creationGrants.freeSkillRanks
          ? game.i18n.format("CDG.creation.recap.freeSkillRanksValue", {
              used: this.#derived.freeSkillRanksUsed,
              total: this.#derived.creationGrants.freeSkillRanks,
            })
          : "",
      },
      {
        label: "CDG.creation.recap.customizationBonus",
        value: this.#derived.creationGrants.customizationPoints
          ? game.i18n.format("CDG.creation.recap.customizationBonusValue", { points: this.#derived.creationGrants.customizationPoints })
          : "",
      },
      { label: "CDG.label.long.karma", value: `${this.#derived.karma.value} — ${game.i18n.localize(this.#derived.karma.allegianceLabel)}` },
      { label: "CDG.label.long.languages", value: this.#derived.languages.map((id) => game.i18n.localize(SYSTEM.LANGUAGES[id].label)).join(", ") },
    ]
    return lines.filter((line) => line.value)
  }

  /* -------------------------------------------- */
  /*  Saisie                                      */
  /* -------------------------------------------- */

  /**
   * Recopie le formulaire dans le brouillon.
   *
   * Les champs sont nommés d'après le chemin qu'ils occupent dans le brouillon (`abilities.corps`,
   * `peuple.uuid`...), ce qui évite un aiguillage par champ. Choisir un peuple ou une carrière dans
   * la liste en recopie le nom : les deux champs restent utilisables sans objet correspondant.
   * @this {CdgCharacterCreation}
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onChangeForm(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object)

    if (data.peuple?.uuid !== undefined && data.peuple.uuid !== this.#draft.peuple.uuid) {
      const item = data.peuple.uuid ? await this.#resolveDocument(data.peuple.uuid) : null
      if (item) data.peuple.name = item.name
    }
    if (data.carriere?.uuid !== undefined && data.carriere.uuid !== this.#draft.carriere.uuid) {
      const item = data.carriere.uuid ? await this.#resolveDocument(data.carriere.uuid) : null
      if (item) data.carriere.name = item.name
    }
    if (data.ascendance?.uuid !== undefined && data.ascendance.uuid !== this.#draft.ascendance.uuid) {
      const item = data.ascendance.uuid ? await this.#resolveDocument(data.ascendance.uuid) : null
      if (item) data.ascendance.name = item.name
    }

    // Le grade est le seul champ de formulaire à coûter des points : un grade hors d'atteinte ou
    // trop cher est refusé ici, et pas seulement grisé dans le gabarit.
    if (data.grade !== undefined && data.grade !== this.#draft.grade) {
      const cost = SYSTEM.GRADES[data.grade]?.creationCost
      const budget = this.#derived.customizationRemaining + this.#derived.gradeCost
      if (cost === null || cost === undefined || cost > budget) delete data.grade
    }

    foundry.utils.mergeObject(this.#draft, data)

    // Un groupe de boutons radio dont aucun n'est coché arrive à `null` : le brouillon ne connaît
    // que la chaîne vide, et tout le reste du code compte dessus.
    this.#draft.religion ??= ""
    this.#draft.grade ||= "duplicator"

    this.render()
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Va directement à une étape déjà atteinte, depuis le bandeau.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-step`.
   */
  static #onGoToStep(event, target) {
    const index = parseInt(target.dataset.step)
    if (isNaN(index) || index > this.#maxStep) return
    this.#step = index
    this.render()
  }

  /**
   * Revient à l'étape précédente.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onPreviousStep(event, target) {
    if (this.#step === 0) return
    this.#step -= 1
    this.render()
  }

  /**
   * Passe à l'étape suivante. Une étape incomplète ne bloque pas : elle reste signalée dans le
   * bandeau, et le récapitulatif final la rappellera.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onNextStep(event, target) {
    if (this.#step >= SYSTEM.CREATION_STEPS.length - 1) return
    this.#step += 1
    this.#maxStep = Math.max(this.#maxStep, this.#step)
    this.render()
  }

  /**
   * Achète ou rend l'augmentation d'une caractéristique, au prix fort des points de
   * personnalisation. Une seule augmentation par caractéristique à la création.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-ability`.
   */
  static #onToggleImprovement(event, target) {
    const ability = target.dataset.ability
    if (!ability) return

    const bought = this.#draft.improvements[ability] > 0
    if (!bought && SYSTEM.CUSTOMIZATION_COSTS.abilityImprovement > this.#derived.customizationRemaining) return

    this.#draft.improvements[ability] = bought ? 0 : SYSTEM.CREATION_MAX_ABILITY_IMPROVEMENTS
    this.render()
  }

  /**
   * Ajoute un arcanum choisi dans la liste, au rang 1.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`, lu depuis le `select` voisin.
   */
  static async #onAddArcanum(event, target) {
    const select = this.element.querySelector("select[name='arcanumPicker']")
    const uuid = select?.value
    if (!uuid || this.#draft.items.includes(uuid)) return

    const item = await this.#resolveDocument(uuid)
    if (!item || item.type !== SYSTEM.ITEM_TYPE.arcanum) return

    this.#draft.items.push(uuid)
    this.#draft.arcanumRanks[uuid] = SYSTEM.ARCANUM_MIN_RANK
    this.render()
  }

  /**
   * Fixe le rang d'un arcanum acquis. Recliquer sur le rang courant le redescend, et le rang 1
   * recliqué retire l'arcanum : c'est le seul moyen de rendre les 7 points. Un arcanum de la
   * carrière ne peut jamais redescendre sous son plancher gratuit.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid` et `data-rank`.
   */
  static #onSetArcanumRank(event, target) {
    const uuid = target.dataset.uuid
    const clicked = parseInt(target.dataset.rank)
    if (!uuid || isNaN(clicked)) return

    const floor = this.#carriereArcanumFloor(uuid)
    const maxRank = Math.max(SYSTEM.CREATION_MAX_ARCANUM_RANK, floor)
    if (clicked > maxRank || clicked < floor) return

    const current = this.#derived.arcanumRanks[uuid] ?? floor
    if (current === clicked) return

    const delta = (clicked - current) * SYSTEM.CUSTOMIZATION_COSTS.arcanumRank
    if (delta > this.#derived.customizationRemaining) return

    this.#draft.arcanumRanks[uuid] = clicked
    this.render()
  }

  /**
   * Choisit, parmi les candidats de l'ascendance, celui qui reçoit le bonus gratuit — un seul à la
   * fois, recliquer sur le candidat déjà choisi l'annule. Gratuit : rien à vérifier contre le
   * budget de personnalisation.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`.
   */
  static #onSetAscendanceArcanumBonus(event, target) {
    const uuid = target.dataset.uuid
    if (!uuid) return
    const activating = this.#draft.ascendanceArcanumBonus !== uuid
    if (activating && this.#ascendanceArcanumOptions().find((option) => option.uuid === uuid)?.capped) return
    this.#draft.ascendanceArcanumBonus = activating ? uuid : ""
    this.render()
  }

  /**
   * Investit ou reprend un point dans le pécule de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-delta`.
   */
  static #onAdjustMoney(event, target) {
    const delta = parseInt(target.dataset.delta)
    if (isNaN(delta)) return
    if (delta > this.#derived.customizationRemaining) return

    this.#draft.moneyPoints = Math.max(0, this.#draft.moneyPoints + delta)
    this.render()
  }

  /**
   * Monte ou descend une caractéristique d'un point, dans les bornes de la création.
   *
   * La montée s'arrête aussi quand l'enveloppe est épuisée : le budget se dépense au clic, sans
   * jamais laisser le compteur passer dans le rouge. Le champ de saisie, lui, reste libre — un
   * joueur qui tape une valeur voit le dépassement signalé.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-ability` et `data-delta`.
   */
  static #onAdjustAbility(event, target) {
    const ability = target.dataset.ability
    const delta = parseInt(target.dataset.delta)
    if (!ability || isNaN(delta)) return

    const value = this.#draft.abilities[ability] + delta
    if (value < SYSTEM.ABILITY_MIN || value > SYSTEM.ABILITY_MAX) return
    if (delta > 0 && this.#derived.pointsRemaining < delta) return

    this.#draft.abilities[ability] = value
    this.render()
  }

  /**
   * Fixe le rang d'une compétence. Recliquer sur l'écusson courant redescend d'un cran, comme sur
   * la fiche.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-skill` et `data-rank`.
   */
  static #onSetSkillRank(event, target) {
    const skill = target.dataset.skill
    const clicked = parseInt(target.dataset.rank)
    if (!skill || isNaN(clicked)) return

    const granted = this.#derived.grantedSkills[skill] ?? 0
    const custom = this.currentStep.id === "personnalisation"

    // Le rang accordé par la carrière est un plancher : les écussons qu'il occupe ne bougent pas.
    if (clicked <= granted) return
    // L'étape des compétences s'arrête au rang 2 ; le rang 3 s'achète en personnalisation.
    if (!custom && clicked > SYSTEM.CREATION_MAX_SKILL_RANK) return

    // Recliquer sur l'écusson courant redescend d'un cran, comme sur la fiche, sans jamais passer
    // sous le plancher de la carrière.
    const current = this.#derived.skills[skill]
    const target_ = Math.max(granted, current === clicked ? clicked - 1 : clicked)
    if (target_ === current) return

    const projectedSkills = { ...this.#derived.skills, [skill]: target_ }
    const projectedSpent = this.#skillBudget(projectedSkills).total

    if (custom) {
      // En personnalisation, seul ce qui déborde des 10 points de l'étape 5 se paie ici : monter
      // une compétence quand l'enveloppe précédente n'est pas épuisée ne coûte rien de plus.
      const spent = this.#derived.skillPointsSpent
      const overflow = (total) => Math.max(0, total - SYSTEM.SKILL_POINTS_TOTAL)
      const delta = overflow(projectedSpent) - overflow(spent)
      if (delta > this.#derived.customizationRemaining) return
      // Une seule compétence peut finir la création au rang 3.
      if (target_ >= SYSTEM.MAX_RANK && this.#derived.rank3Skills >= SYSTEM.CREATION_MAX_RANK3_SKILLS && current < SYSTEM.MAX_RANK) return
    } else if (projectedSpent - this.#derived.skillPointsSpent > this.#derived.skillPointsRemaining) {
      return
    }

    this.#draft.skills[skill] = target_
    this.render()
  }

  /**
   * Fixe la valeur d'un couple de traits : un côté domine, l'autre retombe à zéro.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-pair`, `data-side` et `data-value`.
   */
  static #onSetTrait(event, target) {
    const pairId = target.dataset.pair
    const side = target.dataset.side
    const value = parseInt(target.dataset.value)
    if (!pairId || !side || isNaN(value)) return

    const trait = this.#draft.traits[pairId]
    const isSameCell = trait.dominant === side && trait.value === value

    // Libérer un couple ne bute sur aucun plafond ; le renseigner, si.
    if (!isSameCell) {
      const promoted = this.#derived.traitsPromoted - (trait.value >= 2 ? 1 : 0) + (value >= 2 ? 1 : 0)
      const mastered = this.#derived.traitsMastered - (trait.value >= 3 ? 1 : 0) + (value >= 3 ? 1 : 0)
      if (promoted > SYSTEM.TRAIT_RANK2_MAX || mastered > SYSTEM.TRAIT_RANK3_MAX) return
    }

    this.#draft.traits[pairId] = isSameCell ? { dominant: null, value: 0 } : { dominant: side, value }
    this.render()
  }

  /**
   * Coche ou décoche une langue. Celles accordées par le peuple ne se décochent pas.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-language`.
   */
  static #onToggleLanguage(event, target) {
    const language = target.dataset.language
    if (!language || this.#derived.grantedLanguages.includes(language)) return

    const known = new Set(this.#draft.languages)
    if (known.has(language)) known.delete(language)
    else {
      // Une langue apprise se paie sur les points de personnalisation ; celles du peuple, non.
      if (SYSTEM.CUSTOMIZATION_COSTS.language > this.#derived.customizationRemaining) return
      known.add(language)
    }

    this.#draft.languages = [...known]
    this.render()
  }

  /**
   * Choisit le portrait du personnage.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onPickImage(event, target) {
    const fp = new foundry.applications.apps.FilePicker.implementation({
      current: this.#draft.img,
      type: "image",
      callback: (path) => {
        this.#draft.img = path
        this.render()
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    })
    return fp.browse()
  }

  /**
   * Retire un objet de la liste de départ.
   * @param {PointerEvent} event
   * @param {HTMLElement} target Porte `data-uuid`.
   */
  static #onRemoveItem(event, target) {
    const uuid = target.dataset.uuid
    this.#draft.items = this.#draft.items.filter((entry) => entry !== uuid)
    delete this.#draft.arcanumRanks[uuid]
    this.render()
  }

  /**
   * Détache l'objet Peuple, en laissant le nom saisi.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onClearPeuple(event, target) {
    this.#draft.peuple.uuid = ""
    this.render()
  }

  /**
   * Détache l'objet Carrière, en laissant le nom saisi.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onClearCarriere(event, target) {
    this.#draft.carriere.uuid = ""
    this.render()
  }

  /**
   * Détache l'objet Ascendance, en laissant le nom saisi.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onClearAscendance(event, target) {
    this.#draft.ascendance.uuid = ""
    this.render()
  }

  /**
   * Repart d'un brouillon vierge, après confirmation.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onReset(event, target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("CDG.creation.resetTitle") },
      content: `<p>${game.i18n.localize("CDG.creation.resetContent")}</p>`,
    })
    if (!confirmed) return

    this.#draft = CdgCharacterCreation.#blankDraft()
    this.#step = 0
    this.#maxStep = 0
    this.render()
  }

  /* -------------------------------------------- */
  /*  Glisser-déposer                             */
  /* -------------------------------------------- */

  /**
   * Accepte un objet déposé n'importe où dans la fenêtre : un peuple ou une carrière prend la
   * place de celui déjà choisi, tout le reste rejoint l'équipement de départ.
   * @param {DragEvent} event
   */
  async #onDrop(event) {
    const data = TextEditor.implementation.getDragEventData(event)
    if (data.type !== "Item") return

    const item = await Item.implementation.fromDropData(data)
    if (!item) return

    switch (item.type) {
      case SYSTEM.ITEM_TYPE.peuple:
        this.#draft.peuple = { name: item.name, uuid: item.uuid }
        break
      case SYSTEM.ITEM_TYPE.carriere:
        this.#draft.carriere = { name: item.name, uuid: item.uuid }
        break
      case SYSTEM.ITEM_TYPE.ascendance:
        this.#draft.ascendance = { name: item.name, uuid: item.uuid }
        break
      default:
        if (this.#draft.items.includes(item.uuid)) return
        this.#draft.items.push(item.uuid)
    }

    this.render()
  }

  /* -------------------------------------------- */
  /*  Création                                    */
  /* -------------------------------------------- */

  /**
   * Crée l'acteur. C'est la seule écriture de tout l'assistant.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCreate(event, target) {
    if (this.#creating) return
    if (!this.#draft.name.trim()) {
      ui.notifications.warn(game.i18n.localize("CDG.creation.missing.name"))
      this.#step = SYSTEM.CREATION_STEPS.length - 1
      return this.render()
    }

    // Une étape laissée en plan n'interdit pas de forger le personnage : on prévient, et le joueur
    // tranche. Un Marqué incomplet se finit à la main sur sa fiche.
    const incomplete = SYSTEM.CREATION_STEPS.filter((step, index) => !this.#stepStatus(index).complete)
    if (incomplete.length > 0) {
      const list = incomplete.map((step) => `<li>${game.i18n.localize(step.label)}</li>`).join("")
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: game.i18n.localize("CDG.creation.incompleteTitle") },
        content: `<p>${game.i18n.localize("CDG.creation.incompleteContent")}</p><ul>${list}</ul>`,
      })
      if (!confirmed) return
    }

    this.#creating = true
    target.disabled = true
    let actor = null
    let completed = false
    try {
      actor = await Actor.implementation.create({
        name: this.#draft.name.trim(),
        type: "character",
        img: this.#draft.img,
        system: this.#actorSystemData(),
      })
      if (!actor) throw new Error("Actor.implementation.create n'a retourné aucun document")

      // Les origines doivent passer par l'API de l'acteur : elle marque la provenance des objets
      // accordés et permet de les retirer proprement plus tard.
      if (this.#peupleItem) await actor.grantOrigin(this.#peupleItem, { notifySuccess: false })
      if (this.#carriereItem) {
        await actor.grantOrigin(this.#carriereItem, { notifySuccess: false })
        // Un arcanum de la carrière que le joueur a monté avec ses points de personnalisation :
        // la copie embarquée par `grantOrigin` part au rang de la carrière, à corriger ici plutôt
        // que d'embarquer un doublon.
        const grantedArcanums = actor.grantedBy(actor.carriere).filter((item) => item.type === SYSTEM.ITEM_TYPE.arcanum)
        for (const source of this.#carriereArcanums) {
          const target = this.#draft.arcanumRanks[source.uuid]
          if (!target || target <= source.system.rank) continue
          const embedded = grantedArcanums.find((item) => item.name === source.name)
          if (embedded) await embedded.update({ "system.rank": target })
        }
      }

      // Avant l'ascendance : son bonus retrouve un arcanum déjà possédé par son nom
      // (`CdgActor#grantArcanumBonus`) — un arcanum acheté en personnalisation doit donc déjà être
      // embarqué pour compter comme « déjà là », exactement comme l'aperçu de l'assistant le
      // suppose (`#ascendanceArcanumOptions`).
      const items = await this.#startingItems()
      if (items.length > 0) await actor.createEmbeddedDocuments("Item", items)

      if (this.#ascendanceItem) {
        await actor.grantAscendance(this.#ascendanceItem, { notifySuccess: false })
        // `grantAscendance` a repris le bonus inscrit sur l'objet source (le plus souvent aucun) :
        // s'il diffère du candidat choisi dans l'assistant, on défait l'un et pose l'autre, puis on
        // consigne le choix sur la copie embarquée — sans quoi retirer l'ascendance plus tard sur
        // la fiche lirait un bonus resté vide et ne rendrait rien.
        const ascendance = actor.ascendance
        if (ascendance && ascendance.system.arcanumBonus !== this.#draft.ascendanceArcanumBonus) {
          await actor.updateArcanumBonus(ascendance, ascendance.system.arcanumBonus, this.#draft.ascendanceArcanumBonus)
          await ascendance.update({ "system.arcanumBonus": this.#draft.ascendanceArcanumBonus })
        }
      }

      // Les ajustements d'origine modifient le maximum par effet actif. La réserve de départ est
      // remplie ensuite, afin de partir au vrai maximum sans stocker deux fois le bonus.
      const abilityValues = Object.values(SYSTEM.ABILITIES).reduce((updates, ability) => {
        updates[`system.abilities.${ability.id}.value`] = actor.system.abilities[ability.id].max
        return updates
      }, {})
      await actor.update(abilityValues)

      completed = true
    } catch (error) {
      console.error(Utils.log("Création du personnage impossible"), error)
      let removed = !actor
      if (actor) {
        try {
          await actor.delete()
          removed = true
        } catch (cleanupError) {
          console.error(Utils.log("Suppression du personnage partiel impossible"), cleanupError)
        }
      }
      if (removed) ui.notifications.error(game.i18n.localize("CDG.creation.createFailed"))
      else ui.notifications.error(game.i18n.format("CDG.creation.createFailedPartial", { name: actor.name }))
    } finally {
      this.#creating = false
      if (!completed) this.render()
    }
    if (!completed) return

    ui.notifications.info(game.i18n.format("CDG.creation.created", { name: actor.name }))
    await this.close()
    actor.sheet.render(true)
  }

  /**
   * Les données système de l'acteur à créer, à partir du brouillon et des valeurs dérivées.
   * @returns {Object}
   */
  #actorSystemData() {
    // Peuple, carrière et ascendance ne sont plus des champs texte de `identity` : ce sont de vrais
    // objets, déposés ensuite par `grantOrigin`/`grantAscendance` juste après la création de
    // l'acteur (cf. `#onCreate`). `identity` ne porte plus que le vrai nom, la religion et le grade.
    const system = {
      identity: {
        vraiNom: this.#draft.vraiNom,
        religion: this.#derived.religionLabel,
        grade: this.#draft.grade,
      },
      abilities: {},
      skills: {},
      traits: {},
      languages: this.#derived.languages,
      passion: { tokens: this.#draft.passionTokens },
      // Les points de personnalisation ne sont pas de l'expérience gagnée en jeu : le compteur
      // d'expérience du personnage part à zéro. Seule la case d'augmentation cochée en garde trace.
      xp: { total: 0, spent: 0 },
      wealth: this.#derived.wealth,
      specialTraits: CdgCharacterCreation.#toHtml(this.#draft.marque),
      details: {
        biography: CdgCharacterCreation.#toHtml(this.#draft.histoire),
      },
    }

    // Les bonus d'origine ne sont pas persistés ici : ils seront appliqués par les effets actifs
    // transférés. La réserve sera remplie au maximum effectif une fois les origines embarquées.
    for (const ability of Object.values(SYSTEM.ABILITIES)) {
      const base = this.#draft.abilities[ability.id] + this.#draft.improvements[ability.id]
      system.abilities[ability.id] = {
        max: base,
        value: base,
        improvements: this.#draft.improvements[ability.id],
      }
    }

    for (const skill of Object.values(SYSTEM.SKILLS)) {
      system.skills[skill.id] = { rank: this.#derived.skills[skill.id] }
    }

    for (const pair of Object.values(SYSTEM.TRAIT_PAIRS)) {
      system.traits[pair.id] = { ...this.#draft.traits[pair.id] }
    }

    return system
  }

  /**
   * Convertit un texte saisi au clavier en HTML : les champs de destination sont des `HTMLField`,
   * et les alinéas du joueur doivent survivre au passage.
   * @param {string} text
   * @returns {string}
   */
  static #toHtml(text) {
    const trimmed = (text ?? "").trim()
    if (!trimmed) return ""
    return trimmed
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${foundry.utils.escapeHTML(paragraph).replaceAll("\n", "<br>")}</p>`)
      .join("")
  }

  /**
   * Les objets ajoutés manuellement, hors de ceux que les origines accordent déjà.
   * @returns {Promise<Object[]>}
   */
  async #startingItems() {
    const granted = new Set([...(this.#peupleItem?.system.features ?? []), ...(this.#carriereItem?.system.arcanums ?? []), ...(this.#carriereItem?.system.equipments ?? [])])
    const uuids = new Set(this.#draft.items.filter((uuid) => !granted.has(uuid)))

    const documents = await Promise.all([...uuids].map((uuid) => this.#resolveDocument(uuid)))
    return documents
      .filter((item) => item !== null)
      .map((item) => {
        const data = item.toObject()
        // Un arcanum acquis en personnalisation part au rang payé, pas à celui de sa fiche source.
        const rank = this.#derived.arcanumRanks[item.uuid]
        if (rank !== undefined) data.system.rank = rank
        return data
      })
  }

  /* -------------------------------------------- */
  /*  API                                         */
  /* -------------------------------------------- */

  /**
   * Ouvre l'assistant, ou ramène au premier plan celui déjà ouvert.
   * @returns {Promise<CdgCharacterCreation>}
   */
  static async open() {
    const existing = foundry.applications.instances.get("cdg-character-creation")
    if (existing) {
      existing.bringToFront()
      return existing
    }
    return new CdgCharacterCreation().render({ force: true })
  }
}
