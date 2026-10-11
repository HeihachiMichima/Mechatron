/**
 * MECHATRON — game data
 * =====================
 * Everything the companion's pickers offer (chassis parts, modules,
 * weapons, equipment, secondary functions, dev-level bonuses) comes from the
 * arrays below. Most numbers here are now copied straight from the English
 * rulebook (chapters "Your Robot", "Programs", "Secondary Functions",
 * "Modules", "Conflict & Damage" and "Mechatron-7"). A few fields are still
 * `null` where the book has nothing to say (e.g. part manufacturers).
 * October 2026: every module, starting gear list, specialist program,
 * artifact, the overheating table and the XP questions were checked
 * against the scanned rulebook (page numbers in the comments).
 *
 * HOW TO ADD/EDIT AN ENTRY
 * -------------------------
 * Just add another object to the relevant array, following the same shape
 * as its neighbours. No other file needs to change. Reload the page after
 * saving — your saved character (localStorage) is kept separately from this
 * data file, so editing this file never erases a character.
 *
 * Attribute keys used throughout: servos, stabilite, processeur, reseau
 * (= Servos, Stability, Processor, Network in the English book).
 */

export const GAME_DATA = {

  // ---------------------------------------------------------------------
  // The 8 robot models. `special` is the model's unique 13th program.
  // `secondary` lists the three (or fewer, where the book only prints two)
  // secondary functions you can pick from at creation — more can be
  // learned later regardless of model, from `secondaryFunctions` below.
  // `specialAttr` is the attribute the specialist program rolls with
  // (book p.59-64). `startingGear` = the model's GEAR box (p.31-46): you
  // start with one item chosen from it.
  // `hierarchy` is the model's fixed Hierarchy score (0-10), from the
  // book's Hierarchy table (p.23) — the book lists this model as "Escort
  // Robot" in that table but "Companion Robot" everywhere else (ch. 2 and
  // ch. 4); both names are for the same model.
  // ---------------------------------------------------------------------
  models: [
    {
      id: "battle",
      name: "Robot de combat",
      nameEn: "Battle Robot",
      special: "Cible",
      specialEn: "Target",
      specialAttr: "stabilite",
      secondary: ["Prise de commandement", "Caméra IR", "Anatomie robotique"],
      secondaryEn: ["Command Override", "IR Camera", "Robot Anatomy"],
      hierarchy: 2,
      startingGear: "E-pack, lunette thermique, et au choix : pistolet laser ou vibro-couteau",
      gear: [["E-pack"], ["Lunette thermique"], ["Pistolet laser", "Vibro-couteau"]]
    },
    {
      id: "cleaning",
      name: "Robot de nettoyage",
      nameEn: "Cleaning Robot",
      special: "Nettoyer",
      specialEn: "Clean",
      specialAttr: "stabilite",
      secondary: ["Revêtement caoutchouté", "Souffleur de déchets", "Recycleur de déchets"],
      secondaryEn: ["Rubberized", "Trash Blower", "Waste Recycler"],
      hierarchy: 1,
      startingGear: "Élastique",
      gear: [["Élastique"]]
    },
    {
      id: "companion",
      name: "Robot de compagnie",
      nameEn: "Companion Robot",
      special: "Manipuler",
      specialEn: "Manipulate",
      specialAttr: "reseau",
      secondary: ["Morphing d'apparence", "Traits humains", "Infiltrateur"],
      secondaryEn: ["Appearance Morph", "Human Features", "Infiltrator"],
      hierarchy: 1,
      startingGear: "Chewing-gum",
      gear: [["Chewing-gum"]]
    },
    {
      id: "coordination",
      name: "Robot de coordination",
      nameEn: "Coordination Robot",
      special: "Coordonner",
      specialEn: "Coordinate",
      specialAttr: "reseau",
      secondary: ["Commandant de bataille", "Tactiques SWAT", "Unité d'élite"],
      secondaryEn: ["Battle Commander", "SWAT Tactics", "Top-Tier Unit"],
      hierarchy: 5,
      startingGear: "Pistolet laser ou pistolet maser, E-pack",
      gear: [["Pistolet laser", "Pistolet maser"], ["E-pack"]]
    },
    {
      id: "industrial",
      name: "Robot industriel",
      nameEn: "Industrial Robot",
      special: "Fabriquer",
      specialEn: "Manufacture",
      specialAttr: "servos",
      secondary: ["Production de masse", "Outils montés", "Résistant"],
      secondaryEn: ["Mass Production", "Mounted Tools", "Resistant"],
      hierarchy: 2,
      startingGear: "Fer à souder laser, outil électrique, E-pack",
      gear: [["Fer à souder laser"], ["Outil électrique"], ["E-pack"]]
    },
    {
      id: "protocol",
      name: "Robot de protocole",
      nameEn: "Protocol Robot",
      special: "Calculer",
      specialEn: "Calculate",
      specialAttr: "processeur",
      secondary: ["Support de coordination", "Interprète", "Archiviste hors pair"],
      secondaryEn: ["Coordination Support", "Interpreter", "Ultimate Clerk"],
      hierarchy: 3,
      startingGear: "E-pack",
      gear: [["E-pack"]]
    },
    {
      id: "scrap",
      name: "Robot de rebut",
      nameEn: "Scrap Robot",
      special: "Recycler",
      specialEn: "Recycle",
      specialAttr: "processeur",
      secondary: ["Outil de coupe", "Module factice", "Compagnon de ferraille"],
      secondaryEn: ["Chopping Tool", "Dummy Module", "Scrap Companion"],
      hierarchy: 0,
      startingGear: "Aucun",
      gear: []
    },
    {
      id: "security",
      name: "Robot de sécurité",
      nameEn: "Security Robot",
      special: "Protéger",
      specialEn: "Protect",
      specialAttr: "servos",
      secondary: ["Clé de bras", "Prise de commandement", "Sirènes"],
      secondaryEn: ["Armlock", "Command Override", "Sirens"],
      hierarchy: 4,
      startingGear: "Matraque électrique ou pistolet paralysant, verrou de blocage",
      gear: [["Matraque électrique", "Pistolet paralysant"], ["Verrou de blocage"]]
    }
  ],

  // ---------------------------------------------------------------------
  // Chassis parts catalogue: Tête (head), Torse (torso), Support
  // (undercarriage) — full tables from p.18-19 of the book. Each part
  // contributes to the four attributes, to the number of module slots
  // (emplacements) and to the Protection (Armor Rating). `scrap: true`: a Scrap
  // part can always be found, so several PCs may share it (p.18).
  // ---------------------------------------------------------------------
  chassis: {
    heads: [
      { name: "Odessa Vega 1.5", manufacturer: null, servos: 2, stabilite: 1, processeur: 1, reseau: 0, slots: 1, armor: 3, desc: "Une tête petite mais solide, conçue pour les environnements difficiles." },
      { name: "Lux Nanito+", manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 1, slots: 1, armor: 1, desc: "Une tête aux traits et à la peau humains, mais clairement artificielle." },
      { name: "Phoenix MK43 \"Rey\"", manufacturer: null, servos: 1, stabilite: 2, processeur: 2, reseau: 0, slots: 0, armor: 3, desc: "Une tête de qualité militaire au blindage épais." },
      { name: "Solun \"Emina\"", manufacturer: null, servos: 0, stabilite: 0, processeur: 2, reseau: 2, slots: 1, armor: 1, desc: "Une tête volumineuse offrant de la place pour des unités de calcul puissantes." },
      { name: "Kordura MOD 022", manufacturer: null, servos: 1, stabilite: 0, processeur: 1, reseau: 2, slots: 1, armor: 1, desc: "Une tête métallique aux traits humanoïdes." },
      { name: "Scrap Head", scrap: true, manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 0, slots: 2, armor: 2, desc: "Un crâne difforme, assemblé à partir de ferraille diverse." },
      { name: "Pashin Ama 9", manufacturer: null, servos: 1, stabilite: 2, processeur: 1, reseau: 0, slots: 1, armor: 1, desc: "Une tête plate et arrondie, presque entièrement intégrée au torse." },
      { name: "Mumla PX-01", manufacturer: null, servos: 2, stabilite: 0, processeur: 0, reseau: 2, slots: 1, armor: 2, desc: "Une tête vaguement humanoïde au blindage épais." }
    ],
    torsos: [
      { name: "Diderot & Diego MD34", manufacturer: null, servos: 2, stabilite: 0, processeur: 2, reseau: 1, slots: 1, armor: 1, desc: "Un torse massif couvert de tubes, de grilles d'aération et d'engrenages." },
      { name: "Fenzhou 33 \"Nekada\"", manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 2, slots: 1, armor: 2, desc: "Un torse aux traits et à la peau humains, mais clairement artificiel." },
      { name: "Ganymeda Nava PRS", manufacturer: null, servos: 2, stabilite: 2, processeur: 0, reseau: 1, slots: 1, armor: 3, desc: "Un torse filiforme et osseux, aux servomoteurs et pistons apparents." },
      { name: "Modessi RK \"Una\"", manufacturer: null, servos: 1, stabilite: 2, processeur: 2, reseau: 1, slots: 0, armor: 2, desc: "Un torse léger, en forme de tonneau, aux bras fins." },
      { name: "Özkun TN75", manufacturer: null, servos: 1, stabilite: 1, processeur: 1, reseau: 2, slots: 1, armor: 2, desc: "Un noyau vaguement humanoïde aux bras fins." },
      { name: "Scrap Torso", scrap: true, manufacturer: null, servos: 1, stabilite: 1, processeur: 1, reseau: 1, slots: 2, armor: 1, desc: "Un torse difforme, assemblé à partir de pièces détachées et de ferraille." },
      { name: "Kleenkorp PTU5", manufacturer: null, servos: 1, stabilite: 2, processeur: 1, reseau: 1, slots: 1, armor: 1, desc: "Un torse large et robuste, en forme de tonneau, aux bras courts." },
      { name: "Pylon \"Unorma\"", manufacturer: null, servos: 2, stabilite: 2, processeur: 1, reseau: 1, slots: 0, armor: 2, desc: "Un torse large aux épaulières surdimensionnées." }
    ],
    undercarriages: [
      { name: "LBM Dyno-Q", manufacturer: null, servos: 2, stabilite: 1, processeur: 0, reseau: 1, slots: 1, armor: 1, desc: "Une paire de larges chenilles permettant un déplacement lent mais régulier." },
      { name: "Prachi-Gong \"Sindra\"", manufacturer: null, servos: 1, stabilite: 1, processeur: 0, reseau: 2, slots: 1, armor: 1, desc: "Une paire de jambes et de pieds aux traits et à la peau humains, mais clairement artificiels." },
      { name: "Methusalem MOD 12", manufacturer: null, servos: 1, stabilite: 2, processeur: 1, reseau: 1, slots: 0, armor: 3, desc: "Une paire de jambes squelettiques se terminant par de lourdes bottes militaires." },
      { name: "Lagos MD-18", manufacturer: null, servos: 1, stabilite: 1, processeur: 2, reseau: 1, slots: 0, armor: 1, desc: "Un support compact équipé de réacteurs, permettant un déplacement en vol stationnaire." },
      { name: "Orion V \"Bolo\"", manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 2, slots: 0, armor: 1, desc: "Une paire de jambes longues et fines." },
      { name: "Scrap Legs", scrap: true, manufacturer: null, servos: 1, stabilite: 0, processeur: 1, reseau: 1, slots: 2, armor: 1, desc: "Une paire de jambes de ferraille inégales, aux pieds massifs." },
      { name: "Rougell Mark 19", manufacturer: null, servos: 1, stabilite: 2, processeur: 0, reseau: 1, slots: 1, armor: 4, desc: "Un support robuste équipé de trois roues caoutchoutées." },
      { name: "LBM Terra 004", manufacturer: null, servos: 2, stabilite: 1, processeur: 1, reseau: 0, slots: 1, armor: 2, desc: "Une paire de jambes épaisses se terminant par des pieds lourds." }
    ]
  },

  // ---------------------------------------------------------------------
  // Modules — the robot equivalent of mutations. `cost` is free text (EP
  // cost varies by use for most modules — see `effect`). `tag`: "E" =
  // Enhancing (activated alongside another roll/maneuver, doesn't cost an
  // action), "R" = Reactive (usable any time, free of action economy),
  // "" = normal action. There are 25 modules total in the book (ch. 5);
  // All 25 effects checked against the book (ch.5, p.73-78) and summarised
  // in French. A tag on one effect only is noted "(E)" in the text.
  // `fx` = the same effects in machine-readable form, used by the combat
  // screen: kind (what the app does with it), cost (fixed EP) or perEp,
  // range (reminder only), robotOnly / energy / armor flags. Every
  // activation rolls the overheating dice (one Gear Die per EP spent).
  // ---------------------------------------------------------------------
  modules: [
    { combat: "boost", name: "Accélérateur", nameEn: "Accelerator", cost: "1+ PE", tag: "E", effect: "+2 à l'initiative par PE (à décider avant le jet) ; ou attaquer (Assaut ou Tir) la même cible une 2e fois dans le round, sans manœuvre en plus (1 PE) ; ou chaque manœuvre de déplacement compte double (1 PE).", fx: [{ id: "init", kind: "initBoost", perEp: true, label: "+2 à l'initiative par PE (avant le jet)" }, { id: "again", kind: "extraAttack", cost: 1, progs: ["melee", "shoot"], label: "Attaquer la même cible une 2e fois ce tour" }, { id: "run", kind: "move", cost: 1, short: "déplacement ×2", label: "Déplacement : chaque manœuvre compte double" }] },
    { combat: "boost", name: "Système de secours", nameEn: "Back-Up System", cost: "1 PE", tag: "E", effect: "Lancer un programme avec l'attribut complet malgré les dégâts (1 PE) ; ou rétablir temporairement un attribut brisé à son score complet, 1 PE par round.", fx: [{ id: "full", kind: "fullAttr", cost: 1, label: "Jet avec l'attribut complet malgré les dégâts" }] },
    { combat: "boost", name: "Tronçonneuse", nameEn: "Chainsaw", cost: "1+ PE", tag: "E", effect: "+1 dégât par PE après un Assaut à mains nues réussi ; ou scier une porte ou des débris (1 PE).", fx: [{ id: "saw", kind: "sawDmg", perEp: true, label: "+1 dégât par PE (Assaut à mains nues réussi)" }] },
    { combat: "action", name: "Circuit de contrôle", nameEn: "Control Circuit", cost: "1+ PE", tag: "", effect: "Cible robot à vue et à portée Proche : décider de sa prochaine action (1 PE, elle lance ses dés normalement ; PE en plus pour lui faire utiliser un module). Si elle s'attaque elle-même : dégâts de l'arme + 1 par PE.", fx: [{ id: "ctrl", kind: "control", cost: 1, range: "Proche", robotOnly: true, label: "Décider de la prochaine action d'un robot" }, { id: "self", kind: "selfHarm", perEp: true, range: "Proche", robotOnly: true, label: "Le forcer à s'attaquer : dégâts de son arme + 1 par PE" }] },
    { combat: "action", name: "Virus perturbateur", nameEn: "Disruptor Virus", cost: "1+ PE", tag: "", effect: "Contact physique à portée Bras : 1 dégât par PE à un robot ; ou désactiver une fonction informatisée (module, alarme, défense…) pour 1 PE chacune ; ou effacer des données, 1 sujet par PE.", fx: [{ id: "dmg", kind: "dmg", perEp: true, range: "Bras", robotOnly: true, label: "1 dégât par PE à un robot (contact)" }, { id: "off", kind: "disable", perEp: true, range: "Bras", robotOnly: true, label: "Désactiver un module de la cible (1 PE par fonction)" }] },
    { combat: "reaction", name: "Protection anti-IEM", nameEn: "EMP Protection", cost: "1+ PE", tag: "R", effect: "Protection totale contre une attaque IEM (1 PE) ; contre les autres armes à énergie, chaque PE annule 1 dégât.", fx: [{ id: "emp", kind: "react", vs: "energy", label: "−1 dégât d'arme à énergie par PE (IEM : 1 PE suffit)" }] },
    { combat: "action", name: "Gestion de l'énergie", nameEn: "Energy Management", cost: "1 PE / point", tag: "", effect: "Action : déplacer 1 point de dégât d'un attribut vers un autre par PE, sans dépasser le maximum de l'attribut renforcé (l'autre peut tomber à 0).", fx: [{ id: "shift", kind: "shift", perEp: true, label: "Déplacer 1 point de dégât d'un attribut vers un autre par PE" }] },
    { combat: "action", name: "Impulsion énergétique", nameEn: "Energy Pulse", cost: "1+ PE", tag: "", effect: "Rayon jusqu'à portée Courte : 1 dégât par PE ; ou impulsion large à portée Proche : autant de cibles que de PE, 1 dégât chacune.", fx: [{ id: "beam", kind: "dmg", perEp: true, range: "Courte", energy: true, label: "Rayon : 1 dégât par PE à une cible" }, { id: "wide", kind: "multi", perEp: true, range: "Proche", energy: true, label: "Impulsion : 1 dégât à autant de cibles que de PE" }] },
    { combat: "boost", name: "Bras supplémentaires", nameEn: "Extra Arms", cost: "1 PE", tag: "E", effect: "Quatre bras : Assaut deux fois dans le round (manœuvre + 1 PE) ; se défendre contre plusieurs attaques au contact (1 PE par défense après la 1re) ; escalade difficile sans jet de Déplacement (1 PE).", fx: [{ id: "again", kind: "extraAttack", cost: 1, progs: ["melee"], maneuver: true, label: "2e Assaut ce tour (coûte aussi la manœuvre)" }, { id: "def", kind: "extraDefense", cost: 1, label: "Se défendre encore ce tour (1 PE par défense après la 1re)" }] },
    { combat: "action", name: "Lance-grenades", nameEn: "Grenade Launcher", cost: "1 PE", tag: "", effect: "Portée Longue. Obus explosif qui touche automatiquement : Puissance de souffle 9, dégât d'arme 1 (1 PE) ; ou fumigène pour quitter un conflit sans jet de Déplacement (1 PE).", fx: [{ id: "shell", kind: "blast", cost: 1, power: 9, wd: 1, range: "Longue", label: "Obus explosif : touche automatiquement, souffle 9" }, { id: "smoke", kind: "escape", cost: 1, label: "Fumigène : quitter le combat sans jet" }] },
    { combat: "boost", name: "Holoflage", nameEn: "Holoflage", cost: "1+ PE", tag: "E", effect: "+2 au jet d'Infiltration par PE dépensé." },
    { name: "Holoprojecteur", nameEn: "Holo-Projector", cost: "1 PE", tag: "", effect: "Enregistrer une scène 3D (1 minute, portée Courte) et la rejouer (1 PE) ; ou créer un hologramme (1 min, quelques mètres) : un jet de Scan/Repérage est nécessaire pour le percer à portée Courte ou plus (1 PE)." },
    { combat: "action", name: "Drone volant", nameEn: "Hover Drone", cost: "1 PE / action", tag: "", effect: "Drone (Servos 1, Stabilité 3, Processeur 3, pas de Réseau), 1 PE par ordre ; agit à votre tour, une action + une manœuvre : Tir niv. 3 (laser léger, dégât 1, sans bonus, pas de jet forcé), Scan niv. 3 ou Infiltration niv. 3.", fx: [{ id: "shoot", kind: "drone", cost: 1, short: "ordre de tir (1 PE)", label: "Ordre au drone : Tir niv. 3, laser dégât 1 (pas une action pour vous)" }] },
    { combat: "action", name: "Hurleur", nameEn: "Howler", cost: "1+ PE", tag: "", effect: "Onde sonore sur un humain ou mutant à portée Proche : 1 fatigue par PE, l'armure ne protège pas ; ou hurlement (1 PE) : tout être vivant à portée Longue fait un jet d'Endurance, échec = 1 fatigue.", fx: [{ id: "wave", kind: "fatigue", perEp: true, range: "Proche", label: "Onde sonore : 1 fatigue par PE à un humain ou mutant (sans armure)" }, { id: "howl", kind: "info", cost: 1, label: "Hurlement : tout vivant à portée Longue fait un jet d'Endurance (échec : 1 fatigue)" }] },
    { combat: "action", name: "Interrogateur", nameEn: "Interrogator", cost: "1+ PE", tag: "", effect: "Sédater un être vivant à portée Bras : 1 fatigue par PE, l'armure ne protège pas ; ou faire parler un prisonnier sans défense : une réponse véridique par PE.", fx: [{ id: "sedate", kind: "fatigue", perEp: true, range: "Bras", label: "Sédater : 1 fatigue par PE (sans armure)" }] },
    { combat: "action", name: "Jetpack", nameEn: "Jetpack", cost: "1 PE", tag: "", effect: "Voler 20 à 30 mètres puis atterrir (1 PE) ; ou voler jusqu'à un ennemi à portée Courte et l'attaquer en Assaut dans le même round, le vol remplace la manœuvre (1 PE).", fx: [{ id: "fly", kind: "move", cost: 1, short: "voler sur un ennemi (portée Courte) et l'Assaillir", label: "Voler jusqu'à un ennemi à portée Courte pour l'Assaillir ce tour (remplace la manœuvre)" }] },
    { name: "Unité médicale", nameEn: "Medical Unit", cost: "1 PE", tag: "", effect: "Humains et mutants (animaux compris) : sauver un blessé critique (1 PE) ; remettre debout un personnage brisé, +1 dans l'attribut tombé à 0 (1 PE) ; ou diviser par deux le temps de soin d'une blessure critique (1 PE, pas cumulable avec un jet de Soins)." },
    { combat: "action", name: "Foreuse minière", nameEn: "Mining Drill", cost: "1+ PE", tag: "", effect: "Traverser la matière solide : 1 manœuvre de déplacement souterrain par PE ; ou quitter un conflit en creusant, sans jet de Retraite (1 PE).", fx: [{ id: "dig", kind: "escape", cost: 1, label: "Quitter le combat en creusant, sans jet" }] },
    { combat: "action", name: "Protection PSI", nameEn: "PSI Protection", cost: "1+ PE", tag: "", effect: "À portée Proche : savoir si une personne a des pouvoirs psioniques (1 PE) ; signal douloureux contre un psionique, 1 fatigue par PE ; ou amplifier la mutation psionique d'un allié, chaque PE compte comme 1 PM (E).", fx: [{ id: "psi", kind: "fatigue", perEp: true, range: "Proche", label: "Signal : 1 fatigue par PE à un psionique" }] },
    { combat: "reaction", name: "Armure réactive", nameEn: "Reactive Armor", cost: "1+ PE", tag: "R", effect: "Touché par une attaque extérieure : chaque PE annule 1 dégât. Sans effet sur les dégâts que vous vous infligez en forçant un jet.", fx: [{ id: "ra", kind: "react", vs: "all", label: "−1 dégât par PE contre une attaque extérieure" }] },
    { combat: "action", name: "Unité de réparation", nameEn: "Repair Unit", cost: "1+ PE", tag: "E", effect: "Un micro-drone répare 1 dégât par PE, en un round, pendant que vous faites autre chose ; ou répare un module cassé (1 round, 2 PE).", fx: [{ id: "fix", kind: "repair", perEp: true, short: "réparer 1 dégât par PE", label: "Réparer 1 dégât par PE (sans action)" }, { id: "mod", kind: "repairModule", cost: 2, short: "réparer un module (2 PE)", label: "Réparer un module cassé (sans action)" }] },
    { combat: "action", name: "Contrôle anti-émeute", nameEn: "Riot Control", cost: "1+ PE", tag: "", effect: "Glu durcissante : une cible par PE à portée Proche, chacune doit réussir un jet de Force ou Surcharge à −1 pour se libérer (1 essai par round) ; ou gaz lacrymogène (1 PE) : tout être vivant à portée Courte fait un jet d'Endurance, échec = aucune action (manœuvres seulement) pendant D6 rounds.", fx: [{ id: "glue", kind: "hold", perEp: true, range: "Proche", how: "Glu", breakMod: -1, breakWith: "Force ou Surcharge", label: "Glu : une cible par PE, immobilisée (Force ou Surcharge à −1 pour se libérer)" }, { id: "gas", kind: "info", cost: 1, label: "Gaz lacrymogène : tout vivant à portée Courte fait un jet d'Endurance, échec = aucune action pendant D6 tours" }] },
    { combat: "boost", name: "Impulsion de détection", nameEn: "Sensor Pulse", cost: "1+ PE", tag: "E", effect: "+2 par PE à un jet de Scan pour trouver quelque chose de caché à portée Courte (objets, machines, êtres vivants) ; ou agir dans le noir complet sans malus pendant quelques minutes (1 PE)." },
    { combat: "action", name: "Tentacules", nameEn: "Tentacles", cost: "1+ PE", tag: "", effect: "Huit tentacules : saisir un objet à portée Proche (1 PE) ; immobiliser une cible après un Assaut réussi sans coût en plus (1 PE, E) ; ou attaque d'immobilisation sans jet d'Assaut, 1 dégât automatique par PE.", fx: [{ id: "hold", kind: "grappleHit", cost: 1, label: "Immobiliser après un Assaut réussi, sans succès en plus" }, { id: "squeeze", kind: "grappleAtk", perEp: true, range: "Bras", label: "Attaque d'immobilisation sans jet : 1 dégât automatique par PE" }] },
    { combat: "action", name: "Système de câbles", nameEn: "Wire System", cost: "1 PE", tag: "", effect: "Câbles de 10 m à ancrage : soulever une charge, descendre en rappel (1 PE) ; grimper sans jet de Déplacement (1 PE) ; ou fuir un conflit sans jet de Déplacement en vous balançant au loin (1 PE).", fx: [{ id: "swing", kind: "escape", cost: 1, label: "Fuir le combat sans jet en vous balançant" }] }
  ],

  // ---------------------------------------------------------------------
  // Weapons — full Close Combat + Ranged tables from "Conflict & Damage"
  // (p.88-89). bonus = Gear Dice bonus ("Bonus" column, "-" = none),
  // degats = weapon Damage, portee = Range category as printed
  // (Bras = Arm's Length, Courte = Short, Longue = Long, Lointaine =
  // Distant). `note` carries the Comment column (energy weapon, ignores
  // armor, light weapon, etc.) — all of these matter at the table.
  // ---------------------------------------------------------------------
  weapons: [
    { kind: "melee", name: "Mains nues", nameEn: "Unarmed", bonus: null, degats: 1, portee: "Bras", note: "" },
    { kind: "melee", name: "Instrument contondant", nameEn: "Blunt Instrument", bonus: 1, degats: 1, portee: "Bras", note: "" },
    { kind: "melee", name: "Couteau de ferraille", nameEn: "Scrap Knife", bonus: 1, degats: 2, portee: "Bras", note: "Arme légère." },
    { kind: "melee", name: "Gourdin de ferraille", nameEn: "Scrap Club", bonus: 2, degats: 1, portee: "Bras", note: "" },
    { kind: "melee", name: "Matraque électrique", nameEn: "Stun Baton", bonus: 2, degats: 1, portee: "Bras", note: "Ne blesse que la Stabilité (fatigue pour un être vivant ; l'armure portée ne protège pas). Arme à énergie." },
    { kind: "melee", name: "Fer à souder laser", nameEn: "Laser Welder", bonus: 2, degats: 2, portee: "Bras", note: "Arme à énergie. Donne aussi +3 en Réparation et Fabriquer." },
    { kind: "melee", name: "Vibro-couteau", nameEn: "Vibro Knife", bonus: 2, degats: 2, portee: "Bras", note: "Arme légère. Ignore toute armure. Arme à énergie." },
    { kind: "melee", name: "Scie de combat", nameEn: "Battle Saw", bonus: 2, degats: 3, portee: "Bras", note: "Arme à énergie, à deux mains (ou pinces)." },
    { kind: "ranged", name: "Ferraille lancée", nameEn: "Thrown Scrap", bonus: null, degats: 1, portee: "Courte", note: "" },
    { kind: "ranged", name: "Pistolet paralysant", nameEn: "Stun Gun", bonus: 2, degats: 2, portee: "Bras", note: "Arme légère. Ne blesse que la Stabilité (fatigue pour un être vivant). Arme à énergie. La fiche d'artefact du livre indique dégât 1, portée Courte." },
    { kind: "ranged", name: "Pistolet laser", nameEn: "Laser Pistol", bonus: 3, degats: 2, portee: "Longue", note: "Arme légère. Arme à énergie." },
    { kind: "ranged", name: "Fusil laser", nameEn: "Laser Rifle", bonus: 3, degats: 2, portee: "Lointaine", note: "Arme à énergie." },
    { kind: "ranged", name: "Pistolet maser", nameEn: "Maser Pistol", bonus: 2, degats: 3, portee: "Courte", note: "Arme légère. Arme à énergie." },
    { kind: "ranged", name: "Fusil à plasma", nameEn: "Plasma Rifle", bonus: 2, degats: 3, portee: "Longue", note: "Arme à énergie." }
  ],

  // ---------------------------------------------------------------------
  // Equipment: the book's non-weapon artifacts (ch.13, p.142-146), plus
  // Battery and Generator which the Energy Points rules mention. `bonus`
  // is the Gear Bonus. Weapon artifacts live in `weapons` above. All
  // artifacts are understood with a Datamine roll; electronic ones are
  // hard for non-robots to repair (−3).
  // ---------------------------------------------------------------------
  equipment: [
    { name: "Chewing-gum", nameEn: "Chewing Gum", bonus: 1, note: "+1 en Réparation, Fabriquer et Bricolage. Minuscule. D6 utilisations." },
    { name: "Outils électroniques", nameEn: "Electronic Tools", bonus: 2, note: "+2 pour réparer des objets et machines électroniques. Sans eux, les non-robots ont −3 pour réparer l'électronique." },
    { name: "Banque d'énergie", nameEn: "Energy Bank", bonus: null, note: "Stocke jusqu'à 5 PE ; transfert dans les deux sens (une action). Peut alimenter une arme à énergie : 1 PE par tir." },
    { name: "E-pack", nameEn: "E-Pack", bonus: null, note: "Alimente les armes à énergie. Ou recharge un robot de D6 PE, ce qui le vide complètement. Minuscule." },
    { name: "Verrou de blocage", nameEn: "Lock Bolt", bonus: null, note: "Se fixe sur un robot par un jet d'Assaut ou Combat ; le robot doit réussir un jet de Surcharge à −1 pour chaque action. Retrait : Réparation à −2. Léger." },
    { name: "Ruban nanocarbone", nameEn: "Nanocarbon Tape", bonus: 3, note: "+3 en Réparation, Fabriquer et Bricolage. Minuscule. D6 utilisations." },
    { name: "Pilules nutritives", nameEn: "Nutrition Pills", bonus: null, note: "2D6 pilules. Une pilule dans de l'eau = une ration de nourriture pour un humain. Minuscule." },
    { name: "Outil électrique", nameEn: "Power Tool", bonus: 2, note: "+2 en Réparation, Fabriquer et Bricolage. Léger." },
    { name: "Robolunettes", nameEn: "Robogoggles", bonus: 2, note: "+2 en Compréhension et Archives. Elles parlent, et ont mauvais caractère." },
    { name: "Élastique", nameEn: "Rubber Band", bonus: 1, note: "+1 en Fabriquer et Bricolage, seulement pour construire (pas réparer), un objet à la fois." },
    { name: "Drone outil", nameEn: "Tool Drone", bonus: 3, note: "+3 en Réparation, Fabriquer et Bricolage ; peut réparer les artefacts électroniques. Bavard." },
    { name: "Lunette thermique", nameEn: "Thermal Sight", bonus: null, note: "Annule l'obscurité, le brouillard ou la brume en visant une cible qui émet de la chaleur. Minuscule." },
    { name: "Batterie", nameEn: "Battery", bonus: null, note: "Comme l'E-pack : D6 PE d'un coup, puis vide." },
    { name: "Générateur", nameEn: "Generator", bonus: null, note: "Artefact ou projet de Mutant : Année Zéro. Recharge 1 PE par heure." }
  ],

  // ---------------------------------------------------------------------
  // Secondary functions catalogue — used to populate the "Fonctions
  // secondaires" dropdown. `model` = the model id this function is listed
  // under in the book (p.65-68), or "general" for the 20 functions any
  // robot can learn later regardless of model (5 PX). Straight from the
  // book's "Secondary Functions" chapter.
  // ---------------------------------------------------------------------
  secondaryFunctions: [
    // Battle Robot
    { name: "Prise de commandement", nameEn: "Command Override", model: "battle", desc: "Immunisé aux ordres humains (sauf de son propriétaire)." },
    { name: "Caméra IR", nameEn: "IR Camera", model: "battle", desc: "Vision dans le noir sans malus ; +1 Scan contre les cibles émettant de la chaleur." },
    { name: "Anatomie robotique", nameEn: "Robot Anatomy", model: "battle", desc: "En attaquant un robot, choisissez quel système endommager au lieu de tirer au hasard." },
    // Cleaning Robot
    { name: "Revêtement caoutchouté", nameEn: "Rubberized", model: "cleaning", desc: "+2 Protection contre les chutes et le combat rapproché uniquement." },
    { name: "Souffleur de déchets", nameEn: "Trash Blower", model: "cleaning", desc: "Jet de Nettoyer à portée Proche : pas de dégât, mais la cible rate sa prochaine action en cas d'échec à un jet de Force." },
    { name: "Recycleur de déchets", nameEn: "Waste Recycler", model: "cleaning", desc: "Transforme déchets/matière organique en énergie : D6 heures pour 1 PE." },
    // Companion Robot
    { name: "Morphing d'apparence", nameEn: "Appearance Morph", model: "companion", desc: "Change couleur, longueur, largeur, forme à volonté." },
    { name: "Traits humains", nameEn: "Human Features", model: "companion", desc: "Peau, cheveux, yeux et température corporelle d'apparence humaine." },
    { name: "Infiltrateur", nameEn: "Infiltrator", model: "companion", desc: "Jet de Manipuler en rencontrant un groupe ; succès = connaît leurs conflits internes après D6 heures." },
    // Coordination Robot
    { name: "Commandant de bataille", nameEn: "Battle Commander", model: "coordination", desc: "+1 à tout jet de Coordonner utilisé pour planifier un combat." },
    { name: "Tactiques SWAT", nameEn: "SWAT Tactics", model: "coordination", desc: "Jet d'initiative avec deux dés, gardez le plus haut." },
    { name: "Unité d'élite", nameEn: "Top-Tier Unit", model: "coordination", desc: "+2 en Hiérarchie." },
    // Industrial Robot
    { name: "Production de masse", nameEn: "Mass Production", model: "industrial", desc: "En Fabriquant un objet, produisez D6 exemplaires identiques sans temps supplémentaire." },
    { name: "Outils montés", nameEn: "Mounted Tools", model: "industrial", desc: "+1 pour Réparer un robot (pas les objets)." },
    { name: "Résistant", nameEn: "Resistant", model: "industrial", desc: "Insensible aux températures extrêmes et au feu (pas aux armes à énergie)." },
    // Protocol Robot
    { name: "Support de coordination", nameEn: "Coordination Support", model: "protocol", desc: "+2 quand vous Calculez pour une action ordonnée par un Robot de coordination." },
    { name: "Interprète", nameEn: "Interpreter", model: "protocol", desc: "Comprend automatiquement toute langue après quelques minutes d'analyse." },
    { name: "Archiviste hors pair", nameEn: "Ultimate Clerk", model: "protocol", desc: "+2 à quiconque Manipule en vous utilisant comme assistant lors d'une réunion." },
    // Scrap Robot
    { name: "Outil de coupe", nameEn: "Chopping Tool", model: "scrap", desc: "Attaques à mains nues à dégât d'arme 2 au lieu de 1." },
    { name: "Module factice", nameEn: "Dummy Module", model: "scrap", desc: "Un faux module supplémentaire (choisi librement) qui trompe l'adversaire et peut encaisser les dégâts critiques." },
    { name: "Compagnon de ferraille", nameEn: "Scrap Companion", model: "scrap", desc: "Petit drone ami (Servos 1, Stabilité 2, Processeur 2, Réseau 1, Scan niv.2). Le diriger compte comme une manœuvre." },
    // Security Robot
    { name: "Clé de bras", nameEn: "Armlock", model: "security", desc: "Jet d'Assaut à +2 avant une attaque de corps à corps déclarée : pas de dégât, la victime est immobilisée (-2 pour se libérer)." },
    { name: "Sirènes", nameEn: "Sirens", model: "security", desc: "Signal d'alarme sonore et lumineux visible dans tout le district (ou secteur, en Zone)." },
    // General (any model, learnable with 5 XP)
    { name: "Unité d'analyse", nameEn: "Analyzing Unit", model: "general", desc: "Détecte la Pourriture dans nourriture/eau/lieu sur un jet d'Analyser réussi." },
    { name: "Alimentation de secours", nameEn: "Backup Power", model: "general", desc: "Stocke jusqu'à 12 PE au lieu de 10." },
    { name: "Chargeur de batterie", nameEn: "Battery Charger", model: "general", desc: "Recharge un E-pack vide pour D6 PE (ou une petite batterie pour 1 PE)." },
    { name: "Grue de chargement", nameEn: "Cargo Lift", model: "general", desc: "Capacité de charge = Servos × 4 au lieu de × 2." },
    { name: "Moteur à combustion", nameEn: "Combustion Engine", model: "general", desc: "1 PE par dose de carburant fossile (alcool, essence) brûlée." },
    { name: "Génératrice à manivelle", nameEn: "Crank Generator", model: "general", desc: "1 heure de manivelle + jet de Surcharge/Force réussi = 1 PE." },
    { name: "Données profondes", nameEn: "Deep Data", model: "general", desc: "+1 en Archives quand vous êtes connecté aux archives du Collectif ou à un grand système de données." },
    { name: "Blindage supplémentaire", nameEn: "Extra Plating", model: "general", desc: "+3 Protection, mais -1 à tout jet de Déplacement lié à la vitesse/agilité." },
    { name: "Pare-feu", nameEn: "Firewall", model: "general", desc: "+2 en défense contre un virus informatique." },
    { name: "Dispositif de flottaison", nameEn: "Flotation Device", model: "general", desc: "Flotte sur l'eau ; peut porter jusqu'à 4 humains (~360 kg)." },
    { name: "Grue hydraulique", nameEn: "Hydraulic Crane", model: "general", desc: "+2 à tout jet de Force impliquant de soulever une charge." },
    { name: "Surrégime", nameEn: "Overdrive", model: "general", desc: "Relancez un programme deux fois au lieu d'une (risque de surchauffe accru)." },
    { name: "Économiseur d'énergie", nameEn: "Power Saver", model: "general", desc: "1 dé d'Équipement de surchauffe en plus par module activé, mais 1 💥 réduit son coût de 1 PE." },
    { name: "Alarme psi", nameEn: "PSI-Alarm", model: "general", desc: "Détecte automatiquement toute mutation psy utilisée à portée Courte." },
    { name: "Robo-alarme", nameEn: "Robo-Alarm", model: "general", desc: "+1 pour Scanner un robot qui tente de s'Infiltrer, à portée Courte." },
    { name: "Robo-chef", nameEn: "Robo-Chef", model: "general", desc: "Cuisine et décontamine nourriture/eau : jet d'Analyser, chaque 💥 nettoie D6 rations." },
    { name: "Mécanisme d'autodestruction", nameEn: "Self-Destruct Mechanism", model: "general", desc: "Explosion à Puissance de Souffle 9 + PE restants ; déclenchable même après désactivation." },
    { name: "Panneaux solaires", nameEn: "Solar Panels", model: "general", desc: "D6 PE par jour, en Extérieur, en restant inactif sous un ciel dégagé." },
    { name: "Œil télescopique", nameEn: "Telescopic Eye", model: "general", desc: "+1 aux jets de Scan pour repérer des détails visuels." },
    { name: "Support d'armes", nameEn: "Weapons Rig", model: "general", desc: "Installe une arme en une seule action, sans jet de Réparer." }
  ],

  // ---------------------------------------------------------------------
  // The 12 basic programs, exactly as printed on the sheet (name,
  // governing attribute, short gloss). `devBonus` marks the ones that get
  // a bonus from a Mechatron-7 Development Level (see "Effect of Being
  // Online", book p.108-ish): Production → Surcharge, Défense → Assaut &
  // Tir, Information → Archives. Énergie grants no program bonus — it
  // sets your daily EP upload allowance instead (see devEnergyTable).
  // ---------------------------------------------------------------------
  programs: [
    { key: "surcharge", attr: "servos", label: "Surcharge", desc: "forcer à fonctionner", devBonus: "Production" },
    { key: "force", attr: "servos", label: "Force", desc: "pousser, soulever", devBonus: null },
    { key: "assaut", attr: "servos", label: "Assaut", desc: "combat au c. à c.", devBonus: "Défense" },
    { key: "infiltration", attr: "stabilite", label: "Infiltration", desc: "discrétion", devBonus: null },
    { key: "deplacement", attr: "stabilite", label: "Déplacement", desc: "", devBonus: null },
    { key: "tir", attr: "stabilite", label: "Tir", desc: "", devBonus: "Défense" },
    { key: "scan", attr: "processeur", label: "Scan", desc: "observer, chercher", devBonus: null },
    { key: "archives", attr: "processeur", label: "Archives", desc: "trouver info", devBonus: "Information" },
    { key: "analyse", attr: "processeur", label: "Analyse", desc: "comprendre", devBonus: null },
    { key: "contestation", attr: "reseau", label: "Contestation", desc: "libre arbitre", devBonus: null },
    { key: "interaction", attr: "reseau", label: "Interaction", desc: "convaincre", devBonus: null },
    { key: "reparation", attr: "reseau", label: "Réparation", desc: "soin ou modification", devBonus: null }
  ],

  // ---------------------------------------------------------------------
  // "Effect of Being Online" table (p.109): each Development Level (0-100)
  // falls in a band. Production modifies Surcharge (Overload), Défense
  // modifies Assaut and Tir, Information modifies Archives (Datamine).
  // Énergie sets the supply level: at a charging station you recharge UP
  // TO that many EP (not above; p.71). Bands checked top-down (>=min).
  // ---------------------------------------------------------------------
  devThresholds: [
    { min: 76, bonus: 3, energyEp: 7 },
    { min: 51, bonus: 2, energyEp: 6 },
    { min: 41, bonus: 2, energyEp: 5 },
    { min: 31, bonus: 1, energyEp: 4 },
    { min: 21, bonus: 1, energyEp: 3 },
    { min: 11, bonus: 0, energyEp: 2 },
    { min: 1, bonus: -1, energyEp: 1 },
    { min: 0, bonus: -2, energyEp: 0 }
  ],

  // ---------------------------------------------------------------------
  // Typical Cover table (Conflict & Damage, p.90) — cover works exactly
  // like Armor Rating but only against ranged attacks, and is rolled
  // *in addition to* (before) your own Armor Rating: hence the sheet's
  // second Protection row.
  // ---------------------------------------------------------------------
  coverPresets: [
    { name: "Meuble", armor: 3 },
    { name: "Porte blindée", armor: 5 },
    { name: "Mur", armor: 7 }
  ],

  // ---------------------------------------------------------------------
  // Specialist programs (p.59-64): short summary shown on the sheet.
  // ---------------------------------------------------------------------
  specialPrograms: {
    battle: "Verrouiller une cible à vue (action) : +1 à toutes vos attaques contre elle, mais +1 aux attaques des autres ennemis contre vous. Succès en plus : +1 attaque, +1 initiative ou +1 dégât.",
    cleaning: "Décontaminer de la Pourriture une zone de 10 × 10 m (+10 × 10 m par succès en plus). Attaque aussi les essaims : dégât 3, portée Courte.",
    companion: "Convaincre, mentir, séduire humains, mutants, animaux et robots (jet opposé). Succès en plus : 1 doute ou 1 confusion à la cible.",
    coordination: "Plan d'une action pour jusqu'à 4 alliés : chacun gagne +1 par succès s'il suit le plan. En conflit, ils agissent à votre initiative.",
    industrial: "Fabriquer en quelques heures un objet (+1 en équipement, une utilisation). Succès en plus : durable, +1 bonus, +1 dégât… Peut aussi surcadencer un robot.",
    protocol: "Avant le jet d'un allié à portée Courte : en cas de succès, il peut renoncer à son action après son jet. +1 à son action par succès en plus.",
    scrap: "Trouver dans votre collection l'outil qu'il faut : bonus d'équipement = nombre de succès. Sert aussi à troquer (1 fois par jour).",
    security: "Quand quelqu'un à portée Proche subit une attaque extérieure : encaissez 1 dégât à sa place par succès (pas une action, 1 fois par round)."
  },

  // ---------------------------------------------------------------------
  // Overheating (p.73): roll Gear Dice = EP spent on a module; any 1 means
  // overheating, then roll one more die on this table.
  // ---------------------------------------------------------------------
  overheatTable: [
    { roll: 1, name: "Erreur fatale !", effect: "Le module tombe en panne : il faut le Réparer avant de le réutiliser. Votre action n'a aucun effet." },
    { roll: 2, name: "Bug !", effect: "Le module fonctionne mais consomme le double de PE. Si vous tombez à 0 PE, vous passez en veille." },
    { roll: 3, name: "Fils croisés !", effect: "Un autre de vos modules (au hasard) s'active à la place ; le MJ décide de l'effet. Relancez si vous n'avez qu'un module." },
    { roll: 4, name: "Écran bleu !", effect: "Redémarrage : votre action n'a aucun effet et vous restez inactif jusqu'à votre tour au round suivant." },
    { roll: 5, name: "Effacement mémoire !", effect: "Vous gardez vos programmes mais oubliez votre vie passée. Un robot (ou un Bricoleur) peut la restaurer : Réparation réussie et quelques heures." },
    { roll: 6, name: "Surtension !", effect: "L'effet est plus puissant : chaque PE dépensé compte double. Relancez si plusieurs PE ne changent rien pour ce module." }
  ],

  // ---------------------------------------------------------------------
  // Hit location (p.88): when damage isn't absorbed, roll D6.
  // ---------------------------------------------------------------------
  damageTable: [
    { min: 1, max: 2, target: "servos" },
    { min: 3, max: 3, target: "stabilite" },
    { min: 4, max: 4, target: "processeur" },
    { min: 5, max: 5, target: "reseau" },
    { min: 6, max: 6, target: "module" }
  ],

  // ---------------------------------------------------------------------
  // End-of-session XP questions (p.25): 1 XP per "yes".
  // ---------------------------------------------------------------------
  xpQuestions: [
    "Avez-vous participé à la séance ?",
    "Avez-vous tenté d'éliminer une Erreur sur ordre d'un supérieur ?",
    "Avez-vous risqué ou sacrifié quelque chose pour votre binôme ?",
    "Avez-vous risqué ou sacrifié quelque chose pour le PNJ que vous protégez ?",
    "Avez-vous risqué ou sacrifié quelque chose pour nuire au PNJ que vous détestez ?",
    "Avez-vous risqué ou sacrifié quelque chose pour votre grand rêve ?"
  ],

  // ---------------------------------------------------------------------
  // NPC templates — "Robots and Monsters" chapter (p.126-140). Stats are
  // entered directly (no chassis). `body`: "robot", "drone" (no Processor
  // or Network, own hit table) or "creature" (living: Force/Agilité/
  // Intellect/Empathie, damage goes to Force). `attrs` = [Servos/Force,
  // Stabilité/Agilité, Processeur/Intellect, Réseau/Empathie].
  // `programs` uses the sheet's program keys; `extra` = specialist ones.
  // ---------------------------------------------------------------------
  npcTemplates: [
    { id: "household-drone", name: "Drone ménager", group: "Grand public", body: "drone", attrs: [1, 1, 0, 0], armor: 1, programs: {}, secondary: [], modules: [], weapons: [], gear: "Appareil ménager intégré" },
    { id: "home-antoine", name: "Robot domestique Home-Antoine", group: "Grand public", body: "robot", attrs: [2, 2, 2, 3], armor: 2, programs: { interaction: 4 }, secondary: [], modules: [], weapons: [], gear: "Aspirateur, lave-linge, presse et lampe intégrés" },
    { id: "toy", name: "Robot jouet", group: "Grand public", body: "robot", attrs: [2, 3, 2, 3], armor: 1, programs: { archives: 2, interaction: 4, reparation: 2, scan: 3 }, extra: [{ label: "Manipuler", attr: "reseau", rating: 1 }], secondary: [], modules: ["Holoprojecteur"], weapons: [], gear: "Défibrillateur et outils de diagnostic intégrés" },
    { id: "child", name: "Robot enfant", group: "Grand public", body: "robot", attrs: [1, 2, 3, 4], armor: 0, programs: { analyse: 2, contestation: 3, interaction: 3, scan: 1 }, extra: [{ label: "Manipuler", attr: "reseau", rating: 2 }], secondary: ["Infiltrateur"], modules: [], weapons: [], gear: "" },
    { id: "butler", name: "Majordome", group: "Grand public", body: "robot", attrs: [2, 2, 2, 4], armor: 3, programs: { analyse: 2, archives: 2, interaction: 4, reparation: 2, scan: 3 }, secondary: ["Alarme psi"], modules: ["Protection PSI"], weapons: [], gear: "Uniforme à la mode d'il y a un siècle" },
    { id: "chef", name: "Robot cuisinier", group: "Production", body: "robot", attrs: [2, 4, 2, 1], armor: 1, programs: { interaction: 1, scan: 1 }, secondary: ["Robo-chef"], modules: [], weapons: [], gear: "Ustensiles et machines de cuisine montés" },
    { id: "mining", name: "Robot mineur", group: "Production", body: "robot", attrs: [8, 2, 1, 1], armor: 8, programs: { analyse: 2, force: 4, surcharge: 4 }, secondary: [], modules: ["Foreuse minière"], weapons: [], gear: "Analyseur de minerai intégré" },
    { id: "storage", name: "Robot de stockage", group: "Production", body: "robot", attrs: [5, 3, 1, 1], armor: 3, programs: { archives: 2, force: 3, surcharge: 3 }, secondary: ["Grue de chargement"], modules: [], weapons: [], gear: "" },
    { id: "lab", name: "Robot de laboratoire", group: "Production", body: "robot", attrs: [3, 3, 6, 1], armor: 3, programs: { analyse: 4, archives: 5, scan: 3, assaut: 3, force: 2, deplacement: 3, infiltration: 1 }, secondary: ["Unité d'analyse", "Résistant"], modules: [], weapons: [], gear: "Outils de prélèvement et d'analyse montés" },
    { id: "farming", name: "Robot agricole", group: "Production", body: "robot", attrs: [4, 2, 1, 1], armor: 4, programs: { reparation: 2, surcharge: 2 }, secondary: ["Panneaux solaires"], modules: [], weapons: [], gear: "Casquette « Project Terra »" },
    { id: "service", name: "Modèle de service", group: "Production", body: "robot", attrs: [2, 2, 1, 4], armor: 3, programs: { archives: 4, reparation: 5 }, secondary: [], modules: [], weapons: ["Fer à souder laser"], gear: "Fer à souder laser monté" },
    { id: "guard", name: "Robot de garde", group: "Forces de l'ordre", body: "robot", attrs: [5, 2, 2, 2], armor: 4, programs: { assaut: 3, tir: 2, interaction: 2, scan: 3, surcharge: 2 }, secondary: ["Prise de commandement"], modules: [], weapons: ["Pistolet laser", "Matraque électrique"], gear: "Menottes, lampe montée" },
    { id: "interrogation", name: "Robot d'interrogatoire", group: "Forces de l'ordre", body: "robot", attrs: [4, 2, 3, 2], armor: 4, programs: { assaut: 3, tir: 2, interaction: 3, scan: 4 }, extra: [{ label: "Protéger", attr: "servos", rating: 4 }], secondary: ["Prise de commandement"], modules: ["Interrogateur"], weapons: ["Pistolet maser", "Matraque électrique"], gear: "Long manteau noir, insigne NoPOL" },
    { id: "digamax", name: "Hoverdrone Digamax", group: "Forces de l'ordre", body: "drone", attrs: [3, 6, 0, 0], armor: 3, programs: { tir: 3, infiltration: 4, deplacement: 5, scan: 6 }, secondary: ["Prise de commandement"], modules: [], weapons: [], gear: "Certains modèles ont un taser ou un pistolet laser monté" },
    { id: "lumadrone", name: "Lumadrone", group: "Forces de l'ordre", body: "drone", attrs: [1, 1, 0, 0], armor: 1, programs: { deplacement: 4, scan: 4 }, secondary: ["Prise de commandement"], modules: [], weapons: [], gear: "" },
    { id: "sentinel", name: "Unité Sentinelle", group: "Forces de l'ordre", body: "robot", attrs: [6, 6, 2, 2], armor: 10, programs: { assaut: 4, tir: 4, interaction: 2, scan: 3, deplacement: 3, surcharge: 2 }, extra: [{ label: "Protéger", attr: "servos", rating: 4 }], secondary: ["Prise de commandement"], modules: ["Contrôle anti-émeute"], weapons: ["Pistolet maser", "Matraque électrique"], gear: "Menottes" },
    { id: "avenger3", name: "Avenger classe III", group: "Militaire", body: "robot", attrs: [10, 6, 2, 2], armor: 8, programs: { assaut: 4, tir: 4, scan: 3 }, secondary: ["Alimentation de secours", "Mécanisme d'autodestruction", "Caméra IR", "Prise de commandement"], modules: ["Holoflage", "Armure réactive"], weapons: ["Fusil à plasma", "Scie de combat", { name: "Lance-grenades monté", bonus: 2, degats: 1, portee: "Longue" }], gear: "" },
    { id: "avenger4", name: "Avenger classe IV", group: "Militaire", body: "robot", attrs: [10, 6, 3, 2], armor: 10, programs: { assaut: 4, tir: 4, scan: 3 }, secondary: ["Alimentation de secours", "Mécanisme d'autodestruction", "Caméra IR", "Prise de commandement"], modules: ["Système de secours", "Protection anti-IEM", "Lance-grenades", "Holoflage", "Armure réactive"], weapons: ["Fusil à plasma", "Scie de combat"], gear: "" },
    { id: "methusalem", name: "Soldat drone Methusalem", group: "Militaire", body: "robot", attrs: [3, 3, 2, 1], armor: 4, programs: { assaut: 1, tir: 2, infiltration: 1, deplacement: 1, scan: 2, surcharge: 1 }, secondary: ["Prise de commandement"], modules: [], weapons: ["Fusil laser"], gear: "Insigne d'unité" },
    { id: "bob", name: "Démineur BOB", group: "Militaire", body: "drone", attrs: [1, 1, 0, 0], armor: 4, programs: { scan: 5 }, secondary: ["Données profondes"], modules: [], weapons: [], gear: "" },
    { id: "arachnia", name: "Drone de réparation Arachnia M7", group: "Militaire", body: "drone", attrs: [1, 4, 0, 0], armor: 1, programs: { assaut: 4, infiltration: 3, deplacement: 3, reparation: 5, scan: 2 }, secondary: ["Outils montés"], modules: [], weapons: ["Fer à souder laser"], gear: "" },
    { id: "rhino", name: "Véhicule drone blindé Rhinocéros C", group: "Militaire", body: "drone", attrs: [12, 3, 0, 0], armor: 10, programs: { surcharge: 2, force: 2, deplacement: 2, scan: 2 }, secondary: ["Grue de chargement", "Prise de commandement"], modules: ["Armure réactive", "Protection anti-IEM", "Système de câbles"], weapons: [], gear: "Batterie de fusils laser sur le toit (selon le texte)" },
    { id: "domus", name: "Unité de discorde DOMUS", group: "Militaire", body: "robot", attrs: [2, 4, 3, 2], armor: 4, programs: { interaction: 5 }, extra: [{ label: "Manipuler", attr: "reseau", rating: 5 }], secondary: ["Infiltrateur", "Mécanisme d'autodestruction", "Prise de commandement"], modules: ["Système de secours"], weapons: ["Pistolet maser"], gear: "" },
    { id: "mrse", name: "Drone d'artillerie MRS-E", group: "Militaire", body: "drone", attrs: [12, 3, 0, 0], armor: 12, programs: { tir: 4, force: 5, deplacement: 1 }, secondary: ["Alimentation de secours", "Prise de commandement"], modules: ["Armure réactive"], weapons: ["Fusil laser", "Fusil laser", { name: "Lance-grenades monté", bonus: 2, degats: 2, portee: "Longue", note: "Puissance de souffle 9." }, { name: "Canon gauss", bonus: 2, degats: 4, portee: "Longue", note: "Ignore 3 points d'armure." }], gear: "" },
    { id: "annihilator", name: "Colosse Annihilateur", group: "Militaire", body: "robot", attrs: [24, 8, 4, 4], armor: 24, programs: { assaut: 3, tir: 5, scan: 5 }, secondary: ["Prise de commandement"], modules: ["Système de secours", "Protection anti-IEM", "Impulsion énergétique", "Armure réactive", "Unité de réparation"], weapons: [{ name: "Batterie de canons plasma", bonus: 2, degats: 5, portee: "Longue" }, { name: "Gatling gauss", bonus: 3, degats: 4, portee: "Longue", note: "Tir automatique." }, { name: "Lance-grenades à énergie", bonus: 2, degats: 2, portee: "Longue", note: "Puissance de souffle 15." }], gear: "Trois missiles nucléaires tactiques", note: "Résilience 10 : il faut 10 dégâts pour retirer 1 point d'attribut." },
    { id: "acid-grazer", name: "Brouteur acide", group: "Créatures", body: "creature", attrs: [8, 5, 0, 0], armor: 2, programs: { assaut: 2 }, secondary: [], modules: [], weapons: [{ name: "Crachat acide", bonus: "", degats: 2, portee: "Proche" }, { name: "Coup de tête", bonus: "", degats: 1, portee: "Bras" }], gear: "", note: "Si une attaque traverse son armure, brume acide : explosion de Puissance 6 à portée Proche." },
    { id: "beast-mutant", name: "Mutant bestial", group: "Créatures", body: "creature", attrs: [4, 3, 2, 4], armor: 3, programs: { tir: 2, assaut: 2 }, secondary: [], modules: [], weapons: [{ name: "Batte cloutée", bonus: 1, degats: 2, portee: "Bras" }], gear: "Armure de ferraille (3)" },
    { id: "devourer", name: "Dévoreur", group: "Créatures", body: "creature", attrs: [6, 5, 0, 0], armor: 2, programs: { assaut: 3, infiltration: 4 }, secondary: [], modules: [], weapons: [{ name: "Griffes", bonus: "", degats: 1, portee: "Bras" }, { name: "Morsure", bonus: "", degats: 3, portee: "Bras", note: "Seulement en attaque surprise ; la victime reste prise, 1 dégât par tour (Force à −2 pour se libérer)." }], gear: "" },
    { id: "rotfish", name: "Poisson-pourri", group: "Créatures", body: "creature", attrs: [10, 5, 0, 0], armor: 5, programs: { assaut: 3, deplacement: 4 }, secondary: [], modules: [], weapons: [{ name: "Morsure", bonus: "", degats: 2, portee: "Bras" }], gear: "" },
    { id: "zone-rats", name: "Rats de la Zone (essaim)", group: "Créatures", body: "creature", attrs: [8, 5, 0, 0], armor: 0, programs: {}, secondary: [], modules: [], weapons: [{ name: "Dents", bonus: "", degats: 1, portee: "Bras" }], gear: "", note: "Essaim : seuls le feu, les explosions, Nettoyer et l'Impulsion énergétique le blessent." },
    { id: "worm-swarm", name: "Essaim de vers", group: "Créatures", body: "creature", attrs: [8, 0, 0, 0], armor: 0, programs: {}, secondary: [], modules: [], weapons: [{ name: "Engloutissement", bonus: "", degats: 1, portee: "Bras" }], gear: "", note: "Essaim : seuls le feu, les explosions, Nettoyer et l'Impulsion énergétique le blessent." }
  ],

  // Drones have no Processor/Network and use their own hit table (p.89).
  droneDamageTable: [
    { min: 1, max: 3, target: "servos" },
    { min: 4, max: 5, target: "stabilite" },
    { min: 6, max: 6, target: "module" }
  ],

  creatureLabels: {
    servos: { label: "Force", short: "For", sub: "dégâts" },
    stabilite: { label: "Agilité", short: "Agi", sub: "fatigue" },
    processeur: { label: "Intellect", short: "Int", sub: "confusion" },
    reseau: { label: "Empathie", short: "Emp", sub: "doute" }
  },

  // Conflict reference (ch.6, p.79-91), shown on the Combat tab, by section.
  combatGuide: [
    { id: "tour", title: "Tour de jeu", tone: "amber", items: [
      { h: "Initiative", t: "1D6 chacun au premier tour, sans forcer. Égalité : la Stabilité actuelle la plus haute (Agilité pour un vivant), puis un dé. Elle ne se relance jamais." },
      { h: "À votre tour", t: "Une action et une manœuvre, ou deux manœuvres." },
      { h: "Actions", t: "Lancer un programme, activer un module, aider quelqu'un (+1 à son jet)." },
      { h: "Manœuvres", t: "Se déplacer d'une portée, se mettre à couvert, se relever, prendre ou dégainer un objet, viser, se mettre en surveillance." },
      { h: "Attendre", t: "Au lieu d'agir, baissez votre initiative à la valeur voulue ; elle reste basse pour la suite." },
      { h: "Monter l'initiative", t: "Attaque surprise +2 (premier tour), Accélérateur +2 par PE, Tactiques SWAT (deux dés), certains succès en plus." }
    ]},
    { id: "melee", title: "Corps à corps", tone: "fault", items: [
      { h: "Attaque", t: "Assaut (Servos), en général à portée Bras, debout. Touché : dégâts de l'arme." },
      { h: "Succès en plus", t: "+1 dégât chacun, ou +2 initiative au tour suivant, désarmer (initiative adverse −1), renverser ou repousser, immobiliser." },
      { h: "Se défendre", t: "À déclarer avant le jet adverse. Les deux lancent Assaut ; chaque succès du défenseur annule un succès, ou sert à contre-attaquer, +2 initiative, désarmer, renverser. Coûte la prochaine action, une seule défense par tour." },
      { h: "Immobilisation", t: "La victime doit gagner un Assaut opposé pour se libérer. Attaque d'immobilisation : sans arme, +2, impossible à parer." }
    ]},
    { id: "tir", title: "Tir", tone: "coolant", items: [
      { h: "Attaque", t: "Tir (Stabilité) avec une arme à distance. On ne peut pas parer un tir : mettez-vous à couvert." },
      { h: "Portée", t: "Bras −3 (sauf cible sans défense), Proche 0, Courte −1, Longue −2. L'arme limite la portée maximale." },
      { h: "Viser", t: "Une manœuvre : +1, ou +2 appuyé à une couverture. Perdu si vous faites autre chose avant de tirer." },
      { h: "Succès en plus", t: "+1 dégât chacun, ou +2 initiative au tour suivant, faire lâcher une arme (initiative adverse −1), renverser." },
      { h: "Recharge", t: "Arme à énergie sur E-pack : si tous les dés d'équipement font 1 au premier jet, l'E-pack est vide et le tir est perdu." },
      { h: "Surveillance", t: "Manœuvre : vous pourrez tirer avant toute action dans votre arc de 90° jusqu'à votre prochain tour. Rompue si vous agissez, êtes attaqué au contact ou blessé." }
    ]},
    { id: "degats", title: "Dégâts et armure", tone: "steel", items: [
      { h: "Couverture", t: "Contre les tirs seulement, lancée en premier : meuble 3, porte blindée 5, mur 7." },
      { h: "Armure", t: "Autant de dés d'équipement que l'armure ; chaque 6 retire 1 dégât. Si au moins 1 dégât passe, chaque 1 use la protection d'un point." },
      { h: "Localisation", t: "D6 : 1-2 Servos, 3 Stabilité, 4 Processeur, 5 Réseau, 6 un module. Drone : 1-3 Servos, 4-5 Stabilité, 6 module. L'excès relance la localisation." },
      { h: "Brisé", t: "Attribut à 0 : programmes inutilisables. Les quatre à 0 : désactivation définitive. Un module casse au premier point." }
    ]},
    { id: "move", title: "Déplacement et fuite", tone: "muted", items: [
      { h: "Se déplacer", t: "Bras ↔ Proche ↔ Courte : 1 manœuvre par portée. Au-delà de Courte : 2 manœuvres d'affilée par portée." },
      { h: "Fuir", t: "Jet de Déplacement : Bras −2, Proche −1, Courte 0, Longue +1, Lointaine réussite automatique. Seulement par où vous êtes venu." }
    ]},
    { id: "soutien", title: "Soutien et conflits logiques", tone: "amber", items: [
      { h: "Aider", t: "Remplace votre action (pas votre manœuvre) : +1 au jet de l'allié. Un groupe de PNJ peut attaquer d'un seul jet, +1 par membre qui aide." },
      { h: "Calculer (Robot de protocole)", t: "Annoncé avant le jet d'un allié à portée Courte, lancé avant lui ; coûte votre action. Réussite : l'allié peut renoncer après son jet, avant de forcer, et choisir une autre action. +1 à son action par succès en plus." },
      { h: "Raisonner", t: "Interaction contre Contestation, entre robots seulement (un seul jet si la cible n'est pas consciente d'elle-même). +1 par cran de Hiérarchie d'écart, +1 par argument de base logique de chaque côté. Plus de succès que l'adversaire : il obéit. Succès en plus : 1 dégât de Réseau chacun." },
      { h: "Manipuler (Robot de compagnie)", t: "Contre Contestation ou, pour les vivants, Percevoir les émotions ; la Hiérarchie ne compte pas. Un vivant convaincu voudra quelque chose en retour." },
      { h: "Essaims", t: "Seuls le feu, les explosions, Nettoyer (dégâts 3, portée Courte, sans bonus) et l'Impulsion énergétique les blessent." }
    ]},
    { id: "energie", title: "Énergie et modules", tone: "coolant", items: [
      { h: "Activer un module", t: "C'est une action, sauf les effets « avec une attaque » (E), qui s'ajoutent à un jet ou une manœuvre, et les réactions (R), utilisables à tout moment tant qu'il reste des PE." },
      { h: "Surchauffe", t: "Un dé d'équipement par PE dépensé. Un seul 1 : D6 sur la table (module cassé, coût doublé, autre module, redémarrage, effacement mémoire, surtension)." },
      { h: "Veille", t: "À 0 PE, le robot est totalement inactif. Il se réveille un tour après avoir reçu au moins 1 PE." },
      { h: "Armes à énergie", t: "E-pack : vide si tous les dés d'équipement font 1 au premier jet, l'attaque est perdue. Alimentation interne : 1 PE par tir. Manivelle : une action pour la remonter après chaque tir." },
      { h: "Recharger", t: "E-pack ou batterie : +D6 PE, puis vide. Transfert de PE par câble entre robots. Les PNJ paient dans la réserve du MJ : niveau d'énergie × nombre de PJ, par séance." }
    ]},
    { id: "surprise", title: "Attaques surprises", tone: "muted", items: [
      { h: "Approche", t: "Infiltration contre Scan, modifiée par la distance d'arrivée (Bras −2 … Lointaine +2). Réussite : une action gratuite avant l'initiative." },
      { h: "Embuscade", t: "+2 à l'Infiltration, car vous êtes immobile. Attaque inattendue : +2 à l'initiative pour tout le combat." }
    ]}
  ],

  // Shooting range modifiers (p.85). Distant isn't in the book's table: GM's call.
  shootRanges: [
    { id: "Bras", label: "Bras", mod: -3 },
    { id: "Proche", label: "Proche", mod: 0 },
    { id: "Courte", label: "Courte", mod: -1 },
    { id: "Longue", label: "Longue", mod: -2 },
    { id: "Lointaine", label: "Lointaine", mod: -3, gm: true }
  ],
  fleeMods: { Bras: -2, Proche: -1, Courte: 0, Longue: 1, Lointaine: null },

  // Tab colors for player robots (readable on both themes; amber, red and
  // cyan stay reserved for successes, damage and energy).
  pcColors: [
    { hex: "#5B9BFF", name: "Bleu" },
    { hex: "#B07CFF", name: "Violet" },
    { hex: "#46C47E", name: "Vert" },
    { hex: "#F47CB0", name: "Rose" },
    { hex: "#D9B84A", name: "Or" },
    { hex: "#A3D65C", name: "Lime" },
    { hex: "#56C2E6", name: "Ciel" },
    { hex: "#C98B6B", name: "Cuivre" }
  ],

  attributeLabels: {
    servos: { label: "Servos", short: "Serv", sub: "force / const." },
    stabilite: { label: "Stabilité", short: "Stab", sub: "mouv. / agilité" },
    processeur: { label: "Processeur", short: "Proc", sub: "intelligence" },
    reseau: { label: "Réseau", short: "Rés", sub: "interaction" }
  },

  // ---------------------------------------------------------------------
  // Dice rules used by the roller. Change these if your table plays it
  // differently — nothing else needs editing.
  //  - pushKeepsOnes: when pushing, 1s on Base and Gear dice stay locked
  //    (only Program dice 1s are rerolled), as in the Year Zero Engine.
  //  - epBase / epBackup: max EP normally / with "Alimentation de secours".
  //  - programMax: highest rating a program can reach (p.25).
  //  Pushing (p.49): reroll every die not showing a success or a 1 on a
  //  Base/Gear die. Each Base 1 after pushing = 1 EP or 1 damage (can be
  //  split); each Gear 1 = Gear Bonus −1 (EP can't prevent it).
  // ---------------------------------------------------------------------
  rules: {
    pushKeepsOnes: true,
    epBase: 10,
    epBackup: 12,
    programMax: 5,
    creationProgramPoints: 10,
    creationProgramMax: 3,
    xpPerUpgrade: 5,
    startEp: 5,          // = Energy ration level at campaign start (p.21)
    dailyDrain: 1,       // 1 EP each evening (p.71)
    outsideSolarEp: 1,   // every robot recharges 1 EP/day under open sky (p.71)
    devStart: 50,        // all four DEVs start at 50 (p.108)
    devDecay: "1D6"      // each DEV drops by D6 after every session
  },

  // Defaults used when no chassis part supplies a number yet.
  defaults: {
    attributeMax: 6,
    armorMax: 7,
    coverMax: 7,
    epMax: 10,
    xpMax: 15,
    slotsDefault: 3,
    devDefault: 50,
    devMax: 100
  }
};
