/* NDAP SUKULU autonome : badges de chapitre (version locale).
   Un badge récompense un chapitre dont toutes les évaluations sont faites et dont le score
   atteint 60 %. Quatre niveaux : Acquis, Validé, Maîtrise, Excellence.
   Ce fichier ne calcule aucune note : app.js (révision) et eval.js (évaluation) lui donnent,
   pour chaque chapitre, le meilleur score de chaque évaluation. Il rend le dessin du badge,
   la barre de trophées et la page « Mes badges ».
   En mode évaluation, l'enseignant signe chaque badge à la publication des résultats : la page
   « Mes badges » affiche alors un QR code de vérification sous le badge accepté. */
(function () {
  "use strict";
  var NIVEAUX = [
    { cle: "acquis", nom: "Acquis", min: 60, metal: "vermeil", etoiles: 1,
      rim1: "#f3b0ac", rim2: "#9e2b2b", d1: "#3c1113", d2: "#1b0708", laurier: "#e59a96", rub1: "#c0392b", rub2: "#8e2420", etoile: "#ffe0de" },
    { cle: "valide", nom: "Validé", min: 70, metal: "bronze", etoiles: 2,
      rim1: "#edc196", rim2: "#8a4f23", d1: "#2a1a0f", d2: "#140a05", laurier: "#d89a5e", rub1: "#b5732e", rub2: "#834f1d", etoile: "#ffe6c8" },
    { cle: "maitrise", nom: "Maîtrise", min: 85, metal: "argent", etoiles: 3,
      rim1: "#f4f7fa", rim2: "#93a1af", d1: "#1b2733", d2: "#0a1118", laurier: "#c6d0da", rub1: "#8b98a6", rub2: "#5c6773", etoile: "#ffffff" },
    { cle: "excellence", nom: "Excellence", min: 95, metal: "or", etoiles: 4,
      rim1: "#faec8f", rim2: "#c6921f", d1: "#17213a", d2: "#070f22", laurier: "#ecc659", rub1: "#e9b949", rub2: "#bd8622", etoile: "#fff4cf" }
  ];
  var ACC = "#37b6d6", POLICE = "Montserrat,Segoe UI,Arial,sans-serif", N = 0;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // Indice du niveau atteint par un score en pourcentage, ou -1 sous 60.
  function niveauDe(p) {
    var r = -1;
    if (p == null || isNaN(p)) return r;
    NIVEAUX.forEach(function (n, i) { if (p + 1e-9 >= n.min) r = i; });
    return r;
  }
  function txtScore(p) { return String(Math.round(p * 10) / 10).replace(".", ",") + " %"; }
  // Préparations aux certifications (code PREP-...) : l'unité est le domaine, pas le chapitre.
  function unite(code) { return /^PREP-/i.test(code || "") ? "domaine" : "chapitre"; }
  function libelleChapitre(c) {
    var m = /^Ch\.\s*(\d+)/.exec(c.court || "");
    return m ? "Chapitre " + ("0" + m[1]).slice(-2) : (c.court || c.id);
  }

  // ------------------------------------------------------------ dessin
  function etoile(cx, cy, r, couleur) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * 0.42;
      p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1));
    }
    return '<polygon points="' + p.join(" ") + '" fill="' + couleur + '"/>';
  }
  function laurier(cx, cy, couleur, droite) {
    var h = '<g fill="' + couleur + '">';
    for (var a = droite ? -48 : 132; a <= (droite ? 48 : 228); a += 16) {
      var r = a * Math.PI / 180, x = (cx + 150 * Math.cos(r)).toFixed(1), y = (cy + 150 * Math.sin(r)).toFixed(1);
      h += '<ellipse cx="' + x + '" cy="' + y + '" rx="17" ry="7" transform="rotate(' + (a + 90) + " " + x + " " + y + ')"/>';
    }
    return h + "</g>";
  }
  // o : { code, chapitre, niveau (indice), bandeau (texte facultatif), titre (texte lu par les lecteurs d'écran) }
  function svg(o) {
    var t = NIVEAUX[o.niveau] || NIVEAUX[0], u = "nsb" + (++N), cx = 250, cy = 280, R = 198;
    var code = String(o.code || ""), tailleCode = code.length > 13 ? Math.max(15, Math.floor(26 * 13 / code.length)) : 26;
    var bandeau = (o.bandeau || t.nom).toUpperCase(), ry = cy + 132, rw = 330, rh = 50, x0 = cx - rw / 2, h = "";
    h += '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 30 500 500" role="img" aria-label="' + esc(o.titre || ("Badge " + t.nom + ", " + o.chapitre + ", " + code)) + '">';
    h += "<defs>" +
      '<linearGradient id="' + u + 'r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + t.rim1 + '"/><stop offset="0.5" stop-color="' + t.rim2 + '"/><stop offset="1" stop-color="' + t.rim1 + '"/></linearGradient>' +
      '<radialGradient id="' + u + 'd" cx="0.5" cy="0.36" r="0.75"><stop offset="0" stop-color="' + t.d1 + '"/><stop offset="1" stop-color="' + t.d2 + '"/></radialGradient>' +
      '<linearGradient id="' + u + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + t.rub1 + '"/><stop offset="1" stop-color="' + t.rub2 + '"/></linearGradient>' +
      '<path id="' + u + 'a" d="M ' + (cx - 158) + " " + cy + " A 158 158 0 0 1 " + (cx + 158) + " " + cy + '"/>' +
      '<path id="' + u + 'c" d="M ' + (cx - 133) + " " + cy + " A 133 133 0 0 1 " + (cx + 133) + " " + cy + '"/></defs>';
    h += '<circle cx="' + cx + '" cy="' + (cy + 8) + '" r="' + (R + 20) + '" fill="#000" opacity="0.13"/>';
    h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 18) + '" fill="url(#' + u + 'r)"/>';
    h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 6) + '" fill="none" stroke="#fff" stroke-width="2" opacity="0.35"/>';
    h += '<path d="M ' + (cx - 154) + " " + (cy - 119) + " A " + (R + 10) + " " + (R + 10) + " 0 0 1 " + (cx + 40) + " " + (cy - 194) + '" fill="none" stroke="#fff" stroke-width="7" opacity="0.5" stroke-linecap="round"/>';
    h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#' + u + 'd)"/>';
    h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + ACC + '" stroke-width="1.5" opacity="0.5"/>';
    h += '<ellipse cx="' + cx + '" cy="' + (cy - 72) + '" rx="150" ry="78" fill="#fff" opacity="0.07"/>';
    h += '<text font-family="' + POLICE + '" font-size="29" font-weight="800" letter-spacing="3" fill="#fff"><textPath href="#' + u + 'a" xlink:href="#' + u + 'a" startOffset="50%" text-anchor="middle">NDAP SUKULU</textPath></text>';
    h += '<text font-family="' + POLICE + '" font-size="16" font-weight="500" letter-spacing="1" fill="' + ACC + '"><textPath href="#' + u + 'c" xlink:href="#' + u + 'c" startOffset="50%" text-anchor="middle">by MaletYon</textPath></text>';
    h += laurier(cx, cy + 6, t.laurier, false) + laurier(cx, cy + 6, t.laurier, true);
    var sy = cy - 92;
    h += '<path d="M ' + (cx - 40) + " " + sy + " L " + (cx + 40) + " " + sy + " L " + (cx + 40) + " " + (sy + 56) + " Q " + (cx + 40) + " " + (sy + 84) + " " + cx + " " + (sy + 98) +
      " Q " + (cx - 40) + " " + (sy + 84) + " " + (cx - 40) + " " + (sy + 56) + ' Z" fill="#0c2036" stroke="' + ACC + '" stroke-width="3"/>';
    h += '<path d="M ' + (cx - 23) + " " + (sy + 70) + " L " + (cx - 23) + " " + (sy + 26) + " L " + cx + " " + (sy + 52) + '" fill="none" stroke="' + ACC + '" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>';
    h += '<path d="M ' + cx + " " + (sy + 52) + " L " + (cx + 23) + " " + (sy + 26) + " L " + (cx + 23) + " " + (sy + 70) + '" fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>';
    h += '<rect x="' + (cx - 145) + '" y="' + (cy + 8) + '" width="290" height="54" rx="10" fill="#081a2e" stroke="' + ACC + '" stroke-width="2"/>';
    h += '<text x="' + cx + '" y="' + (cy + 44) + '" font-family="' + POLICE + '" font-size="' + tailleCode + '" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="1">' + esc(code) + "</text>";
    h += '<text x="' + cx + '" y="' + (cy + 94) + '" font-family="' + POLICE + '" font-size="20" font-weight="600" fill="' + ACC + '" text-anchor="middle" letter-spacing="2">' + esc(o.chapitre || "") + "</text>";
    for (var k = 0; k < t.etoiles; k++) h += etoile(cx - (t.etoiles - 1) * 15 + k * 30, cy + 118, 11, t.etoile);
    h += '<path d="M ' + (x0 - 18) + " " + (ry + 8) + " L " + x0 + " " + ry + " L " + x0 + " " + (ry + rh) + " L " + (x0 - 18) + " " + (ry + rh + 16) + " L " + (x0 - 6) + " " + (ry + rh - 2) + ' Z" fill="' + t.rub2 + '"/>';
    h += '<path d="M ' + (x0 + rw + 18) + " " + (ry + 8) + " L " + (x0 + rw) + " " + ry + " L " + (x0 + rw) + " " + (ry + rh) + " L " + (x0 + rw + 18) + " " + (ry + rh + 16) + " L " + (x0 + rw + 6) + " " + (ry + rh - 2) + ' Z" fill="' + t.rub2 + '"/>';
    h += '<rect x="' + x0 + '" y="' + ry + '" width="' + rw + '" height="' + rh + '" fill="url(#' + u + 'b)" stroke="#fff" stroke-width="1.2"/>';
    h += '<rect x="' + x0 + '" y="' + ry + '" width="' + rw + '" height="20" fill="#fff" opacity="0.14"/>';
    h += '<circle cx="' + (x0 + 32) + '" cy="' + (ry + 25) + '" r="14" fill="none" stroke="#fff" stroke-width="3"/>';
    h += '<path d="M ' + (x0 + 25) + " " + (ry + 25) + ' l 5 6 l 10 -12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
    h += '<text x="' + (cx + 14) + '" y="' + (ry + 33) + '" font-family="' + POLICE + '" font-size="24" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="2">' + esc(bandeau) + "</text>";
    var ty = ry + rh + 16;
    h += '<polygon points="' + (cx - 26) + "," + ty + " " + cx + "," + (ty - 11) + " " + (cx + 26) + "," + ty + " " + cx + "," + (ty + 11) + '" fill="#0c2036" stroke="' + ACC + '" stroke-width="1.5"/>';
    h += '<circle cx="' + cx + '" cy="' + ty + '" r="3" fill="' + ACC + '"/>';
    return h + "</svg>";
  }

  // ------------------------------------------------------------ calcul
  // chapitres : [{ id, court, titre, evals: [{ titre, meilleur }] }] où meilleur est un pourcentage
  // ou null quand l'évaluation n'est pas faite. Rend la même liste, complétée.
  function calculer(chapitres) {
    return chapitres.filter(function (c) { return c.evals && c.evals.length; }).map(function (c) {
      var faites = c.evals.filter(function (e) { return e.meilleur != null; });
      var complet = faites.length === c.evals.length;
      var score = complet ? faites.reduce(function (s, e) { return s + e.meilleur; }, 0) / faites.length : null;
      return { id: c.id, court: c.court, titre: c.titre, libelle: libelleChapitre(c), total: c.evals.length,
               manquantes: c.evals.length - faites.length, complet: complet, score: score, niveau: complet ? niveauDe(score) : -1 };
    });
  }
  function bilan(liste, acceptes) {
    var b = { acceptes: 0, a_accepter: 0, restants: 0, total: liste.length };
    liste.forEach(function (c) {
      var a = acceptes[c.id];
      if (a) b.acceptes++;
      if (c.niveau >= 0 && (!a || c.niveau > a.niveau)) b.a_accepter++;
      if (!a && c.niveau < 0) b.restants++;
    });
    return b;
  }

  // ------------------------------------------------------------ styles
  function styles() {
    if (document.getElementById("style-badges")) return;
    var s = document.createElement("style");
    s.id = "style-badges";
    s.textContent =
      ".bdg-barre{display:flex;align-items:center;gap:6px;flex-wrap:wrap}" +
      ".bdg-barre a.bdg-mini{display:block;width:64px;line-height:0;text-decoration:none}" +
      ".bdg-barre a.bdg-mini svg{width:64px;height:64px}" +
      ".bdg-grille{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}" +
      ".bdg-carte{text-align:center}" +
      ".bdg-carte svg{width:170px;height:170px;max-width:100%}" +
      ".bdg-carte.verrou svg{filter:grayscale(1);opacity:.32}" +
      ".bdg-carte.attente svg{opacity:.6}" +
      ".bdg-carte h3{margin:6px 0 2px;font-size:1rem}" +
      ".bdg-legende{display:flex;gap:18px;flex-wrap:wrap;align-items:center}" +
      ".bdg-legende div{display:flex;align-items:center;gap:8px}" +
      ".bdg-legende svg{width:54px;height:54px}" +
      ".bdg-carte .bdg-qr{width:84px;margin:8px auto 0}.bdg-carte .bdg-qr svg{width:84px;height:84px;filter:none;opacity:1}";
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------ barre de trophées (tableau de bord)
  // o : { code, liste (calculer), acceptes }
  function barre(o) {
    styles();
    var b = bilan(o.liste, o.acceptes), h = '<div class="carte" id="bdg-barre"><div class="bdg-barre">';
    o.liste.forEach(function (c) {
      var a = o.acceptes[c.id]; if (!a) return;
      h += '<a class="bdg-mini" href="#/badges" title="' + esc(c.libelle + " · " + NIVEAUX[a.niveau].nom) + '">' + svg({ code: o.code, chapitre: c.libelle, niveau: a.niveau }) + "</a>";
    });
    if (!b.acceptes) h += '<span class="doux">Aucun badge pour l\'instant. Un badge se gagne à la fin d\'un ' + unite(o.code) + ', à partir de 60 %.</span>';
    h += "</div>";
    h += '<p class="petit" style="margin-bottom:0">' + b.acceptes + " badge" + (b.acceptes > 1 ? "s" : "") + " sur " + b.total + " " + unite(o.code) + "s" +
      (b.a_accepter ? ' · <strong id="bdg-a-accepter">' + b.a_accepter + " à accepter</strong>" : "") +
      ' · <a href="#/badges">Mes badges</a></p></div>';
    return h;
  }

  // ------------------------------------------------------------ page « Mes badges »
  // o : { code, liste, acceptes, titulaire, attente (texte affiché tant qu'aucun score n'est connu) }
  function page(o) {
    styles();
    var b = bilan(o.liste, o.acceptes), h = "<h1>Mes badges</h1>";
    h += '<p class="doux">' + esc(o.titulaire || "") + (o.titulaire ? " · " : "") + b.acceptes + " badge" + (b.acceptes > 1 ? "s" : "") + " sur " + b.total + " " + unite(o.code) + "s" +
      (b.a_accepter ? " · " + b.a_accepter + " à accepter" : "") + "</p>";
    if (o.attente) h += '<p class="message avert">' + esc(o.attente) + "</p>";
    h += '<div class="carte"><div class="bdg-legende">' + NIVEAUX.map(function (n, i) {
      return "<div>" + svg({ code: o.code, chapitre: "", niveau: i }) + "<span><strong>" + n.nom + "</strong><br><span class=\"petit doux\">à partir de " + n.min + " %</span></span></div>";
    }).join("") + "</div>" +
      '<p class="petit doux" style="margin-bottom:0">Le score d\'un ' + unite(o.code) + ' est la moyenne de ses évaluations, en retenant pour chacune votre meilleur essai. ' +
      "Toutes les évaluations du " + unite(o.code) + " doivent être faites. Un badge obtenu s'affiche après votre acceptation.</p></div>";
    h += '<div class="bdg-grille">';
    o.liste.forEach(function (c) {
      var a = o.acceptes[c.id], gagne = c.niveau >= 0, mieux = a && c.niveau > a.niveau;
      var classe = a ? "" : gagne ? " attente" : " verrou";
      var niv = a ? a.niveau : gagne ? c.niveau : 0;
      h += '<div class="carte bdg-carte' + classe + '" data-chapitre="' + esc(c.id) + '" data-etat="' + (a ? "accepte" : gagne ? "obtenu" : "verrou") + '"' +
        ' data-niveau="' + (a ? NIVEAUX[a.niveau].cle : gagne ? NIVEAUX[c.niveau].cle : "") + '">' +
        svg({ code: o.code, chapitre: c.libelle, niveau: niv, bandeau: a || gagne ? null : "À obtenir" }) +
        "<h3>" + esc(c.libelle) + '</h3><p class="petit doux" style="margin:0 0 6px">' + esc(c.titre || "") + "</p>";
      if (a) {
        h += '<p class="petit" style="margin:0"><span class="etiquette ok">' + NIVEAUX[a.niveau].nom + "</span> " + txtScore(a.score) + "</p>" +
          '<p class="petit doux" style="margin:4px 0 0">Délivré à ' + esc(o.titulaire || "") + "<br>le " + new Date(a.date).toLocaleDateString("fr-FR") + "</p>";
        // badge signé par l'enseignant au même niveau : QR code de vérification
        var sg = o.signes && o.signes[c.id];
        if (sg && sg.niveau === NIVEAUX[a.niveau].cle && o.qr) h += '<div class="bdg-qr" data-lien="' + esc(sg.lien) + '">' + o.qr(sg.lien) + '</div><p class="petit doux" style="margin:2px 0 0">Signé par l\'enseignant · <a href="' + esc(sg.lien) + '" target="_blank" rel="noopener">vérifier</a></p>';
        if (mieux) h += '<div class="actions" style="justify-content:center"><button class="btn petit" data-bdg-accepter="' + esc(c.id) + '">Accepter le niveau ' + NIVEAUX[c.niveau].nom + "</button></div>";
      } else if (gagne) {
        h += '<p class="petit" style="margin:0"><span class="etiquette avert">obtenu, à accepter</span> ' + txtScore(c.score) + "</p>" +
          '<div class="actions" style="justify-content:center"><button class="btn petit" data-bdg-accepter="' + esc(c.id) + '">Accepter ce badge</button></div>';
      } else {
        h += '<p class="petit doux" style="margin:0">' + (c.complet ? "Score de " + txtScore(c.score) + ", sous 60 %" :
          c.manquantes === c.total ? (c.total > 1 ? c.total + " évaluations à faire" : "Évaluation à faire") :
          c.manquantes + " évaluation" + (c.manquantes > 1 ? "s" : "") + " à faire sur " + c.total) + "</p>";
      }
      h += "</div>";
    });
    return h + "</div>";
  }
  // Branche les boutons « Accepter ». surAccepter(chapitre calculé) enregistre puis réaffiche.
  function brancher(o, surAccepter) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-bdg-accepter]"), function (bt) {
      bt.onclick = function () {
        var id = bt.getAttribute("data-bdg-accepter"), c = o.liste.filter(function (x) { return x.id === id; })[0];
        if (!c || c.niveau < 0) return;
        if (!confirm("Accepter le badge « " + NIVEAUX[c.niveau].nom + " » pour " + c.libelle + " ?\n\nIl sera affiché avec votre nom : " + (o.titulaire || "") + ".")) return;
        surAccepter(c, { niveau: c.niveau, score: c.score, date: new Date().toISOString() });
      };
    });
  }

  window.NS_BADGES = { unite: unite, NIVEAUX: NIVEAUX, niveauDe: niveauDe, libelleChapitre: libelleChapitre, svg: svg, calculer: calculer,
                       bilan: bilan, barre: barre, page: page, brancher: brancher, txtScore: txtScore };
})();
