/**
 * MECHATRON — game data
 * =====================
 * Everything the character sheet's dropdowns offer (chassis parts, modules,
 * weapons, equipment, secondary functions, dev-level bonuses) comes from the
 * arrays below. Most numbers here are now copied straight from the English
 * rulebook (chapters "Your Robot", "Programs", "Secondary Functions",
 * "Modules", "Conflict & Damage" and "Mechatron-7"). A few fields are still
 * `null` — genuinely not documented anywhere I could find in the book, or
 * only relevant once you own the artifact chapter (equipment prices, etc.)
 * — the sheet works fine with them, it just won't auto-fill a number.
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

const GAME_DATA = {

  // ---------------------------------------------------------------------
  // The 8 robot models. `special` is the model's unique 13th program.
  // `secondary` lists the three (or fewer, where the book only prints two)
  // secondary functions you can pick from at creation — more can be
  // learned later regardless of model, from `secondaryFunctions` below.
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
      secondary: ["Prise de commandement", "Caméra IR", "Anatomie robotique"],
      secondaryEn: ["Command Override", "IR Camera", "Robot Anatomy"],
      hierarchy: 2,
      startingGear: "E-pack, lunette thermique, et au choix : pistolet laser ou vibro-couteau"
    },
    {
      id: "cleaning",
      name: "Robot de nettoyage",
      nameEn: "Cleaning Robot",
      special: "Nettoyer",
      specialEn: "Clean",
      secondary: ["Revêtement caoutchouté", "Souffleur de déchets", "Recycleur de déchets"],
      secondaryEn: ["Rubberized", "Trash Blower", "Waste Recycler"],
      hierarchy: 1,
      startingGear: "Élastique"
    },
    {
      id: "companion",
      name: "Robot de compagnie",
      nameEn: "Companion Robot",
      special: "Manipuler",
      specialEn: "Manipulate",
      secondary: ["Morphing d'apparence", "Traits humains", "Infiltrateur"],
      secondaryEn: ["Appearance Morph", "Human Features", "Infiltrator"],
      hierarchy: 1,
      startingGear: "Chewing-gum"
    },
    {
      id: "coordination",
      name: "Robot de coordination",
      nameEn: "Coordination Robot",
      special: "Coordonner",
      specialEn: "Coordinate",
      secondary: ["Commandant de bataille", "Tactiques SWAT", "Unité d'élite"],
      secondaryEn: ["Battle Commander", "SWAT Tactics", "Top-Tier Unit"],
      hierarchy: 5,
      startingGear: "Pistolet laser ou pistolet maser, E-pack"
    },
    {
      id: "industrial",
      name: "Robot industriel",
      nameEn: "Industrial Robot",
      special: "Fabriquer",
      specialEn: "Manufacture",
      secondary: ["Production de masse", "Outils montés", "Résistant"],
      secondaryEn: ["Mass Production", "Mounted Tools", "Resistant"],
      hierarchy: 2,
      startingGear: "Fer à souder laser, outil électrique, E-pack"
    },
    {
      id: "protocol",
      name: "Robot de protocole",
      nameEn: "Protocol Robot",
      special: "Calculer",
      specialEn: "Calculate",
      secondary: ["Support de coordination", "Interprète", "Archiviste hors pair"],
      secondaryEn: ["Coordination Support", "Interpreter", "Ultimate Clerk"],
      hierarchy: 3,
      startingGear: "E-pack"
    },
    {
      id: "scrap",
      name: "Robot de rebut",
      nameEn: "Scrap Robot",
      special: "Recycler",
      specialEn: "Recycle",
      secondary: ["Outil de coupe", "Module factice", "Compagnon de ferraille"],
      secondaryEn: ["Chopping Tool", "Dummy Module", "Scrap Companion"],
      hierarchy: 0,
      startingGear: "Aucun"
    },
    {
      id: "security",
      name: "Robot de sécurité",
      nameEn: "Security Robot",
      special: "Protéger",
      specialEn: "Protect",
      secondary: ["Clé de bras", "Prise de commandement", "Sirènes"],
      secondaryEn: ["Armlock", "Command Override", "Sirens"],
      hierarchy: 4,
      startingGear: "Matraque électrique ou pistolet paralysant, verrou de blocage"
    }
  ],

  // ---------------------------------------------------------------------
  // Chassis parts catalogue: Tête (head), Torse (torso), Support
  // (undercarriage) — full tables from p.18-19 of the book. Each part
  // contributes to the four attributes, to the number of module slots
  // (emplacements) and to the Protection (Armor Rating).
  // ---------------------------------------------------------------------
  chassis: {
    heads: [
      { name: "Odessa Vega 1.5", manufacturer: null, servos: 2, stabilite: 1, processeur: 1, reseau: 0, slots: 1, armor: 3, desc: "Une tête petite mais solide, conçue pour les environnements difficiles." },
      { name: "Lux Nanito+", manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 1, slots: 1, armor: 1, desc: "Une tête aux traits et à la peau humains, mais clairement artificielle." },
      { name: "Phoenix MK43 \"Rey\"", manufacturer: null, servos: 1, stabilite: 2, processeur: 2, reseau: 0, slots: 0, armor: 3, desc: "Une tête de qualité militaire au blindage épais." },
      { name: "Solun \"Emina\"", manufacturer: null, servos: 0, stabilite: 0, processeur: 2, reseau: 2, slots: 1, armor: 1, desc: "Une tête volumineuse offrant de la place pour des unités de calcul puissantes." },
      { name: "Kordura MOD 022", manufacturer: null, servos: 1, stabilite: 0, processeur: 1, reseau: 2, slots: 1, armor: 1, desc: "Une tête métallique aux traits humanoïdes." },
      { name: "Scrap Head", manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 0, slots: 2, armor: 2, desc: "Un crâne difforme, assemblé à partir de ferraille diverse." },
      { name: "Pashin Ama 9", manufacturer: null, servos: 1, stabilite: 2, processeur: 1, reseau: 0, slots: 1, armor: 1, desc: "Une tête plate et arrondie, presque entièrement intégrée au torse." },
      { name: "Mumla PX-01", manufacturer: null, servos: 2, stabilite: 0, processeur: 0, reseau: 2, slots: 1, armor: 2, desc: "Une tête vaguement humanoïde au blindage épais." }
    ],
    torsos: [
      { name: "Diderot & Diego MD34", manufacturer: null, servos: 2, stabilite: 0, processeur: 2, reseau: 1, slots: 1, armor: 1, desc: "Un torse massif couvert de tubes, de grilles d'aération et d'engrenages." },
      { name: "Fenzhou 33 \"Nekada\"", manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 2, slots: 1, armor: 2, desc: "Un torse aux traits et à la peau humains, mais clairement artificiel." },
      { name: "Ganymeda Nava PRS", manufacturer: null, servos: 2, stabilite: 2, processeur: 0, reseau: 1, slots: 1, armor: 3, desc: "Un torse filiforme et osseux, aux servomoteurs et pistons apparents." },
      { name: "Modessi RK \"Una\"", manufacturer: null, servos: 1, stabilite: 2, processeur: 2, reseau: 1, slots: 0, armor: 2, desc: "Un torse léger, en forme de tonneau, aux bras fins." },
      { name: "Özkun TN75", manufacturer: null, servos: 1, stabilite: 1, processeur: 1, reseau: 2, slots: 1, armor: 2, desc: "Un noyau vaguement humanoïde aux bras fins." },
      { name: "Scrap Torso", manufacturer: null, servos: 1, stabilite: 1, processeur: 1, reseau: 1, slots: 2, armor: 1, desc: "Un torse difforme, assemblé à partir de pièces détachées et de ferraille." },
      { name: "Kleenkorp PTU5", manufacturer: null, servos: 1, stabilite: 2, processeur: 1, reseau: 1, slots: 1, armor: 1, desc: "Un torse large et robuste, en forme de tonneau, aux bras courts." },
      { name: "Pylon \"Unorma\"", manufacturer: null, servos: 2, stabilite: 2, processeur: 1, reseau: 1, slots: 0, armor: 2, desc: "Un torse large aux épaulières surdimensionnées." }
    ],
    undercarriages: [
      { name: "LBM Dyno-Q", manufacturer: null, servos: 2, stabilite: 1, processeur: 0, reseau: 1, slots: 1, armor: 1, desc: "Une paire de larges chenilles permettant un déplacement lent mais régulier." },
      { name: "Prachi-Gong \"Sindra\"", manufacturer: null, servos: 1, stabilite: 1, processeur: 0, reseau: 2, slots: 1, armor: 1, desc: "Une paire de jambes et de pieds aux traits et à la peau humains, mais clairement artificiels." },
      { name: "Methusalem MOD 12", manufacturer: null, servos: 1, stabilite: 2, processeur: 1, reseau: 1, slots: 0, armor: 3, desc: "Une paire de jambes squelettiques se terminant par de lourdes bottes militaires." },
      { name: "Lagos MD-18", manufacturer: null, servos: 1, stabilite: 1, processeur: 2, reseau: 1, slots: 0, armor: 1, desc: "Un support compact équipé de réacteurs, permettant un déplacement en vol stationnaire." },
      { name: "Orion V \"Bolo\"", manufacturer: null, servos: 0, stabilite: 1, processeur: 2, reseau: 2, slots: 0, armor: 1, desc: "Une paire de jambes longues et fines." },
      { name: "Scrap Legs", manufacturer: null, servos: 1, stabilite: 0, processeur: 1, reseau: 1, slots: 2, armor: 1, desc: "Une paire de jambes de ferraille inégales, aux pieds massifs." },
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
  // All 25 effects checked against the book (ch.5, p.73-78), October 2026.
  // ---------------------------------------------------------------------
  modules: [
    { name: "Accélérateur", nameEn: "Accelerator", cost: "1+ PE", tag: "E", effect: "+2 à l'initiative par PE (à décider avant le jet) ; ou attaquer (Assaut ou Tir) la même cible une 2e fois dans le round, sans manœuvre en plus (1 PE) ; ou chaque manœuvre de déplacement compte double (1 PE)." },
    { name: "Système de secours", nameEn: "Back-Up System", cost: "1 PE", tag: "E", effect: "Lancer un programme avec l'attribut complet malgré les dégâts (1 PE) ; ou rétablir temporairement un attribut brisé à son score complet, 1 PE par round." },
    { name: "Tronçonneuse", nameEn: "Chainsaw", cost: "1+ PE", tag: "E", effect: "+1 dégât par PE après un Assaut à mains nues réussi ; ou scier une porte ou des débris (1 PE)." },
    { name: "Circuit de contrôle", nameEn: "Control Circuit", cost: "1+ PE", tag: "", effect: "Cible robot à vue et à portée Proche : décider de sa prochaine action (1 PE, elle lance ses dés normalement ; PE en plus pour lui faire utiliser un module). Si elle s'attaque elle-même : dégâts de l'arme + 1 par PE." },
    { name: "Virus perturbateur", nameEn: "Disruptor Virus", cost: "1+ PE", tag: "", effect: "Contact physique à portée Bras : 1 dégât par PE à un robot ; ou désactiver une fonction informatisée (module, alarme, défense…) pour 1 PE chacune ; ou effacer des données, 1 sujet par PE." },
    { name: "Protection anti-IEM", nameEn: "EMP Protection", cost: "1+ PE", tag: "R", effect: "Protection totale contre une attaque IEM (1 PE) ; contre les autres armes à énergie, chaque PE annule 1 dégât." },
    { name: "Gestion de l'énergie", nameEn: "Energy Management", cost: "1 PE / point", tag: "", effect: "Action : déplacer 1 point de dégât d'un attribut vers un autre par PE, sans dépasser le maximum de l'attribut renforcé (l'autre peut tomber à 0)." },
    { name: "Impulsion énergétique", nameEn: "Energy Pulse", cost: "1+ PE", tag: "", effect: "Rayon jusqu'à portée Courte : 1 dégât par PE ; ou impulsion large à portée Proche : autant de cibles que de PE, 1 dégât chacune." },
    { name: "Bras supplémentaires", nameEn: "Extra Arms", cost: "1 PE", tag: "E", effect: "Quatre bras : Assaut deux fois dans le round (manœuvre + 1 PE) ; se défendre contre plusieurs attaques au contact (1 PE par défense après la 1re) ; escalade difficile sans jet de Déplacement (1 PE)." },
    { name: "Lance-grenades", nameEn: "Grenade Launcher", cost: "1 PE", tag: "", effect: "Portée Longue. Obus explosif qui touche automatiquement : Puissance de souffle 9, dégât d'arme 1 (1 PE) ; ou fumigène pour quitter un conflit sans jet de Déplacement (1 PE)." },
    { name: "Holoflage", nameEn: "Holoflage", cost: "1+ PE", tag: "E", effect: "+2 au jet d'Infiltration par PE dépensé." },
    { name: "Holoprojecteur", nameEn: "Holo-Projector", cost: "1 PE", tag: "", effect: "Enregistrer une scène 3D (1 minute, portée Courte) et la rejouer (1 PE) ; ou créer un hologramme (1 min, quelques mètres) : un jet de Scan/Repérage est nécessaire pour le percer à portée Courte ou plus (1 PE)." },
    { name: "Drone volant", nameEn: "Hover Drone", cost: "1 PE / action", tag: "", effect: "Drone (Servos 1, Stabilité 3, Processeur 3, pas de Réseau), 1 PE par ordre ; agit à votre tour, une action + une manœuvre : Tir niv. 3 (laser léger, dégât 1, sans bonus, pas de jet forcé), Scan niv. 3 ou Infiltration niv. 3." },
    { name: "Hurleur", nameEn: "Howler", cost: "1+ PE", tag: "", effect: "Onde sonore sur un humain ou mutant à portée Proche : 1 fatigue par PE, l'armure ne protège pas ; ou hurlement (1 PE) : tout être vivant à portée Longue fait un jet d'Endurance, échec = 1 fatigue." },
    { name: "Interrogateur", nameEn: "Interrogator", cost: "1+ PE", tag: "", effect: "Sédater un être vivant à portée Bras : 1 fatigue par PE, l'armure ne protège pas ; ou faire parler un prisonnier sans défense : une réponse véridique par PE." },
    { name: "Jetpack", nameEn: "Jetpack", cost: "1 PE", tag: "", effect: "Voler 20 à 30 mètres puis atterrir (1 PE) ; ou voler jusqu'à un ennemi à portée Courte et l'attaquer en Assaut dans le même round, le vol remplace la manœuvre (1 PE)." },
    { name: "Unité médicale", nameEn: "Medical Unit", cost: "1 PE", tag: "", effect: "Humains et mutants (animaux compris) : sauver un blessé critique (1 PE) ; remettre debout un personnage brisé, +1 dans l'attribut tombé à 0 (1 PE) ; ou diviser par deux le temps de soin d'une blessure critique (1 PE, pas cumulable avec un jet de Soins)." },
    { name: "Foreuse minière", nameEn: "Mining Drill", cost: "1+ PE", tag: "", effect: "Traverser la matière solide : 1 manœuvre de déplacement souterrain par PE ; ou quitter un conflit en creusant, sans jet de Retraite (1 PE)." },
    { name: "Protection PSI", nameEn: "PSI Protection", cost: "1+ PE", tag: "", effect: "À portée Proche : savoir si une personne a des pouvoirs psioniques (1 PE) ; signal douloureux contre un psionique, 1 fatigue par PE ; ou amplifier la mutation psionique d'un allié, chaque PE compte comme 1 PM (E)." },
    { name: "Armure réactive", nameEn: "Reactive Armor", cost: "1+ PE", tag: "R", effect: "Touché par une attaque extérieure : chaque PE annule 1 dégât. Sans effet sur les dégâts que vous vous infligez en forçant un jet." },
    { name: "Unité de réparation", nameEn: "Repair Unit", cost: "1+ PE", tag: "E", effect: "Un micro-drone répare 1 dégât par PE, en un round, pendant que vous faites autre chose ; ou répare un module cassé (1 round, 2 PE)." },
    { name: "Contrôle anti-émeute", nameEn: "Riot Control", cost: "1+ PE", tag: "", effect: "Glu durcissante : une cible par PE à portée Proche, chacune doit réussir un jet de Force ou Surcharge à −1 pour se libérer (1 essai par round) ; ou gaz lacrymogène (1 PE) : tout être vivant à portée Courte fait un jet d'Endurance, échec = aucune action (manœuvres seulement) pendant D6 rounds." },
    { name: "Impulsion de détection", nameEn: "Sensor Pulse", cost: "1+ PE", tag: "E", effect: "+2 par PE à un jet de Scan pour trouver quelque chose de caché à portée Courte (objets, machines, êtres vivants) ; ou agir dans le noir complet sans malus pendant quelques minutes (1 PE)." },
    { name: "Tentacules", nameEn: "Tentacles", cost: "1+ PE", tag: "", effect: "Huit tentacules : saisir un objet à portée Proche (1 PE) ; immobiliser une cible après un Assaut réussi sans coût en plus (1 PE, E) ; ou attaque d'immobilisation sans jet d'Assaut, 1 dégât automatique par PE." },
    { name: "Système de câbles", nameEn: "Wire System", cost: "1 PE", tag: "", effect: "Câbles de 10 m à ancrage : soulever une charge, descendre en rappel (1 PE) ; grimper sans jet de Déplacement (1 PE) ; ou fuir un conflit sans jet de Déplacement en vous balançant au loin (1 PE)." }
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
    { name: "Mains nues", nameEn: "Unarmed", bonus: null, degats: 1, portee: "Bras", note: "" },
    { name: "Instrument contondant", nameEn: "Blunt Instrument", bonus: 1, degats: 1, portee: "Bras", note: "" },
    { name: "Couteau de ferraille", nameEn: "Scrap Knife", bonus: 1, degats: 2, portee: "Bras", note: "Arme légère." },
    { name: "Gourdin de ferraille", nameEn: "Scrap Club", bonus: 2, degats: 1, portee: "Bras", note: "" },
    { name: "Matraque électrique", nameEn: "Stun Baton", bonus: 2, degats: 1, portee: "Bras", note: "Ne blesse que la Stabilité. Arme à énergie." },
    { name: "Fer à souder laser", nameEn: "Laser Welder", bonus: 2, degats: 2, portee: "Bras", note: "Arme à énergie." },
    { name: "Vibro-couteau", nameEn: "Vibro Knife", bonus: 2, degats: 2, portee: "Bras", note: "Ignore l'armure. Arme à énergie." },
    { name: "Scie de combat", nameEn: "Battle Saw", bonus: 2, degats: 3, portee: "Bras", note: "Arme à énergie." },
    { name: "Ferraille lancée", nameEn: "Thrown Scrap", bonus: null, degats: 1, portee: "Courte", note: "" },
    { name: "Pistolet paralysant", nameEn: "Stun Gun", bonus: 2, degats: 2, portee: "Bras", note: "Arme légère. Ne blesse que la Stabilité. Arme à énergie." },
    { name: "Pistolet laser", nameEn: "Laser Pistol", bonus: 3, degats: 2, portee: "Longue", note: "Arme légère. Arme à énergie." },
    { name: "Fusil laser", nameEn: "Laser Rifle", bonus: 3, degats: 2, portee: "Lointaine", note: "Arme à énergie." },
    { name: "Pistolet maser", nameEn: "Maser Pistol", bonus: 2, degats: 3, portee: "Courte", note: "Arme légère. Arme à énergie." },
    { name: "Fusil à plasma", nameEn: "Plasma Rifle", bonus: 2, degats: 3, portee: "Longue", note: "Arme à énergie." }
  ],

  // ---------------------------------------------------------------------
  // Equipment / artifacts (the "Equipements" box). `integre` marks
  // whether it's normally built into the chassis vs. carried. The full
  // artifact price/rarity table lives in the book's "Mechatron-7" chapter
  // and wasn't fully catalogued here yet — names and known mechanics only.
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
  // "Effect of Being Online" table (Mechatron-7 chapter): each Development
  // Level (0-100) falls in a threshold band. Production/Défense/
  // Information give the matching programs above a flat bonus; Énergie
  // instead sets how many EP you may upload once per day. Bands are
  // checked from the top down (>=min).
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

  attributeLabels: {
    servos: { label: "Servos", sub: "force / const." },
    stabilite: { label: "Stabilité", sub: "mouv. / agilité" },
    processeur: { label: "Processeur", sub: "intelligence" },
    reseau: { label: "Réseau", sub: "interaction" }
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
