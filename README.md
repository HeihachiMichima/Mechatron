# Compagnon Mechatron

Compagnon de jeu *mobile d'abord* pour **Mutant : Année Zéro, Mechatron** : la fiche de chaque
robot, l'énergie, le marché noir, le combat guidé et sa carte tactique facultative.

Outil de fan, non officiel, sans lien avec Free League Publishing.

## Utiliser sans rien installer

Ouvrez le site : **https://heihachimichima.github.io/Mechatron/** (mis à jour automatiquement à
chaque modification de la branche `main`). Pour l'utiliser hors ligne, enregistrez la page, ou
construisez-la (`npm run build`) et ouvrez **`dist/index.html`** d'un double-clic : c'est un seul
fichier autonome (scripts, styles, polices et logo inclus).

**Sur l'écran d'accueil.** Depuis le site, le menu du navigateur propose *Ajouter à l'écran
d'accueil* (Safari sur iPhone et iPad : bouton Partager) : le compagnon s'ouvre alors comme une
appli, en plein écran, avec son icône. Sur iPhone et iPad, c'est aussi ce qui évite que Safari
efface les données après quelques jours sans visite. Attention : sur iPhone et iPad, l'appli de
l'écran d'accueil a ses propres données, séparées de Safari ; une campagne commencée dans Safari
s'y transfère par *Exporter la campagne* puis *Importer*. L'icône a besoin du réseau pour s'ouvrir :
hors ligne, utilisez le fichier enregistré. Gardez l'habitude d'*Exporter la campagne* en fin de
séance.

Le logo (`src/assets/logo.png`, versionné dans le dépôt) est intégré au fichier : il s'affiche dans la barre du haut et en tête de la fiche imprimée. Pour le changer, remplacez ce fichier puis relancez `npm run build`.

## Premiers pas

**Premier lancement.** Un écran d'accueil propose *Nouvelle campagne* (donnez-lui un nom, l'équipe est vide : créez ensuite vos robots), *Importer une campagne* (un fichier `.mechatron.json`, ou un robot `.json` qui ouvre une nouvelle campagne) ou *Essayer la démo* (quatre robots joueurs et trois PNJ). Une seule campagne à la fois : pour en changer, exportez-la, puis créez-en une autre ou importez-en une.

**Accueil.** Le logo, en haut à gauche, ramène à l'accueil depuis n'importe quel écran (aussi
*Accueil* dans le menu ☰) : *Reprendre la campagne*, ou en ouvrir une autre (nouvelle, importée,
démo), ce qui remplace la campagne en cours après l'avoir copiée dans les sauvegardes automatiques.
Pendant la démo, *Quitter la démo* (à l'accueil et dans la barre du haut, avant « MJ ») revient à un accueil vide ; la
démo reste dans les sauvegardes automatiques.

**Une table, un appareil.** Le compagnon est fait pour un appareil posé sur la table (tablette
partagée ou ordinateur du MJ). Pas de comptes ni de synchronisation : un joueur qui veut son robot
sur son téléphone ouvre le *lien de partage* de sa fiche, qui lui en donne une **copie**.

**Mode MJ.** L'interrupteur « MJ » de la barre du haut, à côté du menu ☰, propre à l'appareil (il n'est pas dans la campagne
ni dans les exports). Il affiche l'espace MJ et les outils du meneur ; il cache des outils, pas des
informations : le combat est le même dans les deux modes. Hors mode MJ, les PNJ n'apparaissent pas
dans l'Équipe. En combat, « Ouvrir la fiche » montre la fiche complète d'un PNJ sur place, quel que
soit le mode, avec « Retour au combat » pour revenir. Pas de code.

**Menu de la campagne** (icône ☰ en haut) : renommer la campagne, *Exporter la campagne*, *Importer* (une campagne remplace l'actuelle après confirmation, avec la proposition de l'exporter d'abord ; un robot s'ajoute à l'équipe), *Nouvelle campagne*, *Restaurer une sauvegarde automatique*, *Accueil*, le thème et, sur une fiche, *Exporter* ce robot.

## L'appli, espace par espace

**Organisation par espaces, dans l'ordre du jeu.** Une barre en bas, à portée de pouce (sur
ordinateur, une colonne à gauche) :

| Espace | Rôle |
|---|---|
| Équipe | Les fiches des robots joueurs : onglets de couleur, plaque d'état, puis *État · Programmes · Matériel · Identité*, et *Gérer* (la liste de l'équipe) |
| Énergie | L'horloge jour/nuit de Mechatron-7, l'énergie de l'équipe, le rationnement, les transferts de PE, les niveaux de développement |
| Marché | Le marché noir : ce qui est en vente aujourd'hui, acheter et vendre (fermé pendant la création ou si le MJ le ferme) |
| Combat | Préparation, initiative et tours guidés, avec une carte tactique facultative |
| Séance | *Terminer la séance* (PX de toute l'équipe, usure des niveaux, relations, résumé), PX à dépenser, historique, journal |
| MJ | En mode MJ seulement : les PNJ et leurs fiches, la création de l'équipe, le marché noir, les règles d'expérience, les cartes, les rencontres |

Les quatre parties d'une fiche :

| Onglet | Rôle |
|---|---|
| État | Ce qu'on touche en partie : dégâts d'attributs, énergie, armure, couverture, PX, jet libre |
| Programmes | Les 12 programmes groupés par attribut, le spécialiste, les personnalisés, les fonctions secondaires. Touchez un programme pour lancer les dés |
| Matériel | Modules (bouton Activer), armes (touchez pour attaquer), équipement |
| Identité | Nom, modèle, châssis avec les statistiques de chaque pièce, relations, notes |

Sur une fiche, une **plaque d'état** reste toujours visible : les 4 attributs, les PE et l'armure, en jauges.

**Onglets de couleur.** Sous la barre du haut, un onglet par robot joueur, chacun de sa couleur
(attribuée automatiquement, modifiable dans l'onglet Identité). Le liseré de la plaque d'état prend
la couleur du robot affiché. Un point rouge signale un robot endommagé ; un nom barré, un robot
désactivé. « + » crée un PJ, *Gérer* ouvre la liste de l'équipe. Sur ordinateur, les flèches gauche
et droite passent d'un onglet à l'autre.

## Pour les joueurs

**Création de l'équipe.** « Nouveau robot » (le « + » des onglets, *Gérer*, ou l'équipe vide) ouvre
un assistant qui suit l'ordre du livre, un écran par étape : modèle, nom (*Au hasard* propose un
surnom de robot, *Générer* un numéro de série), châssis (attributs, armure et emplacements calculés en direct), programmes
(10 points, 3 au plus par programme, le spécialiste au moins à 1 : « Suivant » reste bloqué tant que
la répartition n'est pas juste), fonction secondaire (une des trois du modèle), modules (autant que
d'emplacements), équipement de départ du modèle (avec ses choix) et énergie de départ au niveau de
rationnement, relations et grand rêve, puis un récapitulatif. Une pièce de châssis ou un module
déjà pris par un autre robot joueur n'est pas disponible, sauf les pièces de ferraille ; en mode
MJ, on peut passer outre et ouvrir n'importe quelle étape. Pendant la création (ou en mode MJ),
*Reprendre l'assistant* (onglet Identité) modifie un robot. Le MJ ouvre la partie avec
*L'équipe est prête* (espace MJ, qui signale les robots pas finis) : le marché noir ouvre, et
l'entrée va au journal. *Rouvrir la création* fait l'inverse.

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

**Outils de séance.** *Subir des dégâts* (onglet État) passe l'armure puis lance le D6 de localisation et retire les points.
*Recharger jusqu'à N* suit la règle de la borne (on remonte au niveau de rationnement, jamais
au-delà) ; hors ligne, le bouton devient *Soleil (+1)*. Le **journal de campagne** (espace Séance)
garde les notes de la table, les plus récentes en haut.

**Plusieurs robots.** Dans l'Équipe, *Gérer* (ou le nom en haut) ouvre la liste des robots
joueurs : ouvrir, dupliquer, supprimer, créer. Les PNJ du MJ ont leur liste dans l'espace MJ,
chacun avec sa fiche complète. *Nouveau PNJ* propose les 25 robots et 6 créatures du chapitre
« Robots et monstres » (garde, sentinelle, Avenger, Methusalem, Digamax, Dévoreur…), ou un robot,
drone ou créature vierge. Les PNJ ont leurs statistiques saisies directement (sans châssis) ; un drone
n'a ni Processeur ni Réseau et a sa propre table de localisation ; une créature utilise Force,
Agilité, Intellect et Empathie. Les niveaux du collectif sont enregistrés une seule fois, dans la campagne : ils valent pour tous les robots connectés.

**Jour et nuit (espace Énergie).** Un seul bouton fait avancer la journée : *Terminer la journée*
(chaque robot consomme 1 PE ; à 0, il passe en veille), *Recharger pour la nuit* (un robot connecté
remonte à sa borne jusqu'au rationnement, jamais au-delà ; dehors, le soleil donne 1 PE, et les
*Panneaux solaires* D6 par ciel dégagé), puis *Nouveau jour*. Chaque étape s'annule d'un coup et va
au journal, avec une ligne par robot ; le dernier rapport reste affiché. Les robots de rebut n'ont
pas de borne : ils sont exclus de la recharge sauf si le MJ décoche « Pas de borne ». Le tableau de
l'équipe montre les PE, l'état (OK, bas, en veille) et la connexion de chacun. *Donner des PE*
transfère par câble ou vers une banque d'énergie (5 PE au plus), et vide un E-pack ou une batterie
(+D6). En mode MJ, *Règles de l'énergie* change la consommation, le soleil et le rationnement, avec
la valeur du livre et *Réinitialiser*. Sur la fiche, ±1 et *Recharger jusqu'à N* restent ; c'est
l'horloge de l'espace Énergie qui fait passer les jours.

**Acheter et vendre (espace Marché).** Chaque jour de jeu, l'offre est tirée selon la rareté
(commun : toujours ; peu commun : 1 chance sur 2 ; rare : 1 sur 6 ; unique : seulement si le MJ le
met en vente). Choisissez l'acheteur (le robot de la fiche par défaut, avec ses PE). L'offre est
une liste compacte, rangée par catégorie repliable (modules, armes, pièces, équipement), du moins
cher au plus cher : une ligne par objet avec son prix et *Acheter*. Le bouton reste grisé, la raison
écrite sous le nom, s'il manque des PE, s'il n'y a plus d'emplacement libre pour un module ou si le
robot a déjà ce module. Touchez le nom pour le détail : effet, et pour une arme, les armes du même
type que le robot possède. Une pièce de châssis arrive dans l'équipement, à monter ensuite. Un
achat retire les PE, ajoute l'objet, baisse le stock et s'inscrit au journal ; « Annuler » défait
tout. *Vendre* (repliable, fermé au départ ; seuls les objets que le marché reprend y figurent) reprend un module, une arme ou un équipement à la moitié du prix (au moins 1 PE,
règle maison), sans dépasser le maximum de PE, et remet l'objet en stock. En mode MJ : *Nouveau
tirage*, *Tout le catalogue*, et pour chaque objet « Forcer en vente » ou « Retirer de la vente »
pour la journée ; les objets cachés n'apparaissent qu'au MJ.

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

**Carte tactique (facultative).** Le livre joue aux portées ; une carte en cases (1 case = 2 m,
règle maison) aide à les visualiser. Dès que la campagne a une carte, le panneau *Carte* de *Combat*
choisit celle du combat (ou aucune),
puis on place chaque combattant : touchez-le dans « À placer », puis une case (ou glissez un pion
déjà posé ; au clavier, les flèches le déplacent). *Placer sur les zones de départ* pose tout le
monde d'un geste. Le pion sélectionné (ou celui qui joue) montre au choix : les *portées* (Bras,
Proche, Courte), le *déplacement* possible en 1 ou 2 manœuvres (4 cases par manœuvre, règle maison)
et les *lignes de vue* vers les adversaires, avec la couverture suggérée (Meuble 3, Porte blindée 5,
Mur 7 : la table du livre). Ce ne sont que des suggestions : la table décide.

Pendant le tour, quand les deux robots sont sur la carte, le tour guidé s'en sert sans rien
imposer : la portée de la cible est présélectionnée (« Courte (7 cases) ») ; une cible cachée
affiche « Pas de ligne de vue » et le tir attend l'accord du MJ ; la puce de couverture que la
carte suggère est encadrée en pointillé (se mettre à couvert reste un choix, et la couverture ne
change jamais toute seule) ; la fuite part de la portée de l'ennemi le plus proche ; le
déplacement possible double avec un module de mouvement (Accélérateur, Jetpack) ; un obus se vise
en touchant une case, et les personnes prises dans l'explosion arrivent avec leur portée ; les
modules à portée (Proche, Courte, Bras) ne proposent que les cibles à portée, et *Protéger* ne
propose que les robots de sécurité à portée Proche. Quand un pion entre dans la vue d'un ennemi en
surveillance, l'application demande « Tir de surveillance ? » (l'arc de 90° reste à juger) et ne
tire jamais seule. Le journal du combat note « tir à Courte (7 cases), couverture Meuble 3 ».
Sans carte, rien ne change. Un doigt déplace la
carte, deux doigts (ou la molette) zooment, *Recentrer* revient à la vue entière. Sur téléphone, la
carte se replie ; sur grand écran, elle passe à gauche du tour de jeu.

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

**Reset.** Le bouton *Reset* (préparation du combat, bas de l'écran de combat) remet tous les
robots, PJ et PNJ, à neuf ; *Reset de l'équipe* (liste de l'équipe) et *Reset des PNJ* (espace MJ)
ne touchent que leur groupe. Parfait état : aucun dégât, armure et modules
réparés, pas de couverture, PE au maximum, armes à énergie rechargées, bonus d'équipement des
armes du livre rétabli. En combat, il efface aussi les états temporaires (immobilisé, à terre,
action perdue) mais garde l'initiative. Deuxième appui pour confirmer, et « Annuler » juste après.

**Fin de séance (espace Séance).** *Terminer la séance* fait une sauvegarde automatique, puis guide
toute l'équipe : 1) les PX, une case par réponse « oui » et par récompense, « participé » déjà
cochée, avec un ajustement du MJ ; 2) l'usure, 1D6 par niveau de développement (corrigeable) ;
3) les relations (PNJ protégé, détesté, grand rêve) ; 4) le résumé, avec les jours de jeu et les
affaires du marché noir depuis la séance précédente. Rien ne change avant le dernier bouton, qui
s'annule d'un coup ; le résumé va au journal et à l'historique des séances, puis *Exporter la
campagne*. **Dépenser des PX** (fiche, État, ou espace Séance) : un programme +1 (5 PX, niveau 5 au
plus) ou une nouvelle fonction secondaire, de n'importe quel modèle (5 PX, il faut aussi la
ferraille) ; chaque dépense va au journal. En mode MJ, *Règles de l'expérience* (espace MJ) :
questions (texte, PX, active, ordre, ajout, suppression), récompenses en plus (« Ordre de travail
accompli »…), coûts, et *Valeurs du livre*.

## Pour le MJ

Tout ce qui suit est dans l'espace **MJ**, visible quand l'interrupteur *MJ* de la barre du haut est activé. Il
regroupe la création de l'équipe (*L'équipe est prête*), les PNJ et leurs fiches, le marché noir,
les règles d'expérience, les cartes et les rencontres. Les valeurs que le livre ne donne pas sont
des *règles maison*, marquées d'un badge et modifiables pour la campagne.

**Marché noir : le catalogue.** Le catalogue contient tous les modules, armes, pièces de
châssis et équipements du compagnon. Les prix du livre (p.234 : module 5 PE, pièce de châssis 8 PE,
armes de 1 à 7 PE) sont marqués « livre p.234 » ; un prix changé par le MJ, ou un objet sans prix
dans le livre (l'équipement), porte le badge « règle maison ». Un objet sans prix ne se vend pas tant
que le MJ n'en a pas fixé un. Le catalogue est rangé comme la boutique, par catégories repliables :
une ligne par objet avec son prix ; touchez le nom pour sa rareté (commun, peu commun, rare, unique),
stock (vide = illimité), en vente ou non, caché ou non ; recherche et filtres ; *Ajouter un objet
perso* ; export et import du catalogue (JSON) ; *Tout réinitialiser*. *Règles du marché* (règles
maison) : revente à la moitié du prix, au moins 1 PE, et la chance de chaque rareté. L'interrupteur
*Ouvert/Fermé* ferme le marché aux joueurs ; *L'équipe est prête* l'ouvre.

**Cartes.** *MJ → Cartes* dessine les cartes (jusqu'à 32 × 24 cases) : sol, mur, porte fermée ou
ouverte, porte blindée (bouclier), meuble, terrain difficile, eau, zones de départ alliée et ennemie ;
pinceau ou rectangle, *Annuler*, taille, nom, dupliquer, supprimer. Les *Règles de la grille* (taille
d'une case, limites de Proche et de Courte, cases par manœuvre) se changent pour la campagne. Les
cartes sont enregistrées à part : *Annuler* (en bas de l'écran) ne défait pas un dessin, mais défait
le déplacement d'un pion. Elles partent avec *Exporter la campagne*.

**Rencontres.** *MJ → Rencontres* prépare des combats à lancer en un geste. Une
rencontre a un nom, des mots-clés, une carte (facultative), des PNJ tirés des modèles du livre
(nombre, adversaires ou alliés), la surprise (+2 à l'initiative pour l'équipe ou pour les
adversaires), la réserve du MJ (vide = ration × nombre de PJ) et des notes. *Lancer* remplace le
combat en cours (deuxième appui pour confirmer) : toute l'équipe, les PNJ (les copies d'un même
modèle partagent une initiative), la surprise, la réserve, la carte, chacun posé sur sa zone de
départ ; on arrive dans *Combat → Préparation*, *Initiative* est à un appui. Recherche, mots-clés,
dupliquer, supprimer, exporter et importer (les cartes utilisées partent avec). Quatre *mises en
place rapides* originales sont prêtes : *Couloir de service* (embuscade), *Quai* (caisses, eau),
*Salle du réacteur* (bassins, cœur brûlant) et *Entrepôt* (rayonnages) ; *Copier*
les met dans la bibliothèque. Comme les cartes, la bibliothèque s'enregistre à part (*Annuler* ne
la défait pas), mais lancer une rencontre s'annule.

## Sauvegarde, annulation et fichiers

**Sauvegarde.** Tout est enregistré dans le navigateur, quelques instants après chaque changement et dès qu'on quitte la page. Si le navigateur refuse (navigation privée, stockage plein), un message demande d'exporter la campagne. À la création de la première campagne, l'appli demande au navigateur de ne pas effacer ces données. Les sauvegardes des versions 2.x ne s'ouvrent plus.

**Sauvegardes automatiques.** Le navigateur garde les 3 dernières copies de la campagne, avec leur date et le nombre de robots : une à l'ouverture si la campagne a changé depuis la précédente, et une avant chaque remplacement (import, nouvelle campagne). Restaurer une copie s'annule comme le reste.

**Annuler.** Chaque action (dégât, PE, import, fiche vierge…) affiche un bandeau *Annuler* (40 retours en arrière au plus ; un texte tapé dans un champ compte pour un seul).

**Thèmes.** Sombre, clair ou automatique (menu de la campagne, ou en haut de l'écran d'accueil).

**Grand écran.** Sur ordinateur, les pages occupent toute la largeur de la fenêtre ; au-delà de
1500 px, les onglets passent à trois colonnes.

### Exports (menu ☰ → Exporter, sur une fiche)

- **Carte image PNG** : résumé visuel pour Discord ou le MJ (partage natif sur téléphone).
- **Lien de partage** : toute la fiche tient dans le lien. Celui qui l'ouvre peut l'importer.
- **Texte** : résumé à coller dans Discord ou un forum.
- **Ce robot (.json)** : télécharger, ou ajouter un robot depuis un fichier.
- **Toute la campagne (.mechatron.json)** : robots et PNJ, niveaux de développement, journal, marché, PX, cartes, rencontres, combat en cours, pour changer d'appareil ou garder une copie (aussi dans le menu de la campagne et à la fin de chaque séance).
- **Imprimer ou PDF** : mise en page A4 dédiée, claire, avec cases à cocher.

## Données du livre

**Données vérifiées dans le livre (octobre 2026).** Les 25 modules, l'équipement de départ des
8 modèles, l'attribut et l'effet de chaque programme spécialiste, les artefacts, la table de
surchauffe, la table de localisation des dégâts et les questions de fin de séance ont été repris
du livre de base Mechatron (numéros de page en commentaire dans `data.js`). Les tables déjà
présentes (châssis, hiérarchie, armes, couverture, fonctions secondaires, niveaux de
développement) ont été contrôlées et sont exactes. Seul écart trouvé dans le livre lui-même : le
pistolet paralysant est à dégât 2 / Bras dans la table des armes, mais dégât 1 / Courte sur sa
fiche d'artefact ; le compagnon garde la table et signale l'écart.

## Modifier les données de jeu

Les valeurs du livre sont dans **`src/lib/data.js`** (`export const GAME_DATA`, numéros de page en
commentaire) ; les règles de dés réglables sont dans `rules` à la fin du fichier (`pushKeepsOnes`,
max de PE, etc.). Les valeurs que le livre ne donne pas (prix de l'équipement, raretés, taille d'une
case…) sont dans **`src/lib/house.js`** : ce sont les *règles maison*, que le MJ peut aussi changer
dans l'appli pour sa campagne. Après modification, reconstruisez :

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
src/lib/data.js          données du livre
src/lib/house.js         règles maison (ce que le livre ne donne pas)
src/lib/rules.js         calculs de règles et dés
src/lib/clock.js, market.js, xp.js, encounters.js   énergie jour/nuit, marché noir, expérience, rencontres
src/lib/tactics/         carte en cases : terrain, ligne de vue, couverture, portées, suggestions en combat
src/lib/rng.js           tirage des dés (initialisable pour les tests)
src/lib/__tests__/       tests Vitest
e2e/                     test Playwright de l'appli construite
src/lib/store.svelte.js  état, sauvegarde auto, annulation
src/lib/exports.js       PNG, lien, texte, JSON
src/views/               les espaces (Équipe, Énergie, Marché, Combat, Séance, MJ) et les onglets de fiche
src/views/creation/      l'assistant de création (règles dans src/lib/creation.js)
src/sheets/              panneaux (dés, module, arme, sélecteur, exports)
src/components/          plaque d'état, navigation, jauges, carte tactique, fiche imprimable
pwa/                     manifeste et icônes pour l'écran d'accueil (copiés à côté de index.html)
```
