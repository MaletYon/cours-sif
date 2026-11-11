/* NDAP SUKULU autonome : mode d'emploi intégré à l'application.
   Ce fichier porte le moteur d'affichage (sommaire, recherche) et le mode d'emploi de l'apprenant.
   Le mode d'emploi de l'enseignant vit dans l'espace enseignant, jamais dans la version apprenant.
   Source : NDAP_SUKULU_Guide_apprenant.docx, partie « version en ligne ». */
(function () {
  "use strict";
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function ol(a) { return "<ol>" + a.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol>"; }
  function ul(a) { return "<ul>" + a.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>"; }
  function tab(entetes, lignes) {
    return '<div style="overflow-x:auto"><table class="tab"><thead><tr>' + entetes.map(function (e) { return "<th>" + e + "</th>"; }).join("") + "</tr></thead><tbody>" +
      lignes.map(function (l) { return "<tr>" + l.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
  }
  function note(titre, texte) { return '<div class="encadre"><strong>' + titre + "</strong><br>" + texte + "</div>"; }

  // ------------------------------------------------------------ mode d'emploi de l'apprenant
  // modes : "evaluation" (copies remises à l'enseignant) ou "revision" (correction immédiate)
  var BADGES = {
    id: "badges", titre: "Gagner et accepter un badge",
    html: "<p>Un badge récompense un chapitre réussi. Il existe quatre niveaux.</p>" +
      tab(["Niveau", "Score du chapitre", "Couleur"], [["Acquis", "60 à 69 %", "vermeil"], ["Validé", "70 à 84 %", "bronze"], ["Maîtrise", "85 à 94 %", "argent"], ["Excellence", "95 à 100 %", "or"]]) +
      ul(["Le score d'un chapitre est la moyenne de ses évaluations : la fiche du chapitre et, s'il en a, ses labs.",
          "Pour chaque évaluation, votre <strong>meilleur essai</strong> est retenu.",
          "Toutes les évaluations du chapitre doivent être faites. Sous 60 %, aucun badge."]) +
      "<p><strong>Accepter un badge</strong></p>" +
      ol(["Ouvrez le menu <strong>Mes badges</strong>. Un badge obtenu porte la mention « obtenu, à accepter ».",
          "Cliquez sur <strong>Accepter ce badge</strong>, vérifiez votre nom, puis confirmez.",
          "Le badge passe en couleur. Il apparaît aussi dans la barre de badges de la page d'accueil."]) +
      ul(["Un emplacement gris marque un chapitre dont le badge reste à obtenir. La raison est écrite dessous.",
          "Si vous améliorez votre score, un bouton propose d'accepter le niveau supérieur. Un badge accepté ne redescend jamais."]) +
      note("Badge signé", "Quand votre enseignant publie les résultats, il signe vos badges. Un QR code apparaît alors sous le badge accepté : il prouve son authenticité à qui le scanne. En mode révision, sans enseignant, le badge reste local et sans QR code.")
  };
  var ORGANISER = {
    id: "dossiers", titre: "Organiser vos fichiers",
    html: "<p>Créez une fois pour toutes un dossier au nom du cours à la racine de votre disque, avec deux sous-dossiers.</p>" +
      tab(["Dossier", "Ce que vous y rangez"], [
        ["<code>C:\\{SIGLE}\\Exports</code>", "Tout ce que vous exportez : {EXPORTS}"],
        ["<code>C:\\{SIGLE}\\Imports</code>", "Tout ce que votre enseignant vous envoie par courriel : {RECUS}"]]) +
      ol(["Ouvrez l'Explorateur de fichiers, puis le disque <code>C:</code>.", "Créez le dossier <code>{SIGLE}</code>, puis à l'intérieur les dossiers <code>Exports</code> et <code>Imports</code>.",
          "Après chaque export, le fichier arrive dans Téléchargements : déplacez-le aussitôt dans <code>Exports</code>.",
          "Enregistrez dans <code>Imports</code> chaque pièce jointe reçue de votre enseignant, puis importez-la depuis ce dossier."]) +
      ul(["Vous retrouvez ainsi tout de suite le bon fichier, et vous gardez la trace de ce que vous avez remis.", "Ne renommez pas les fichiers et ne les ouvrez pas pour les modifier : un fichier modifié est refusé.",
          "Sur un téléphone, créez un dossier du même nom dans Documents."]) +
      note("Pour ne plus déplacer les fichiers", "Dans les paramètres de votre navigateur, rubrique Téléchargements, activez « Toujours demander où enregistrer les fichiers ». Vous choisirez alors le dossier Exports à chaque export.")
  };
  var CHANGER = {
    id: "navigateur", titre: "Changer de navigateur ou d'appareil",
    html: "<p>Vos sessions, vos résultats, vos badges et vos attestations acceptés vivent dans un seul navigateur. Pour continuer ailleurs, emportez votre contexte de session.</p>" +
      ol(["Dans l'ancien navigateur, ouvrez <strong>Paramètres</strong>, puis cliquez sur <strong>Exporter mon contexte de session</strong>.", "Rangez le fichier <code>NDAP_SUKULU_&lt;CODE&gt;_&lt;matricule&gt;_contexte_&lt;date&gt;.json</code> dans votre dossier <code>Exports</code>.",
          "Dans le nouveau navigateur, ouvrez l'application et connectez-vous avec le même matricule et le même mot de passe.", "Ouvrez <strong>Paramètres</strong>, cliquez sur <strong>Importer un contexte</strong>, puis choisissez le fichier."]) +
      ul(["Le fichier est chiffré avec votre clé personnelle. Il ne s'ouvre qu'avec votre compte.", "L'import complète ce qui existe déjà. Il n'efface rien et ne rend aucune tentative.",
          "Ce fichier n'est pas une remise. Pour être corrigé, exportez toujours votre fichier de synthèse dans <strong>Mes remises</strong>.", "Exportez votre contexte après chaque séance de travail : c'est aussi votre sauvegarde."])
  };
  var PRATIQUES = {
    id: "pratiques", titre: "Les bonnes pratiques",
    html: ul(["Travaillez de préférence sur le même appareil et le même navigateur : vos sessions y sont enregistrées. Si vous devez en changer, emportez votre contexte de session ou votre progression.",
              "Rangez chaque export dans votre dossier Exports et chaque fichier reçu dans votre dossier Imports.",
              "Ne videz pas les données de navigation de ce navigateur avant d'avoir exporté votre travail.",
              "N'utilisez pas la navigation privée : tout est effacé à la fermeture.",
              "Laissez l'heure de votre appareil à l'heure exacte : la minuterie s'appuie sur elle."])
  };
  var EVALUATION = [
    { id: "ouvrir", titre: "Ouvrir l'application",
      html: "<p><strong>Sur un ordinateur connecté à Internet</strong></p>" +
        ol(["Ouvrez Edge, Chrome ou Firefox.", "Tapez l'adresse de votre cours, remise par votre enseignant, puis appuyez sur Entrée.", "Ajoutez la page à vos favoris (Ctrl+D)."]) +
        "<p><strong>Sur un ordinateur sans Internet</strong></p>" +
        ol(["Quand vous avez Internet, ouvrez la page GitHub de votre cours, puis le dossier <code>ndap-sukulu</code>.",
            "Téléchargez le fichier <code>NDAP_SUKULU_&lt;SIGLE&gt;_ordinateur.zip</code>.",
            "Faites un clic droit sur le fichier, puis Extraire tout, dans un dossier fixe, par exemple Documents.",
            "Double-cliquez sur <code>NDAP_SUKULU_&lt;SIGLE&gt;.html</code>. L'application s'ouvre sans Internet.",
            "Double-cliquez une fois sur <code>Creer_raccourci_Bureau.cmd</code> pour placer une icône sur votre Bureau."]) +
        note("Important", "Ne déplacez plus le dossier extrait et ouvrez toujours l'application avec le même navigateur : vos sessions sont enregistrées dans ce navigateur, pour ce dossier.") +
        "<p><strong>Sur un téléphone</strong></p>" +
        ol(["Ouvrez l'adresse de votre cours suivie de <code>telephone/</code>.", "Dans le menu du navigateur, choisissez Ajouter à l'écran d'accueil.", "Ouvrez ensuite NDAP SUKULU depuis l'icône. Les fiches fonctionnent même sans réseau."]) +
        "<p>Les labs ne sont proposés que sur ordinateur.</p>" +
        "<p><strong>Si l'adresse est bloquée par le réseau de l'école</strong></p><p>Utilisez l'adresse de secours <code>https://raw.githack.com/MaletYon/&lt;dépôt&gt;/main/ndap-sukulu/</code>, ou travaillez avec l'archive hors ligne.</p>" },
    { id: "connexion", titre: "Se connecter",
      html: ol(["Saisissez votre <strong>Matricule</strong>, tel qu'il figure sur le coupon remis par votre enseignant.",
                "Saisissez votre <strong>Mot de passe</strong> en respectant exactement les majuscules et les minuscules.",
                "Cliquez sur <strong>Se connecter</strong>."]) +
        ul(["La vérification se fait sur votre appareil : la connexion fonctionne même sans réseau.",
            "Après cinq erreurs, la connexion est suspendue quelques secondes, puis de plus en plus longtemps.",
            "Fermer l'onglet vous déconnecte. Vos sessions restent enregistrées."]) +
        note("Votre mot de passe est personnel", "Il sert aussi de clé à vos copies et à vos résultats. Ne le communiquez à personne. Si vous l'avez perdu, demandez-en un nouveau à votre enseignant.") },
    { id: "ecran", titre: "Découvrir l'écran",
      html: tab(["Menu", "Ce que vous y trouvez"], [
        ["Mes évaluations", "La liste des fiches (une par chapitre) et des labs, avec leur durée, vos tentatives et leur état"],
        ["Mes remises", "Vos sessions terminées et le bouton pour exporter votre fichier de synthèse"],
        ["Mon relevé de notes", "Toutes vos notes, tentative par tentative, et la note retenue, dès que la correction de l'enseignant est arrivée"],
        ["Mes badges", "Les badges de chapitre obtenus, à accepter ou restant à obtenir"],
        ["Mes attestations", "Les attestations de module obtenues, à accepter, à afficher et à imprimer"],
        ["Mode d'emploi", "Cette page"],
        ["Paramètres", "Votre compte, l'affichage clair ou sombre, la déconnexion"],
        ["Se déconnecter", "Ferme votre session sur cet appareil"]]) },
    { id: "fiche", titre: "Passer une fiche de questions",
      html: ol(["Dans <strong>Mes évaluations</strong>, repérez la fiche du chapitre et cliquez sur <strong>Commencer</strong>.",
                "Une fenêtre indique le numéro de la tentative et la durée. Cliquez sur OK pour démarrer. La minuterie commence à cet instant.",
                "Répondez : cochez une proposition pour un QCM, choisissez Vrai ou Faux, ou tapez le mot manquant.",
                "Surveillez le temps restant affiché en haut de la page.",
                "Cliquez sur <strong>Enregistrer et terminer</strong>. Votre copie est alors remise et verrouillée."]) +
        tab(["Situation", "Ce qui se passe"], [
          ["Vous cliquez sur Enregistrer et terminer", "La copie est remise et verrouillée : vous pouvez la relire, plus la modifier"],
          ["Vous cliquez sur Quitter sans enregistrer", "Rien n'est remis. Vous pouvez Reprendre tant que le délai court"],
          ["Le temps s'écoule pendant que vous travaillez", "La copie est remise automatiquement"],
          ["Le délai expire alors que vous aviez quitté", "La tentative est close sans être remise, et elle compte"]]) +
        note("La minuterie ne s'arrête jamais", "Une fois la tentative commencée, le temps court même si vous fermez l'application. Ne commencez une fiche que lorsque vous avez le temps de la finir.") +
        ul(["Une seule session peut être en cours à la fois.", "Le nombre de tentatives est limité. Quand il est atteint, la fiche indique « tentatives épuisées ».",
            "Les questions sont tirées au sort pour chaque tentative : deux étudiants n'ont pas la même fiche."]) },
    { id: "lab", titre: "Faire un lab (sur ordinateur)",
      html: ol(["Dans <strong>Mes évaluations</strong>, rubrique Labs, cliquez sur <strong>Commencer</strong> devant le lab choisi, puis confirmez.",
                "Lisez l'énoncé. La rubrique <strong>Pièces</strong> liste les fichiers à analyser : cliquez sur chacun pour le télécharger ou l'ouvrir.",
                "Analysez les pièces avec les outils demandés. La rubrique Rappels de méthode vous guide sans donner les réponses.",
                "Dans <strong>Vos constats</strong>, répondez à chaque point de contrôle.",
                "Cliquez sur <strong>Enregistrer et terminer</strong> pour remettre le lab."]) },
    { id: "remise", titre: "Remettre votre travail à l'enseignant",
      html: "<p>Vos copies sont enregistrées sur votre appareil. Pour que l'enseignant les corrige, vous devez lui remettre votre fichier de synthèse.</p>" +
        ol(["Cliquez sur le menu <strong>Mes remises</strong>.",
            "Cliquez sur <strong>Exporter mon fichier de synthèse</strong>. Un fichier <code>NDAP_SUKULU_&lt;CODE&gt;_&lt;matricule&gt;_&lt;date&gt;.json</code> est téléchargé.",
            "Remettez ce fichier à votre enseignant de la façon qu'il vous a indiquée : courriel, clé USB ou plateforme de l'école."]) +
        ul(["Le fichier contient toutes vos sessions terminées. Le dernier export est toujours complet.",
            "Il est chiffré pour votre enseignant seul. Ne le modifiez pas : un fichier modifié est refusé.",
            "Exportez votre fichier après chaque évaluation et gardez-en une copie."]) },
    { id: "resultats", titre: "Consulter votre relevé de notes",
      html: "<p>Tant que l'enseignant n'a pas corrigé, vous ne voyez aucune note. Dès que sa correction arrive, <strong>Mon relevé de notes</strong> affiche tout.</p>" +
        ul(["Sur la version en ligne, la correction arrive seule à votre connexion suivante.",
            "Hors ligne, votre enseignant vous envoie le fichier <code>resultats.js</code> : dans Mon relevé de notes, cliquez sur <strong>Choisir le fichier</strong>."]) +
        tab(["Ce que vous y lisez", "Ce que cela veut dire"], [
          ["Note des fiches", "La moyenne de toutes les fiches du cours, comptée pour 60 %"],
          ["Note des labs", "La moyenne de tous les labs du cours, comptée pour 40 %"],
          ["Note de contrôle continu", "La somme des deux, sur 20"],
          ["Le tableau", "Chaque évaluation, toutes vos tentatives et la note retenue"]]) +
        ul(["Une évaluation non remise compte 0. Le relevé s'affiche même si toutes vos notes sont à zéro.",
            "Dans un cours sans lab, la note de contrôle continu repose sur les fiches.",
            "Vous ne voyez que vos propres notes. Un fichier modifié ou qui ne vient pas de votre enseignant est refusé.",
            "Au même moment, vos badges et vos attestations passent en attente d'acceptation."]) },
    BADGES,
    { id: "attestations", titre: "Accepter et imprimer une attestation de module",
      html: "<p>Un module est une partie du livre. L'attestation est acquise quand toutes les évaluations du module sont remises, fiches et labs, avec une moyenne d'au moins 70 %, en retenant votre meilleur essai.</p>" +
        ol(["Ouvrez le menu <strong>Mes attestations</strong>. Une attestation obtenue porte la mention « obtenue, à accepter ».",
            "Cliquez sur <strong>Accepter cette attestation</strong>, vérifiez votre nom, puis confirmez.",
            "Cliquez sur <strong>Afficher et imprimer</strong>, puis sur <strong>Imprimer ou enregistrer en PDF</strong>. Choisissez A4 paysage, marges « aucune », arrière-plans activés."]) +
        ul(["L'attestation porte un numéro et un QR code signé par votre enseignant. <strong>Vérifier en ligne</strong> ouvre la page de contrôle.",
            "Sous chaque module non acquis, la raison est écrite : évaluations manquantes ou moyenne sous le seuil.",
            "L'attestation n'est ni un diplôme ni un relevé officiel de l'établissement."]) },
    ORGANISER,
    CHANGER,
    { id: "affichage", titre: "Régler l'affichage",
      html: "<p>Dans <strong>Paramètres</strong>, rubrique Affichage, choisissez Clair, Sombre ou Automatique.</p>" },
    PRATIQUES,
    { id: "demo", titre: "Compte de démonstration et inscription",
      html: "<p>Le compte de démonstration sert à découvrir l'application. Il ne remet aucun fichier et ne reçoit ni résultat ni badge.</p>" +
        ol(["Cliquez sur <strong>Demander mon inscription</strong>, dans Mes remises ou Paramètres. Votre messagerie s'ouvre avec un courriel déjà rédigé.",
            "Complétez les lignes Nom, Prénom, Établissement, Filière et niveau, Matricule et Année académique.",
            "Envoyez le courriel. Vous recevrez vos identifiants personnels quand votre inscription sera acceptée."]) },
    { id: "pannes", titre: "Problèmes fréquents",
      html: tab(["Ce que vous voyez", "Que faire"], [
        ["« Matricule ou mot de passe incorrect »", "Vérifiez les majuscules du mot de passe et la touche Verr. Maj. Si le problème persiste, prévenez votre enseignant."],
        ["« Trop d'essais infructueux »", "Attendez le délai indiqué avant de réessayer."],
        ["« Version non activée »", "La classe n'est pas encore en ligne. Prévenez votre enseignant."],
        ["« Navigateur incompatible »", "Utilisez Edge, Chrome ou Firefox dans une version récente."],
        ["La page montre une ancienne version", "Appuyez sur Ctrl+F5 pour recharger complètement la page."],
        ["Mes sessions ou mes badges ont disparu", "Vous avez changé de navigateur, d'appareil ou de dossier, ou vidé le navigateur. Importez votre dernier contexte de session dans Paramètres. Sans ce fichier, revenez à l'appareil d'origine, ou réimportez vos résultats puis acceptez de nouveau vos badges."],
        ["« Ce contexte appartient à un autre compte »", "Le fichier a été exporté avec un autre matricule. Connectez-vous avec le compte qui l'a exporté."],
        ["« tentatives épuisées »", "Le nombre de tentatives de cette évaluation est atteint. Seul l'enseignant peut l'augmenter."],
        ["« Fichier de résultats refusé »", "Le fichier ne vient pas de votre enseignant ou ne vous concerne pas. Demandez-lui le bon fichier."],
        ["Aucun badge alors que j'ai tout remis", "Les badges attendent les résultats publiés par l'enseignant. Vérifiez aussi que chaque évaluation du chapitre est remise."]]) }
  ];
  var REVISION = [
    { id: "ouvrir", titre: "Ouvrir l'application", html: EVALUATION[0].html },
    { id: "connexion", titre: "Se connecter", html: EVALUATION[1].html },
    { id: "ecran", titre: "Découvrir l'écran",
      html: tab(["Menu", "Ce que vous y trouvez"], [
        ["Tableau de bord", "Votre maîtrise de la banque, vos suggestions de travail, vos chapitres et votre barre de badges"],
        ["Réviser", "Le résumé de chaque chapitre : objectifs, définitions, points à retenir"],
        ["Fiches", "Une fiche de questions par chapitre, corrigée tout de suite"],
        ["Examen blanc", "Un tirage sur plusieurs chapitres, en temps limité"],
        ["Labs", "Les travaux pratiques sur pièces (ordinateur seulement)"],
        ["Progression", "L'historique de vos scores"],
        ["Mes badges", "Les badges de chapitre obtenus, à accepter ou restant à obtenir"],
        ["Mode d'emploi", "Cette page"],
        ["Paramètres", "L'affichage, l'export et l'import de votre progression"]]) },
    { id: "reviser", titre: "Réviser un chapitre",
      html: ol(["Ouvrez <strong>Réviser</strong>, puis le chapitre voulu.", "Lisez les objectifs, les définitions et les points à retenir.", "Cliquez sur <strong>Faire la fiche</strong> quand vous êtes prêt."]) +
        "<p>Le tableau de bord vous signale les sections où vous échouez le plus. Le bouton <strong>M'entraîner</strong> lance une série ciblée sur une section.</p>" },
    { id: "fiche", titre: "Faire une fiche",
      html: ol(["Dans <strong>Fiches</strong>, choisissez le chapitre.", "Répondez aux questions avant la fin du temps.", "Cliquez sur <strong>Valider</strong>. La correction s'affiche tout de suite, avec la réponse attendue et une explication."]) +
        ul(["Vous pouvez refaire une fiche autant de fois que vous voulez : le tirage change à chaque fois.", "Votre meilleur score compte pour le badge du chapitre."]) },
    { id: "examen", titre: "Passer un examen blanc",
      html: "<p>Dans <strong>Examen blanc</strong>, choisissez les chapitres puis lancez le tirage. Le résultat est détaillé par chapitre. L'examen blanc ne compte pas pour les badges.</p>" },
    { id: "lab", titre: "Faire un lab (sur ordinateur)",
      html: ol(["Dans <strong>Labs</strong>, cliquez sur <strong>Commencer</strong>.", "Analysez les pièces fournies dans le dossier de l'application avec vos outils.", "Saisissez vos constats puis soumettez. Vous pouvez soumettre autant de fois que vous le voulez : le meilleur score est gardé."]) },
    BADGES,
    { id: "progression", titre: "Suivre et sauvegarder votre progression",
      html: "<p><strong>Progression</strong> affiche l'historique de vos scores.</p><p>Dans <strong>Paramètres</strong>, vous pouvez exporter votre progression dans un fichier, puis l'importer sur un autre appareil. Vos badges acceptés voyagent avec elle.</p>" },
    ORGANISER,
    PRATIQUES,
    { id: "pannes", titre: "Problèmes fréquents",
      html: tab(["Ce que vous voyez", "Que faire"], [
        ["« Matricule ou mot de passe incorrect »", "Vérifiez les majuscules du mot de passe. Si le problème persiste, prévenez votre enseignant."],
        ["« Navigateur incompatible »", "Utilisez Edge, Chrome ou Firefox dans une version récente."],
        ["La page montre une ancienne version", "Appuyez sur Ctrl+F5 pour recharger complètement la page."],
        ["Ma progression a disparu", "Vous avez changé de navigateur ou d'appareil, ou vidé le navigateur. Importez votre dernière sauvegarde dans Paramètres."],
        ["Pas de badge pour un chapitre", "Faites la fiche du chapitre et ses labs, puis atteignez 60 % de moyenne."]]) }
  ];

  // ------------------------------------------------------------ affichage
  // onglets : [{ cle, titre, sections }] ; un seul onglet n'affiche pas de sélecteur
  function page(titre, intro, onglets, actif) {
    var o = onglets.filter(function (x) { return x.cle === actif; })[0] || onglets[0];
    var h = "<h1>" + esc(titre) + '</h1><p class="doux">' + esc(intro) + "</p>";
    if (onglets.length > 1) h += '<div class="actions" style="margin-top:0">' + onglets.map(function (x) {
      return '<button class="btn petit' + (x.cle === o.cle ? "" : " second") + '" data-aide-onglet="' + esc(x.cle) + '">' + esc(x.titre) + "</button>"; }).join("") + "</div>";
    h += '<div class="carte"><label class="champ" style="margin:0">Chercher dans le mode d\'emploi<input type="search" id="aide-chercher" placeholder="par exemple : badge, résultats, mot de passe"></label>' +
      '<p class="petit doux" id="aide-compte" style="margin:6px 0 0"></p></div>';
    h += '<div class="carte" id="aide-sommaire"><strong>Sommaire</strong><ol style="margin-bottom:0">' + o.sections.map(function (s) {
      return '<li><a href="#" data-aide-aller="' + esc(s.id) + '">' + esc(s.titre) + "</a></li>"; }).join("") + "</ol></div>";
    h += o.sections.map(function (s, i) {
      return '<details class="carte aide-section" id="aide-' + esc(s.id) + '"' + (i === 0 ? " open" : "") + "><summary><strong>" + (i + 1) + ". " + esc(s.titre) + "</strong></summary>" + s.html + "</details>";
    }).join("");
    return h;
  }
  // surOnglet(cle) : appelé quand l'utilisateur change d'onglet
  function brancher(surOnglet) {
    var champ = document.getElementById("aide-chercher"), compte = document.getElementById("aide-compte");
    var sections = Array.prototype.slice.call(document.querySelectorAll(".aide-section"));
    function norm(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    if (champ) champ.oninput = function () {
      var q = norm(champ.value.trim()), n = 0;
      sections.forEach(function (d) {
        var vu = !q || norm(d.textContent).indexOf(q) >= 0;
        d.style.display = vu ? "" : "none";
        if (q && vu) { d.open = true; n++; }
      });
      document.getElementById("aide-sommaire").style.display = q ? "none" : "";
      compte.textContent = q ? (n ? n + " rubrique" + (n > 1 ? "s" : "") + " trouvée" + (n > 1 ? "s" : "") : "Aucune rubrique ne contient ce mot.") : "";
    };
    Array.prototype.forEach.call(document.querySelectorAll("[data-aide-aller]"), function (a) {
      a.onclick = function (ev) {
        ev.preventDefault();
        var d = document.getElementById("aide-" + a.getAttribute("data-aide-aller"));
        if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); }
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-aide-onglet]"), function (b) {
      b.onclick = function () { if (surOnglet) surOnglet(b.getAttribute("data-aide-onglet")); };
    });
  }
  // sigle : sigle du cours, pour nommer le dossier conseillé à la racine du disque
  function apprenant(mode, sigle) {
    var ev = mode === "evaluation", nom = String(sigle || "COURS").replace(/[^A-Za-z0-9_-]/g, "");
    return (ev ? EVALUATION : REVISION).map(function (s) {
      return { id: s.id, titre: s.titre, html: s.html.replace(/\{SIGLE\}/g, nom)
        .replace(/\{EXPORTS\}/g, ev ? "vos fichiers de synthèse, votre contexte de session" : "votre progression")
        .replace(/\{RECUS\}/g, ev ? "le fichier <code>resultats.js</code>" : "les fichiers du cours") };
    });
  }

  window.NS_AIDE = { page: page, brancher: brancher, apprenant: apprenant, outils: { ol: ol, ul: ul, tab: tab, note: note } };
})();
