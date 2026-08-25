/**
 * Les 22 Arcanums du livre, p. 92 à 109.
 *
 * Le texte est repris de la couche texte du PDF, dépouillée colonne par colonne : les intitulés de
 * variante et les coûts en Esprit ont été relevés pouvoir par pouvoir, le livre ne les donnant que
 * dans le corps du texte.
 *
 * Deux conventions, imposées par ce que `CdgArcanumData` sait porter :
 *
 * - Un arcanum **physique** n'a pas de tours par rang : son effet et ses deux variantes
 *   d'allégeance tiennent dans la description, et ses trois onglets de rang restent vides.
 * - Pour un arcanum **mystique**, chaque rang porte son nom, ses coûts et ses deux variantes. Le
 *   texte commun au tour, celui que le livre imprime avant les puces d'allégeance, rejoint la
 *   description sous le titre du rang : le modèle n'a pas de champ pour lui, et le perdre aurait
 *   vidé les pouvoirs de leur substance.
 *
 * `slug` fait au plus 11 caractères : c'est lui, et non le nom affiché, qui forme l'identifiant du
 * document. Deux arcanums ne peuvent donc pas se retrouver avec le même `_id` parce que leurs noms
 * commencent pareil.
 */
export const ARCANUMS = [
  {
    slug: "acuitus",
    name: "Acuitus",
    arcanumType: "physique",
    summary: "Perceptions aiguisées et tirs précis.",
    linkedSkill: "tir",
    description:
      "<p>Un œil vif et un geste adroit suffisent à un archer pour transpercer mortellement un homme. " +
      "Acuitus offre une acuité sensorielle supérieure à celle des animaux les mieux dotés par la " +
      "nature. Pour chaque rang possédé dans cet Arcanum, le personnage bénéficie d’un + 2 à tous les " +
      "tests d’attaque avec une arme à distance (tir ou jet).</p><h4>Balance / Lumière</h4><p>Doté " +
      "d’une vue perçante, le Marqué bénéficie par ailleurs d’un bonus de + 1 par rang sur tous les " +
      "tests de perception (vigilance, investigation, etc.) mettant largement en jeu la " +
      "vision.</p><h4>Obscurité</h4><p>Le Marqué bénéficie également d’un bonus de + 1 par rang sur " +
      "tous les tests de perception (vigilance, investigation, etc.) mettant largement en jeu " +
      "l’audition, le toucher et/ou l’odorat.</p>",
  },
  {
    slug: "devito",
    name: "Devito",
    arcanumType: "physique",
    summary: "Esquives acrobatiques et prodigieuses.",
    linkedSkill: "esquive",
    description:
      "<p>L’Arcanum Devito se concentre sur l’art de la dérobade en se basant sur le leurre et sur des " +
      "prouesses physiques surnaturelles, telles que des sauts périlleux, des esquives acrobatiques ou " +
      "des roulés-boulés. Pour chaque rang possédé dans cet Arcanum, le personnage bénéficie d’un + 2 " +
      "à tous les tests d’esquive.</p><h4>Lumière / Balance</h4><p>Le Marqué gagne en outre un bonus " +
      "de + 1 par rang sur tous les tests d’Acrobatie, tels que les sauts périlleux, les pirouettes ou " +
      "le maintien de l’équilibre. Ce bonus s’applique en particulier aux tests visant à limiter les " +
      "dégâts d’une chute.</p><h4>Obscurité</h4><p>Le Marqué bénéficie par ailleurs d’un bonus de + 1 " +
      "par rang sur tous les tests de discrétion, que ce soit pour passer inaperçu ou pour dissimuler " +
      "un objet sur lui.</p>",
  },
  {
    slug: "dextem",
    name: "Dextem",
    arcanumType: "physique",
    summary: "Coups précis et inévitables au corps-à-corps.",
    linkedSkill: "melee",
    description:
      "<p>Les Marqués qui développent Dextem bénéficient d’une précision hors norme lors des combats : " +
      "leurs coups sont parfaitement ajustés et capables de trouver la moindre faille dans les " +
      "défenses de leurs adversaires. Pour chaque rang possédé dans cet Arcanum, le personnage " +
      "bénéficie d’un + 2 à tous les tests d’attaque au corps-à-corps, que ce soit avec une arme ou à " +
      "mains nues.</p><h4>Lumière / Balance</h4><p>Le Marqué gagne en outre un bonus de + 1 par rang " +
      "sur tous les tests créatifs ou bénéfiques mettant en jeu le doigté. C’est typiquement le cas " +
      "pour l’artisanat et les premiers soins.</p><h4>Obscurité</h4><p>Le Marqué bénéficie par " +
      "ailleurs d’un bonus de + 1 par rang sur tous les tests (autres que ceux d’attaque) visant à " +
      "détruire, détériorer ou nuire et impliquant principalement la dextérité, comme le pickpocket, " +
      "le crochetage de serrures ou le désamorçage de pièges.</p>",
  },
  {
    slug: "fulmen",
    name: "Fulmen",
    arcanumType: "physique",
    summary: "Vitesse d'action hors du commun.",
    linkedSkill: "",
    description:
      "<p>L’Arcanum Fulmen octroie une vitesse d’action hors du commun. Le personnage devient capable " +
      "de réaliser des mouvements à une vitesse surnaturelle ; ses réflexes deviennent prodigieux. " +
      "Pour chaque rang possédé dans cet Arcanum, le personnage bénéficie d’un + 2 à tous les tests " +
      "d’initiative.</p><h4>Lumière / Balance</h4><p>Le Marqué bénéficie par ailleurs d’un bonus de + " +
      "1 par rang sur tous les tests de course sur de courtes distances (sprint) : il est rapide, mais " +
      "pas forcément endurant.</p><h4>Obscurité</h4><p>Le Marqué bénéficie par ailleurs d’un bonus de " +
      "+ 1 par rang sur tous les tests visant à éviter d’être pris par surprise : ses réflexes sont " +
      "extraordinaires.</p>",
  },
  {
    slug: "induratus",
    name: "Induratus",
    arcanumType: "physique",
    summary: "Résistance aux blessures et aux privations.",
    linkedSkill: "",
    description:
      "<p>En développant Induratus, un Marqué peut endurer des coups terribles sans subir la moindre " +
      "éraflure, mais aussi résister aux pires épreuves. Pour chaque rang possédé dans cet Arcanum, le " +
      "personnage bénéficie d’un + 2 à tous les tests de résistance aux " +
      "dommages.</p><h4>Lumière</h4><p>Le Marqué gagne en outre un bonus de + 1 par rang sur tous les " +
      "tests visant à endurer les privations ou les sévices, que ce soit la fatigue, la faim, la soif " +
      "ou la torture.</p><h4>Balance / Obscurité</h4><p>Le Marqué bénéficie par ailleurs d’un bonus de " +
      "+ 1 par rang sur tous les tests visant à résister aux effets des maladies ou des poisons.</p>",
  },
  {
    slug: "obsidio",
    name: "Obsidio",
    arcanumType: "physique",
    summary: "Parades infaillibles et ripostes éclairs.",
    linkedSkill: "blocage",
    description:
      "<p>Les adeptes d’Obsidio apprennent à maîtriser toutes les subtilités de la parade, que ce soit " +
      "à l’aide d’armes de mêlée ou de boucliers. Ils font de cet art soit un rempart impénétrable " +
      "pour eux comme pour leurs alliés, soit un outil offensif, utilisant au mieux les failles de " +
      "l’attaquant pour s’y engouffrer et réaliser des ripostes mortelles. Pour chaque rang possédé " +
      "dans cet Arcanum, le personnage bénéficie d’un + 2 à tous les tests de blocage, aussi bien avec " +
      "une arme de corps-à-corps qu’avec les boucliers.</p><h4>Lumière</h4><p>Lorsqu’un allié proche " +
      "(moins de 2 mètres) est sur le point de recevoir un coup (après que sa tentative de blocage ou " +
      "d’esquive ait échoué mais avant que les dégâts soient déterminés), le Marqué peut tenter de le " +
      "défendre in extremis. Il doit pour cela dépenser 1 point de Vivacité. Il peut alors faire un " +
      "test de blocage dont le résultat se substitue à celui que le défenseur aurait dû appliquer. Si " +
      "cette tentative ne réussit toujours pas à éviter l’attaque, soit le pratiquant décide de subir " +
      "les dommages (ce choix nécessite la dépense de 1 point d’Esprit), soit la cible initiale reçoit " +
      "le coup (par défaut). Ce pouvoir ne « consomme » pas l’unique parade que peut réaliser en temps " +
      "normal le combattant par round.</p><h4>Balance / Obscurité</h4><p>Avant de tenter de bloquer un " +
      "coup au contact qui lui est destiné, le Marqué peut annoncer une tentative de riposte. Ceci lui " +
      "coûte 1 point de Vivacité. Si le test d’opposition d’attaque / parade se solde par un échec ou " +
      "un échec critique pour l’assaillant, le défenseur peut alors immédiatement tenter contre lui " +
      "une attaque gratuite (qui ne consomme pas d’action). Ce pouvoir ne permet pas d’outrepasser la " +
      "limite d’une seule tentative de blocage par round.</p>",
  },
  {
    slug: "rejuvnum",
    name: "Rejuvnum",
    arcanumType: "physique",
    summary: "Régénération de ses propres blessures.",
    linkedSkill: "",
    description:
      "<p>Rejuvnum offre à son possesseur la capacité de guérir ses propres blessures à une vitesse " +
      "surnaturelle, au point que certains décrivent ses effets comme semblables à de la régénération. " +
      "Le pratiquant peut se régénérer : la gravité d’une de ses blessures est alors réduite d’un cran " +
      "(une blessure légère disparaît, une blessure grave devient une blessure légère, une blessure " +
      "mortelle devient une blessure grave). Rejuvnum au rang 1 ( ) ne permet de traiter ainsi que les " +
      "blessures légères, au rang 2 ( ) les blessures graves et enfin au rang 3 ( ) toutes les " +
      "blessures, même mortelles.</p><h4>Lumière / Balance</h4><p>Chaque régénération est une action " +
      "qui coûte au Marqué 1 point de Corps. Il n’a même pas besoin d’être conscient pour que cet " +
      "effet opère : s’il est inconscient, la régénération se produit alors une fois par round, à la " +
      "toute fin du round.</p><h4>Obscurité</h4><p>La régénération se produit en fin de round et ne " +
      "consomme pas d’action. Pour pouvoir régénérer, le Marqué doit avoir infligé au moins une " +
      "blessure de la même gravité à un être vivant au cours du round et réussir un test de Corps / " +
      "Arcanum avec un malus de - 1, - 3 ou - 6 selon que la blessure à guérir soit légère, grave ou " +
      "mortelle. En combat, il lui faudra donc généralement réussir à toucher et faire saigner son " +
      "adversaire. Hors combat, la scarification ou le sacrifice d’un animal, voire d’un être humain " +
      "devrait faire l’affaire…</p>",
  },
  {
    slug: "stratagema",
    name: "Stratagema",
    arcanumType: "physique",
    summary: "Combattre avec ruse et intelligence.",
    linkedSkill: "",
    description:
      "<p>Le Marqué se bat en déployant des trésors d’ingéniosité, analysant rapidement les failles de " +
      "ses adversaires, et les surprenant avec des tactiques élaborées. Il ressent intuitivement le " +
      "flux des combats. En dépensant 1 point d’Esprit, le Marqué bénéficie d’un bonus de + 1 par rang " +
      "pour tous ses tests d’initiative, d’attaque et de défense, pendant toute la durée d’une " +
      "escarmouche ou d’un duel. On ne peut activer cet effet qu’une seule fois par combat. Ceci ne " +
      "requiert pas d’action. Exemple Lors d’une escarmouche, un Marqué avec Stratagema au rang 2 ( ) " +
      "peut choisir de dépenser 1 point d’Esprit pour gagner un bonus de + 2 à tous ses tests " +
      "d’initiative, d’attaque, d’esquive et de blocage, et ce tant que dure le combat.</p><h4>Lumière " +
      "/ Balance</h4><p>Le pratiquant se préfigure les mouvements des troupes sur les champs de " +
      "bataille, comme s’il lui était naturel de survoler la situation. Il gagne en permanence un " +
      "bonus de + 1 par rang dans cet Arcanum pour tous les tests de la compétence Tactique. Cet effet " +
      "est passif.</p><h4>Obscurité</h4><p>Pris au cœur d’une mêlée, le Marqué anticipe les mouvements " +
      "de foule de telle sorte qu’il soit moins exposé ou puisse plus aisément exploiter une faille " +
      "chez ses adversaires. Il bénéficie d’un bonus permanent de + 1 par rang dans cet Arcanum pour " +
      "tous les tests de la compétence Sens des batailles. Cet effet est passif.</p>",
  },
  {
    slug: "vehementer",
    name: "Vehementèr",
    arcanumType: "physique",
    summary: "Force surhumaine, coups dévastateurs.",
    linkedSkill: "",
    description:
      "<p>Avec Vehementèr, un personnage développe une force surhumaine et devient capable de " +
      "prouesses physiques dépassant ce que le commun des mortels pourrait normalement accomplir. Pour " +
      "chaque rang possédé dans cet Arcanum, le personnage bénéficie d’un + 2 à tous les tests de " +
      "dommages réalisés au corps-à-corps, que ce soit à mains nues ou avec une arme de " +
      "mêlée.</p><h4>Lumière / Balance</h4><p>Le Marqué bénéficie par ailleurs d’un bonus de + 1 par " +
      "rang sur tous les tests mettant en jeu la puissance physique brute, comme escalader une paroi à " +
      "la force des bras, gagner un bras de fer ou soulever un objet lourd.</p><h4>Obscurité</h4><p>Le " +
      "Marqué bénéficie par ailleurs d’un bonus de + 1 par rang sur tous les tests mettant en jeu la " +
      "domination mentale via le rapport de force, par exemple pour intimider autrui, obtenir des " +
      "informations sous la menace ou la torture, ou encore faire exécuter des ordres à des " +
      "subalternes réfractaires.</p>",
  },
  {
    slug: "alkemia",
    name: "Alkemia",
    arcanumType: "mystique",
    summary: "Préparer des concoctions, élixirs et autres enchantements.",
    description:
      "<p>Un adepte de l’Arcanum Alkemia dispose des connaissances mystiques requises pour fabriquer " +
      "des préparations alchimiques (concoctions, élixirs et enchantements), du moment qu’il dispose " +
      "du matériel, du temps nécessaire et des ingrédients adéquats. Les composantes alchimiques se " +
      "perdent vite mais un bon pratiquant en prélève souvent dans la nature. Aussi, on considère " +
      "qu’un alchimiste a toujours les ingrédients nécessaires pour réaliser une dose de préparation " +
      "par jour et par rang dans cet Arcanum. Ainsi, un pratiquant avec Alkemia au rang 2 ( ) pourra " +
      "préparer deux concoctions, deux élixirs ou une concoction et un élixir par jour. Un alchimiste " +
      "vend généralement une partie de sa production pour financer l’achat des ingrédients les plus " +
      "exotiques, ce qui revient à dire en termes de jeu que l’alchimie est financièrement neutre : le " +
      "personnage ne s’enrichit pas spécialement mais on ne compte pas non plus ses dépenses en " +
      "composantes. Ceci est d’autant plus vrai que les préparations ne se conservent guère longtemps, " +
      "ce qui force à les réaliser au fur et à mesure des besoins.</p>",
    ranks: [
      {
        name: "Concoctions",
        cost: { lumiere: 0, balance: 0, obscurite: 0 },
        effect:
          "<p>Le Marqué peut élaborer des concoctions simples. Il sait réaliser toutes les recettes " +
          "suivantes :</p><ul><li>Concoction de coup de fouet : récupération immédiate d’un point en " +
          "Corps, Vivacité ou Esprit, sous réserve que le buveur réussisse un test de Corps / " +
          "Vigueur.</li><li>Concoction de guérison : bonus de + 2 au prochain test de rétablissement (à la " +
          "fin de la journée) ; non cumulable.</li><li>Concoction de santé : bonus de + 2 pendant 24 h à " +
          "tous les tests visant à guérir une maladie ou une affliction ; non " +
          "cumulable.</li><li>Concoction d’antidote : bonus de + 2 pendant 24 h à tous les tests effectués " +
          "pour combattre un empoisonnement ; non cumulable.</li><li>Concoction de vigueur : bonus de + 2 " +
          "au prochain test sous 24 h pour encaisser une blessure ; non cumulable.</li><li>Concoction " +
          "d’endurance : bonus de + 2 pendant 24 h à tous les tests visant à résister à la fatigue ou aux " +
          "conditions climatiques ; non cumulable.</li><li>Concoction empoisonnée : doit être ingérée ; la " +
          "victime effectue un test de Corps / Endurance à + 2 ; réussite critique : aucun effet ; " +
          "réussite : blessure légère ; échec : blessure grave ; échec critique : blessure mortelle. " +
          "Préparer une concoction demande une dose d’ingrédients, 15 minutes et la réussite d’un test " +
          "d’Esprit / Arcanum à + 2.</li></ul>",
        variants: [
          {
            label: "Lumière / Balance",
            text: "<p>Une fois préparée, une concoction se conserve 72 h.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>S’il ne dispose pas des ingrédients, le pratiquant peut les remplacer par son sang, ce qui " +
              "lui inflige une blessure légère. Une fois préparée, une concoction ne se conserve que 24 " +
              "h.</p>",
          },
        ],
      },
      {
        name: "Élixirs",
        cost: { lumiere: 0, balance: 0, obscurite: 0 },
        effect:
          "<p>L’alchimiste sait préparer des élixirs, des préparations plus puissantes mais plus délicates " +
          "à élaborer :</p><ul><li>Élixir de feu : une petite dose de mélange inflammable (poix, goudron, " +
          "soufre, etc.).</li><li>Élixir de récupération : regain supplémentaire d’un point dans chaque " +
          "caractéristique après un repos ; non cumulable.</li><li>Élixir de guérison : bonus de + 4 au " +
          "prochain test de rétablissement (à la fin de la journée) ; non cumulable.</li><li>Élixir de " +
          "santé : bonus de + 4 pendant 24 h à tous les tests visant à guérir une maladie ou une " +
          "affliction ; non cumulable.</li><li>Élixir d’antidote : bonus de + 4 pendant 24 h à tous les " +
          "tests effectués pour combattre un empoisonnement ; non cumulable.</li><li>Élixir de vigueur : " +
          "bonus de + 4 au prochain test sous 24 h pour encaisser une blessure ; non " +
          "cumulable.</li><li>Élixir d’endurance : bonus de + 4 pendant 24 h à tous les tests visant à " +
          "résister à la fatigue ou aux conditions climatiques ; non cumulable.</li><li>Élixir empoisonné " +
          ": doit être ingéré ou appliqué sur une lame ; dans le second cas, le poison ne fait effet que " +
          "si le premier coup porté avec l’arme inflige au moins une blessure légère ; la victime effectue " +
          "un test de Corps / Endurance à - 2 ; réussite critique : aucun effet ; réussite : blessure " +
          "légère ; échec : blessure grave ; échec critique : blessure mortelle. Préparer un élixir " +
          "demande une dose d’ingrédients, 30 minutes et la réussite d’un test d’Esprit / Arcanum à - " +
          "2.</li></ul>",
        variants: [
          {
            label: "Lumière / Balance",
            text: "<p>Une fois préparé, un élixir se conserve 72 h.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>S’il ne dispose pas des ingrédients, le pratiquant peut les remplacer avec son sang, ce " +
              "qui lui inflige une blessure légère. Une fois préparé, un élixir ne se conserve que 24 h.</p>",
          },
        ],
      },
      {
        name: "Enchantements",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant connaît les secrets complexes des enchantements, de sorte qu’il puisse imbiber " +
          "un objet de pouvoirs magiques via des inscriptions profanes (runes, glyphes, sceaux, etc.). " +
          "L’objet à préparer doit être au minimum de bonne qualité (cf. Chiens de guerre - Chroniques du " +
          "meneur, « Qualité des objets », p. XXX). Le processus d’enchantement est long et laborieux, de " +
          "l’ordre d’une semaine de travail ininterrompu. Une fois enchanté, un objet confère à son " +
          "utilisateur un bonus de + 2 à un type d’action correspondant à sa fonction première. Un même " +
          "objet ne peut être enchanté qu’une seule fois. Des outils de crochetage enchantés donneraient " +
          "un + 2 aux jets de serrurerie, une épée enchantée accorderait un bonus de + 2 aux tests " +
          "d’attaque ou de dégâts selon qu’elle soit plutôt légère ou affûtée, une armure ferait " +
          "bénéficier d’un bonus de + 2 aux tests d’encaissement, etc. Ce bonus est cumulable avec celui " +
          "procuré par un éventuel objet de qualité exceptionnelle. En plus des autres coûts, un " +
          "enchantement nécessite l’engagement de 1 point d’Esprit. Tant que l’objet reste actif, ce point " +
          "ne peut plus être récupéré par quelque moyen que ce soit. Un enchantement coûte donc " +
          "virtuellement 1 point d’Esprit définitif. L’enchantement est permanent, mais est dissipé par la " +
          "mort de son créateur ou si ce dernier effectue un contre-rituel (une journée de travaux " +
          "magiques). Dans ce dernier cas, le point d’Esprit investi est récupéré. Le premier objet " +
          "enchanté produit par un Marqué est appelé son « artefact » : il a la particularité de ne pas " +
          "coûter l’habituel point d’Esprit et n’a d’effet qu’entre ses mains. Rien n’empêche un Marqué " +
          "d’enchanter un objet pour autrui, mais il doit payer le coût en Esprit — c’est donc une faveur " +
          "rarissime.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Outre l’objet de bonne qualité au minimum, les composants nécessaires à l’enchantement " +
              "coûtent excessivement cher (20 D) et ne peuvent en aucun cas rentrer dans les ingrédients " +
              "quotidiens gratuits.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>L’enchantement va puiser dans l’énergie vitale et la destinée du Marqué, ce qui se traduit " +
              "par des stigmates surnaturels. Les trois prochaines fois qu’il obtiendra un échec critique en " +
              "jeu, quelle que soit la nature du test, il subira une blessure grave en plus des effets " +
              "normaux (du sang coule par ses oreilles, il est victime d’une crise cardiaque, il subit une " +
              "combustion spontanée, etc.).</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "delere",
    name: "Dèlère",
    arcanumType: "mystique",
    summary: "Fragiliser et détruire les choses.",
    description:
      "<p>Dèlère se concentre sur la destruction. Cet Arcanum exploite l’entropie, c’est-à-dire l’idée " +
      "selon laquelle toute chose se dégrade, se désorganise et finit par se disloquer. Dans les mains " +
      "d’un sapeur ou d’un artilleur, Dèlère peut renverser le cours d’un siège.</p>",
    ranks: [
      {
        name: "Vision de la faiblesse",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le Marqué se concentre pendant une minute sur une cible. Il ressent alors son point faible, " +
          "c’est-à-dire là où elle devrait naturellement se briser avec le temps ou sous l’effet d’un " +
          "choc. Ce tour répond donc à la question : « Où frapper pour endommager, voire détruire le plus " +
          "efficacement possible une chose ? ». La réponse est parfois décevante, car évidente. Par " +
          "exemple, lancé sur une armure de plaques, il est probable que la réponse soit « ses lanières de " +
          "cuir ». Dans d’autres cas, elle met en lumière une faiblesse difficilement décelable autrement. " +
          "Ainsi, pour un édifice, les informations glanées sont souvent cruciales.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Ce tour ne peut cibler qu’un objet ou une structure, pas un être vivant. Le lancer " +
              "nécessite seulement de voir sa cible, quelle que soit la distance. Le pratiquant doit alors " +
              "dépenser 1 point d’Esprit.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Ce tour peut cibler aussi bien une chose qu’un être vivant. Le lancer demande un contact " +
              "tactile avec la cible et la dépense de 1 point d’Esprit. Si les informations reçues sont " +
              "pertinentes, le pratiquant bénéficie d’un bonus de + 2 à tous les tests visant à endommager " +
              "la structure ou à blesser l’être vivant pendant 24 h, en plus des éventuels bénéfices liés au " +
              "fait de connaître le point faible.</p>",
          },
        ],
      },
      {
        name: "Fragilisation",
        cost: { lumiere: 1, balance: 1, obscurite: 2 },
        effect:
          "<p>Le pratiquant peut considérablement augmenter la fragilité d’un petit objet ou d’une partie " +
          "d’une structure pour quelque temps. Il doit pour cela toucher ce qu’il veut affaiblir et se " +
          "concentrer pendant une minute. La zone affectée ne peut être plus grande que la taille d’un " +
          "poing. Une chose intacte aura, pour la durée du pouvoir, la résistance d’une chose délabrée ; " +
          "une chose délabrée deviendra cassante ; une chose cassante sera sur le point de s’effondrer " +
          "d’elle-même.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text: "<p>Le Marqué lance ce tour pour 1 point d’Esprit ; la fragilisation durera 1 heure.</p>",
          },
          {
            label: "Obscurité",
            text: "<p>Pour lancer ce tour, le Marqué doit dépenser 2 points d’Esprit. La fragilisation est " + "définitive.</p>",
          },
        ],
      },
      {
        name: "Déflagration",
        cost: { lumiere: 2, balance: 2, obscurite: 2 },
        effect:
          "<p>Le Marqué peut accumuler de l’énergie brute dans ses mains. Cette énergie est instable et " +
          "finira par produire une explosion. Le pratiquant doit se concentrer pendant une minute, au " +
          "cours de laquelle il joint ses mains. À l’issue de l’incantation, une boule d’énergie " +
          "crépitante y apparaît. Cette boule est immatérielle et inamovible : elle est littéralement « " +
          "accrochée » à l’air. Elle explosera après un laps de temps variable et totalement incontrôlé, " +
          "généralement entre 3 secondes et 3 minutes. Lancer ce tour nécessite la dépense de 2 points " +
          "d’Esprit et la réussite d’un test d’Esprit / Arcanum à - 5 (un échec critique indique une " +
          "explosion immédiate). Ce tour est généralement employé pour des travaux de démolition et peut " +
          "nécessiter un test complémentaire, par exemple avec la compétence « Ingénierie », pour des " +
          "tâches subtiles comme creuser une galerie sans provoquer son effondrement.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>L’explosion est très localisée et précise ; elle produit une lumière très vive et un son " +
              "modéré, sourd. Son pouvoir destructeur immédiat est très fort, mais elle n’a aucun effet à " +
              "courte portée et au-delà (les dégâts sont équivalents à un test de rang 3 sous Corps 25, " +
              "uniquement au point de contact de la boule).</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>La déflagration a la force d’un petit explosif artisanal et peut donc endommager de " +
              "grandes surfaces ou blesser des personnes alentour (les dégâts sont équivalents à un test de " +
              "rang 2 sous Corps 15, dans un rayon d’environ 3 mètres). Elle produit une détonation " +
              "assourdissante.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "impero",
    name: "Impero",
    arcanumType: "mystique",
    summary: "Commander avec force, dominer autrui.",
    description:
      "<p>Impero est un Arcanum plutôt agressif, qui regroupe des tours visant à asseoir la volonté du " +
      "pratiquant sur celle d’autrui. Cette influence n’est ni subtile ni discrète. Elle s’avère par " +
      "contre particulièrement redoutable pour mener au doigt et à la baguette des hommes, ce qui en " +
      "fait une capacité extrêmement appréciable pour des officiers, surtout s’ils assurent le " +
      "commandement de troupes peu fiables ou indisciplinées. Lorsque les effets d’un tour d’Impero se " +
      "dissipent, ses victimes sont conscientes de la manipulation magique, ce qui provoque " +
      "invariablement rancœur et colère.</p>",
    ranks: [
      {
        name: "Autorité",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Ce tour affecte un petit groupe d’individus qui reconnaissent l’autorité du pratiquant. Le " +
          "Marqué n’a pas besoin d’être apprécié, mais il faut que les cibles le considèrent comme leur " +
          "supérieur hiérarchique. Le pouvoir a pour effet de fortifier son emprise sur ses victimes, la " +
          "plupart du temps ses propres hommes, pour la durée d’une scène. On peut parfaitement combiner " +
          "les effets de ce tour avec celui du rang 3 ( ) d’Impello, « grandeur fantasmée ».</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Le pratiquant doit dépenser 1 point d’Esprit puis réussir un test d’Esprit / Arcanum pour " +
              "influencer ses hommes. Son autorité est alors renforcée de telle façon qu’ils suivent bien " +
              "plus aisément ses ordres et deviennent peu sensibles aux effets de la peur. Le Marqué devient " +
              "un meneur d’hommes modèle : sous son commandement et tant qu’il reste honorable, il est " +
              "improbable que quiconque désobéisse ou prenne la fuite.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Le pratiquant doit dépenser 1 point d’Esprit puis réussir un test d’Esprit / Arcanum pour " +
              "renforcer son emprise sur ses hommes. Ses consignes sont alors suivies avec beaucoup plus de " +
              "conviction et les hésitations liées à la morale ou à l’honneur sont étouffées dans l’œuf. Le " +
              "Marqué devient un meneur d’hommes à poigne : sous son commandement et tant qu’il ne montre " +
              "aucune faiblesse, les instructions sont suivies, peu importe l’éthique.</p>",
          },
        ],
      },
      {
        name: "Commandement",
        cost: { lumiere: 2, balance: 2, obscurite: 2 },
        effect:
          "<p>Le pratiquant devient capable d’imposer brutalement sa volonté à autrui, au travers d’un " +
          "ordre bref qu’il sera bien difficile d’ignorer. Ce tour affecte une unique cible qui doit être " +
          "attentive au Marqué, dans une situation calme. Elle doit être capable de comprendre ses " +
          "directives sans la moindre ambiguïté, ce qui impose qu’elle puisse l’entendre nettement dans " +
          "une langue qu’elle maîtrise parfaitement. Ces conditions font que ce tour est inutilisable dans " +
          "le chaos d’une mêlée. L’ordre donné doit être succinct (une demi-douzaine de mots tout au plus) " +
          "et ne souffrir d’aucune difficulté d’interprétation : la cible doit pouvoir y répondre " +
          "intuitivement dans la seconde, sans avoir à s’interroger sur sa signification ou la façon de " +
          "procéder. La moindre hésitation qu’elle pourrait ressentir aura pour effet de briser la " +
          "suggestion. Si l’ordre implique de se prolonger dans le temps, il ne le sera que quelques " +
          "dizaines de secondes au maximum, une durée plus longue entraînant la fin de l’enchantement. Ce " +
          "tour sera vécu ultérieurement comme un viol psychique, auquel les victimes répondront " +
          "variablement en fonction de leur psychologie, mais il est vraisemblable qu’elles finissent par " +
          "nourrir un vif ressentiment, ou pire encore.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>L’ordre imposé ne peut en aucune façon mettre en danger la victime, que ce soit " +
              "directement (« saute de la falaise ») ou indirectement (« lâche ton arme »). Le pratiquant " +
              "dépense alors 2 points d’Esprit et doit réussir un test d’opposition d’Esprit / Arcanum " +
              "contre Esprit / Volonté de la cible. Cette dernière bénéficiera d’un bonus de + 0 à + 5 en " +
              "fonction du caractère humiliant ou contre nature de l’ordre (+ 0 : « faismoi un sourire », + " +
              "5 : « retire ton pantalon »).</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>L’ordre imposé ne peut pas directement menacer la vie de la victime ou la blesser (« " +
              "tranche-toi la gorge ») mais il peut indirectement la mettre en danger (« allonge-toi au sol " +
              "»). Le pratiquant dépense alors 2 points d’Esprit et doit réussir un test d’opposition " +
              "d’Esprit / Arcanum contre Esprit / Volonté de la cible. Cette dernière bénéficiera d’un bonus " +
              "de + 5 à + 10 en fonction du caractère contre nature ou dangereux de l’ordre (+ 5 : « fuis ! " +
              "», + 10 : « rends-toi »).</p>",
          },
        ],
      },
      {
        name: "Asservissement",
        cost: { lumiere: 3, balance: 3, obscurite: 3 },
        effect:
          "<p>À ce stade, le pratiquant est en mesure d’imposer sa volonté à un individu pour le forcer à " +
          "agir comme il le souhaite, à la façon d’un automate. Le Marqué doit préalablement tenir une " +
          "longue discussion avec sa victime, avoir un contact visuel prolongé, puis exprimer à haute et " +
          "intelligible voix ses directives dans une langue parfaitement maîtrisée par la cible. Celles-ci " +
          "peuvent se révéler aussi complexes et précises qu’il le désire — et il est plutôt dans son " +
          "intérêt d’être exhaustif. Les directives ne peuvent concerner que des actes : elles ne peuvent " +
          "pas altérer la mémoire, la personnalité ou les sentiments. Une fois envoûtée, la cible exécute " +
          "les instructions en faisant preuve d’une capacité d’initiative et d’adaptation très limitée. " +
          "D’une certaine façon, les directives font office de programmation : des contradictions ou une " +
          "situation insoluble provoquent l’arrêt brutal de l’enchantement. Pour tout observateur, il est " +
          "évident que la victime n’est pas dans son état normal et qu’elle ne semble pas pleinement " +
          "consciente de ses actes. L’emprise mentale se prolonge jusqu’à ce que les directives soient " +
          "remplies, que la victime soit brutalisée (une claque suffit) ou qu’une heure se soit écoulée. " +
          "La victime se souvient alors parfaitement de ce qui s’est passé et réagira très négativement à " +
          "ce qu’elle percevra comme un viol psychique, nourrissant immédiatement un très vif ressentiment " +
          "à l’égard du Marqué.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Les directives ne peuvent pas mettre en danger la vie de la victime ou la blesser. Si ses " +
              "actions l’amènent à commettre un acte allant à l’encontre de ses convictions (le meurtre en " +
              "fait souvent partie), alors l’enchantement se rompt immédiatement. Les ordres peuvent " +
              "toutefois inclure un déclenchement différé (« quand tu entendras un hennissement, tu ouvriras " +
              "la porte d’entrée de ta maison »), du moment que la limite d’une heure n’est pas dépassée. Le " +
              "lancement de ce tour nécessite la dépense de 3 points d’Esprit et la réussite d’un test " +
              "d’opposition d’Esprit / Arcanum contre Esprit / Volonté. La victime bénéficie d’un bonus de + " +
              "5 pour résister.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Les directives peuvent parfaitement inclure des actes allant à l’encontre des convictions " +
              "profondes de la victime, la blesser ou même la tuer. En revanche les directives doivent être " +
              "exécutées dans l’instant : le Marqué ne peut pas inclure de clause permettant de différer " +
              "leur exécution. Le lancement de ce tour nécessite la dépense de 3 points d’Esprit et la " +
              "réussite d’un test d’opposition Esprit / Arcanum contre Esprit / Volonté. La victime " +
              "bénéficie d’un bonus de + 10 pour résister.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "inspex",
    name: "Inspex",
    arcanumType: "mystique",
    summary: "Percevoir à distance et avec perspicacité.",
    description: "<p>Inspex explore les arts anciens de la clairvoyance. Avec son appui, un Marqué peut étendre " + "ses sens et, par exemple, espionner ses ennemis.</p>",
    ranks: [
      {
        name: "Sens lointain",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant peut percevoir magiquement à distance. En lançant ce tour, il projette un ou " +
          "plusieurs de ses sens à une distance maximale de 10 mètres et perçoit alors exactement comme " +
          "s’il se situait là-bas. Ce point de référence ne peut pas bouger. Tant que ce pouvoir est " +
          "actif, tous les sens de son enveloppe charnelle sont temporairement inhibés, ce qui " +
          "l’empêchera, par exemple, de conserver l’équilibre. Si le sens projeté est la vue, les sorts " +
          "qui se reposent sur la vision (comme la détection de la magie de l’Arcanum Magicè) profitent " +
          "également du nouveau point de référence. Lancer ce tour nécessite la dépense de 1 point " +
          "d’Esprit et dure aussi longtemps que le Marqué se concentre, jusqu’à un maximum de 10 " +
          "minutes.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text: "<p>Le sens projeté est la vue. Pour 1 point d’Esprit supplémentaire, le pratiquant peut " + "projeter en plus son ouïe.</p>",
          },
          {
            label: "Obscurité",
            text: "<p>Le sens projeté est l’ouïe. Pour 1 point d’Esprit supplémentaire, le pratiquant peut " + "projeter en plus sa vue.</p>",
          },
        ],
      },
      {
        name: "Percer le voile",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant se dote, le temps d’une scène, d’une vue capable de percer toutes les " +
          "illusions et tous les artifices magiques. Il détecte les illusions pour ce qu’elles sont et " +
          "perçoit l’invisible (comme une personne cachée par l’Arcanum Nebula ou un fantôme). Il décèle " +
          "par ailleurs la forme véritable d’un métamorphe ou de quiconque serait touché par une magie " +
          "altérant sa véritable apparence.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Lancer ce tour nécessite la dépense de 1 point d’Esprit. Le pratiquant se dote également " +
              "d’une parfaite vision dans l’obscurité, qui fonctionne aussi bien dans la pénombre que dans " +
              "le noir total. La vision thermographique des nains devient capable de distinguer les " +
              "couleurs.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Lancer ce tour nécessite la dépense de 1 point d’Esprit. Le pratiquant se dote également " +
              "d’une écholocalisation, à l’instar des chauves-souris : il peut envoyer des ultrasons qui se " +
              "propagent jusqu’à rencontrer un obstacle physique, ce qui lui indique précisément son " +
              "emplacement.</p>",
          },
        ],
      },
      {
        name: "Espionnage magique",
        cost: { lumiere: 2, balance: 2, obscurite: 2 },
        effect:
          "<p>Ce tour de magie est une puissante variante de « sens lointain ». Le pratiquant projette un " +
          "ou plusieurs de ses sens dans un lieu connu ou à proximité d’un individu qui lui est familier, " +
          "et ce, quelle que soit la distance de la cible. Si la projection sensorielle vise une personne, " +
          "le point de référence se déplacera avec elle. Tant que ce pouvoir est actif, tous les sens de " +
          "l’enveloppe charnelle du Marqué sont temporairement inhibés. On ne peut pas profiter de cette " +
          "perception extra-sensorielle pour lancer d’autres tours par son intermédiaire. Pour lancer ce " +
          "sort, il faut dépenser 2 points d’Esprit et réussir un test d’Esprit / Arcanum assorti d’un " +
          "malus d’autant plus important que le lieu, ou la personne, est mal connu du lanceur (+ 0 : lieu " +
          "ou personne intime ; 5 : lieu ou personne familiers ; - 10 : lieu ou personne vu une seule " +
          "fois). Il est impossible de cibler un individu ou un endroit que le pratiquant n’a jamais " +
          "observé. Le tour dure au maximum 10 minutes.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text: "<p>Le sens projeté est la vue. Pour 1 point d’Esprit supplémentaire, le pratiquant peut " + "projeter en plus son ouïe.</p>",
          },
          {
            label: "Obscurité",
            text: "<p>Le sens projeté est l’ouïe. Pour 1 point d’Esprit supplémentaire, le pratiquant peut " + "projeter en plus sa vue.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "iter",
    name: "Iter",
    arcanumType: "mystique",
    summary: "Voyager avec sûreté, efficacité et confort.",
    description: "<p>Iter est l’art du voyage. Ses tours facilitent la survie, aident le voyageur à trouver son " + "chemin et fournissent une protection pour la nuit.</p>",
    ranks: [
      {
        name: "Purification",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Ce tour rend consommable un liquide ou des ingrédients impropres à la consommation (avariés " +
          "ou empoisonnés, par exemple). Il ne les protège cependant pas contre une putréfaction ou une " +
          "corruption ultérieure : ainsi, un fruit pourri traité par ce tour reprendra immédiatement son " +
          "processus de décomposition normal. La purification détruit les parties corrompues, ce qui peut " +
          "drastiquement diminuer le poids de la nourriture (ainsi, lancé sur une carcasse pourrissante, " +
          "il ne restera pas grand-chose).</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit et vise autant de nourriture et/ou de liquide qu’il " +
              "souhaite. Il doit alors réussir un test d’Esprit / Arcanum à + 4 avec un malus de - 2 pour " +
              "chaque jour de ration et - 2 pour chaque 3 litres de liquide. Ainsi, tenter de purifier 1 " +
              "jour de ration et 6 litres d’eau imposerait un test avec un modificateur final de - 2. La " +
              "nourriture et les liquides ainsi traités sont aussi débarrassés du goût lié à la " +
              "corruption.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit et vise autant de nourriture et/ou de liquide qu’il " +
              "souhaite. Il doit alors réussir un test d’Esprit / Arcanum à + 4 avec un malus de - 1 pour " +
              "chaque jour de ration et - 1 pour chaque 3 litres de liquide. Ainsi, tenter de purifier 1 " +
              "jour de ration et 6 litres d’eau imposerait un test avec un modificateur final de + 1. La " +
              "nourriture et les liquides ainsi traités ne sont toutefois pas débarrassés du goût lié à la " +
              "corruption ; leur consommation peut nécessiter un test d’Esprit / Volonté pour supporter " +
              "l’odeur ou l’amertume.</p>",
          },
        ],
      },
      {
        name: "Voyage assuré",
        cost: { lumiere: 1, balance: 2, obscurite: 1 },
        effect: "<p>Ce tour facilite le voyage dans des conditions difficiles.</p>",
        variants: [
          {
            label: "Lumière / Obscurité",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit et vise, en plus de lui-même, autant de personnes " +
              "dans son champ de vision qu’il le souhaite. Il doit alors réussir un test d’Esprit / Arcanum " +
              "avec un malus de - 1 par individu supplémentaire affecté. En cas de réussite, les " +
              "bénéficiaires deviennent peu sensibles aux températures (chaud, froid), aux conditions " +
              "climatiques (pluie, neige), aux difficultés du terrain (terrains boueux ou escarpés, etc) et " +
              "à l’encombrement du matériel. Ce tour transforme un déplacement ardu en voyage confortable. " +
              "Il ne protège cependant pas des conditions extrêmes (feu, froid intense, charges excessives, " +
              "etc.). L’effet dure jusqu’au prochain coucher ou lever de soleil, le plus proche des " +
              "deux.</p>",
          },
          {
            label: "Balance",
            text:
              "<p>Ce tour coûte 2 points d’Esprit à l’activation. Le pratiquant désigne une destination " +
              "qu’il a déjà visitée ou dont il connaît précisément la localisation. Tant qu’il chemine vers " +
              "cet objectif, il connaît intuitivement la bonne direction et les chemins les plus aisés à " +
              "emprunter. Peu avant de rencontrer une difficulté comme une embuscade ou un rôdeur dangereux, " +
              "il en est averti s’il réussit un test d’Esprit / Arcanum. L’effet dure jusqu’au prochain " +
              "coucher ou lever de soleil, le plus proche des deux.</p>",
          },
        ],
      },
      {
        name: "Sanctuaire",
        cost: { lumiere: 2, balance: 2, obscurite: 2 },
        effect:
          "<p>Ce tour nécessite un rituel d’une dizaine de minutes. Il érige un dôme transparent dont " +
          "l’emprise au sol est un cercle d’environ 3 mètres de rayon. Le dôme n’est pas une barrière " +
          "physique (on peut le traverser), mais il est imperméable et conserve la chaleur. Ainsi, ses " +
          "occupants sont assurés d’être au sec et de bénéficier d’une température agréable. Le dôme reste " +
          "en place jusqu’au prochain lever de soleil.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Lancer ce tour nécessite la dépense de 2 points d’Esprit. Des esprits bienveillants " +
              "veillent sur le dôme et ses occupants. Ils avertiront automatiquement le pratiquant si un " +
              "danger s’approche et peuvent le réveiller si nécessaire.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Lancer ce tour nécessite la dépense de 2 points d’Esprit. Des dizaines d’esprits asservis " +
              "peuvent dresser un campement en peu de temps si le matériel nécessaire est accessible : ils " +
              "montent les tentes, déplient les couchages, allument un feu et préparent les repas, etc. Ces " +
              "esprits-esclaves prennent également soin des occupants : pansage des petites blessures, " +
              "massage des pieds meurtris ou autre soin léger, etc. Les occupants récupèrent 1 point bonus " +
              "en Corps, Vivacité ou Esprit à l’issue du repos.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "magice",
    name: "Magicè",
    arcanumType: "mystique",
    summary: "Détecter et analyser la magie.",
    description:
      "<p>Magicè est un méta-Arcanum, car il vise à percevoir, et dans une moindre mesure, manipuler, " +
      "la magie elle-même. Il est particulièrement utile vis-à-vis des Marqués et des Élus, car le " +
      "Stigmate constituant en soi une puissante balise psychique aisément détectable.</p>",
    ranks: [
      {
        name: "Vision de la magie",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le Marqué perçoit pendant quelques secondes les émanations magiques de son environnement " +
          "sous forme d’effluves éthériques. Ceci lui permet d’identifier qu’un individu, un objet ou un " +
          "lieu est sous l’influence d’un sort (par exemple qu’une personne est sous l’emprise d’un " +
          "Arcanum), qu’un objet est enchanté, ou encore de repérer les traces résiduelles laissées par un " +
          "ancien sort, sous réserve que l’effet ait été puissant et qu’il ne soit pas trop ancien. Les " +
          "êtres invisibles comme les fantômes ou ceux dissimulés par l’Arcanum Nebula sont révélés. Les " +
          "Stigmates apparaissent clairement, ce qui permet d’identifier immédiatement les Marqués ou les " +
          "Élus. Ce tour se base principalement sur la vue ; il peut donc se combiner avec des capacités " +
          "magiques augmentant la perception, comme certains tours de l’Arcanum Inspex. Les effets " +
          "magiques discrets ou lointains peuvent nécessiter, en complément, un test d’Esprit / Arcanum " +
          "pour être détectés.</p>",
        variants: [
          {
            label: "Lumière / Obscurité",
            text:
              "<p>Le Marqué lance le tour pour 1 point d’Esprit. Pour chaque effet magique perçu, il peut " +
              "déterminer s’il est plutôt bénéfique ou plutôt néfaste (les effets purement neutres restant " +
              "très rares). Aucune information supplémentaire n’est obtenue sur les Stigmates.</p>",
          },
          {
            label: "Balance",
            text:
              "<p>Le Marqué lance le tour pour 1 point d’Esprit. Il peut déterminer grossièrement la " +
              "puissance de chaque effet magique perçu (faible, modérée ou forte), sans obtenir d’autre " +
              "détail.</p>",
          },
        ],
      },
      {
        name: "Analyse de la magie",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Ce pouvoir améliore « vision de la magie ». Lorsque le pratiquant perçoit un effet magique " +
          "ou un Stigmate via le tour de rang 1 ( ), il peut tenter de l’analyser pour en apprendre les " +
          "caractéristiques. Pour chaque Stigmate ou effet magique ainsi analysé, 1 point d’Esprit doit " +
          "être dépensé en supplément du coût d’activation de la vision de la magie.</p>",
        variants: [
          {
            label: "Lumière / Obscurité",
            text:
              "<p>L’analyse d’un Stigmate révèle automatiquement son origine divine (Marqué ou Élu). " +
              "L’analyse d’un effet magique nécessite un test d’Esprit / Arcanum : un échec critique ne " +
              "donne aucune information, un échec indique grossièrement sa puissance (faible, modérée ou " +
              "forte), une réussite permet d’en connaître l’effet principal, une réussite critique dévoile " +
              "l’essentiel des caractéristiques (branche d’Arcanum, effets, durée, conditions d’annulation, " +
              "etc.). L’analyse d’un sort de Vraie-Magie impose un malus de - 5 à ce test.</p>",
          },
          {
            label: "Balance",
            text:
              "<p>L’analyse d’une Marque nécessite un test d’Esprit / Arcanum ; un succès révèle son origine " +
              "divine (Marqué ou Élu). L’analyse d’un effet magique en révèle automatiquement la " +
              "quasi-totalité des caractéristiques (effet, branche d’Arcanum, durée, conditions " +
              "d’annulation, etc.). Toutefois, l’analyse d’un sort de Vraie-Magie impose également un test " +
              "d’Esprit / Arcanum.</p>",
          },
        ],
      },
      {
        name: "Contre- sort",
        cost: { lumiere: 0, balance: 0, obscurite: 0 },
        effect:
          "<p>Le Marqué peut contrer un tour en cours d’incantation par autrui. Cette capacité s’applique " +
          "aux Arcanums mystiques mais pas aux Arcanums physiques. Le lanceur doit pouvoir observer " +
          "l’incantation pour tenter le contre-sort ; ainsi, les effets d’Impello ne peuvent être contrés " +
          "puisqu’ils ne requièrent ni gestes ni paroles. La tentative de contre-magie s’effectue après " +
          "que le sort visé a été payé par son lanceur et qu’un éventuel test d’activation a été réussi, " +
          "mais avant que l’effet ne se manifeste. Le pratiquant de Magicè doit alors remporter un test " +
          "d’opposition d’Esprit / Magicè contre Esprit / Arcanum du sort d’origine. Ce test subit un " +
          "malus de - 10 face à de la Vraie-Magie. Il est également possible de supprimer un effet magique " +
          "actif si ses traces ont été préalablement détectées via le rang 1 de cet Arcanum et analysées " +
          "via le rang 2.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Pour tenter le contre-sort, le Marqué doit dépenser autant de points d’Esprit que le " +
              "lanceur du sort originel, moins un. Une réussite critique au test d’opposition permet, si la " +
              "situation le justifie, de renvoyer le sort contré vers son lanceur.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Pour tenter le contre-sort, le Marqué doit subir une blessure non encaissable dont la " +
              "gravité dépend du coût en Esprit du sort originel : 0-1 = blessure légère ; 2-3 = blessure " +
              "grave ; 4 ou plus = blessure mortelle. Une réussite critique au test d’opposition permet " +
              "d’infliger une blessure équivalente au lanceur du sort contré.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "mandatum",
    name: "Mandatum",
    arcanumType: "mystique",
    summary: "Communiquer sans barrières.",
    description:
      "<p>Mandatum est l’art du message. Ses différents tours se focalisent sur la transmission " +
      "d’informations et se révèlent particulièrement précieux en temps de conflit pour une compagnie " +
      "franche. Cet Arcanum offre des possibilités très variées, aussi bien pour dépasser la barrière " +
      "des langues que pour assurer la confidentialité des missives délivrées.</p>",
    ranks: [
      {
        name: "Langue intuitive",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Ce tour permet de s’affranchir de la barrière de la langue afin que le Marqué et son " +
          "interlocuteur puissent se comprendre alors même qu’ils ne maîtrisent aucun langage en " +
          "commun.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Ce tour vise un individu que le Marqué peut voir. La cible maîtrise alors instantanément à " +
              "l’oral (mais pas à l’écrit) la langue natale du pratiquant pendant une scène. Elle n’a pas " +
              "conscience de cet effet, qui lui semble naturel, mais des proches puissent s’en étonner. " +
              "Chaque usage de ce pouvoir coûte 1 point d’Esprit.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Chaque usage de ce pouvoir coûte 1 point d’Esprit. Ce tour vise un individu que le Marqué " +
              "peut voir. Le pratiquant maîtrise alors instantanément à l’oral (mais pas à l’écrit) la " +
              "langue natale de la cible pendant une scène.</p>",
          },
        ],
      },
      {
        name: "Missive codée",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant lance ce tour pendant qu’il rédige une missive. Il se met alors " +
          "instinctivement à écrire en utilisant une technique de cryptage complexe, différente à chaque " +
          "utilisation. Le cryptage, bien que robuste, n’est pas incassable : un individu extrêmement doué " +
          "pourrait parvenir à le décoder en y consacrant énormément de temps (de l’ordre d’une semaine). " +
          "Lorsque le message est enfin rédigé, le Marqué projette mentalement l’image d’une personne " +
          "qu’il a déjà vue. Cette personne connaîtra instinctivement la méthode de décodage appropriée " +
          "lorsqu’elle touchera le message, ce qui lui permettra de le lire avec fluidité, comme s’il " +
          "était écrit en clair.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Chaque usage de ce tour de magie coûte 1 point d’Esprit. Lorsque le destinataire légitime " +
              "touche pour la première fois le message, il reçoit une brève image mentale de l’expéditeur et " +
              "ressent instinctivement si la missive a été ou non altérée (sans pour autant savoir si " +
              "quelqu’un d’autre l’a lue).</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Chaque usage de ce tour de magie coûte 1 point d’Esprit. Toute personne autre que le " +
              "destinataire légitime qui tenterait activement à décrypter le message devra réussir un test " +
              "d’Esprit / Volonté à la fin de chaque journée de travail ; en cas d’échec, elle encaissera " +
              "une blessure légère.</p>",
          },
        ],
      },
      {
        name: "Message mental",
        cost: { lumiere: 2, balance: 2, obscurite: 2 },
        effect:
          "<p>Le pratiquant entre en communication télépathique avec une personne qu’il peut voir. Le " +
          "dialogue est à double sens et dure tant que le Marqué le souhaite, sans excéder la durée d’une " +
          "scène. Une fois la liaison télépathique établie, il est possible d’utiliser en complément le " +
          "tour « langue intuitive », qui devra être payé séparément.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Chaque utilisation de ce tour coûte 2 points d’Esprit. Si la cible n’est pas prévenue, " +
              "elle bloquera instinctivement la communication. Le pratiquant devra alors réussir un test " +
              "d’opposition Esprit / Arcanum contre Esprit / Volonté, sans quoi le tour échouera.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Chaque utilisation de ce tour de magie coûte 2 points d’Esprit. Que la cible soit prévenue " +
              "ou non, elle ressentira le contact psychique comme une agression et cherchera instinctivement " +
              "à le bloquer. Le pratiquant doit réussir un test d’opposition Esprit / Arcanum contre Esprit " +
              "/ Volonté, sans quoi le tour échouera. Si le lien télépathique est établi, la cible subira " +
              "une blessure légère (non encaissable) lorsque la connexion sera rompue, sous la forme d’un " +
              "violent mal de tête. Certains Marqués utilisent volontairement ce pouvoir non pour " +
              "communiquer, mais pour agresser leurs victimes en multipliant de brefs contacts psychiques " +
              "répétés.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "medicatus",
    name: "Medicatus",
    arcanumType: "mystique",
    summary: "Guérir et soulager.",
    description:
      "<p>Medicatus est l’art de guérir autrui. Son usage demeure suffisamment rare pour que les soins " +
      "traditionnels restent la norme. Ainsi, les bénéficiaires de tels pouvoirs se limitent " +
      "généralement aux puissants de ce monde et aux frères d’armes des Marqués capables de les " +
      "prodiguer. Au sein d’une compagnie, ce talent est donc d’une valeur inestimable. Les " +
      "pratiquants de Medicatus complètent souvent leur formation par l’étude de la médecine " +
      "classique, car ils ne peuvent pas s’appuyer exclusivement sur cet Arcanum lorsqu’ils traiter un " +
      "grand nombre de patients. La forme que prend Medicatus varie fortement selon l’allégeance du " +
      "Marqué : entre les mains d’un pratiquant tourné vers l’Obscurité, son usage peut s’apparenter " +
      "davantage à une forme de nécromancie qu’à une magie bienfaisante. Note : Medicatus n’agit que " +
      "sur les êtres vivants et ne peut donc pas affecter les elfes putrides.</p>",
    ranks: [
      {
        name: "Stabilisation",
        cost: { lumiere: 0, balance: 1, obscurite: 1 },
        effect:
          "<p>Ce premier tour permet de stopper instantanément les hémorragies et autres afflictions " +
          "menaçant la vie d’une victime à très court terme. Il stabilise une personne mourante, comme si " +
          "un premier soin avait été appliqué avec succès (cf. p. XXX), à la différence près que le " +
          "lanceur n’a pas besoin de manipuler la cible : un simple contact visuel suffit.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Le pratiquant doit réussir un test d’Esprit / Arcanum. En cas de succès, la victime est " +
              "stabilisée, mais le lanceur intériorise une partie du mal et subit une blessure légère qu’il " +
              "ne peut pas encaisser.</p>",
          },
          {
            label: "Balance / Obscurité",
            text: "<p>Le pratiquant dépense 1 point d’Esprit, puis doit réussir un test d’Esprit / Arcanum pour " + "stabiliser la victime.</p>",
          },
        ],
      },
      {
        name: "Soin des blessures",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant devient capable de refermer les blessures d’autrui (ou les siennes), même les " +
          "plus graves. Aucun contact physique n’est nécessaire : un simple contact visuel " +
          "suffit.</p><ul><li>la blessure du bénéficiaire est alors réduite d’un cran ;</li><li>la victime " +
          "subit une blessure légère non encaissable. Ce pouvoir est particulièrement efficace en combat, " +
          "car il permet de soigner un allié tout en blessant un adversaire. En revanche, hors combat, son " +
          "utilisation devient moralement et pratiquement problématique puisqu’elle exige une victime… " +
          "Exemple Un Marqué de l’Obscurité lance Soin des blessures en plein combat. Il cherche à soigner " +
          "un compagnon ayant subi une blessure grave, tout en transférant la souffrance à un ennemi " +
          "proche. Il dépense 1 point d’Esprit (sa réserve passe à 8) et tente le sort. Il décide " +
          "d’investir 2 points d’effort, ce qui porte son seuil de réussite à 11 (8 - 3 + 6). Avec en " +
          "Medicatus, il lance deux d20 et garde le meilleur résultat, à savoir 10 : il vient d’obtenir " +
          "une réussite. L’ennemi teste son Esprit / Volonté et obtient 8 : c’est insuffisant, le pouvoir " +
          "prend effet : la blessure grave de l’allié devient blessure légère, l’ennemi subit une blessure " +
          "légère.</li></ul>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit puis effectue un test d’Esprit / Arcanum avec un " +
              "malus dépendant de la gravité de la blessure : Blessure légère : - 1 Blessure grave : - 3 " +
              "Blessure mortelle : - 6 En cas de réussite, la blessure diminue d’un cran : Mortelle > grave " +
              "Grave > légère Légère > disparaît</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Le pratiquant désigne deux êtres vivants visibles : le bénéficiaire, qui recevra le soin, " +
              "et la victime, qui subira le contrecoup. Ni l’un ni l’autre ne peuvent être le lanceur. Le " +
              "Marqué dépense 1 point d’Esprit et cible l’une des blessures du bénéficiaire. Il effectue " +
              "ensuite un test d’opposition : Esprit / Arcanum (avec malus de -1, -3 ou -6 selon la gravité " +
              "de la blessure) contre Esprit / Volonté de la victime. En cas de réussite :</p>",
          },
        ],
      },
      {
        name: "Soin des maladies et des poisons",
        cost: { lumiere: 0, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant est désormais capable de résorber directement les effets d’une maladie ou d’un " +
          "empoisonnement. Un simple contact visuel suffit, et l’effet se manifeste immédiatement, de " +
          "manière presque miraculeuse. Ce pouvoir est d’autant plus difficile à manipuler que " +
          "l’affliction à traiter est grave. De plus, il ne peut pas guérir un mal que la médecine " +
          "traditionnelle serait incapable de traiter. Pour ce tour, les afflictions sont classées en " +
          "trois catégories : Légères : maladies et poisons bénins ; Graves : afflictions préoccupantes ; " +
          "Mortelles : maladies ou poisons entraînant la mort à court terme.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Le pratiquant effectue un test d’Esprit / Arcanum. En cas de réussite, l’affliction " +
              "disparait. Cependant, le mal se transfère dans le corps du lanceur sous une autre forme : il " +
              "subit immédiatement une blessure du même niveau (légère, grave ou mortelle) qu’il ne peut pas " +
              "encaisser. Ce tour ne peut être tenté qu’une fois par jour et par personne.</p>",
          },
          {
            label: "Obscurité / Balance",
            text:
              "<p>Le pratiquant dépense : 1 point d’Esprit pour une affliction légère 2 points d’Esprit pour " +
              "une affliction grave 3 points d’Esprit pour une affliction mortelle Il doit ensuite réussir " +
              "un test d’Esprit / Arcanum pour supprimer l’affliction et guérir le patient.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "mortem",
    name: "Mortem",
    arcanumType: "mystique",
    summary: "Manipuler la mort.",
    description:
      "<p>Mortem est un Arcanum qui fut enseigné directement par Tol-Amoth à ses plus proches " +
      "lieutenants, lesquels diffusèrent ensuite ce sombre savoir auprès de leurs serviteurs les plus " +
      "zélés. Mortem manipule les sombres forces de la mort comme un outil que l’on utilise puis que " +
      "lon range pour un usage ultérieur. Les initiés s’engagent souvent dans cette voie dans le vain " +
      "espoir d’y trouver une solution à leur propre mortalité.</p>",
    ranks: [
      {
        name: "Les yeux du trépas",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Ce tour de magie permet au nécromancien de voir la dernière scène vécue par un défunt en " +
          "touchant son cadavre. Ceci peut souvent, mais pas systématiquement, renseigner sur la cause de " +
          "la mort. Le pratiquant visualise les derniers instants perçus par les yeux du mort sous la " +
          "forme d’une vision intense. Lancer ce tour nécessite de dépenser1 point d’Esprit et de réussir " +
          "un test d’Esprit / Arcanum. Plus la réussite est élevée, plus la scène observée est longue et " +
          "nette.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Le pratiquant doit toucher un cadavre, quel que soit son état de décomposition ou son " +
              "ancienneté, tant que le crâne est intact (un os de fémur seul, par exemple, ne suffirait " +
              "pas). En cas de réussite, le nécromant ne perçoit que des images, sans aucun son.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Le pratiquant doit toucher un cadavre frais (mort depuis moins de trois jours). Un corps " +
              "plus ancien empêche le pouvoir de fonctionner. En plus des images, le pratiquant perçoit " +
              "aussi les sons comme le défunt les entendait, quoi que légèrement étouffés.</p>",
          },
        ],
      },
      {
        name: "Communiquer avec les morts",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant devient capable de convoquer l’esprit d’un mort afin de s’entretenir avec lui. " +
          "Le rituel dure quelques minutes, et nécessite de connaître le nom du défunt et de disposer de " +
          "son corps ou d’une partie de ce dernier (os, cheveux, sang, etc.). Le pratiquant doit également " +
          "dépenser 1 point d’Esprit et réussir un test d’Esprit / Arcanum avec un malus de - 2. Une fois " +
          "convoqué, l’esprit demeure dans le monde physique pendant une minute. Il est incapable d’agir, " +
          "mais peut parler.</p>",
        variants: [
          {
            label: "Lumière",
            text: "<p>L’esprit est libre de mentir ou de dire la vérité tout au long de l’entretien.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Le rituel de convocation exige que le pratiquant se fasse abondamment saigner, ce qui lui " +
              "inflige une blessure légère. Une fois l’esprit convoqué, le nécromant peut le contraindre à " +
              "dire la vérité. Cela lui coûte 1 point d’Esprit par question à laquelle l’esprit ne pourra ni " +
              "mentir ni se soustraire. Rien n’empêche le pratiquant de discuter « normalement » avec " +
              "l’esprit pendant la convocation et de recourir à l’interrogatoire magique qu’avec parcimonie, " +
              "selon les besoins.</p>",
          },
        ],
      },
      {
        name: "Serviteur cadavérique",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Au cours d’un rituel d’une heure, le nécromant peut animer un cadavre pour en faire un " +
          "serviteur. Cela nécessite de dépenser 1 point d’Esprit et de réussir un test d’Esprit / " +
          "Arcanum. Le cadavre animé ne possède aucune intelligence et se contente d’exécuter strictement " +
          "les ordres simples de son créateur. Il ne parle pas. Les zombis sont presque indestructibles " +
          "sans armes adaptées : face à tout dommage non tranchant (dégâts contondants ou perforants, par " +
          "exemple), la protection d’un zombi passe à 3 .</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Le cadavre reste animé jusqu’au prochain coucher de soleil. Les serviteurs cadavériques " +
              "sont infatigables, assez forts mais relativement lents et stupides. Ils sont incapables de " +
              "manipuler une arme et se montrent maladroits à mains nues. Caractéristiques : Corps 11, " +
              "Vivacité 8, Esprit 3 Mêlée 1 , Athlétisme 1 , Vigueur 3 Ils ne sont pas particulièrement " +
              "effrayants et pourraient passer pour un homme très malade, voire presque banal avec un bon " +
              "déguisement.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Le cadavre reste animé jusqu’au prochain lever de soleil. Ces serviteurs sont infatigables " +
              "et extrêmement puissants, mais lourdauds et totalement dénués d’intelligence. Ils ne peuvent " +
              "manier aucune arme et sont peu efficaces à mains nues. Caractéristiques : Corps 14, Vivacité " +
              "6, Esprit 1 Mêlée 1 , Athlétisme 2 , Vigueur 3 Ils sont terrifiants et ne peuvent en aucun " +
              "cas passer pour quelque chose de normal.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "nebula",
    name: "Nebula",
    arcanumType: "mystique",
    summary: "Se dissimuler, disparaître dans les ombres.",
    description:
      "<p>Nebula se concentre sur l’art de dissimuler sa présence aux autres. C’est un Arcanum " +
      "extrêmement précieux pour les éclaireurs, les espions, ou simplement ceux qui préfèrent éviter " +
      "le danger plutôt que de l’affronter.</p>",
    ranks: [
      {
        name: "Passage sans traces",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Ce tour de magie permet au bénéficiaire, pendant une heure, de ne laisser aucune piste lors " +
          "de ses déplacements. Il ne laisse ni d’empreintes au sol, ni traces de doigts, ni d’odeur. " +
          "Employé par une personne précautionneuse, il devient presque impossible à pister.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Le Marqué dépense 1 point d’Esprit, puis doit réussir un test d’Esprit / Arcanum pour " +
              "activer ce pouvoir. Au moment où il l’active, il peut décider de l’étendre à une ou plusieurs " +
              "personnes proches (maximum 10). Dans ce cas, son test subit un malus de - 1 par cible en plus " +
              "de lui-même.</p>",
          },
          {
            label: "Balance / Obscurité",
            text: "<p>Le Marqué dépense 1 point d’Esprit ; le tour prend alors effet uniquement pour lui-même.</p>",
          },
        ],
      },
      {
        name: "Refuge des ombres",
        cost: { lumiere: 1, balance: 1, obscurite: 2 },
        effect:
          "<p>Pour lancer ce tour, le Marqué doit se glisser dans une zone d’ombre et ne pas être observé " +
          "par quiconque. Il devient alors totalement invisible (techniquement, il reste visible, mais les " +
          "gens ignorent instinctivement sa présence). Il le demeure tant qu’il reste parfaitement " +
          "immobile et ne produit aucun bruit. Sa présence est toutefois révélée en cas de fouille active " +
          "ou de lumière soudaine. Ce tour se révèle particulièrement utile pour semer des poursuivants ou " +
          "tendre une embuscade.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Le Marqué doit dépenser 1 point d’Esprit pour activer ce tour. Après une minute, il devra " +
              "dépenser 1 point d’Esprit supplémentaire pour prolonger l’effet d’une minute, et ainsi de " +
              "suite tant qu’il le souhaite et peut en payer le coût.</p>",
          },
          {
            label: "Obscurité",
            text: "<p>Le Marqué doit dépenser 2 points d’Esprit pour activer ce tour. Il demeure alors " + "indéfiniment invisible, tant qu’il respecte les conditions.</p>",
          },
        ],
      },
      {
        name: "Regards aveugles",
        cost: { lumiere: 2, balance: 2, obscurite: 3 },
        effect:
          "<p>Les observateurs cessent de voir le Marqué, même si ce pouvoir est activé en pleine lumière " +
          "et devant témoins. Il ne devient pas réellement invisible : il s’agit d’un effet psychique. Les " +
          "gens détournent le regard, s’écartent de son chemin et ignorent involontairement sa présence. " +
          "Cet effet n’affecte que la vue, et non l’ouïe ni l’odorat. L’effet cesse immédiatement dès que " +
          "le pratiquant révèle sa présence à une tierce personne (s’il produit un bruit, ouvre une porte, " +
          "porte un coup, déplace un objet, etc.). Cela n’empêche pas le bénéficiaire de se déplacer, mais " +
          "il a intérêt à le faire silencieusement et sans toucher à quoi que ce soit. S’il reste " +
          "immobile, une fouille active du lieu ne peut pas le révéler — à moins d’utiliser un animal doté " +
          "d’un excellent flair.</p><ul><li>+ 0 : une seule personne aux alentours qui ne lui prête pas " +
          "particulièrement attention ;</li><li>- 5 : face à un individu qui le surveille attentivement " +
          ";</li><li>- 10 : au milieu d’une foule. En cas d’échec, le sort ne prend pas effet. Le tour " +
          "dure une minute, prolongeable au prix de 1 point d’Esprit par minute supplémentaire.</li></ul>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Le tour est lancé pour 2 points d’Esprit. Si le pratiquant est observé au moment de " +
              "l’activation, il doit réussir un test d’Esprit / Arcanum assorti d’un modificateur de + 0 à - " +
              "10 :</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Ce tour est lancé pour 3 points d’Esprit, que le pratiquant soit observé ou non. Il " +
              "demeure alors indéfiniment invisible, tant qu’il respecte les conditions.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "parmae",
    name: "Parmae",
    arcanumType: "mystique",
    summary: "Protéger et renforcer les choses.",
    description:
      "<p>Parmae regroupe divers tours dédiés à la protection et au renforcement. C’est un Arcanum qui " +
      "se révèle particulièrement utile pour une compagnie qui se retrouve à devoir défendre une " +
      "position. Un ingénieur de bataille maître de Parmae peut complètement renverser le cours d’un " +
      "siège en tirant la quintessence des ouvrages défensifs.</p>",
    ranks: [
      {
        name: "Glyphe de protection",
        cost: { lumiere: 1, balance: 2, obscurite: 2 },
        effect:
          "<p>Le pratiquant appose au cours d’un rituel de plusieurs minutes une inscription magique sur " +
          "un objet ou un lieu. Le glyphe peut par exemple servir à protéger un couloir, un pont, une " +
          "porte, une fenêtre, un coffre, un sac ou une boîte. Le pratiquant définit un mot de passe sous " +
          "forme d’un unique mot. Si un individu ouvre/entre/traverse/ touche l’objet ou le lieu protégé " +
          "sans prononcer à voix haute le mot de passe, il déclenche la protection. La protection du " +
          "glyphe perdure jusqu’à ce qu’il soit activé. Si le pratiquant trace un nouveau glyphe, tout " +
          "glyphe précédemment apposé se décharge : un seul glyphe peut donc être actif à un moment " +
          "donné.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Apposer le glyphe nécessite la dépense de 1 point d’Esprit. Si un individu déclenche le " +
              "glyphe, le pratiquant en est instantanément informé (mentalement et silencieusement).</p>",
          },
          {
            label: "Obscurité / Balance",
            text:
              "<p>Apposer le glyphe nécessite la dépense de 2 points d’Esprit. L’individu qui déclenche le " +
              "glyphe provoque une petite détonation (sonore) et subit une blessure grave qu’il peut tenter " +
              "de réduire avec un test d’encaissement.</p>",
          },
        ],
      },
      {
        name: "Renforcement",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>Le pratiquant renforce un objet ou un édifice temporairement, de telle sorte que sa " +
          "résistance soit bien supérieure à la normale. Un outil devient incassable même dans des usages " +
          "extrêmes, une épée ébréchée ne se brisera pas pendant le combat, une porte ne pourra pas être " +
          "enfoncée sans déployer des moyens disproportionnés, un mur ne s’effondrera pas en dépit de " +
          "tentatives de sape classiques, etc. Ce tour nécessite un rituel de plusieurs minutes au cours " +
          "duquel l’incantateur doit toucher sa cible. Il devra dépenser d’autant plus de points d’Esprit " +
          "que l’objet ou l’édifice est grand : 1 point pour une arme, un outil ou une armure, 2 points " +
          "pour une porte, une herse ou un pont-levis, 3 points pour un petit pont, une modeste section " +
          "d’un rempart ou une maisonnette, 4 points pour un pont ou une maison, 5 points pour un manoir, " +
          "10 points pour un château entier ou une citadelle, etc. Un bouclier ou une arme en état correct " +
          "ainsi enchanté bénéficie, en plus d’être incassable, d’un bonus de + 2 aux tests de blocage " +
          "tandis qu’une armure fait profiter à son porteur d’un bonus de + 2 aux tests " +
          "d’encaissement.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Le renforcement dure jusqu’au prochain coucher de soleil. À l’issue de cette durée, le " +
              "Marqué pourra renouveler l’enchantement pour une journée de plus, dans les mêmes conditions " +
              "que la première fois (rituel de plusieurs minutes pendant lequel il doit toucher sa cible) et " +
              "pour seulement 1 point d’Esprit.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Le renforcement dure jusqu’au prochain lever de soleil. Le pratiquant peut cependant " +
              "décider d’interrompre instantanément l’effet avant ce moment, sur simple concentration de sa " +
              "part.</p>",
          },
        ],
      },
      {
        name: "Rempart",
        cost: { lumiere: 3, balance: 3, obscurite: 2 },
        effect:
          "<p>Ce tour réarrange lentement la terre et/ou les rochers environnants en un rempart dont la " +
          "forme exacte est au bon vouloir du Marqué — du moment qu’elle reste viable, solidement ancrée " +
          "au sol et stable. Le processus de création requiert un rituel d’un quart d’heure. Le mur est " +
          "formé de 10 panneaux de 3 mètres sur 3 mètres et de 15 cm d’épaisseur. Il peut être façonné " +
          "grossièrement de façon à créer des créneaux ou des meurtrières. La matière première excavée " +
          "forme un trou et il est donc possible d’adjoindre un petit fossé au rempart ainsi créé. Il est " +
          "tout à fait possible d’utiliser ce sort pour créer un pont ou une rampe. L’édifice final n’a " +
          "rien de « magique » : pour tenir, il doit respecter les lois de la pesanteur ; en cela, la " +
          "compétence Ingénierie du Marqué peut se révéler importante pour réaliser des ouvrages « " +
          "complexes », comme un pont.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Lancer ce tour demande de dépenser 3 points d’Esprit. L’édifice créé est permanent (mais " +
              "reste soumis aux affres du temps et aux détériorations volontaires).</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Lancer ce tour demande de dépenser 2 points d’Esprit. L’édifice créé est stable jusqu’au " +
              "prochain lever de soleil. Après cette période, il se délite lentement jusqu’à s’écrouler. Il " +
              "est possible de prolonger sa durée de vie en utilisant le tour « renforcement », qui pour " +
              "l’occasion ne demande que 1 point d’Esprit par utilisation.</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "prophetiae",
    name: "Prophetiae",
    arcanumType: "mystique",
    summary: "Prédire le futur et plonger son regard dans le passé.",
    description:
      "<p>Prophetiae plonge ses racines dans les anciens arts divinatoires permettant d’explorer le " +
      "futur mais également le passé. Les Marqués présentant ce don de « double-vue » se révèlent de " +
      "précieux conseillers pour les gradés des compagnies franches. On les consulte par exemple " +
      "souvent à la veille d’une bataille. Certains pratiquants y voient une communication mystique " +
      "avec les dieux, d’autres une science ésotérique.</p>",
    ranks: [
      {
        name: "Présage",
        cost: { lumiere: 2, balance: 2, obscurite: 1 },
        effect:
          "<p>Via un rituel de divination de quelques minutes (tirage de runes, de cartes, ou d’osselets ; " +
          "interprétation du vol des oiseaux ; sacrifices ; etc.), le pratiquant peut recevoir un présage " +
          "au sujet d’une question portant sur une situation envisagée dans les 24 heures. La situation " +
          "peut être directe (« Comment va se passer la bataille de demain ? ») ou conditionnelle (« " +
          "Comment se déroulera la bataille de demain si nous attaquons le flanc gauche avec notre " +
          "cavalerie ? »). Le devin reçoit un présage qu’il interprète, au choix du MJ, comme « " +
          "catastrophique » (la situation aura des répercussions désastreuses), « néfaste » (la situation " +
          "devrait avoir une issue défavorable), « ambiguë » (la situation n’aura aucune conséquence ou " +
          "est trop incertaine à ce stade), « favorable » (la situation a de bonnes chances d’avoir des " +
          "répercussions positives) ou « bénéfique » (la situation aura une issue très fructueuse). Le " +
          "rituel se solde par un test d’Esprit / Arcanum réalisé en secret par le MJ (de telle sorte que " +
          "le joueur ne sache pas si le résultat est ou non juste) : réussite, le pratiquant obtient un " +
          "présage correct ; réussite critique, le pratiquant obtient un présage correct et sait que son " +
          "présage est juste ; échec, le pratiquant obtient le présage « ambiguë » (qu’il soit ou non " +
          "juste) ; échec critique : le pratiquant obtient un faux présage.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text: "<p>Lancer ce tour de magie coûte 2 points d’Esprit.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Lancer ce tour nécessite un rituel sanglant (sacrifice, lecture dans les entrailles, " +
              "etc.), la dépense de 1 point d’Esprit et que le pratiquant verse son propre sang (ce qui lui " +
              "inflige une blessure légère).</p>",
          },
        ],
      },
      {
        name: "Vision du passé",
        cost: { lumiere: 2, balance: 2, obscurite: 2 },
        effect:
          "<p>Le pratiquant peut s’exposer à des visions du passé, sous forme de courtes mais intenses " +
          "images mentales. Il doit pour cela toucher un objet et se concentrer un bref instant. La vision " +
          "reçue concerne en général l’événement le plus marquant lié à cet objet ou — à défaut d’une " +
          "empreinte émotionnellement chargée — la dernière personne qui l’a manipulé. Le Marqué ne peut " +
          "pas orienter ses visions : il ne pose pas de questions, il reçoit ce que l’objet a accumulé en " +
          "lui.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Lancer ce tour nécessite la dépense de 2 points d’Esprit. Les images sont claires mais les " +
              "émotions véhiculées le sont aussi, ce qui peut rendre l’expérience traumatisante lorsque la " +
              "scène perçue est moralement difficile. Dans ce cas, le pratiquant peut perdre de 1 à 3 points " +
              "d’Esprit supplémentaires au gré du MJ, selon l’intensité de la charge émotionnelle.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Lancer ce tour nécessite la dépense de 2 points d’Esprit. Les images perçues sont floues " +
              "et saccadées, ce qui peut les rendre difficiles à interpréter. Pour en tirer quelque chose, " +
              "le pratiquant doit réussir en complément un test d’Esprit / Arcanum assorti d’un malus lié à " +
              "l’ancienneté et la force émotionnelle de l’événement entraperçu. Ainsi, obtenir une vision à " +
              "partir d’un poignard ayant servi à commettre un meurtre barbare quelques heures auparavant " +
              "sera facile (modificateur de + 0), tandis que tirer une information d’une poignée de porte " +
              "rapidement manipulée pour la dernière fois il y a des années par un passant anonyme sera très " +
              "difficile (malus de - 10).</p>",
          },
        ],
      },
      {
        name: "Oracle",
        cost: { lumiere: 3, balance: 3, obscurite: 2 },
        effect:
          "<p>Le pratiquant réalise un rituel de divination d’une heure au cours duquel il pose une unique " +
          "question, précise et concise, concernant une situation future ne pouvant se dérouler dans plus " +
          "d’une semaine (ex. : « Ce lieu est-il sans danger pour se reposer cette nuit ? », « Où " +
          "allons-nous déboucher si nous suivons ce tunnel ? », « Comment se déroulera la fête de la pomme " +
          "prévue dans trois jours ? », « Avons-nous de bonnes chances d’emporter le combat si nous " +
          "attaquons le convoi demain ? »). Le rituel se solde par un test d’Esprit / Arcanum réalisé en " +
          "secret par le MJ. Réussite : une vision ou une phrase, souvent cryptique, s’impose à lui (la " +
          "réponse est véridique mais peut s’avérer délicate à interpréter et prend généralement la forme " +
          "d’une réponse énigmatique ou d’un présage). Échec : rien, aucune vision. Réussite critique : la " +
          "réponse est facile à interpréter. Échec critique : la vision est fausse. Les questions qui ne " +
          "portent pas sur une situation précise (« Quel est le sens de la vie ? », « Quand est-ce que le " +
          "capitaine va mourir ? »), ou qui dépassent le cadre temporel maximal d’une semaine (« Quel " +
          "temps fera-t-il dans un mois ? ») n’obtiennent aucune réponse (exactement comme si le test " +
          "avait donné un échec). Les pratiquants se sentent en contact avec une force supérieure, qu’ils " +
          "attribuent en général au Père, à la Mère ou au Fils. La prise en compte de la réponse, voire le " +
          "simple fait d’en avoir connaissance, est susceptible de modifier l’avenir…</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text: "<p>Lancer ce tour de magie coûte 3 points d’Esprit.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Lancer ce tour nécessite un rituel sanglant (sacrifice, lecture dans les entrailles, " +
              "etc.), la dépense de 2 points d’Esprit et que le pratiquant verse son propre sang (ce qui lui " +
              "inflige une blessure légère).</p>",
          },
        ],
      },
    ],
  },
  {
    slug: "subjugatio",
    name: "Subjugatio",
    arcanumType: "mystique",
    summary: "Influencer subtilement son prochain.",
    description:
      "<p>Subjugatio est l’art subtil d’influencer les autres. Alors qu’Impero soumet brutalement les " +
      "esprits, Subjugatio modifie imperceptiblement les prédispositions des interlocuteurs de telle " +
      "sorte qu’il soit bien plus aisé de les rallier à son point de vue. Les effets de Subjugatio " +
      "sont très difficiles à déceler mais ne sont guère spectaculaires. Ils conviennent parfaitement " +
      "à un usage diplomatique et présentent l’énorme avantage de ne pas détériorer les relations sur " +
      "le long terme. Les tours de Subjugatio ne nécessitent pas d’incantation (ni voix ni gestes) et " +
      "leur usage n’est donc généralement pas perceptible. Ils nécessitent toutefois toujours la " +
      "dépense d’une action.</p>",
    ranks: [
      {
        name: "Moment de flottement",
        cost: { lumiere: 0, balance: 0, obscurite: 0 },
        effect:
          "<p>Ce tour de magie agit sur un groupe. Il impose un très bref moment de flottement, sans " +
          "conséquence en soi, mais que le pratiquant peut utiliser à son avantage. Utilisé lors d’un " +
          "discours, il force le locuteur à marquer une courte pause, suffisante pour que le Marqué puisse " +
          "l’interrompre et placer un argument choc ou tout simplement reprendre la parole. Utilisé " +
          "pendant un combat, il offre la possibilité au pratiquant de lancer des pourparlers — mais il a " +
          "alors intérêt à se montrer extrêmement convainquant. « Moment de flottement » n’impose rien " +
          "d’autre que cette interruption, et en particulier certainement pas que les interlocuteurs " +
          "soient réceptifs aux propositions : il ne fait que créer une opportunité. Ce tour ne permet pas " +
          "d’utiliser un quelconque effet de surprise à son avantage.</p>",
        variants: [
          {
            label: "Lumière",
            text:
              "<p>Le pratiquant doit réussir un test d’Esprit / Arcanum pour lancer ce tour. Que ce soit un " +
              "succès ou un échec, le pouvoir ne pourra pas être à nouveau utilisé pendant cette scène. En " +
              "cas de succès, il bénéficie en plus des effets normaux d’un bonus de + 2 à tous les tests " +
              "sociaux reposant sur l’autorité pendant la scène.</p>",
          },
          {
            label: "Balance / Obscurité",
            text:
              "<p>Le pratiquant doit réussir un test d’Esprit / Arcanum pour lancer ce tour. Que ce soit un " +
              "succès ou un échec, le pouvoir ne pourra pas être à nouveau utilisé pendant cette scène. En " +
              "cas de succès, il bénéficie en plus des effets normaux d’un bonus de + 2 à tous les tests " +
              "sociaux reposant sur le mensonge pendant la scène.</p>",
          },
        ],
      },
      {
        name: "Bipolarisation du groupe",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>« Bipolarisation du groupe » ne peut prendre effet que sur un groupe restreint (4 à 20 " +
          "individus), pendant une discussion civilisée. Il focalise l’attention de tous les participants " +
          "sur deux personnes : d’une part le pratiquant et d’autre part l’individu dont l’ascendant " +
          "social est le plus fort. Ce tour rend passifs les autres participants, qui se contentent " +
          "d’écouter docilement ce que les deux protagonistes ont à dire. Celui des deux orateurs qui " +
          "remporte la joute oratoire sur l’autre aura la certitude de remporter également l’adhésion du " +
          "groupe, au moins pour cette scène. Ce tour cristallise donc tous les débats sur deux champions, " +
          "de telle façon que les individualités et dissidences soient temporairement muselées. Une fois " +
          "la scène terminée, chacun rationalisera ce qui s’est passé en mettant cela sur le compte de la " +
          "dynamique de groupe.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit et doit réussir un test d’opposition d’Esprit / " +
              "Arcanum contre Esprit / Volonté, l’adversaire testé étant celui qui deviendrait l’orateur " +
              "concurrent en cas de réussite. Si le tour prend effet et que le pratiquant sort vainqueur de " +
              "la joute verbale qui s’ensuit, il se nimbe d’une plus grande crédibilité auprès du groupe " +
              "affecté pendant quelques jours.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit et doit réussir un test d’opposition d’Esprit / " +
              "Arcanum contre Esprit / Volonté, l’adversaire testé étant celui qui deviendrait l’orateur " +
              "concurrent en cas de réussite. Si le tour prend effet et que le pratiquant sort vainqueur de " +
              "la joute verbale qui s’ensuit, l’orateur concurrent devient socialement décrédibilisé pendant " +
              "quelques jours.</p>",
          },
        ],
      },
      {
        name: "Grandeur fantasmée",
        cost: { lumiere: 1, balance: 1, obscurite: 1 },
        effect:
          "<p>La prestance du Marqué est temporairement renforcée le temps d’une scène, de sorte qu’il " +
          "apparaisse comme appartenant à une classe sociale similaire à celle de la personne la plus " +
          "influente de l’assemblée. Ainsi, un simple soldat pourrait discuter sur un pied d’égalité avec " +
          "son officier ; il pourrait s’adresser à un membre de la noblesse sans que cela paraisse " +
          "incongru, voire parler à un roi comme s’il était son pair. Les effets demeurent subtils : les " +
          "interlocuteurs attribuent naturellement cette aisance à un mot bien placé, à un port assuré ou " +
          "à un visage affable. Cet effet dure une scène.</p>",
        variants: [
          {
            label: "Lumière / Balance",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit et doit réussir un test d’Esprit / Arcanum à - 2 " +
              "pour lancer ce tour. En cas de succès, il bénéficie en outre d’un bonus de + 4 à tous ses " +
              "tests sociaux reposant sur l’autorité pendant la scène.</p>",
          },
          {
            label: "Obscurité",
            text:
              "<p>Le pratiquant dépense 1 point d’Esprit et doit réussir un test d’Esprit / Arcanum à - 2 " +
              "pour lancer ce tour. En cas de succès, il bénéficie en outre d’un bonus de + 4 à tous ses " +
              "tests sociaux reposant sur le mensonge pendant la scène.</p>",
          },
        ],
      },
    ],
  },
]
