# Compagnon Mechatron

Compagnon de jeu *mobile d'abord* pour **Mutant : Année Zéro, Mechatron** : la fiche de chaque
robot, l'énergie, le combat guidé, et bientôt le marché noir et la carte tactique.

Outil de fan, non officiel, sans lien avec Free League Publishing.

## Utiliser sans rien installer

Ouvrez le site : **https://heihachimichima.github.io/Mechatron/** (mis à jour automatiquement à
chaque modification de la branche `main`). Pour l'utiliser hors ligne, enregistrez la page, ou
construisez-la (`npm run build`) et ouvrez **`dist/index.html`** d'un double-clic : c'est un seul
fichier autonome (scripts, styles, polices et logo inclus).

Le logo (`src/assets/logo.png`, versionné dans le dépôt) est intégré au fichier : il s'affiche dans la barre du haut et en tête de la fiche imprimée. Pour le changer, remplacez ce fichier puis relancez `npm run build`.

## Ce qui change

**Organisation pour le téléphone.** Une barre d'onglets en bas, à portée de pouce :

| Onglet | Rôle |
|---|---|
| État | Ce qu'on touche en partie : dégâts d'attributs, énergie, armure, couverture, PX, jet libre |
| Programmes | Les 12 programmes groupés par attribut, le spécialiste, les personnalisés, les fonctions secondaires. Touchez un programme pour lancer les dés |
| Matériel | Modules (bouton Activer), armes (touchez pour attaquer), équipement |
| Robot | Identité, modèle, châssis avec les statistiques de chaque pièce, relations |
| Collectif | Niveaux de développement, connexion au collectif, notes |

En haut, une **plaque d'état** reste toujours visible : les 4 attributs, les PE et l'armure, en jauges.

**Calculs automatiques.** Les attributs, l'armure et les emplacements viennent du châssis. La
hiérarchie vient du modèle (+2 avec Unité d'élite). Le max de PE passe à 12 avec Alimentation de
secours, l'armure gagne +3 avec Blindage supplémentaire. Les dégâts se notent comme des dégâts
(case hachurée rouge), pas en effaçant la valeur.

**Lanceur de dés.** Réserve calculée (base jaune, programme vert, équipement noir), bonus du
collectif si connecté, arme choisie automatiquement pour Assaut et Tir. Après le jet :
succès, dégâts infligés par l'arme, bouton *Forcer le jet* (deux fois avec Surrégime), puis
répartition des 1 entre PE et dégâts, appliquée à la fiche en un geste.

**Modules.** *Activer* retire les PE choisis et lance les dés de surchauffe ; en cas de 1, le D6
d'incident est lancé et son résultat affiché (Erreur fatale, Bug, Fils croisés…).

**Données vérifiées dans le livre (octobre 2026).** Les 25 modules, l'équipement de départ des
8 modèles, l'attribut et l'effet de chaque programme spécialiste, les artefacts, la table de
surchauffe, la table de localisation des dégâts et les questions de fin de séance ont été repris
du livre de base Mechatron (numéros de page en commentaire dans `data.js`). Les tables déjà
présentes (châssis, hiérarchie, armes, couverture, fonctions secondaires, niveaux de
développement) ont été contrôlées et sont exactes. Seul écart trouvé dans le livre lui-même : le
pistolet paralysant est à dégât 2 / Bras dans la table des armes, mais dégât 1 / Courte sur sa
fiche d'artefact ; la fiche garde la table et signale l'écart.

**Outils de séance.** *Dégât localisé* lance le D6 de localisation et retire le point.
*Recharger jusqu'à N* suit la règle de la borne (on remonte au niveau de rationnement, jamais
au-delà) ; hors ligne, le bouton devient *Soleil (+1)*. *Fin de séance* coche les questions de PX ;
l'onglet Collectif retire 1D6 à chaque niveau de développement en un geste.

**Plusieurs robots.** Touchez le nom en haut pour ouvrir *Vos robots* : l'équipe (PJ) et les PNJ du
MJ, chacun avec sa fiche complète. *Nouveau PNJ* propose les 25 robots et 6 créatures du chapitre
« Robots et monstres » (garde, sentinelle, Avenger, Methusalem, Digamax, Dévoreur…), ou un robot,
drone ou créature vierge. Les PNJ ont leurs statistiques saisies directement (sans châssis) ; un drone
n'a ni Processeur ni Réseau et a sa propre table de localisation ; une créature utilise Force,
Agilité, Intellect et Empathie. Les niveaux du collectif sont partagés par tous les robots.

**Onglets de couleur.** Sous la barre du haut, un onglet par robot joueur, chacun de sa couleur
(attribuée automatiquement, modifiable dans l'onglet Robot). Le liseré de la plaque d'état prend
la couleur du robot affiché. Un point rouge signale un robot endommagé ; un nom barré, un robot
désactivé. « + » crée un PJ, « PNJ » ouvre la liste des PNJ. Sur ordinateur, les flèches gauche
et droite passent d'un onglet à l'autre.

**Combat.** Un guide pas à pas en trois étapes.

1. *Préparation* : chaque PJ apparaît en pastille ronde à sa couleur ; un appui l'ajoute au combat
   ou l'en retire. Les adversaires viennent des modèles du livre (en nombre), d'un *Nouveau robot*,
   *Nouveau drone* ou *Nouvelle créature*, ou de vos PNJ ; chacun se modifie (nom, stats,
   programmes de combat, armes, modules) sans ouvrir toute la fiche. *Dupliquer* (icône de copie,
   ou dans la fenêtre de modification) ajoute autant de copies identiques que voulu, sans dégâts,
   numérotées et regroupées : elles partagent un seul jet d'initiative.
2. *Initiative* : « Lancer pour tous », ou ligne par ligne (Lancer, saisie manuelle, ±).
   Tactiques SWAT garde le meilleur de deux dés, un groupe identique partage un jet, attaque
   surprise +2, égalités départagées par la Stabilité. L'ordre final s'affiche avant de commencer.
3. *Combat* : la piste d'initiative montre qui joue : le robot actif en premier, puis ceux qui
   doivent encore jouer ; ceux qui ont déjà joué glissent en fin de ligne, grisés, après un
   séparateur, et tout le monde reprend l'ordre d'initiative au tour suivant. En haut de son tour,
   le robot actif affiche ses caractéristiques : attributs, armure et couverture, PE, programmes
   de combat, armes et modules (les modules cassés sont barrés). Les mêmes caractéristiques
   s'affichent pour la cible dès qu'on la choisit (attaque, verrouillage, module, drone,
   conflit logique). Pour le robot actif, l'écran propose
   uniquement ce qui sert au combat : manœuvre (couverture, surveillance), puis action (corps à
   corps, tir, verrouiller une cible pour le Robot de combat, module de combat, attendre, fuir).
   Ensuite : choix de la cible et de l'arme, modificateurs (portée, visée, cible verrouillée),
   jet de l'attaquant puis éventuelle défense de la cible, prouesses par succès en plus, armure,
   localisation et dégâts appliqués, puis « Fin du tour » passe au suivant. Une action dont
   l'attribut est hors service (Servos pour l'assaut, Stabilité pour le tir) est grisée.

Les robots désactivés sont sautés. Un appui sur une pastille de la piste ouvre ses options
(dégâts manuels, initiative, couverture, état, ouvrir la fiche, retirer). Les PNJ paient leurs PE
dans la *réserve du MJ*. Journal du combat et aide-mémoire (tour, corps à corps, tir, dégâts,
énergie et modules, déplacement, surprise) inclus. *Terminer* peut supprimer les PNJ détruits.

**Modules en combat.** Chaque module intervient là où le livre le prévoit, et chaque activation
lance ses dés de surchauffe (un par PE ; Économiseur d'énergie : un dé de plus, un 6 retire 1 PE) :

- *Initiative* : Accélérateur, +2 par PE choisis avant le jet.
- *Avec une attaque* : Accélérateur (réattaquer la même cible, 1 PE) et Bras supplémentaires
  (2e Assaut, 1 PE et la manœuvre) proposés après le jet ; Système de secours (attribut complet,
  même brisé) ; Tronçonneuse (+1 dégât par PE à mains nues) ; Tentacules (immobiliser sans succès
  en plus). Bras supplémentaires permet aussi de se défendre plusieurs fois (1 PE par défense).
- *En action* : Impulsion énergétique (rayon ou impulsion multi-cibles), Virus perturbateur
  (dégâts ou désactiver un module), Circuit de contrôle, Lance-grenades (explosion souffle 9 par
  victime et par distance, ou fumigène pour fuir), Hurleur, Interrogateur et Protection PSI
  (fatigue des êtres vivants), Contrôle anti-émeute (glu : cibles immobilisées), Tentacules
  (attaque d'immobilisation), Gestion de l'énergie, Foreuse et Système de câbles (fuir sans jet).
- *Sans action* : Unité de réparation (dégâts ou module), Drone volant (tir niveau 3).
- *Réactions* : Armure réactive et Protection anti-IEM au moment des dégâts.
- *Fonctions secondaires* : Anatomie robotique (choisir le système touché), Revêtement caoutchouté
  (+2 d'armure au contact), Clé de bras (+2, immobilise), Blindage supplémentaire (−1 pour fuir).
  Le Robot de sécurité peut *Protéger* un allié touché (un dégât encaissé par succès, 1 fois par tour).

Une cible immobilisée (prise, glu, tentacules, clé de bras) est signalée sur la piste (⛓) ; elle ne
peut plus se défendre, et l'attaque d'immobilisation se fait sans arme à +2.

**Soutien, robots de l'équipe et conflits logiques.**

- *Aider* : à l'étape de la cible, chaque allié qui n'a pas encore agi peut aider (+1 chacun) ; il
  perd son action, pas sa manœuvre. C'est aussi ainsi qu'un groupe de PNJ attaque d'un seul jet.
- *Calculer* (Robot de protocole) : lancé avant l'attaque d'un allié, il coûte l'action du
  calculateur. En cas de réussite, l'allié peut *renoncer* après son jet (avant de forcer) et choisir
  une autre action ; chaque succès en plus donne +1 à l'attaque.
- *Nettoyer* (Robot de nettoyage) : contre un essaim, l'équipement de nettoyage sert d'arme
  (dégâts 3, portée Courte). Un essaim n'est blessé que par le feu, les explosions, Nettoyer et
  l'Impulsion énergétique : l'écran le rappelle. *Souffleur de déchets* : jet de Nettoyer, puis jet
  de Force de la cible ; un échec lui fait perdre sa prochaine action.
- *Recycler* (Robot de rebut) : trouver dans sa collection une arme (instrument contondant amélioré
  par les succès en plus : bonus, dégâts, portée, durable) ou un outil (bonus = succès). Une arme à
  usage unique est jetée à la fin du tour où elle a servi.
- *Raisonner* : Interaction contre Contestation entre robots, avec l'écart de Hiérarchie et les
  arguments de base logique (+1 chacun, de chaque côté), un seul jet si la cible n'est pas
  consciente d'elle-même. Succès en plus : dégâts de Réseau. Le Robot de compagnie peut aussi
  *Manipuler* (sans Hiérarchie), y compris les êtres vivants.

**Énergie en combat.** Le panneau *Énergie* montre les PE de chaque robot et l'état de ses armes à
énergie ; la piste affiche ⚡ et le nombre de PE. À 0 PE, un robot est *en veille* et passe son tour.
Une arme à énergie a une source, réglable dans l'onglet Matériel : *E-pack* (vide si tous les dés
d'équipement font 1 au premier jet ; recharge en manœuvre avec un E-pack de réserve),
*alimentation interne* (1 PE par tir) ou *manivelle* (une action pour la remonter après chaque
tir). En manœuvre, un E-pack ou une batterie de l'équipement recharge le robot de D6 PE ; en
action, un robot peut transférer des PE à un allié par câble.

**Grand écran.** Sur ordinateur, les pages occupent toute la largeur de la fenêtre ; au-delà de
1500 px, les onglets passent à trois colonnes.

**Tout remettre à neuf.** Un bouton (préparation du combat, bas de l'écran de combat, liste
des robots) remet tous les robots, PJ et PNJ, en parfait état : aucun dégât, armure et modules
réparés, pas de couverture, PE au maximum, armes à énergie rechargées, bonus d'équipement des
armes du livre rétabli. En combat, il efface aussi les états temporaires (immobilisé, à terre,
action perdue) mais garde l'initiative. Deuxième appui pour confirmer, et « Annuler » juste après.

**Annuler.** Chaque action (dégât, PE, import, fiche vierge…) affiche un bandeau *Annuler*.

**Thèmes.** Sombre, clair ou automatique (bouton en haut).

## Exports (bouton Exporter)

- **Carte image PNG** : résumé visuel pour Discord ou le MJ (partage natif sur téléphone).
- **Lien de partage** : toute la fiche tient dans le lien. Celui qui l'ouvre peut l'importer.
- **Texte** : résumé à coller dans Discord ou un forum.
- **Ce robot (.json)** : télécharger, ou ajouter un robot depuis un fichier (compatible ancienne fiche).
- **Toute la table (.json)** : tous les robots et le combat en cours, pour changer d'appareil.
- **Imprimer ou PDF** : mise en page A4 dédiée, claire, avec cases à cocher.

## Modifier les données de jeu

Tout est dans **`src/lib/data.js`**, avec la même forme qu'avant (seule différence : il
commence par `export const GAME_DATA`). Les règles de dés réglables sont dans `rules` à la fin
du fichier (`pushKeepsOnes`, max de PE, etc.). Après modification, reconstruisez :

```bash
npm install     # une seule fois
npm run dev     # aperçu en direct sur http://localhost:5173
npm run build   # régénère dist/index.html (non versionné : GitHub le construit et le publie)
npm test        # tests des règles et de la sauvegarde (Vitest)
npm run e2e     # après le build : ouvre l'appli dans Chromium, captures dans e2e/screenshots/
```

Pour `npm run e2e` sur un PC, installez le navigateur une fois : `npx playwright install chromium`.

## Structure

```
src/lib/data.js          données du livre (à compléter)
src/lib/rules.js         calculs de règles et dés
src/lib/rng.js           tirage des dés (initialisable pour les tests)
src/lib/__tests__/       tests Vitest
e2e/                     test Playwright de l'appli construite
src/lib/store.svelte.js  état, sauvegarde auto, annulation
src/lib/exports.js       PNG, lien, texte, JSON
src/views/               les onglets
src/sheets/              panneaux (dés, module, arme, sélecteur, exports)
src/components/          plaque d'état, navigation, jauges, fiche imprimable
```
