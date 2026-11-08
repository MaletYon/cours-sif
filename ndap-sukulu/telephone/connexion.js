/* NDAP SUKULU autonome : connexion de l'apprenant.
   Les comptes viennent de identifiants.js (window.NS_IDENT), produit par l'espace enseignant.
   La vérification se fait sur l'appareil, sans réseau : le mot de passe donne, par PBKDF2, un
   vérificateur comparé à celui du fichier, puis la clé qui déchiffre le profil de l'étudiant.
   La session ouverte vit dans sessionStorage (onglet courant) : fermer l'onglet déconnecte.
   Une fois connecté, l'application (app.js) est chargée avec window.NS_UTILISATEUR. */
(function () {
  "use strict";
  var K = window.NS_CRYPTO, D = window.NS_DATA, I = window.NS_IDENT;
  var C = D.cours;
  var CLE_SESSION = "ndap-sukulu-session:" + C.code;
  var CLE_ECHECS = "ndap-sukulu-echecs:" + C.code;
  var main = document.getElementById("app");

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function entete() {
    document.getElementById("bandeau").textContent = C.bandeau;
    document.getElementById("sous").textContent = C.sigle + " · " + C.titre;
    document.getElementById("pied").textContent = C.pied;
    document.title = "NDAP SUKULU · " + C.sigle;
    document.getElementById("menu").innerHTML = "";
    try { var t = localStorage.getItem("ndap-sukulu:theme"); if (t) document.documentElement.setAttribute("data-theme", t); } catch (e) {}
  }
  function page(html) { main.innerHTML = '<div class="connexion">' + html + "</div>"; }

  function demarrer(u) {
    window.NS_UTILISATEUR = u;
    window.NS_DECONNEXION = function () {
      try { sessionStorage.removeItem(CLE_SESSION); } catch (e) {}
      location.hash = "#/accueil"; location.reload();
    };
    var s = document.createElement("script");
    s.src = C.mode === "evaluation" ? "eval.js" : "app.js";   // évaluation sans corrigé, ou révision
    document.body.appendChild(s);
  }

  function echecs() { try { return JSON.parse(localStorage.getItem(CLE_ECHECS)) || { n: 0, t: 0 }; } catch (e) { return { n: 0, t: 0 }; } }
  function noterEchec() { var e = echecs(); e.n++; e.t = Date.now(); try { localStorage.setItem(CLE_ECHECS, JSON.stringify(e)); } catch (x) {} return e; }
  function attente() {
    var e = echecs(); if (e.n < 5) return 0;
    var d = Math.min(300, 15 * Math.pow(2, e.n - 5));       // 15 s, 30 s, 60 s… plafonné à 5 min
    return Math.max(0, Math.ceil((e.t + d * 1000 - Date.now()) / 1000));
  }

  function aDemo() { return Object.keys(I.comptes).some(function (k) { return I.comptes[k].d; }); }

  function formulaire(msg) {
    page('<div class="carte"><h1 style="margin-top:0">Connexion</h1>' +
      '<p class="petit doux">' + esc(C.sigle) + " · " + esc(C.titre) +
      (I.periode ? "<br>Classe " + esc(I.periode.annee) + " · " + esc(I.periode.semestre) : "") +
      ".<br>Saisissez le matricule et le mot de passe remis par votre enseignant.</p>" +
      '<form id="f-cnx" autocomplete="on"><label class="champ">Matricule<input id="mat" autocomplete="username" autocapitalize="characters" required></label>' +
      '<label class="champ">Mot de passe<input type="password" id="mdp" autocomplete="current-password" required></label>' +
      '<div class="actions"><button class="btn" type="submit" id="ok">Se connecter</button></div></form>' +
      '<p id="msg" class="message' + (msg ? " ko" : "") + '">' + esc(msg || "") + "</p></div>" +
      (aDemo() ? '<div class="carte"><h3 style="margin-top:0">Essayer NDAP SUKULU</h3><p class="petit">Compte de démonstration, ouvert à tous : ' +
        "matricule <b>" + esc(K.DEMO.matricule) + "</b>, mot de passe <b>" + esc(K.DEMO.motDePasse) + "</b>. " +
        "Vos essais restent sur cet appareil et ne sont jamais transmis à l'enseignant.</p></div>" : ""));
    document.getElementById("mat").focus();
    document.getElementById("f-cnx").onsubmit = async function (ev) {
      ev.preventDefault();
      var w = attente(), m = document.getElementById("msg"), b = document.getElementById("ok");
      if (w) { m.className = "message ko"; m.textContent = "Trop d'essais infructueux. Réessayez dans " + w + " s."; return; }
      b.disabled = true; m.className = "message"; m.textContent = "Vérification…";
      var mat = document.getElementById("mat").value, mdp = document.getElementById("mdp").value;
      try {
        var id = await K.idCompte(C.code, mat), compte = I.comptes[id];
        // même calcul que le compte existe ou non, pour ne pas révéler les matricules inscrits
        var k = await K.clesEtudiant(mdp, compte ? compte.s : K.b64(new Uint8Array(16)), I.iter);
        if (!compte || k.verificateur !== compte.v) throw new Error("refus");
        // le compte de démonstration a un profil en clair (rien de personnel) ; les autres sont chiffrés
        var profil = compte.d ? compte.p : await K.dechiffrer(k.aes, compte.p);
        var u = { id: id, v: compte.v, matricule: profil.matricule, nom: profil.nom, prenom: profil.prenom,
                  aes: k.aesBrut, mac: k.macBrut, ouvert: new Date().toISOString(), demo: !!compte.d };
        try { sessionStorage.setItem(CLE_SESSION, JSON.stringify(u)); localStorage.removeItem(CLE_ECHECS); } catch (e) {}
        demarrer(u);
      } catch (e) {
        var n = noterEchec().n;
        m.className = "message ko";
        m.textContent = "Matricule ou mot de passe incorrect." + (n >= 5 ? " Prochain essai possible dans " + attente() + " s." : "");
        b.disabled = false;
      }
    };
  }

  entete();
  // Module personnel sans classe (par exemple la préparation de la thèse) : pas de connexion.
  if (C.connexion === false) {
    demarrer({ id: "personnel", v: "", matricule: "", nom: "", prenom: "", aes: "", mac: "", ouvert: new Date().toISOString(), personnel: true });
    return;
  }
  if (!K || !K.disponible) {
    page('<div class="carte"><h1 style="margin-top:0">Navigateur incompatible</h1><p>Ce navigateur ne fournit pas la cryptographie nécessaire (WebCrypto). Utilisez Edge, Chrome ou Firefox récents.</p></div>');
    return;
  }
  if (!I || I.format !== "ndap-sukulu-identifiants" || I.cours !== C.code || !I.comptes) {
    page('<div class="carte"><h1 style="margin-top:0">Version non activée</h1><p>Cette copie de l\'application ne contient pas encore les identifiants de la classe ' +
      "(fichier <code>identifiants.js</code>). Votre enseignant le produit depuis son espace enseignant et le place à côté de cette page.</p></div>");
    return;
  }
  var s = null;
  try { s = JSON.parse(sessionStorage.getItem(CLE_SESSION)); } catch (e) {}
  // La session reste valable tant que le compte existe toujours avec le même vérificateur.
  if (s && I.comptes[s.id] && I.comptes[s.id].v === s.v) demarrer(s);
  else formulaire();
})();
