# NDAP SUKULU · SIF (SEC3266) · évaluations du cours

*Ndap sukulu* signifie « la salle de classe » en bassa. Ce dossier contient la **version étudiant** de NDAP SUKULU pour ce cours : les fiches de questions de chaque chapitre et les labs, minutés et en nombre de tentatives limité. Elle s'utilise **dans un navigateur**, en ligne ou sans Internet, et ne demande aucune installation.

> Ce dossier ne contient **aucun corrigé**. Les réponses de l'étudiant sont corrigées par l'enseignant, qui publie ensuite les résultats. Les identifiants, les résultats et les ajouts de l'enseignant sont chiffrés ou signés : on peut les publier sans risque.

---

## Pour l'étudiant

### 1. Ouvrir l'application

Trois façons, au choix :

| Situation | Que faire |
|---|---|
| **En ligne** (le plus simple) | Ouvrez `https://maletyon.github.io/cours-sif/ndap-sukulu/` dans Edge, Chrome ou Firefox. |
| **Sur un ordinateur, sans Internet** | Téléchargez [`NDAP_SUKULU_SIF_ordinateur.zip`](NDAP_SUKULU_SIF_ordinateur.zip), décompressez-le, puis double-cliquez sur `NDAP_SUKULU_SIF.html`. Double-cliquez une fois sur `Creer_raccourci_Bureau.cmd` pour avoir une icône sur le Bureau. |
| **Sur un téléphone** | Ouvrez `https://maletyon.github.io/cours-sif/ndap-sukulu/telephone/`, puis, dans le menu du navigateur, « Ajouter à l'écran d'accueil ». Les fiches fonctionnent ensuite sans réseau ; les labs ne sont proposés que sur ordinateur. |
| **Si l'adresse est bloquée** par le réseau (page « Web Page Blocked », « connexion réinitialisée ») | Certains pare-feu d'école ou d'entreprise bloquent les sites `github.io`. Utilisez l'adresse de secours `https://raw.githack.com/MaletYon/cours-sif/main/ndap-sukulu/` (téléphone : ajoutez `telephone/` à la fin), ou téléchargez l'archive depuis GitHub : `https://github.com/MaletYon/cours-sif/raw/main/ndap-sukulu/NDAP_SUKULU_SIF_ordinateur.zip`, puis travaillez hors ligne. |

### 2. Se connecter

Saisissez le **matricule** et le **mot de passe** remis par votre enseignant. La vérification se fait sur votre appareil, sans réseau. Le mot de passe est personnel : il sert aussi de clé à vos copies et à vos résultats. Après cinq essais infructueux, la connexion est suspendue quelques instants.

### 3. Passer une évaluation

- *Mes évaluations* liste les fiches (une par chapitre) et les labs, avec leur durée et le nombre de tentatives restantes.
- **La minuterie démarre au début d'une tentative et ne s'arrête jamais**, même si vous quittez l'application.
- **Enregistrer et terminer** : votre copie est remise et verrouillée (lecture seule).
- **Quitter sans enregistrer** : rien n'est remis ; vos réponses restent sur l'appareil et vous pouvez reprendre **tant que le délai court**. Passé ce délai, la tentative est close sans être remise. Elle compte comme une tentative.
- **Temps écoulé** pendant la session : la copie est remise automatiquement.
- Restez sur **le même ordinateur et le même navigateur** pendant toute la période : vos sessions y sont enregistrées (chiffrées).

### 4. Remettre son travail

*Mes remises*, bouton **Exporter mon fichier de synthèse** : un fichier `NDAP_SUKULU_SEC3266_<matricule>_<date>.json` est téléchargé. Remettez-le à votre enseignant (courriel, clé USB, plateforme de l'école). Il est chiffré pour lui seul et scellé avec votre clé : toute modification le rend invalide. Vous pouvez l'exporter autant de fois que vous voulez ; il contient toujours toutes vos sessions terminées.

### 5. Consulter ses résultats

Quand l'enseignant publie les résultats, ils apparaissent dans *Mes résultats* à votre connexion suivante (version en ligne, ou archive à jour). Vous pouvez aussi importer le fichier `resultats.js` qu'il vous transmet. Vous ne voyez que **vos** notes ; un fichier modifié ou non signé par l'enseignant est refusé.

---

## Pour l'enseignant

L'enseignant travaille dans l'**espace enseignant**, une application séparée qui **n'est jamais publiée** (elle contient le coffre : clés, liste de classe, mots de passe, corrigés). Elle se trouve dans l'outil de construction : `Prototypes\Ndap Sukulu\editions\SEC3266\enseignant\NDAP_SUKULU_SIF_enseignant.html`.

### Mise en service (une fois par période)

1. **Espace enseignant** : créer le coffre (phrase secrète d'au moins 12 caractères, à conserver : sans elle le coffre est irrécupérable), importer la liste de classe (CSV `matricule;nom;prenom`), vérifier la période (année académique, semestre).
2. **Version apprenant** : générer `identifiants.js`, imprimer la feuille de coupons et distribuer les identifiants.
3. **Contenus** (facultatif) : régler durées et tentatives, désactiver une évaluation, ajouter des questions ou des labs, puis « Publier les ajouts » pour obtenir `ajouts.js`.
4. **Publier** : déposer `identifiants.js` (et `ajouts.js`) dans `Prototypes\Ndap Sukulu\cours\SEC3266\`, puis lancer :
   ```
   py outils\construire.py SEC3266 --publier "<chemin du dépôt cours-sif>"
   ```
   Le dossier `ndap-sukulu/` du dépôt est régénéré (version ordinateur, version téléphone, archive téléchargeable, ce fichier). La publication **est refusée** si un corrigé ou un fichier de l'espace enseignant s'y trouvait.
5. **Mettre en ligne** : valider (`git add ndap-sukulu`, `git commit`) et pousser (`git push`). La première fois, activer GitHub Pages sur le dépôt : *Settings*, *Pages*, *Deploy from a branch*, branche `main`, dossier `/ (root)`. L'adresse est `https://maletyon.github.io/cours-sif/ndap-sukulu/`.

### Pendant la période

- **Remises** : importer les fichiers de synthèse reçus (plusieurs à la fois). Chaque fichier est vérifié (destinataire, signature de l'étudiant, intégrité) ; un réimport ne crée pas de doublon ; si une copie déjà reçue revient modifiée, la première remise fait foi et l'écart est signalé.
- **Synthèse** : classement, moyennes, graphiques, copies corrigées (avec « Compter juste » ou « Compter faux » pour corriger le jugement automatique), export CSV.
- **Publier les résultats** : générer `resultats.js` (une part chiffrée par étudiant, l'ensemble signé), le déposer dans `cours\SEC3266\` et republier comme à l'étape 4. Option : rang, détail juste ou faux par question, message à la classe.

### Mettre à jour sans l'outil de construction

`identifiants.js`, `ajouts.js` et `resultats.js` peuvent aussi être déposés **directement** dans ce dossier `ndap-sukulu/` du dépôt (interface web de GitHub : *Add file*, *Upload files*, en remplaçant l'ancien). La version téléphone les lit au même endroit : un seul dépôt suffit. À la publication suivante, l'outil de construction **reprend** ces fichiers s'ils sont plus récents que sa copie locale : rien n'est écrasé. L'archive `NDAP_SUKULU_SIF_ordinateur.zip`, elle, n'est régénérée que par l'outil de construction.

### Fin de période

*Classe*, *Fin de période* : **archiver** la classe (elle reste lisible, avec ses mots de passe, pour les remises tardives) et ouvrir la période suivante, ou **supprimer** la classe. Régénérer et republier ensuite `identifiants.js` pour désactiver les anciens comptes.

### Sécurité en bref

| Donnée | Où | Protection |
|---|---|---|
| Coffre (clés, classe, mots de passe, corrigés des ajouts) | navigateur de l'enseignant ; sauvegarde exportable | chiffré par la phrase secrète (PBKDF2, AES-GCM) |
| `identifiants.js` | public | ni nom, ni matricule, ni mot de passe en clair (empreintes PBKDF2, profils chiffrés) |
| Copies des étudiants | appareil de l'étudiant | chiffrées avec sa clé |
| Fichier de synthèse | remis à l'enseignant | chiffré pour l'enseignant (RSA-OAEP), scellé par l'étudiant (HMAC) |
| `resultats.js` | public | une part chiffrée par étudiant, signée par l'enseignant (ECDSA) |
| `ajouts.js` | public | sans corrigés, signé par l'enseignant |

Limites assumées d'un outil sans serveur : l'horloge de l'appareil et le stockage du navigateur restent entre les mains de l'étudiant. La note ne peut pas être falsifiée (l'étudiant n'a ni corrigé ni note), mais vider son navigateur remet ses compteurs de tentatives à zéro : l'enseignant le voit à l'import (numéros de tentative, horaires, alertes).

---

NDAP SUKULU by MaletYon · maletyon@proton.me
