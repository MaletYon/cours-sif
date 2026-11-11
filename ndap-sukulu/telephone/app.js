/* NDAP SUKULU autonome : moteur commun.
   Données : window.NS_DATA (fichier donnees.js produit par le générateur).
   Progression : localStorage du navigateur, exportable en fichier JSON.
   Aucune connexion réseau n'est utilisée. */
(function () {
  "use strict";
  var D = window.NS_DATA;
  var U = window.NS_UTILISATEUR;          // posé par connexion.js après vérification
  if (!U) return;
  var C = D.cours, CFG = D.config;
  var TEL = C.edition === "telephone";
  // un espace de stockage par étudiant ; un module personnel garde la clé d'avant la connexion
  var CLE = "ndap-sukulu:" + C.code + (U.personnel ? "" : ":" + U.id);
  var main = document.getElementById("app");
  // Badges de chapitre (badges.js) et mode d'emploi (aide.js). « badges: false » dans cours.yaml les coupe.
  var B = window.NS_BADGES, AIDE = window.NS_AIDE;
  var BADGES_ACTIFS = !!B && CFG.badges !== false;

  // ------------------------------------------------------------ outils
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
  function niveau(p) { return p >= 75 ? "ok" : p >= 50 ? "moyen" : "faible"; }
  function jauge(p) { return '<div class="jauge ' + niveau(p) + '"><span style="width:' + p + '%"></span></div>'; }
  function dateCourte(t) {
    var d = new Date(t);
    return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  function duree(s) { var m = Math.floor(s / 60); return m + " min " + ("0" + (s % 60)).slice(-2) + " s"; }
  function melange(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function normaliser(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[’']/g, "'").replace(/[«»"]/g, "").replace(/\s+/g, " ").trim();
  }
  var chapParId = {};
  D.chapitres.forEach(function (c) { chapParId[c.id] = c; });
  var qParId = {};
  D.questions.forEach(function (q) { qParId[q.id] = q; });
  function questionsDe(ch) { return D.questions.filter(function (q) { return q.ch === ch; }); }

  // ------------------------------------------------------------ progression
  var P;
  function charger() {
    try { P = JSON.parse(localStorage.getItem(CLE)) || null; } catch (e) { P = null; }
    if (!P || P.version !== 1) P = { version: 1, q: {}, sessions: [], labs: {}, pseudo: "" };
  }
  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(P)); } catch (e) { /* stockage indisponible */ }
  }
  charger();

  function etatQ(id) { return P.q[id] || { n: 0, ok: 0, boite: 0, dernier: null }; }
  function noterQ(id, juste) {
    var e = etatQ(id);
    e.n++; if (juste) e.ok++;
    e.boite = juste ? Math.min(5, (e.boite || 0) + 1) : 1;
    e.dernier = juste; e.t = Date.now();
    P.q[id] = e;
  }
  function statsChapitre(ch) {
    var qs = questionsDe(ch), vues = 0, maitrisees = 0;
    qs.forEach(function (q) { var e = P.q[q.id]; if (e) { vues++; if (e.dernier) maitrisees++; } });
    var sess = P.sessions.filter(function (s) { return s.ch === ch; });
    var meilleur = sess.reduce(function (m, s) { return Math.max(m, s.pct); }, 0);
    return { total: qs.length, vues: vues, maitrise: pct(maitrisees, qs.length), couverture: pct(vues, qs.length),
             sessions: sess.length, meilleur: meilleur, dernier: sess.length ? sess[sess.length - 1].pct : null };
  }
  function sectionsFaibles(ch, limite) {
    var agr = {};
    D.questions.forEach(function (q) {
      if (ch && q.ch !== ch) return;
      var e = P.q[q.id]; if (!e) return;
      var k = q.ch + "|" + q.section;
      agr[k] = agr[k] || { ch: q.ch, section: q.section, n: 0, ok: 0, rates: 0 };
      agr[k].n += e.n; agr[k].ok += e.ok; if (e.dernier === false) agr[k].rates++;
    });
    return Object.keys(agr).map(function (k) { var a = agr[k]; a.taux = pct(a.ok, a.n); return a; })
      .filter(function (a) { return a.n >= 2 && (a.taux < 60 || a.rates > 0); })
      .sort(function (a, b) { return a.taux - b.taux || b.rates - a.rates; })
      .slice(0, limite || 5);
  }

  // ------------------------------------------------------------ tirage pondéré
  function poids(q) {
    var e = P.q[q.id];
    if (!e) return 3;
    return [3, 4, 2, 1, 0.6, 0.35][e.boite || 0];
  }
  function tirer(pool, n) {
    pool = pool.slice(); var res = [];
    while (res.length < n && pool.length) {
      var tot = pool.reduce(function (s, q) { return s + poids(q); }, 0), r = Math.random() * tot, i = 0;
      for (; i < pool.length; i++) { r -= poids(pool[i]); if (r <= 0) break; }
      res.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    return res;
  }
  var A_ORAL = D.questions.some(function (q) { return q.type === "oral"; });
  var A_NIVEAUX = D.questions.some(function (q) { return q.niv; });
  function tirageFiche(ch, niv) {
    var qs = questionsDe(ch).filter(function (q) { return !niv || q.niv === niv; }), t = CFG.tirage, res = [];
    ["qcm", "vf", "trou", "oral"].forEach(function (type) {
      res = res.concat(tirer(qs.filter(function (q) { return q.type === type; }), t[type] || 0));
    });
    if (res.length < CFG.questions_par_fiche) {
      var reste = qs.filter(function (q) { return res.indexOf(q) < 0; });
      res = res.concat(tirer(reste, CFG.questions_par_fiche - res.length));
    }
    if (niv) res.sort(function (a, b) { return a.type === "oral" ? 1 : b.type === "oral" ? -1 : 0; });
    return res;
  }
  function tirageOral(chs, n) {
    var pool = D.questions.filter(function (q) { return q.type === "oral" && chs.indexOf(q.ch) >= 0; });
    // du plus simple au plus complexe, comme un jury qui monte en puissance
    return tirer(pool, n).sort(function (a, b) { return (a.niv || 2) - (b.niv || 2); });
  }
  function tirageExamen(chs) {
    var n = CFG.examen.questions, res = [], pools = chs.map(questionsDe);
    var parCh = chs.map(function () { return Math.floor(n / chs.length); });
    var reste = n - parCh.reduce(function (a, b) { return a + b; }, 0);
    // le reste va à des chapitres tirés au hasard, pour ne pas favoriser les premiers
    melange(chs.map(function (_, i) { return i; })).slice(0, reste).forEach(function (i) { parCh[i]++; });
    pools.forEach(function (p, i) { res = res.concat(tirer(p, parCh[i])); });
    return melange(res);
  }

  // ------------------------------------------------------------ gabarit
  function cadre(actif, html) {
    var liens = [["accueil", "Tableau de bord"], ["cours", "Réviser"], ["fiches", "Fiches"], ["examen", "Examen blanc"]];
    if (A_ORAL) liens.push(["oral", "Grand oral"]);
    if (!TEL && D.labs.length) liens.push(["labs", "Labs"]);
    liens.push(["progression", "Progression"]);
    if (BADGES_ACTIFS) liens.push(["badges", "Mes badges"]);
    if (AIDE) liens.push(["aide", "Mode d'emploi"]);
    liens.push(["parametres", "Paramètres"]);
    document.getElementById("menu").innerHTML = liens.map(function (l) {
      return '<a href="#/' + l[0] + '"' + (l[0] === actif ? ' class="actif"' : "") + ">" + l[1] + "</a>";
    }).join("") + (U.personnel ? "" : '<a href="#/deconnexion" title="' + esc(U.prenom + " " + U.nom + " · " + U.matricule) + '">Se déconnecter</a>');
    main.innerHTML = (U.demo ? '<p class="message avert">Compte de démonstration : votre progression reste sur cet appareil. ' +
      '<a href="' + esc(window.NS_CRYPTO.lienInscription(C)) + '">Demander mon inscription dans la salle de classe</a></p>' : "") + html;
    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------ tableau de bord
  function vueAccueil() {
    var nbQ = D.questions.length, vues = 0, maitr = 0;
    D.questions.forEach(function (q) { var e = P.q[q.id]; if (e) { vues++; if (e.dernier) maitr++; } });
    var sess = P.sessions.length;
    var moy = sess ? Math.round(P.sessions.reduce(function (s, x) { return s + x.pct; }, 0) / sess) : 0;
    var h = '<h1>' + esc(C.titre) + '</h1><p class="doux">' + esc(C.bandeau) + " · UE " + esc(C.code) +
      (U.personnel ? "" : " · " + esc(U.prenom + " " + U.nom) + " (" + esc(U.matricule) + ")") + "</p>";
    h += '<div class="chiffres">' +
      chiffre(pct(maitr, nbQ) + " %", "maîtrise de la banque (" + maitr + " / " + nbQ + ")") +
      chiffre(pct(vues, nbQ) + " %", "questions déjà rencontrées") +
      chiffre(sess, "fiches et examens passés") +
      chiffre(sess ? moy + " %" : "–", "score moyen") + "</div>";
    if (BADGES_ACTIFS) h += B.barre({ code: C.code, liste: listeBadges(), acceptes: P.badges || {} });

    var faibles = sectionsFaibles(null, 4);
    h += "<h2>Suggestions</h2>";
    if (!sess) {
      h += '<div class="carte">Commencez par réviser le premier chapitre, puis faites sa fiche. ' +
        "Les suggestions apparaîtront dès vos premières réponses." +
        '<div class="actions"><a class="btn" href="#/chapitre/' + D.chapitres[0].id + '">Réviser ' +
        esc(D.chapitres[0].court) + '</a><a class="btn second" href="#/fiche/' + D.chapitres[0].id +
        '">Faire la fiche</a></div></div>';
    } else if (!faibles.length) {
      var suivant = D.chapitres.filter(function (c) { return statsChapitre(c.id).sessions === 0; })[0];
      h += '<div class="carte">Aucune faiblesse marquée dans ce que vous avez travaillé. ' +
        (suivant ? "Prochaine étape : " + esc(suivant.court) + "." : "Passez un examen blanc pour consolider.") +
        '<div class="actions">' + (suivant ? '<a class="btn" href="#/chapitre/' + suivant.id + '">Réviser ' +
        esc(suivant.court) + "</a>" : '<a class="btn" href="#/examen">Examen blanc</a>') + "</div></div>";
    } else {
      h += '<div class="grille">' + faibles.map(function (f) {
        var c = chapParId[f.ch];
        return '<div class="carte"><span class="etiquette ko">' + f.taux + " % de réussite</span>" +
          "<h3>" + esc(f.section) + '</h3><p class="doux petit">' + esc(c.court) + " · " + esc(c.titre) +
          '</p><div class="actions"><a class="btn petit" href="#/chapitre/' + c.id + '">Relire</a>' +
          '<a class="btn petit second" href="#/ciblee/' + c.id + "/" + encodeURIComponent(f.section) +
          '">M\'entraîner</a></div></div>';
      }).join("") + "</div>";
    }

    h += '<h2>Mes chapitres</h2><div class="carte">';
    D.chapitres.forEach(function (c) {
      var s = statsChapitre(c.id);
      h += '<div class="ligne-chap"><a href="#/chapitre/' + c.id + '"><b>' + esc(c.court) + "</b></a>" +
        '<div><a href="#/chapitre/' + c.id + '">' + esc(c.titre) + "</a>" + jauge(s.maitrise) + "</div>" +
        '<div class="petit doux">' + s.maitrise + " %</div></div>";
    });
    h += "</div>";
    if (!TEL && D.labs.length) {
      var fait = D.labs.filter(function (l) { var e = P.labs[l.id]; return e && e.meilleur >= l.seuil; }).length;
      h += '<h2>Labs</h2><div class="carte">' + fait + " lab(s) réussi(s) sur " + D.labs.length +
        '.<div class="actions"><a class="btn second" href="#/labs">Voir les labs</a></div></div>';
    }
    cadre("accueil", h);
  }
  // ------------------------------------------------------------ badges de chapitre
  // Mode révision : les scores sont connus sur l'appareil. Meilleur score de la fiche du chapitre
  // et de ses labs (ordinateur), moyenne par chapitre, tout le chapitre fait.
  function listeBadges() {
    return B.calculer(D.chapitres.map(function (c) {
      var evals = [];
      if (questionsDe(c.id).length) {
        var m = null;
        P.sessions.forEach(function (s) { if (s.type === "fiche" && s.ch === c.id) m = m == null ? s.pct : Math.max(m, s.pct); });
        evals.push({ titre: "Fiche " + c.court, meilleur: m });
      }
      if (!TEL) D.labs.forEach(function (l) {
        if (l.chapitre !== c.id) return;
        var e = P.labs[l.id];
        evals.push({ titre: l.titre, meilleur: e && e.meilleur != null ? e.meilleur : null });
      });
      return { id: c.id, court: c.court, titre: c.titre, evals: evals };
    }));
  }
  function vueBadges() {
    if (!BADGES_ACTIFS) return vueAccueil();
    P.badges = P.badges || {};
    var o = { code: C.code, liste: listeBadges(), acceptes: P.badges, titulaire: U.personnel ? "" : U.nom + " " + U.prenom, attente: "" };
    cadre("badges", B.page(o));
    B.brancher(o, function (c, a) { P.badges[c.id] = a; sauver(); vueBadges(); });
  }
  function vueAide() {
    if (!AIDE) return vueAccueil();
    var sections = AIDE.apprenant("revision", C.sigle).filter(function (s) {
      return (BADGES_ACTIFS || s.id !== "badges") && (!U.personnel || s.id !== "connexion") && (!TEL || s.id !== "lab");
    });
    cadre("aide", AIDE.page("Mode d'emploi", "Tout ce qu'il faut savoir pour utiliser NDAP SUKULU, sans quitter l'application.", [{ cle: "apprenant", titre: "Apprenant", sections: sections }]));
    AIDE.brancher();
  }
  function chiffre(v, l) { return '<div class="carte chiffre"><div class="val">' + v + '</div><div class="lib">' + l + "</div></div>"; }

  // ------------------------------------------------------------ révision
  function vueCours() {
    var h = "<h1>Réviser le cours</h1>";
    if (!TEL && C.pdf) h += '<p><a class="btn second" href="' + esc(C.pdf) + '" target="_blank">Ouvrir le livre complet (PDF)</a></p>';
    h += '<div class="grille">' + D.chapitres.map(function (c) {
      var s = statsChapitre(c.id);
      return '<div class="carte"><span class="etiquette">' + esc(c.court) + "</span><h3>" + esc(c.titre) + "</h3>" +
        jauge(s.maitrise) + '<p class="petit doux">Maîtrise ' + s.maitrise + " % · " + s.total + " questions</p>" +
        '<div class="actions"><a class="btn petit" href="#/chapitre/' + c.id + '">Réviser</a>' +
        '<a class="btn petit second" href="#/fiche/' + c.id + '">Fiche</a></div></div>';
    }).join("") + "</div>";
    cadre("cours", h);
  }
  function vueChapitre(id) {
    var c = chapParId[id]; if (!c) return vueCours();
    var s = statsChapitre(id), i = D.chapitres.indexOf(c);
    var h = '<p class="doux">' + esc(c.partie || "") + "</p><h1>" + esc(c.court) + " · " + esc(c.titre) + "</h1>";
    h += '<div class="actions"><a class="btn" href="#/fiche/' + id + '">Faire la fiche (' + CFG.questions_par_fiche + " questions)</a>";
    if (A_NIVEAUX) [1, 2, 3].forEach(function (n) {
      if (questionsDe(id).some(function (q) { return q.niv === n; }))
        h += '<a class="btn second" href="#/fiche/' + id + "/" + n + '">Niveau ' + n + "</a>";
    });
    if (questionsDe(id).some(function (q) { return q.type === "oral"; }))
      h += '<a class="btn second" href="#/jury/' + id + '">Questions du jury</a>';
    if (!TEL && C.pdf && c.page) h += '<a class="btn second" target="_blank" href="' + esc(C.pdf) + "#page=" + c.page + '">Lire le chapitre complet (PDF, p. ' + c.page + ")</a>";
    h += "</div>";
    h += '<p class="petit doux">Maîtrise ' + s.maitrise + " % · " + s.vues + " questions sur " + s.total + " déjà rencontrées</p>";
    if (c.resume) h += '<h2>Résumé</h2><div class="encadre">' + c.resume + (c.motscles ? '<p class="petit"><b>Mots-clés :</b> ' + c.motscles + "</p>" : "") + "</div>";
    if (c.objectifs.length) h += '<h2>Objectifs</h2><div class="encadre"><ul>' + c.objectifs.map(li).join("") + "</ul></div>";
    if (c.sections.length) h += '<h2>Plan</h2><div class="carte"><ol>' + c.sections.map(li).join("") + "</ol></div>";
    if (c.definitions.length) {
      h += "<h2>Définitions</h2>" + c.definitions.map(function (d) { return '<div class="encadre def">' + d + "</div>"; }).join("");
    }
    if (c.resultats && c.resultats.length) {
      h += "<h2>Résultats formels</h2>" + c.resultats.map(function (d) { return '<div class="encadre">' + d + "</div>"; }).join("");
    }
    if (c.retenir.length) h += '<h2>À retenir</h2><div class="encadre retenir"><ul>' + c.retenir.map(li).join("") + "</ul></div>";
    var faibles = sectionsFaibles(id, 5);
    if (faibles.length) {
      h += "<h2>Vos points faibles dans ce chapitre</h2><div class=\"carte\"><table class=\"tab\"><tr><th>Notion</th><th>Réussite</th><th></th></tr>" +
        faibles.map(function (f) {
          return "<tr><td>" + esc(f.section) + "</td><td>" + f.taux + ' %</td><td><a class="btn petit second" href="#/ciblee/' +
            id + "/" + encodeURIComponent(f.section) + '">M\'entraîner</a></td></tr>';
        }).join("") + "</table></div>";
    }
    h += '<div class="actions">' + (i > 0 ? '<a class="btn second" href="#/chapitre/' + D.chapitres[i - 1].id + '">← ' + esc(D.chapitres[i - 1].court) + "</a>" : "") +
      (i < D.chapitres.length - 1 ? '<a class="btn second" href="#/chapitre/' + D.chapitres[i + 1].id + '">' + esc(D.chapitres[i + 1].court) + " →</a>" : "") + "</div>";
    cadre("cours", h);
  }
  function li(x) { return "<li>" + x + "</li>"; }

  // ------------------------------------------------------------ fiches
  function vueFiches() {
    var h = "<h1>Fiches d'auto-évaluation</h1><p class=\"doux\">Chaque fiche tire " + CFG.questions_par_fiche +
      " questions dans la banque du chapitre. Les questions ratées ou jamais vues reviennent plus souvent. " +
      "Vous pouvez reprendre une fiche autant de fois que vous le voulez. Seuil de réussite : " + CFG.seuil + " %.</p>";
    h += '<div class="carte"><table class="tab"><tr><th>Chapitre</th><th>Banque</th><th>Maîtrise</th><th>Meilleur</th><th>Dernier</th><th></th></tr>';
    D.chapitres.forEach(function (c) {
      var s = statsChapitre(c.id);
      h += "<tr><td><b>" + esc(c.court) + "</b> " + esc(c.titre) + "</td><td>" + s.total + "</td><td>" + s.maitrise + " %</td><td>" +
        (s.sessions ? s.meilleur + " %" : "–") + "</td><td>" + (s.dernier == null ? "–" : s.dernier + " %") +
        '</td><td><a class="btn petit" href="#/fiche/' + c.id + '">' + (s.sessions ? "Reprendre" : "Commencer") + "</a></td></tr>";
    });
    cadre("fiches", h + "</table></div>");
  }

  var EN_COURS = null, CHRONO = null;
  function lancer(type, titre, questions, dureeMin, ch, retour) {
    EN_COURS = { type: type, titre: titre, ch: ch || null, retour: retour, debut: Date.now(), duree: dureeMin * 60,
      questions: questions.map(function (q) {
        return { id: q.id, ordre: q.type === "qcm" ? melange(q.options.map(function (_, i) { return i; })) : null };
      }) };
    afficherSession();
  }
  function afficherSession() {
    var S = EN_COURS;
    var h = '<h1>' + esc(S.titre) + '</h1><div class="bandeau-fiche"><span>' + S.questions.length +
      ' questions</span><span>Temps restant : <span class="chrono" id="chrono"></span></span>' +
      '<span id="repondu" class="doux"></span><span style="margin-left:auto"></span>' +
      '<button class="btn" id="valider">Valider ma copie</button></div>';
    h += '<form id="copie">' + S.questions.map(function (sq, i) { return blocQuestion(sq, i); }).join("") + "</form>";
    h += '<div class="actions"><button class="btn" id="valider2">Valider ma copie</button>' +
      '<a class="btn second" href="#/' + S.retour + '">Abandonner</a></div>';
    cadre(S.type === "examen" ? "examen" : S.type === "oral" ? "oral" : "fiches", h);
    document.getElementById("valider").onclick = document.getElementById("valider2").onclick = function () { corriger(false); };
    document.getElementById("copie").addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b || EN_COURS == null) return;
      if (b.hasAttribute("data-voir")) {
        document.getElementById("att" + b.getAttribute("data-voir")).hidden = false; b.remove();
      } else if (b.hasAttribute("data-eval")) {
        var i = b.getAttribute("data-eval");
        document.getElementById("copie").elements["r" + i].value = b.getAttribute("data-v");
        b.parentNode.querySelectorAll("button").forEach(function (x) { x.classList.add("second"); });
        b.classList.remove("second");
        majRepondu();
      }
    });
    document.getElementById("copie").addEventListener("input", majRepondu);
    document.getElementById("copie").addEventListener("change", majRepondu);
    majRepondu();
    clearInterval(CHRONO);
    CHRONO = setInterval(tic, 1000); tic();
  }
  function blocQuestion(sq, i) {
    var q = qParId[sq.id], h = '<div class="carte question" id="b' + i + '"><span class="sect etiquette">' + esc(q.section) +
      (q.niv ? " · niveau " + q.niv : "") + '</span><span class="num">' + (i + 1) + ".</span>";
    if (q.type === "oral") {
      h += '<span class="etiquette avert">Question du jury</span> ' + esc(q.q) +
        '<div style="margin-top:8px"><textarea rows="3" placeholder="Formulez votre réponse comme devant le jury (facultatif), puis découvrez les points attendus." ' +
        'style="width:100%;padding:7px 10px;border:1px solid var(--bord);border-radius:8px;background:var(--fond);color:var(--texte)"></textarea></div>' +
        '<input type="hidden" name="r' + i + '" value="">' +
        '<div class="actions"><button type="button" class="btn petit second" data-voir="' + i + '">Voir les points attendus</button></div>' +
        '<div class="attendu" id="att' + i + '" hidden><div class="encadre retenir" style="white-space:pre-line">' + esc(q.r) + "</div>" +
        (q.expl ? '<div class="explication">' + esc(q.expl) + "</div>" : "") +
        '<div class="actions">Votre réponse couvrait-elle ces points ? ' +
        '<button type="button" class="btn petit second" data-eval="' + i + '" data-v="1">Oui</button>' +
        '<button type="button" class="btn petit second" data-eval="' + i + '" data-v="0.5">En partie</button>' +
        '<button type="button" class="btn petit second" data-eval="' + i + '" data-v="0">Non</button></div></div>';
    } else if (q.type === "qcm") {
      h += esc(q.q) + '<div class="options">' + sq.ordre.map(function (k) {
        return '<label><input type="radio" name="r' + i + '" value="' + k + '">' + esc(q.options[k]) + "</label>";
      }).join("") + "</div>";
    } else if (q.type === "vf") {
      h += '<span class="etiquette">Vrai ou faux</span> ' + esc(q.q) + '<div class="options">' +
        '<label><input type="radio" name="r' + i + '" value="vrai">Vrai</label>' +
        '<label><input type="radio" name="r' + i + '" value="faux">Faux</label></div>';
    } else {
      h += '<span class="etiquette">Complétez</span> ' + esc(q.q) +
        '<div style="margin-top:8px"><input type="text" name="r' + i + '" autocomplete="off" placeholder="Votre réponse"></div>';
    }
    return h + '<div class="zone-corr"></div></div>';
  }
  function lireReponse(i) {
    var f = document.getElementById("copie"), el = f.elements["r" + i];
    if (!el) return "";
    if (el.length !== undefined && el.type !== "text") {
      for (var k = 0; k < el.length; k++) if (el[k].checked) return el[k].value;
      return "";
    }
    return el.value.trim();
  }
  function majRepondu() {
    var n = 0; EN_COURS.questions.forEach(function (_, i) { if (lireReponse(i)) n++; });
    var e = document.getElementById("repondu"); if (e) e.textContent = n + " / " + EN_COURS.questions.length + " répondues";
  }
  function tic() {
    var S = EN_COURS; if (!S) return clearInterval(CHRONO);
    var reste = S.duree - Math.floor((Date.now() - S.debut) / 1000), el = document.getElementById("chrono");
    if (!el) return clearInterval(CHRONO);
    el.textContent = duree(Math.max(0, reste));
    if (reste <= 0) corriger(true);
  }
  function estJuste(q, rep) {
    if (q.type === "oral") return rep === "1";
    if (q.type === "qcm") return rep !== "" && Number(rep) === q.r;
    if (q.type === "vf") return rep === (q.r ? "vrai" : "faux");
    var n = normaliser(rep); if (!n) return false;
    return q.r.some(function (a) {
      var b = normaliser(a);
      return n === b || n.replace(/s$/, "") === b.replace(/s$/, "") || n.replace(/^(l'|le |la |les |un |une |des )/, "") === b;
    });
  }
  function bonneReponse(q) {
    if (q.type === "qcm") return q.options[q.r];
    if (q.type === "vf") return q.r ? "Vrai" : "Faux";
    return q.r.join(" ou ");
  }
  function corriger(auto) {
    var S = EN_COURS; if (!S || S.fini) return;
    if (!auto) {
      var vides = S.questions.filter(function (_, i) { return !lireReponse(i); }).length;
      if (vides && !confirm(vides + " question(s) sans réponse. Valider quand même ?")) return;
    }
    S.fini = true; clearInterval(CHRONO);
    var justes = 0, details = [], parCh = {};
    S.questions.forEach(function (sq, i) {
      var q = qParId[sq.id], rep = lireReponse(i), ok = estJuste(q, rep);
      justes += q.type === "oral" ? Number(rep || 0) : (ok ? 1 : 0);
      noterQ(q.id, ok);
      details.push([q.id, ok ? 1 : 0]);
      parCh[q.ch] = parCh[q.ch] || [0, 0]; parCh[q.ch][1]++; if (ok) parCh[q.ch][0]++;
      var b = document.getElementById("b" + i);
      b.classList.add(ok ? "juste" : "faux");
      b.querySelectorAll("input").forEach(function (x) { x.disabled = true; });
      if (q.type !== "trou") {
        b.querySelectorAll("label").forEach(function (lab) {
          var v = lab.querySelector("input").value;
          var bon = q.type === "qcm" ? Number(v) === q.r : v === (q.r ? "vrai" : "faux");
          if (bon) lab.classList.add("bonne"); else if (lab.querySelector("input").checked) lab.classList.add("mauvaise");
        });
      }
      if (q.type === "oral") {
        var att = document.getElementById("att" + i); if (att) att.hidden = false;
        b.querySelectorAll("button, textarea").forEach(function (x) { x.disabled = true; });
        b.querySelector(".zone-corr").innerHTML = '<div class="correction ' + (ok ? "ok" : "ko") + '">' +
          ({ "1": "✔ Su", "0.5": "◐ Su en partie", "0": "✘ Pas su" }[rep] || "✘ Non évaluée") + "</div>" +
          '<div class="explication">À revoir : ' + esc(chapParId[q.ch].court) + ", « " + esc(q.section) + " »</div>";
        return;
      }
      b.querySelector(".zone-corr").innerHTML = '<div class="correction ' + (ok ? "ok" : "ko") + '">' +
        (ok ? "✔ Juste" : "✘ " + (rep ? "Faux" : "Sans réponse") + ". Réponse attendue : <b>" + esc(bonneReponse(q)) + "</b>") + "</div>" +
        (q.expl ? '<div class="explication">' + esc(q.expl) + "</div>" : "") +
        '<div class="explication">À revoir : ' + esc(chapParId[q.ch].court) + ", « " + esc(q.section) + " »</div>";
    });
    var total = S.questions.length, p = pct(justes, total);
    var sess = { t: Date.now(), type: S.type, ch: S.ch, titre: S.titre, justes: justes, total: total, pct: p,
      duree: Math.round((Date.now() - S.debut) / 1000), details: details };
    P.sessions.push(sess); sauver();
    var reussi = p >= CFG.seuil;
    var res = '<div class="carte" style="margin:14px 0"><div class="score-grand" style="color:var(--' + (reussi ? "ok" : "ko") + ')">' +
      justes + " / " + total + " · " + p + " %</div><p>" + (reussi ? "Fiche réussie." : "Seuil de " + CFG.seuil + " % non atteint.") +
      " Durée : " + duree(sess.duree) + (auto ? " (temps écoulé)" : "") + ".</p>";
    if (S.type === "examen" || S.type === "oral") {
      res += '<table class="tab"><tr><th>Chapitre</th><th>Résultat</th></tr>' + Object.keys(parCh).map(function (k) {
        return "<tr><td>" + esc(chapParId[k].court + " · " + chapParId[k].titre) + "</td><td>" + parCh[k][0] + " / " + parCh[k][1] + "</td></tr>";
      }).join("") + "</table>";
    }
    var faibles = {}; S.questions.forEach(function (sq, i) {
      var q = qParId[sq.id]; if (!details[i][1]) faibles[q.ch + "|" + q.section] = q;
    });
    var fk = Object.keys(faibles);
    if (fk.length) {
      res += "<h3>À retravailler</h3><ul>" + fk.slice(0, 6).map(function (k) {
        var q = faibles[k]; return "<li>" + esc(chapParId[q.ch].court) + " · " + esc(q.section) + "</li>";
      }).join("") + "</ul>";
    }
    res += '<div class="actions">' + (S.ch ? '<a class="btn" href="#/' + (S.type === "jury" ? "jury/" : "fiche/") + S.ch + '">' + (S.type === "jury" ? "Nouvelles questions du jury" : "Refaire une fiche") + '</a>' +
      '<a class="btn second" href="#/chapitre/' + S.ch + '">Réviser le chapitre</a>' :
      (S.type === "oral" ? '<a class="btn" href="#/oral">Nouvelle simulation</a>' : '<a class="btn" href="#/examen">Nouvel examen blanc</a>')) +
      '<a class="btn second" href="#/progression">Ma progression</a></div></div>';
    var zone = document.createElement("div"); zone.innerHTML = res;
    var titre = main.querySelector("h1"); titre.parentNode.insertBefore(zone, titre.nextSibling);
    document.querySelectorAll("#valider, #valider2").forEach(function (b) { b.disabled = true; });
    var band = main.querySelector(".bandeau-fiche"); if (band) band.style.display = "none";
    window.scrollTo(0, 0);
    EN_COURS = null;
  }
  function vueFiche(id, niv) {
    var c = chapParId[id]; if (!c) return vueFiches();
    niv = Number(niv) || null;
    lancer("fiche", "Fiche " + c.court + (niv ? " · niveau " + niv : "") + " · " + c.titre, tirageFiche(id, niv),
      CFG.duree_fiche, id, "chapitre/" + id);
  }
  function dureeOral(n) { return Math.max(10, Math.round(n * ((CFG.grand_oral && CFG.grand_oral.minutes_par_question) || 3))); }
  function vueJury(id) {
    var c = chapParId[id]; if (!c) return vueFiches();
    var n = (CFG.grand_oral && CFG.grand_oral.questions) || 20, qs = tirageOral([id], n);
    lancer("jury", "Questions du jury · " + c.court + " · " + c.titre, qs, dureeOral(qs.length), id, "chapitre/" + id);
  }
  function vueGrandOral() {
    var G = CFG.grand_oral || { questions: 20 };
    var h = "<h1>Grand oral</h1><p class=\"doux\">Simulation de soutenance : " + G.questions +
      " questions du jury tirées dans les chapitres choisis, de la plus simple à la plus exigeante. Pour chacune, formulez " +
      "votre réponse à voix haute ou par écrit, découvrez les points attendus, puis évaluez-vous honnêtement. " +
      "Temps : " + dureeOral(G.questions) + " minutes.</p>";
    h += '<div class="carte"><b>Chapitres à inclure</b><div class="options" id="choix">' + D.chapitres.filter(function (c) {
      return questionsDe(c.id).some(function (q) { return q.type === "oral"; });
    }).map(function (c) {
      return '<label><input type="checkbox" value="' + c.id + '" checked>' + esc(c.court + " · " + c.titre) + "</label>";
    }).join("") + '</div><div class="actions"><button class="btn" id="go">Commencer la simulation</button></div></div>';
    var ex = P.sessions.filter(function (s) { return s.type === "oral"; }).slice(-8).reverse();
    if (ex.length) {
      h += '<h2>Dernières simulations</h2><div class="carte"><table class="tab"><tr><th>Date</th><th>Score</th><th>Durée</th></tr>' +
        ex.map(function (s) { return "<tr><td>" + dateCourte(s.t) + "</td><td>" + s.justes + " / " + s.total + " (" + s.pct + " %)</td><td>" + duree(s.duree) + "</td></tr>"; }).join("") +
        "</table></div>";
    }
    cadre("oral", h);
    document.getElementById("go").onclick = function () {
      var chs = []; document.querySelectorAll("#choix input:checked").forEach(function (x) { chs.push(x.value); });
      if (!chs.length) return alert("Choisissez au moins un chapitre.");
      var qs = tirageOral(chs, G.questions);
      lancer("oral", "Grand oral", qs, dureeOral(qs.length), null, "oral");
    };
  }
  function vueCiblee(id, section) {
    var c = chapParId[id]; if (!c) return vueFiches();
    var pool = questionsDe(id).filter(function (q) { return q.section === section; });
    var ratees = questionsDe(id).filter(function (q) { var e = P.q[q.id]; return e && e.dernier === false && q.section !== section; });
    var qs = tirer(pool, Math.min(pool.length, CFG.questions_par_fiche));
    if (qs.length < CFG.questions_par_fiche) qs = qs.concat(tirer(ratees, CFG.questions_par_fiche - qs.length));
    if (qs.length < 5) qs = qs.concat(tirer(questionsDe(id).filter(function (q) { return qs.indexOf(q) < 0; }), 10 - qs.length));
    lancer("ciblee", "Entraînement ciblé · " + section, qs, CFG.duree_fiche, id, "chapitre/" + id);
  }

  // ------------------------------------------------------------ examen blanc
  function vueExamen() {
    var E = CFG.examen;
    var h = "<h1>Examen blanc</h1><p class=\"doux\">" + E.questions + " questions tirées dans les chapitres choisis, en " +
      E.duree + " minutes. La correction et le bilan par chapitre s'affichent à la fin.</p>";
    h += '<div class="carte"><b>Chapitres à inclure</b><div class="options" id="choix">' + D.chapitres.map(function (c) {
      return '<label><input type="checkbox" value="' + c.id + '" checked>' + esc(c.court + " · " + c.titre) + "</label>";
    }).join("") + '</div><div class="actions"><button class="btn" id="go">Commencer l\'examen</button>' +
      '<button class="btn second" id="aucun">Tout décocher</button></div></div>';
    var ex = P.sessions.filter(function (s) { return s.type === "examen"; }).slice(-8).reverse();
    if (ex.length) {
      h += '<h2>Derniers examens</h2><div class="carte"><table class="tab"><tr><th>Date</th><th>Score</th><th>Durée</th></tr>' +
        ex.map(function (s) { return "<tr><td>" + dateCourte(s.t) + "</td><td>" + s.justes + " / " + s.total + " (" + s.pct + " %)</td><td>" + duree(s.duree) + "</td></tr>"; }).join("") +
        "</table></div>";
    }
    cadre("examen", h);
    document.getElementById("aucun").onclick = function () { document.querySelectorAll("#choix input").forEach(function (x) { x.checked = false; }); };
    document.getElementById("go").onclick = function () {
      var chs = []; document.querySelectorAll("#choix input:checked").forEach(function (x) { chs.push(x.value); });
      if (!chs.length) return alert("Choisissez au moins un chapitre.");
      lancer("examen", "Examen blanc", tirageExamen(chs), E.duree, null, "examen");
    };
  }

  // ------------------------------------------------------------ progression
  function graphe(points, larg, haut) {
    larg = larg || 640; haut = haut || 200;
    var g = 34, n = points.length;
    var x = function (i) { return g + (n === 1 ? (larg - 2 * g) / 2 : i * (larg - 2 * g) / (n - 1)); };
    var y = function (v) { return haut - 24 - v * (haut - 40) / 100; };
    var s = '<svg class="graph" viewBox="0 0 ' + larg + " " + haut + '" width="100%" role="img" aria-label="Évolution des scores">';
    [0, 50, 100].forEach(function (v) {
      s += '<line class="axe" x1="' + g + '" x2="' + (larg - 10) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="4" y="' + (y(v) + 4) + '">' + v + " %</text>";
    });
    s += '<line class="seuil" x1="' + g + '" x2="' + (larg - 10) + '" y1="' + y(CFG.seuil) + '" y2="' + y(CFG.seuil) + '"/>';
    if (n > 1) s += '<polyline class="courbe" points="' + points.map(function (p, i) { return x(i) + "," + y(p); }).join(" ") + '"/>';
    points.forEach(function (p, i) { s += '<circle class="point" r="3.5" cx="' + x(i) + '" cy="' + y(p) + '"><title>' + p + " %</title></circle>"; });
    return s + "</svg>";
  }
  function vueProgression() {
    var h = "<h1>Ma progression</h1>";
    if (!P.sessions.length) {
      cadre("progression", h + '<div class="carte">Aucune fiche passée pour l\'instant.<div class="actions"><a class="btn" href="#/fiches">Faire une fiche</a></div></div>');
      return;
    }
    h += '<h2>Évolution des scores</h2><div class="carte">' + graphe(P.sessions.slice(-40).map(function (s) { return s.pct; })) +
      '<p class="petit doux">Vos ' + Math.min(40, P.sessions.length) + " dernières fiches et examens. La ligne pointillée marque le seuil de " + CFG.seuil + " %.</p></div>";
    h += '<h2>Par chapitre</h2><div class="carte"><table class="tab"><tr><th>Chapitre</th><th>Maîtrise</th><th>Couverture</th><th>Fiches</th><th>Meilleur</th></tr>';
    D.chapitres.forEach(function (c) {
      var s = statsChapitre(c.id);
      h += '<tr><td><a href="#/chapitre/' + c.id + '">' + esc(c.court) + "</a> " + esc(c.titre) + '</td><td style="min-width:110px">' +
        jauge(s.maitrise) + '<span class="petit">' + s.maitrise + " %</span></td><td>" + s.couverture + " %</td><td>" + s.sessions + "</td><td>" + (s.sessions ? s.meilleur + " %" : "–") + "</td></tr>";
    });
    h += '</table><p class="petit doux">Maîtrise : part des questions de la banque dont votre dernière réponse est juste. Couverture : part des questions déjà rencontrées.</p></div>';
    var faibles = sectionsFaibles(null, 10);
    if (faibles.length) {
      h += '<h2>Notions à retravailler</h2><div class="carte"><table class="tab"><tr><th>Notion</th><th>Chapitre</th><th>Réussite</th><th></th></tr>' +
        faibles.map(function (f) {
          return "<tr><td>" + esc(f.section) + "</td><td>" + esc(chapParId[f.ch].court) + "</td><td>" + f.taux + ' %</td><td><a class="btn petit second" href="#/ciblee/' +
            f.ch + "/" + encodeURIComponent(f.section) + '">M\'entraîner</a></td></tr>';
        }).join("") + "</table></div>";
    }
    h += '<h2>Historique</h2><div class="carte"><table class="tab"><tr><th>Date</th><th>Activité</th><th>Score</th></tr>' +
      P.sessions.slice(-25).reverse().map(function (s) {
        return "<tr><td>" + dateCourte(s.t) + "</td><td>" + esc(s.titre) + "</td><td>" + s.justes + " / " + s.total + " (" + s.pct + " %)</td></tr>";
      }).join("") + "</table></div>";
    cadre("progression", h);
  }

  // ------------------------------------------------------------ labs
  function vueLabs() {
    var h = "<h1>Labs</h1><p class=\"doux\">Chaque lab s'appuie sur des pièces fournies dans le dossier de l'application. " +
      "Analysez-les avec vos outils (tableur, éditeur de texte, invite de commandes), puis saisissez vos constats. " +
      "Vous pouvez soumettre autant de fois que vous le voulez.</p><div class=\"grille\">";
    D.labs.forEach(function (l) {
      var e = P.labs[l.id], m = e ? e.meilleur : null;
      h += '<div class="carte"><span class="etiquette">' + esc(l.id) + "</span>" +
        (m == null ? "" : '<span class="etiquette ' + (m >= l.seuil ? "ok" : "avert") + '">' + m + " %</span>") +
        "<h3>" + esc(l.titre) + '</h3><p class="petit doux">' + esc(chapParId[l.chapitre] ? chapParId[l.chapitre].court + " · " + chapParId[l.chapitre].titre : "") +
        " · " + l.duree + ' min</p><div class="actions"><a class="btn petit" href="#/lab/' + l.id + '">' + (e ? "Reprendre" : "Commencer") + "</a></div></div>";
    });
    cadre("labs", h + "</div>");
  }
  function hashReponse(l, c, brut) {
    var v = String(brut || "").trim();
    if (c.type === "numerique") {
      var x = parseFloat(v.replace(/\s/g, "").replace(",", "."));
      if (isNaN(x)) return "";
      v = (Math.round(x / c.pas) * c.pas).toFixed(c.decimales);
    } else if (c.type === "liste") {
      v = v.split(/[,;\n]+/).map(normaliser).filter(Boolean).sort().join(",");
    } else {
      v = normaliser(v).replace(/\s*([:\/.-])\s*/g, "$1");
    }
    return sha256(l.id + "|" + c.id + "|" + v);
  }
  function vueLab(id) {
    var l = D.labs.filter(function (x) { return x.id === id; })[0]; if (!l) return vueLabs();
    var e = P.labs[l.id] || { tentatives: 0, meilleur: null, controles: {}, historique: [] };
    var c = chapParId[l.chapitre];
    var h = '<p class="doux">' + esc(l.id) + (c ? " · " + esc(c.court + " · " + c.titre) : "") + " · " + l.duree + " min · seuil " + l.seuil + " %</p><h1>" + esc(l.titre) + "</h1>";
    h += '<div class="carte"><h3 style="margin-top:0">Briefing</h3><div style="white-space:pre-line">' + esc(l.briefing) + "</div></div>";
    h += '<h2>Pièces</h2><div class="carte"><table class="tab"><tr><th>Fichier</th><th>Taille</th></tr>' + l.pieces.map(function (p) {
      return '<tr><td><a href="' + esc(p.chemin) + '" target="_blank">' + esc(p.nom) + "</a></td><td>" + p.taille + "</td></tr>";
    }).join("") + '</table><div class="actions"><a class="btn second" href="' + esc(l.dossier) + '" target="_blank">Ouvrir le dossier des pièces</a></div>' +
      '<p class="petit doux">Travaillez sur une copie des pièces. Les empreintes SHA-256 de référence sont dans le manifeste.</p></div>';
    if (l.rappel && l.rappel.length) {
      h += '<h2>Rappels de méthode</h2><div class="encadre">' + l.rappel.map(function (r) {
        return "<b>" + esc(r.titre) + "</b><ul>" + r.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
      }).join("") + "</div>";
    }
    h += '<h2>Vos constats</h2><form id="flab">' + l.controles.map(function (k, i) {
      var st = e.controles[k.id];
      return '<div class="carte question" id="c' + i + '"><span class="sect etiquette">Partie ' + esc(k.partie) + " · " + k.points + ' pts</span><span class="num">' + (i + 1) + ".</span>" +
        esc(k.question) + (k.unite ? ' <span class="doux">(' + esc(k.unite) + ")</span>" : "") +
        '<div style="margin-top:8px"><input type="text" name="k' + i + '" autocomplete="off" placeholder="' +
        (k.type === "liste" ? "Valeurs séparées par des virgules" : "Votre réponse") + '"></div>' +
        '<div class="zone-corr">' + (st ? '<div class="correction ' + (st.ok ? "ok" : "ko") + '">' + (st.ok ? "✔ Déjà trouvé" : "✘ Pas encore trouvé") + " · " + st.essais + " essai(s)</div>" : "") + "</div></div>";
    }).join("") + '</form><div class="actions"><button class="btn" id="soumettre">Vérifier mes constats</button><a class="btn second" href="#/labs">Retour aux labs</a></div>';
    if (e.historique.length) {
      h += '<h2>Mes tentatives</h2><div class="carte">' + graphe(e.historique.map(function (x) { return x.pct; }), 640, 160) + "</div>";
    }
    cadre("labs", h);
    document.getElementById("soumettre").onclick = function () {
      var f = document.getElementById("flab"), tot = 0, gagne = 0;
      l.controles.forEach(function (k, i) {
        var v = f.elements["k" + i].value, ok = v.trim() !== "" && k.h.indexOf(hashReponse(l, k, v)) >= 0;
        var st = e.controles[k.id] || { ok: false, essais: 0 };
        if (v.trim() !== "") { st.essais++; st.ok = st.ok || ok; }
        e.controles[k.id] = st;
        tot += k.points; if (ok) gagne += k.points;
        var b = document.getElementById("c" + i);
        b.classList.remove("juste", "faux");
        if (v.trim() !== "") b.classList.add(ok ? "juste" : "faux");
        b.querySelector(".zone-corr").innerHTML = v.trim() === "" ? '<div class="correction ko">Sans réponse</div>' :
          '<div class="correction ' + (ok ? "ok" : "ko") + '">' + (ok ? "✔ Constat exact" : "✘ Constat inexact") + "</div>" +
          (!ok && k.indice && st.essais >= 1 ? '<div class="explication">Indice : ' + esc(k.indice) + "</div>" : "");
      });
      var p = pct(gagne, tot);
      e.tentatives++; e.meilleur = Math.max(e.meilleur || 0, p); e.historique.push({ t: Date.now(), pct: p });
      P.labs[l.id] = e; sauver();
      var z = document.getElementById("bilan-lab");
      if (!z) { z = document.createElement("div"); z.id = "bilan-lab"; z.className = "carte"; z.style.margin = "14px 0";
        var a = main.querySelector(".actions:last-of-type"); a.parentNode.insertBefore(z, a); }
      z.innerHTML = '<div class="score-grand" style="color:var(--' + (p >= l.seuil ? "ok" : "ko") + ')">' + gagne + " / " + tot + " · " + p + " %</div>" +
        "<p>" + (p >= l.seuil ? "Lab réussi." : "Seuil de " + l.seuil + " % non atteint. Corrigez les constats inexacts et soumettez de nouveau.") +
        " Tentative n° " + e.tentatives + ", meilleur score " + e.meilleur + " %.</p>";
    };
  }

  // ------------------------------------------------------------ paramètres
  function vueParametres() {
    var h = "<h1>Paramètres</h1>";
    if (!U.personnel) h += '<div class="carte"><h3 style="margin-top:0">Mon compte</h3><p>' + esc(U.prenom + " " + U.nom) + " · matricule " + esc(U.matricule) +
      '</p><p class="petit doux">Connecté depuis le ' + dateCourte(U.ouvert) + ". Fermer l'onglet vous déconnecte.</p>" +
      '<div class="actions"><a class="btn petit second" href="#/deconnexion">Se déconnecter</a></div></div>';
    h += '<h2>Sauvegarde</h2><div class="carte"><p>Votre progression est enregistrée dans ce navigateur, sur cet appareil. ' +
      "Si vous changez de navigateur, d'ordinateur ou si vous déplacez le dossier de l'application, exportez-la puis réimportez-la.</p>" +
      '<div class="actions"><button class="btn" id="exporter">Exporter ma progression</button>' +
      '<label class="btn second">Importer un fichier<input type="file" id="importer" accept=".json" hidden></label></div></div>';
    h += '<h2>Affichage</h2><div class="carte"><div class="actions" style="margin-top:0">' +
      '<button class="btn petit second" data-theme="">Automatique</button><button class="btn petit second" data-theme="clair">Clair</button>' +
      '<button class="btn petit second" data-theme="sombre">Sombre</button></div></div>';
    h += '<h2>Réinitialiser</h2><div class="carte"><p class="petit doux">Efface toute la progression de ce cours sur cet appareil.</p>' +
      '<button class="btn petit second" id="raz" style="border-color:var(--ko);color:var(--ko)">Tout effacer</button></div>';
    h += '<h2>À propos</h2><div class="carte petit">NDAP SUKULU autonome, édition ' + (TEL ? "téléphone" : "ordinateur") + ", version " + esc(D.version) +
      " du " + esc(D.genere) + ". " + D.questions.length + " questions, " + D.chapitres.length + " chapitres" + (TEL ? "" : ", " + D.labs.length + " labs") + ".<br>" + esc(C.pied) + "</div>";
    cadre("parametres", h);
    document.getElementById("exporter").onclick = function () {
      var blob = new Blob([JSON.stringify({ cours: C.code, exporte: new Date().toISOString(), progression: P }, null, 1)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "ndap-sukulu_" + C.code + "_" + (U.matricule ? U.matricule.replace(/\W+/g, "_") + "_" : "") + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
    };
    document.getElementById("importer").onchange = function (ev) {
      var f = ev.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var o = JSON.parse(r.result);
          if (o.cours !== C.code) return alert("Ce fichier concerne le cours " + o.cours + ", pas " + C.code + ".");
          if (!confirm("Remplacer la progression actuelle par celle du fichier ?")) return;
          P = o.progression; sauver(); alert("Progression importée."); location.hash = "#/accueil";
        } catch (e) { alert("Fichier illisible."); }
      };
      r.readAsText(f);
    };
    document.querySelectorAll("[data-theme]").forEach(function (b) {
      b.onclick = function () {
        var t = b.getAttribute("data-theme");
        try { localStorage.setItem("ndap-sukulu:theme", t); } catch (e) {}
        appliquerTheme();
      };
    });
    document.getElementById("raz").onclick = function () {
      if (confirm("Effacer définitivement toute votre progression pour " + C.code + " sur cet appareil ?")) {
        try { localStorage.removeItem(CLE); } catch (e) {} charger(); location.hash = "#/accueil";
      }
    };
  }
  function appliquerTheme() {
    var t = ""; try { t = localStorage.getItem("ndap-sukulu:theme") || ""; } catch (e) {}
    if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
  }

  // ------------------------------------------------------------ routage
  function router() {
    if (EN_COURS && !EN_COURS.fini && !confirm("Quitter la fiche en cours ? Vos réponses seront perdues.")) {
      history.replaceState(null, "", "#/" + (EN_COURS.type === "examen" ? "examen" : EN_COURS.type === "oral" ? "oral" : (EN_COURS.type === "jury" ? "jury/" : "fiche/") + EN_COURS.ch)); return;
    }
    if (EN_COURS) { EN_COURS = null; clearInterval(CHRONO); }
    var p = (location.hash.replace(/^#\/?/, "") || "accueil").split("/").map(decodeURIComponent);
    switch (p[0]) {
      case "cours": return vueCours();
      case "chapitre": return vueChapitre(p[1]);
      case "fiches": return vueFiches();
      case "fiche": return vueFiche(p[1], p[2]);
      case "jury": return vueJury(p[1]);
      case "oral": return A_ORAL ? vueGrandOral() : vueAccueil();
      case "ciblee": return vueCiblee(p[1], p.slice(2).join("/"));
      case "examen": return vueExamen();
      case "progression": return vueProgression();
      case "labs": return TEL ? vueAccueil() : vueLabs();
      case "lab": return TEL ? vueAccueil() : vueLab(p[1]);
      case "badges": return vueBadges();
      case "aide": return vueAide();
      case "parametres": return vueParametres();
      case "deconnexion": return window.NS_DECONNEXION();
      default: return vueAccueil();
    }
  }
  appliquerTheme();
  document.getElementById("bandeau").textContent = C.bandeau;
  document.getElementById("sous").textContent = C.sigle + " · " + C.titre;
  document.getElementById("pied").textContent = C.pied;
  document.title = "NDAP SUKULU · " + C.sigle;
  window.addEventListener("hashchange", router);
  // Un lien vers la page courante (« Refaire une fiche ») ne déclenche pas
  // hashchange : on relance la vue nous-mêmes.
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#/"]');
    if (a && a.getAttribute("href") === location.hash) { ev.preventDefault(); router(); }
  });
  window.addEventListener("beforeunload", function (e) { if (EN_COURS && !EN_COURS.fini) { e.preventDefault(); e.returnValue = ""; } });
  router();
  if (TEL && "serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
