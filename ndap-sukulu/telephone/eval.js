/* NDAP SUKULU autonome : moteur d'évaluation de l'apprenant (mode « evaluation »).
   La version apprenant ne contient aucun corrigé : l'étudiant répond, sa copie est remise
   puis exportée dans un fichier de synthèse que seul l'enseignant peut ouvrir et corriger.

   Cycle d'une session (une tentative d'une fiche ou d'un lab) :
     en_cours   minuterie en temps réel depuis le début (échéance = début + durée), réponses
                enregistrées au fil de l'eau sur l'appareil ;
     « Enregistrer et terminer » : statut remise, la copie est verrouillée (lecture et export seuls) ;
     temps écoulé pendant la session : remise automatique (motif « temps ») ;
     « Quitter sans enregistrer » : rien n'est remis ; l'étudiant peut se reconnecter et reprendre
                tant que l'échéance n'est pas passée ; après, la session est abandonnee (motif
                « délai ») et ne peut plus être ni reprise ni remise. Elle compte comme une tentative.
   L'état est chiffré sur l'appareil avec la clé de l'étudiant (AES-GCM) : un autre étudiant qui
   utilise le même ordinateur ne peut pas lire ses réponses. */
(function () {
  "use strict";
  var D = window.NS_DATA, U = window.NS_UTILISATEUR, I = window.NS_IDENT, K = window.NS_CRYPTO;
  if (!U) return;
  var C = D.cours, CFG = D.config;
  var TEL = C.edition === "telephone";
  // Contenu effectif = base + ajouts.js de l'enseignant (après vérification de sa signature).
  var EVALS = [], QUESTIONS = [], ALERTE_AJOUTS = null;
  var CLE = "ndap-sukulu-eval:" + C.code + ":" + U.id;
  var main = document.getElementById("app");
  var S = null, CLES = null, ACTIVE = null, CHRONO = null, SAUVE = null;

  // ------------------------------------------------------------ outils
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function $(id) { return document.getElementById(id); }
  function dateFr(t) { var d = new Date(t); return d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
  function heure(t) { return new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
  function reste(s) { s = Math.max(0, Math.round(s)); var m = Math.floor(s / 60); return (m >= 60 ? Math.floor(m / 60) + " h " + ("0" + (m % 60)).slice(-2) : m) + " min " + ("0" + (s % 60)).slice(-2) + " s"; }
  function maintenant() { return new Date().toISOString(); }
  var qParId = {}, labParId = {}, evParId = {};
  var chapParId = {}; D.chapitres.forEach(function (c) { chapParId[c.id] = c; });
  async function indexer() {
    var A = null, o = window.NS_AJOUTS;
    if (o) {
      try {
        if (o.format !== "ndap-sukulu-ajouts" || o.cours !== C.code) throw new Error("fichier d'un autre cours");
        if (!I || !I.cle_signature) throw new Error("clé de l'enseignant absente de cette version");
        var sansSig = {}; Object.keys(o).forEach(function (k) { if (k !== "sig") sansSig[k] = o[k]; });
        if (!(await K.verifierEnseignant(I.cle_signature, JSON.stringify(sansSig), o.sig))) throw new Error("signature de l'enseignant invalide");
        A = o;
      } catch (e) { ALERTE_AJOUTS = "Les ajouts de l'enseignant (ajouts.js) sont ignorés : " + e.message + ". Le contenu de base reste disponible."; }
    }
    var F = NS_CONTENUS.fusionner(D, A, TEL);
    EVALS = F.evaluations; QUESTIONS = F.questions;
    qParId = {}; F.questions.forEach(function (q) { qParId[q.id] = q; });
    labParId = {}; F.labs.forEach(function (l) { labParId[l.id] = l; });
    evParId = {}; F.toutes.forEach(function (e) { evParId[e.id] = e; });
    // indicateur en lecture seule (tests et diagnostic) : aucune donnée personnelle
    window.NS_EVAL_INFO = { questions: F.questions.length, evaluations: EVALS.length, labs: F.labs.length, ajouts: !!A };
  }

  // Générateur pseudo-aléatoire à graine (mulberry32) : même étudiant, même tentative, même tirage.
  function rng(hex) {
    var a = parseInt(hex.slice(0, 8), 16) >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function melanger(a, r) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ------------------------------------------------------------ état chiffré
  async function charger() {
    CLES = await K.importerCles(U.aes, U.mac);
    var brut = null; try { brut = JSON.parse(localStorage.getItem(CLE)); } catch (e) {}
    S = brut ? await K.dechiffrer(CLES.aes, brut) : { version: 1, sessions: [], exports: [] };
  }
  async function sauver() {
    var boite = await K.chiffrer(CLES.aes, S);
    try { localStorage.setItem(CLE, JSON.stringify(boite)); } catch (e) { alert("Enregistrement impossible sur cet appareil : " + e.message); }
  }
  function sauverBientot() { clearTimeout(SAUVE); SAUVE = setTimeout(sauver, 400); }
  function journal(s, evt) { (s.journal = s.journal || []).push({ t: maintenant(), e: evt }); }

  function sessionsDe(evId) { return S.sessions.filter(function (s) { return s.eval === evId; }); }
  function enCours() { return S.sessions.filter(function (s) { return s.statut === "en_cours"; })[0] || null; }

  // Sessions dont l'échéance est passée hors de l'application : abandonnées, non remises.
  function verifierEcheances() {
    var t = Date.now(), change = false;
    S.sessions.forEach(function (s) {
      if (s.statut === "en_cours" && Date.parse(s.echeance) <= t && s !== ACTIVE) {
        s.statut = "abandonnee"; s.motif = "delai"; s.fin = s.echeance; journal(s, "close : délai échu hors session"); change = true;
      }
    });
    return change;
  }

  // ------------------------------------------------------------ tirage d'une fiche
  async function tirer(ev, tentative) {
    var r = rng(await K.sha256hex(U.id + "|" + ev.id + "|" + tentative));
    var pool = QUESTIONS.filter(function (q) { return q.ch === ev.ch; });
    var choisis = [], plan = ev.tirage || {};
    Object.keys(plan).forEach(function (t) {
      melanger(pool.filter(function (q) { return q.type === t; }), r).slice(0, plan[t]).forEach(function (q) { choisis.push(q.id); });
    });
    if (choisis.length < ev.questions) {
      melanger(pool.filter(function (q) { return choisis.indexOf(q.id) < 0; }), r).slice(0, ev.questions - choisis.length)
        .forEach(function (q) { choisis.push(q.id); });
    }
    return melanger(choisis, r).slice(0, ev.questions);
  }

  // ------------------------------------------------------------ gabarit
  function cadre(actif, html) {
    var liens = [["accueil", "Mes évaluations"], ["remises", "Mes remises"], ["resultats", "Mes résultats"], ["parametres", "Paramètres"]];
    $("menu").innerHTML = liens.map(function (l) {
      return '<a href="#/' + l[0] + '"' + (l[0] === actif ? ' class="actif"' : "") + ">" + l[1] + "</a>";
    }).join("") + '<a href="#/deconnexion" title="' + esc(U.prenom + " " + U.nom + " · " + U.matricule) + '">Se déconnecter</a>';
    main.innerHTML = html;
    window.scrollTo(0, 0);
  }
  function etiquetteStatut(s) {
    if (s.statut === "remise") return '<span class="etiquette ok">remise' + (s.motif === "temps" ? " (temps écoulé)" : "") + "</span>";
    if (s.statut === "abandonnee") return '<span class="etiquette ko">abandonnée, non remise</span>';
    return '<span class="etiquette avert">en cours</span>';
  }

  // ------------------------------------------------------------ accueil : catalogue
  function vueAccueil() {
    if (verifierEcheances()) sauver();
    var ec = enCours();
    var h = "<h1>" + esc(C.titre) + '</h1><p class="doux">' + esc(U.prenom + " " + U.nom) + " · " + esc(U.matricule) +
      (I && I.periode ? " · " + esc(I.periode.annee + " · " + I.periode.semestre) : "") + "</p>" +
      (ALERTE_AJOUTS ? '<p class="message ko">' + esc(ALERTE_AJOUTS) + "</p>" : "");
    if (ec) {
      var ev = evParId[ec.eval];
      h += '<div class="carte" style="border-left:4px solid var(--avert)"><h3 style="margin-top:0">Session en cours : ' + esc(ev ? ev.titre : ec.eval) + "</h3>" +
        "<p>Tentative " + ec.tentative + ", commencée le " + dateFr(ec.debut) + ". Il vous reste <strong>" + reste((Date.parse(ec.echeance) - Date.now()) / 1000) +
        "</strong> (échéance à " + heure(ec.echeance) + "). Passé ce délai, la session sera close sans être remise.</p>" +
        '<div class="actions"><a class="btn" href="#/session/' + esc(ec.sid) + '">Reprendre</a></div></div>';
    }
    var aExporter = S.sessions.filter(function (s) { return s.statut !== "en_cours" && !s.exporte; }).length;
    if (aExporter) h += '<p class="message avert">' + aExporter + ' session(s) terminée(s) pas encore exportée(s). <a href="#/remises">Exporter mon fichier de synthèse</a>.</p>';
    h += '<p class="petit doux">Chaque évaluation est minutée et compte un nombre limité de tentatives. ' +
      "Votre note ne s'affiche pas ici : votre enseignant corrige les fichiers de synthèse et vous transmet les résultats.</p>";
    ["fiche", "lab"].forEach(function (type) {
      var liste = EVALS.filter(function (e) { return e.type === type; });
      if (!liste.length) return;
      h += "<h2>" + (type === "fiche" ? "Fiches de questions" : "Labs") + '</h2><div style="overflow-x:auto"><table class="tab"><thead><tr><th>Évaluation</th><th>Durée</th><th>Tentatives</th><th>Dernier état</th><th></th></tr></thead><tbody>' +
        liste.map(function (e) {
          var ss = sessionsDe(e.id), der = ss[ss.length - 1], cours = ss.filter(function (s) { return s.statut === "en_cours"; })[0];
          var bouton = cours ? '<a class="btn petit" href="#/session/' + esc(cours.sid) + '">Reprendre</a>' :
            ss.length >= e.tentatives ? '<span class="doux petit">tentatives épuisées</span>' :
            ec ? '<span class="doux petit">une autre session est en cours</span>' :
            '<a class="btn petit" href="#/commencer/' + esc(e.id) + '">Commencer</a>';
          return "<tr><td>" + esc(e.titre) + "</td><td>" + e.duree + " min</td><td>" + ss.length + " / " + e.tentatives + "</td><td>" +
            (der ? etiquetteStatut(der) : '<span class="doux">non commencée</span>') + '</td><td style="white-space:nowrap">' + bouton + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    });
    if (C.pdf && !TEL) h += '<h2>Le cours</h2><div class="carte"><a href="' + esc(C.pdf) + '" target="_blank">Ouvrir le livre du cours (PDF)</a></div>';
    cadre("accueil", h);
  }

  // ------------------------------------------------------------ démarrer une tentative
  async function commencer(evId) {
    var ev = evParId[evId];
    if (!ev) return (location.hash = "#/accueil");
    verifierEcheances();
    var ec = enCours();
    if (ec) return (location.hash = "#/session/" + ec.sid);
    var ss = sessionsDe(evId);
    if (ss.length >= ev.tentatives) { alert("Vous avez utilisé vos " + ev.tentatives + " tentatives pour cette évaluation."); return (location.hash = "#/accueil"); }
    var n = ss.length + 1;
    if (!confirm(ev.titre + "\n\nTentative " + n + " sur " + ev.tentatives + ", durée " + ev.duree + " minutes.\n\n" +
      "La minuterie démarre maintenant et ne s'arrête pas, même si vous quittez l'application. " +
      "Cette tentative sera décomptée même si vous quittez sans enregistrer.\n\nCommencer ?")) return (location.hash = "#/accueil");
    var debut = new Date();
    var s = { sid: K.b64(crypto.getRandomValues(new Uint8Array(9))).replace(/[+/=]/g, ""), eval: ev.id, type: ev.type, ch: ev.ch,
              tentative: n, duree: ev.duree, debut: debut.toISOString(), echeance: new Date(debut.getTime() + ev.duree * 60000).toISOString(),
              fin: null, statut: "en_cours", motif: null, reponses: {}, journal: [] };
    if (ev.type === "fiche") s.questions = await tirer(ev, n);
    journal(s, "début");
    S.sessions.push(s);
    await sauver();
    location.hash = "#/session/" + s.sid;
  }

  // ------------------------------------------------------------ session
  function blocQuestion(qid, i, rep, lecture, ordre) {
    var q = qParId[qid];
    if (!q) return '<div class="carte question">Question ' + esc(qid) + " introuvable dans cette version.</div>";
    var dis = lecture ? " disabled" : "", h = '<div class="carte question"><span class="sect etiquette">' + esc(q.section) + '</span><span class="num">' + (i + 1) + ".</span>";
    if (q.type === "qcm") {
      h += esc(q.q) + '<div class="options">' + ordre.map(function (k) {
        return '<label><input type="radio" name="' + esc(qid) + '" value="' + k + '"' + (String(rep) === String(k) ? " checked" : "") + dis + ">" + esc(q.options[k]) + "</label>";
      }).join("") + "</div>";
    } else if (q.type === "vf") {
      h += '<span class="etiquette">Vrai ou faux</span> ' + esc(q.q) + '<div class="options">' + ["vrai", "faux"].map(function (v) {
        return '<label><input type="radio" name="' + esc(qid) + '" value="' + v + '"' + (rep === v ? " checked" : "") + dis + ">" + (v === "vrai" ? "Vrai" : "Faux") + "</label>";
      }).join("") + "</div>";
    } else if (q.type === "oral") {
      h += esc(q.q) + '<div style="margin-top:8px"><textarea name="' + esc(qid) + '" rows="4"' + dis + ' style="width:100%;padding:7px 10px;border:1px solid var(--bord);border-radius:8px;background:var(--fond);color:var(--texte)">' + esc(rep || "") + "</textarea></div>";
    } else {
      h += '<span class="etiquette">Complétez</span> ' + esc(q.q) +
        '<div style="margin-top:8px"><input type="text" name="' + esc(qid) + '" value="' + esc(rep || "") + '" autocomplete="off" placeholder="Votre réponse"' + dis + "></div>";
    }
    return h + "</div>";
  }
  function blocControle(l, k, i, rep, lecture) {
    return '<div class="carte question"><span class="sect etiquette">Partie ' + esc(k.partie) + " · " + k.points + ' pts</span><span class="num">' + (i + 1) + ".</span>" +
      esc(k.question) + (k.unite ? ' <span class="doux">(' + esc(k.unite) + ")</span>" : "") +
      '<div style="margin-top:8px"><input type="text" name="' + esc(k.id) + '" value="' + esc(rep || "") + '" autocomplete="off" placeholder="' + (k.type === "liste" ? "Valeurs séparées par des virgules" : k.type === "numerique" ? "Un nombre" : "Votre constat") + '"' + (lecture ? " disabled" : "") + "></div>" +
      (k.indice && !lecture ? '<details class="petit doux" style="margin-top:6px"><summary>Indice</summary>' + esc(k.indice) + "</details>" : "") + "</div>";
  }
  async function ordreOptions(s, qid, n) {
    var r = rng(await K.sha256hex(s.sid + "|" + qid)), a = [];
    for (var i = 0; i < n; i++) a.push(i);
    return melanger(a, r);
  }
  function nbReponses(s) {
    return Object.keys(s.reponses).filter(function (k) { return String(s.reponses[k]).trim() !== ""; }).length;
  }
  function nbAttendues(s) { return s.type === "fiche" ? s.questions.length : (labParId[s.eval] ? labParId[s.eval].controles.length : 0); }

  async function vueSession(sid) {
    var s = S.sessions.filter(function (x) { return x.sid === sid; })[0];
    if (!s) return (location.hash = "#/accueil");
    if (verifierEcheances()) await sauver();
    if (s.statut !== "en_cours") return vueCopie(s);
    var ev = evParId[s.eval] || { titre: s.eval };
    ACTIVE = s; journal(s, "ouverture"); sauverBientot();
    var lecture = false, h = '<div class="bandeau-fiche"><span><strong>' + esc(ev.titre) + "</strong> · tentative " + s.tentative +
      '</span><span>Temps restant : <span class="chrono" id="chrono"></span></span><span id="compte"></span></div>';
    h += '<form id="copie" onsubmit="return false">';
    if (s.type === "fiche") {
      for (var i = 0; i < s.questions.length; i++) {
        var q = qParId[s.questions[i]];
        h += blocQuestion(s.questions[i], i, s.reponses[s.questions[i]], lecture, q && q.type === "qcm" ? await ordreOptions(s, q.id, q.options.length) : null);
      }
    } else {
      var l = labParId[s.eval];
      h += '<div class="carte"><h3 style="margin-top:0">Briefing</h3><div style="white-space:pre-line">' + esc(l.briefing) + "</div></div>";
      h += '<h2>Pièces</h2><div class="carte"><table class="tab"><tr><th>Fichier</th><th>Taille</th></tr>' + l.pieces.map(function (p) {
        // pièce d'un lab ajouté par l'enseignant : embarquée (data URL), téléchargée à la demande
        var lien = p.data ? '<a href="' + esc(p.data) + '" download="' + esc(p.nom) + '">' : '<a href="' + esc(p.chemin) + '" target="_blank">';
        return "<tr><td>" + lien + esc(p.nom) + "</a></td><td>" + p.taille + "</td></tr>";
      }).join("") + "</table><p class=\"petit doux\">" + (l.dossier ? "Les pièces sont aussi dans le dossier <code>" + esc(l.dossier) + "</code> de l'application. " :
        "Cliquez sur une pièce pour l'enregistrer sur votre ordinateur. ") + "Travaillez sur une copie.</p></div>";
      if (l.rappel && l.rappel.length) h += '<h2>Rappels de méthode</h2><div class="encadre">' + l.rappel.map(function (r) {
        return "<b>" + esc(r.titre) + "</b><ul>" + r.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>"; }).join("") + "</div>";
      h += "<h2>Vos constats</h2>" + l.controles.map(function (k, i) { return blocControle(l, k, i, s.reponses[k.id], false); }).join("");
    }
    h += "</form>";
    h += '<div class="carte"><p class="petit">Vos réponses sont enregistrées sur cet appareil à chaque saisie.</p><div class="actions">' +
      '<button class="btn" id="remettre">Enregistrer et terminer</button>' +
      '<button class="btn second" id="quitter">Quitter sans enregistrer</button></div></div>';
    cadre("accueil", h);
    var f = $("copie");
    function lire(ev2) {
      var el = ev2.target; if (!el.name) return;
      if (String(el.value).trim() === "") delete s.reponses[el.name]; else s.reponses[el.name] = el.value;
      $("compte").textContent = nbReponses(s) + " / " + nbAttendues(s) + " répondues";
      sauverBientot();
    }
    f.addEventListener("change", lire); f.addEventListener("input", lire);
    $("compte").textContent = nbReponses(s) + " / " + nbAttendues(s) + " répondues";
    $("remettre").onclick = async function () {
      var manque = nbAttendues(s) - nbReponses(s);
      if (!confirm((manque > 0 ? manque + " question(s) sans réponse.\n\n" : "") + "Enregistrer et terminer ? Votre copie sera verrouillée : vous ne pourrez plus la modifier, seulement l'exporter.")) return;
      await terminer(s, "remise", "eleve");
    };
    $("quitter").onclick = async function () {
      if (!confirm("Quitter sans enregistrer ?\n\nRien n'est remis. Vos réponses restent sur cet appareil et vous pourrez reprendre jusqu'à " +
        heure(s.echeance) + ". Passé ce délai, la session sera close sans être remise ; elle compte comme une tentative.")) return;
      journal(s, "quitter sans enregistrer"); ACTIVE = null; clearInterval(CHRONO); await sauver(); location.hash = "#/accueil";
    };
    clearInterval(CHRONO);
    function tic() {
      var r = (Date.parse(s.echeance) - Date.now()) / 1000;
      var c = $("chrono"); if (c) c.textContent = reste(r);
      if (r <= 0) { clearInterval(CHRONO); terminer(s, "remise", "temps"); }
    }
    tic(); CHRONO = setInterval(tic, 1000);
  }

  async function terminer(s, statut, motif) {
    if (s.statut !== "en_cours") return;
    clearInterval(CHRONO); clearTimeout(SAUVE);
    var f = $("copie");
    if (f) Array.prototype.forEach.call(f.elements, function (el) {
      if (!el.name) return;
      if (el.type === "radio") { if (el.checked) s.reponses[el.name] = el.value; }
      else if (String(el.value).trim() !== "") s.reponses[el.name] = el.value;
      else delete s.reponses[el.name];
    });
    s.statut = statut; s.motif = motif; s.fin = maintenant();
    journal(s, statut === "remise" ? (motif === "temps" ? "remise automatique : temps écoulé" : "remise par l'étudiant") : statut);
    ACTIVE = null;
    await sauver();
    if (motif === "temps") alert("Temps écoulé : votre copie a été enregistrée et remise automatiquement.");
    // même adresse que la session : hashchange ne se déclenche pas, on affiche la copie directement
    if (location.hash === "#/session/" + s.sid) vueCopie(s); else location.hash = "#/session/" + s.sid;
  }

  // ------------------------------------------------------------ copie verrouillée (lecture et export)
  async function vueCopie(s) {
    var ev = evParId[s.eval] || { titre: s.eval };
    var h = '<p class="doux">' + esc(ev.titre) + " · tentative " + s.tentative + "</p><h1>Ma copie</h1>";
    h += '<div class="carte"><p>' + etiquetteStatut(s) + " Commencée le " + dateFr(s.debut) + (s.fin ? ", close le " + dateFr(s.fin) : "") + ". " +
      nbReponses(s) + " / " + nbAttendues(s) + " réponses.</p>" +
      (s.statut === "remise" ? "<p>Copie verrouillée, en attente de correction par l'enseignant. Exportez votre fichier de synthèse et remettez-le à votre enseignant.</p>" :
        "<p>Le délai est échu sans que la copie soit remise : elle n'est pas transmise pour correction, mais figure dans votre fichier de synthèse comme tentative abandonnée.</p>") +
      '<div class="actions"><a class="btn" href="#/remises">Exporter mon fichier de synthèse</a><a class="btn second" href="#/accueil">Retour</a></div></div>';
    if (s.statut === "remise") {
      h += "<h2>Mes réponses</h2>";
      if (s.type === "fiche") {
        for (var i = 0; i < s.questions.length; i++) {
          var q = qParId[s.questions[i]];
          h += blocQuestion(s.questions[i], i, s.reponses[s.questions[i]], true, q && q.type === "qcm" ? await ordreOptions(s, q.id, q.options.length) : null);
        }
      } else {
        var l = labParId[s.eval];
        if (l) h += l.controles.map(function (k, i) { return blocControle(l, k, i, s.reponses[k.id], true); }).join("");
      }
    }
    cadre("remises", h);
  }

  // ------------------------------------------------------------ remises et fichier de synthèse
  function vueRemises() {
    if (verifierEcheances()) sauver();
    var fin = S.sessions.filter(function (s) { return s.statut !== "en_cours"; });
    var h = "<h1>Mes remises</h1>";
    h += '<div class="carte"><h3 style="margin-top:0">Fichier de synthèse</h3><p>Il regroupe toutes vos sessions terminées (remises et abandonnées). ' +
      "Il est chiffré pour votre enseignant et scellé avec votre clé : personne d'autre ne peut le lire, et toute modification le rend invalide. " +
      "Remettez-le à votre enseignant (courriel, clé USB…). Vous pouvez l'exporter autant de fois que nécessaire : il est toujours complet.</p>" +
      '<div class="actions"><button class="btn" id="exporter"' + (fin.length ? "" : " disabled") + ">Exporter mon fichier de synthèse (" + fin.length + " session(s))</button></div>" +
      '<p id="msg-exp"></p>' + (S.exports.length ? '<p class="petit doux">Dernier export : ' + dateFr(S.exports[S.exports.length - 1].t) + ".</p>" : "") + "</div>";
    if (fin.length) {
      h += '<div style="overflow-x:auto"><table class="tab"><thead><tr><th>Évaluation</th><th>Tentative</th><th>État</th><th>Close le</th><th>Réponses</th><th>Exportée</th><th></th></tr></thead><tbody>' +
        fin.map(function (s) {
          var ev = evParId[s.eval] || { titre: s.eval };
          return "<tr><td>" + esc(ev.titre) + "</td><td>" + s.tentative + "</td><td>" + etiquetteStatut(s) + "</td><td>" + (s.fin ? dateFr(s.fin) : "") +
            "</td><td>" + nbReponses(s) + " / " + nbAttendues(s) + "</td><td>" + (s.exporte ? "oui" : '<span class="etiquette avert">non</span>') +
            '</td><td><a class="btn petit second" href="#/session/' + esc(s.sid) + '">Voir</a></td></tr>';
        }).join("") + "</tbody></table></div>";
    } else h += '<p class="doux">Aucune session terminée pour l\'instant.</p>';
    cadre("remises", h);
    if ($("exporter")) $("exporter").onclick = async function () {
      this.disabled = true;
      try {
        var nom = await exporter(fin);
        message("msg-exp", "Fichier « " + nom + " » téléchargé. Remettez-le à votre enseignant.", "ok");
        vueRemisesApres();
      } catch (e) { message("msg-exp", "Export impossible : " + e.message, "ko"); this.disabled = false; }
    };
  }
  function vueRemisesApres() { setTimeout(vueRemises, 1500); }
  function message(id, t, c) { var e = $(id); if (e) { e.className = "message " + (c || ""); e.textContent = t; } }

  async function exporter(sessions) {
    if (!I || !I.cle_publique) throw new Error("clé de l'enseignant absente de cette version");
    var cree = maintenant();
    var contenu = {
      matricule: U.matricule, nom: U.nom, prenom: U.prenom, cours: C.code, periode: I.periode || null,
      exporte: cree, version_app: D.version, generee: D.genere, edition: C.edition, appareil: navigator.userAgent,
      sessions: sessions.map(function (s) {
        return { sid: s.sid, eval: s.eval, type: s.type, ch: s.ch, tentative: s.tentative, duree: s.duree, debut: s.debut,
                 echeance: s.echeance, fin: s.fin, statut: s.statut, motif: s.motif, questions: s.questions || null,
                 reponses: s.reponses, journal: s.journal };
      })
    };
    var f = { format: "ndap-sukulu-synthese", version: 1, cours: C.code, compte: U.id, periode: I.periode || null, cree: cree,
              empreinte_cle: I.empreinte_cle, enc: await K.chiffrerPourEnseignant(I.cle_publique, contenu) };
    f.sig = await K.signer(CLES.mac, K.texteASigner(f));
    var d = new Date(), deux = function (x) { return ("0" + x).slice(-2); };
    var horodatage = d.getFullYear() + deux(d.getMonth() + 1) + deux(d.getDate()) + "_" + deux(d.getHours()) + deux(d.getMinutes());
    var nom = "NDAP_SUKULU_" + C.code + "_" + U.matricule.replace(/\W+/g, "") + "_" + horodatage + ".json";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(f)], { type: "application/json" }));
    a.download = nom; document.body.appendChild(a); a.click(); a.remove();
    sessions.forEach(function (s) { s.exporte = cree; });
    S.exports.push({ t: cree, n: sessions.length, nom: nom });
    await sauver();
    window.NS_DERNIER_EXPORT = f;            // pour les tests automatisés
    return nom;
  }

  // ------------------------------------------------------------ mes résultats
  // Fichier de résultats publié par l'enseignant (resultats.js à côté de la page, ou importé) :
  // signature ECDSA de l'enseignant vérifiée, puis seule la part de l'étudiant est déchiffrée.
  async function lireResultats(o) {
    if (!o || o.format !== "ndap-sukulu-resultats") throw new Error("ce n'est pas un fichier de résultats NDAP SUKULU");
    if (o.cours !== C.code) throw new Error("résultats du cours " + o.cours + ", pas " + C.code);
    if (!I || !I.cle_signature) throw new Error("cette version de l'application ne contient pas la clé de votre enseignant : demandez-lui de republier la version apprenant");
    var sansSig = {}; Object.keys(o).forEach(function (k) { if (k !== "sig") sansSig[k] = o[k]; });
    if (!(await K.verifierEnseignant(I.cle_signature, JSON.stringify(sansSig), o.sig)))
      throw new Error("signature de l'enseignant invalide : fichier modifié ou ne provenant pas de votre enseignant");
    var part = o.parts && o.parts[U.id];
    if (!part) throw new Error("ce fichier ne contient pas de résultats pour votre compte");
    var c = await K.dechiffrer(CLES.aes, part);
    return { genere: o.genere, periode: o.periode, contenu: c };
  }
  async function enregistrerResultats(r) {
    if (S.resultats && Date.parse(S.resultats.genere) >= Date.parse(r.genere)) return false;   // déjà ce fichier, ou plus récent
    S.resultats = r; await sauver(); return true;
  }
  async function resultatsAuto() {
    if (!window.NS_RESULTATS) return null;
    try { var r = await lireResultats(window.NS_RESULTATS); await enregistrerResultats(r); return null; }
    catch (e) { return e.message; }
  }
  function txtNote(n) { return n == null ? "—" : String(Number(n).toFixed(2)).replace(".", ","); }
  async function vueResultats(info) {
    var erreurAuto = await resultatsAuto();
    var R = S.resultats, h = "<h1>Mes résultats</h1>";
    if (info) h += '<p class="message ' + info[1] + '">' + esc(info[0]) + "</p>";
    if (erreurAuto) h += '<p class="message ko">Fichier de résultats présent mais refusé : ' + esc(erreurAuto) + "</p>";
    if (!R) {
      h += '<div class="carte"><p>Aucun résultat pour l’instant. Votre enseignant publie les résultats après avoir corrigé les fichiers de synthèse : ' +
        "ils apparaîtront ici à votre prochaine connexion, ou importez le fichier <code>resultats.js</code> qu'il vous a transmis.</p></div>";
    } else {
      var c = R.contenu;
      h += '<div class="carte"><p class="doux">Résultats publiés par votre enseignant le ' + dateFr(R.genere) + (R.periode ? " · classe " + esc(R.periode.annee + " · " + R.periode.semestre) : "") +
        ". Note retenue en cas de plusieurs tentatives : " + esc(c.regle) + ".</p>" +
        (c.message ? '<div class="encadre">' + esc(c.message) + "</div>" : "") + "</div>";
      h += '<div class="chiffres">' + [["Moyenne générale", txtNote(c.moyenne_globale) + " / 20"], ["Moyenne des évaluations remises", txtNote(c.moyenne_remises)],
        ["Évaluations remises", c.remises + " / " + c.total]].concat(c.rang ? [["Rang", c.rang + " / " + c.effectif]] : []).map(function (x) {
          return '<div class="carte chiffre"><div class="val">' + x[1] + '</div><div class="lib">' + x[0] + "</div></div>"; }).join("") + "</div>";
      h += '<p class="petit doux">Moyenne générale : sur toutes les évaluations du cours, une évaluation non remise comptant 0.</p>';
      h += '<div style="overflow-x:auto"><table class="tab"><thead><tr><th>Évaluation</th><th>Note retenue</th><th>Tentatives</th></tr></thead><tbody>' +
        c.evaluations.map(function (e) {
          return "<tr><td>" + esc(e.titre) + "</td><td><strong>" + (e.note != null ? txtNote(e.note) + " / 20" : e.etat === "abandon" ? '<span class="doux">abandon</span>' : '<span class="doux">non remise</span>') +
            "</strong></td><td>" + (e.tentatives.length ? e.tentatives.map(function (t) {
              return "n° " + t.n + " : " + (t.statut === "remise" ? txtNote(t.note) + (t.motif === "temps" ? " (temps écoulé)" : "") : "abandonnée");
            }).join("<br>") : "") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      var avecDetail = [];
      c.evaluations.forEach(function (e) { e.tentatives.forEach(function (t) { if (t.detail) avecDetail.push({ e: e, t: t }); }); });
      if (avecDetail.length) {
        h += "<h2>Détail par question</h2>" + avecDetail.map(function (x) {
          return '<details class="carte"><summary><strong>' + esc(x.e.titre) + "</strong>, tentative " + x.t.n + " : " + txtNote(x.t.note) + " / 20</summary>" +
            x.t.detail.map(function (d, i) {
              return '<div class="question ' + (d.ok ? "juste" : "faux") + '" style="margin-top:8px"><span class="num">' + (i + 1) + ".</span>" + esc(d.enonce) +
                '<div class="correction ' + (d.ok ? "ok" : "ko") + '">Votre réponse : ' + (d.reponse ? esc(d.reponse) : "<em>sans réponse</em>") + " · " + (d.ok ? "juste" : "fausse") + "</div></div>";
            }).join("") + "</details>";
        }).join("");
      }
    }
    h += '<div class="carte"><h3 style="margin-top:0">Importer un fichier de résultats</h3><p class="petit doux">Fichier <code>resultats.js</code> transmis par votre enseignant. ' +
      "Seule votre part est lisible avec votre compte ; un fichier modifié ou non signé par votre enseignant est refusé.</p>" +
      '<label class="btn second">Choisir le fichier<input type="file" id="imp-res" accept=".js,.json" hidden></label></div>';
    cadre("resultats", h);
    $("imp-res").onchange = async function (ev) {
      var f = ev.target.files[0]; if (!f) return;
      try {
        var t = await f.text(), deb = t.indexOf("{"), fin = t.lastIndexOf("}");
        var o = JSON.parse(t.slice(deb, fin + 1));
        var r = await lireResultats(o);
        var nouveau = await enregistrerResultats(r);
        vueResultats([nouveau ? "Résultats importés." : "Ces résultats sont déjà affichés (ou plus anciens que ceux affichés).", "ok"]);
      } catch (e) { vueResultats(["Fichier refusé : " + e.message, "ko"]); }
    };
  }

  // ------------------------------------------------------------ paramètres
  function vueParametres() {
    var h = "<h1>Paramètres</h1>";
    h += '<div class="carte"><h3 style="margin-top:0">Mon compte</h3><p>' + esc(U.prenom + " " + U.nom) + " · matricule " + esc(U.matricule) +
      (I && I.periode ? "<br>Classe " + esc(I.periode.annee + " · " + I.periode.semestre) : "") +
      '</p><p class="petit doux">Connecté le ' + dateFr(U.ouvert) + ". Fermer l'onglet vous déconnecte.</p>" +
      '<div class="actions"><a class="btn petit second" href="#/deconnexion">Se déconnecter</a></div></div>';
    h += '<h2>Affichage</h2><div class="carte"><div class="actions" style="margin-top:0">' +
      '<button class="btn petit second" data-theme="">Automatique</button><button class="btn petit second" data-theme="clair">Clair</button>' +
      '<button class="btn petit second" data-theme="sombre">Sombre</button></div></div>';
    h += '<h2>À propos</h2><div class="carte petit">NDAP SUKULU autonome, mode évaluation, édition ' + (TEL ? "téléphone" : "ordinateur") +
      ", version " + esc(D.version) + " du " + esc(D.genere) + ". " + EVALS.length + " évaluations. Vos sessions sont chiffrées sur cet appareil avec votre clé personnelle." +
      "<br>" + esc(C.pied) + "</div>";
    cadre("parametres", h);
    document.querySelectorAll("[data-theme]").forEach(function (b) {
      b.onclick = function () {
        var t = b.getAttribute("data-theme");
        try { localStorage.setItem("ndap-sukulu:theme", t); } catch (e) {}
        if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
      };
    });
  }

  // ------------------------------------------------------------ routage
  function router() {
    if (ACTIVE && ACTIVE.statut === "en_cours") {
      var cible = location.hash;
      if (cible !== "#/session/" + ACTIVE.sid) {
        if (!confirm("Quitter la session en cours ? Rien n'est remis ; vous pourrez la reprendre jusqu'à " + heure(ACTIVE.echeance) + ".")) {
          history.replaceState(null, "", "#/session/" + ACTIVE.sid); return;
        }
        journal(ACTIVE, "quitter sans enregistrer"); sauver(); ACTIVE = null; clearInterval(CHRONO);
      }
    }
    var p = (location.hash.replace(/^#\/?/, "") || "accueil").split("/").map(decodeURIComponent);
    switch (p[0]) {
      case "commencer": return commencer(p[1]);
      case "session": return vueSession(p[1]);
      case "remises": return vueRemises();
      case "resultats": return vueResultats();
      case "parametres": return vueParametres();
      case "deconnexion": return window.NS_DECONNEXION();
      default: return vueAccueil();
    }
  }
  window.addEventListener("hashchange", router);
  window.addEventListener("beforeunload", function (e) {
    if (ACTIVE && ACTIVE.statut === "en_cours") { clearTimeout(SAUVE); sauver(); e.preventDefault(); e.returnValue = ""; }
  });
  indexer().then(charger).then(router).catch(function (e) {
    main.innerHTML = '<div class="carte"><h1>Données illisibles</h1><p>Les sessions enregistrées sur cet appareil ne peuvent pas être déchiffrées avec ce compte (' + esc(e.message) + ").</p></div>";
  });
})();
