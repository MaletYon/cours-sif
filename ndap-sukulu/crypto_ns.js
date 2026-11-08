/* NDAP SUKULU autonome : cryptographie commune aux interfaces enseignant et apprenant.
   Tout passe par WebCrypto (crypto.subtle), disponible hors ligne, en file:// comme en https.

   Clés d'un étudiant. Elles sont tirées de son mot de passe par PBKDF2-SHA256 (sel propre à
   l'étudiant), qui donne 96 octets :
     - octets  0 à 31 : authentification ; l'empreinte SHA-256 de ce bloc est le « vérificateur »
                        publié dans identifiants.js ;
     - octets 32 à 63 : clé AES-GCM de l'étudiant (profil, session locale, résultats de la classe) ;
     - octets 64 à 95 : clé HMAC de l'étudiant (scellé de son fichier de synthèse).
   L'enseignant, qui a généré le mot de passe, peut recalculer ces clés : il vérifie les fichiers
   remis et chiffre pour chaque étudiant sa part du fichier de résultats.

   Coffre de l'enseignant. Une phrase secrète donne, par PBKDF2, une clé AES-GCM qui chiffre tout
   le coffre (clé privée, liste de classe, mots de passe). */
(function () {
  "use strict";
  var S = window.crypto && window.crypto.subtle;
  var enc = new TextEncoder(), dec = new TextDecoder();
  var ITER_ETUDIANT = 150000, ITER_COFFRE = 310000;
  var ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; // sans 0 O 1 l I i o

  function b64(buf) {
    var b = new Uint8Array(buf), s = "";
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deb64(s) {
    var t = atob(s), b = new Uint8Array(t.length);
    for (var i = 0; i < t.length; i++) b[i] = t.charCodeAt(i);
    return b;
  }
  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
  }
  function aleatoire(n) { var b = new Uint8Array(n); crypto.getRandomValues(b); return b; }

  function normMatricule(m) { return String(m || "").toUpperCase().replace(/\s+/g, "").trim(); }

  async function sha256hex(texte) { return hex(await S.digest("SHA-256", enc.encode(texte))); }

  // Identifiant public d'un compte : ne révèle pas le matricule en clair.
  async function idCompte(code, matricule) {
    return (await sha256hex("NDAP-SUKULU|" + code + "|" + normMatricule(matricule))).slice(0, 32);
  }

  async function pbkdf2(secret, sel, iter, octets) {
    var base = await S.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
    return new Uint8Array(await S.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sel, iterations: iter }, base, octets * 8));
  }

  // Clés d'un étudiant à partir de son mot de passe et de son sel (base64).
  async function clesEtudiant(motDePasse, selB64, iter) {
    var bits = await pbkdf2(motDePasse, deb64(selB64), iter || ITER_ETUDIANT, 96);
    var auth = bits.slice(0, 32), aes = bits.slice(32, 64), mac = bits.slice(64, 96);
    return {
      verificateur: hex(await S.digest("SHA-256", auth)),
      aesBrut: b64(aes), macBrut: b64(mac),
      aes: await S.importKey("raw", aes, "AES-GCM", true, ["encrypt", "decrypt"]),
      mac: await S.importKey("raw", mac, { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"])
    };
  }
  async function importerCles(aesBrut, macBrut) {
    return {
      aes: await S.importKey("raw", deb64(aesBrut), "AES-GCM", true, ["encrypt", "decrypt"]),
      mac: await S.importKey("raw", deb64(macBrut), { name: "HMAC", hash: "SHA-256" }, true, ["sign", "verify"])
    };
  }

  async function chiffrer(cleAes, objet) {
    var iv = aleatoire(12);
    var ct = await S.encrypt({ name: "AES-GCM", iv: iv }, cleAes, enc.encode(JSON.stringify(objet)));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function dechiffrer(cleAes, boite) {
    var pt = await S.decrypt({ name: "AES-GCM", iv: deb64(boite.iv) }, cleAes, deb64(boite.ct));
    return JSON.parse(dec.decode(pt));
  }

  async function signer(cleMac, texte) { return b64(await S.sign("HMAC", cleMac, enc.encode(texte))); }
  async function verifierSignature(cleMac, texte, sig) {
    try { return await S.verify("HMAC", cleMac, deb64(sig), enc.encode(texte)); } catch (e) { return false; }
  }

  // Mot de passe lisible : 10 caractères sans signes ambigus (environ 57 bits).
  function motDePasse(n) {
    n = n || 10;
    var r = new Uint32Array(n), s = "";
    crypto.getRandomValues(r);
    for (var i = 0; i < n; i++) s += ALPHABET[r[i] % ALPHABET.length];
    return s;
  }
  function nouveauSel() { return b64(aleatoire(16)); }

  // Paire de clés de l'enseignant : chiffrement des fichiers remis (RSA-OAEP 3072, SHA-256).
  async function pairePourEnseignant() {
    var k = await S.generateKey({ name: "RSA-OAEP", modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
      true, ["encrypt", "decrypt"]);
    return { publique: await S.exportKey("jwk", k.publicKey), privee: await S.exportKey("jwk", k.privateKey) };
  }
  async function empreinteCle(jwk) { return (await sha256hex(jwk.n + "|" + jwk.e)).slice(0, 16); }

  // Coffre de l'enseignant.
  async function cleCoffre(phrase, selB64, iter) {
    var bits = await pbkdf2(phrase, deb64(selB64), iter || ITER_COFFRE, 32);
    return S.importKey("raw", bits, "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  async function scellerCoffre(phrase, contenu, selB64) {
    var sel = selB64 || nouveauSel();
    var boite = await chiffrer(await cleCoffre(phrase, sel), contenu);
    return { format: "ndap-sukulu-coffre", version: 1, sel: sel, iter: ITER_COFFRE, iv: boite.iv, ct: boite.ct };
  }
  async function ouvrirCoffre(phrase, coffre) {
    return dechiffrer(await cleCoffre(phrase, coffre.sel, coffre.iter), coffre);
  }

  // Fichier remis par un étudiant : clé AES-256 à usage unique, chiffrée par la clé publique de
  // l'enseignant (RSA-OAEP) ; seul le coffre de l'enseignant peut l'ouvrir.
  async function chiffrerPourEnseignant(jwkPublique, objet) {
    var cle = await S.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
    var brut = await S.exportKey("raw", cle);
    var pub = await S.importKey("jwk", jwkPublique, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
    var boite = await chiffrer(cle, objet);
    return { cle: b64(await S.encrypt({ name: "RSA-OAEP" }, pub, brut)), iv: boite.iv, ct: boite.ct };
  }
  async function dechiffrerPourEnseignant(jwkPrivee, enc) {
    var priv = await S.importKey("jwk", jwkPrivee, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
    var brut = await S.decrypt({ name: "RSA-OAEP" }, priv, deb64(enc.cle));
    return dechiffrer(await S.importKey("raw", brut, "AES-GCM", false, ["decrypt"]), enc);
  }
  // Texte canonique signé par l'étudiant : tout l'en-tête et le contenu chiffré.
  function texteASigner(f) {
    return [f.format, f.version, f.cours, f.compte, f.periode ? f.periode.annee + "/" + f.periode.semestre : "", f.cree,
            f.empreinte_cle, f.enc.cle, f.enc.iv, f.enc.ct].join("|");
  }

  // Signature de l'enseignant (ECDSA P-256, SHA-256) : authentifie les fichiers qu'il publie
  // (résultats de la classe) ; la clé publique est livrée dans identifiants.js.
  async function pairePourSignature() {
    var k = await S.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    return { publique: await S.exportKey("jwk", k.publicKey), privee: await S.exportKey("jwk", k.privateKey) };
  }
  async function signerEnseignant(jwkPrivee, texte) {
    var k = await S.importKey("jwk", jwkPrivee, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    return b64(await S.sign({ name: "ECDSA", hash: "SHA-256" }, k, enc.encode(texte)));
  }
  async function verifierEnseignant(jwkPublique, texte, sig) {
    try {
      var k = await S.importKey("jwk", jwkPublique, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      return await S.verify({ name: "ECDSA", hash: "SHA-256" }, k, deb64(sig), enc.encode(texte));
    } catch (e) { return false; }
  }

  // Compte de démonstration, commun à tous les cours. Public par choix, il ne protège rien :
  // il permet d'essayer la plateforme, n'entre dans aucune classe et ne remet jamais de fichier.
  // Son entrée dans identifiants.js est calculée de la même façon par construire.py et par l'espace enseignant.
  var DEMO = { matricule: "ETU001", motDePasse: "eTU001", nom: "ETUDIANT DEMO", prenom: "", contact: "maletyon@proton.me" };
  function estDemo(m) { return normMatricule(m) === DEMO.matricule; }
  async function compteDemo(code, iter) {
    var sel = b64(new Uint8Array(await S.digest("SHA-256", enc.encode("NDAP-SUKULU-DEMO|" + code))).slice(0, 16));
    var k = await clesEtudiant(DEMO.motDePasse, sel, iter);
    return { id: await idCompte(code, DEMO.matricule),
             compte: { s: sel, v: k.verificateur, d: 1, p: { matricule: DEMO.matricule, nom: DEMO.nom, prenom: DEMO.prenom } } };
  }
  // Courriel prérempli pour demander son inscription dans la salle de classe d'un cours.
  function lienInscription(c) {
    var sujet = "NDAP SUKULU · " + c.sigle + " (" + c.code + ") · demande d'inscription";
    var corps = "Bonjour,\n\nJ'ai essayé NDAP SUKULU avec le compte de démonstration et je souhaite être inscrit(e) " +
      "dans la salle de classe du cours " + c.sigle + " (" + c.code + ") : " + c.titre + ".\n\n" +
      "Nom :\nPrénom :\nÉtablissement :\nFilière et niveau :\nMatricule :\nAnnée académique :\n\nCordialement,\n";
    return "mailto:" + DEMO.contact + "?subject=" + encodeURIComponent(sujet) + "&body=" + encodeURIComponent(corps);
  }

  window.NS_CRYPTO = {
    DEMO: DEMO, estDemo: estDemo, compteDemo: compteDemo, lienInscription: lienInscription,
    pairePourSignature: pairePourSignature, signerEnseignant: signerEnseignant, verifierEnseignant: verifierEnseignant,
    chiffrerPourEnseignant: chiffrerPourEnseignant, dechiffrerPourEnseignant: dechiffrerPourEnseignant, texteASigner: texteASigner,
    disponible: !!S, ITER_ETUDIANT: ITER_ETUDIANT,
    b64: b64, deb64: deb64, hex: hex, sha256hex: sha256hex,
    normMatricule: normMatricule, idCompte: idCompte,
    clesEtudiant: clesEtudiant, importerCles: importerCles,
    chiffrer: chiffrer, dechiffrer: dechiffrer, signer: signer, verifierSignature: verifierSignature,
    motDePasse: motDePasse, nouveauSel: nouveauSel,
    pairePourEnseignant: pairePourEnseignant, empreinteCle: empreinteCle,
    scellerCoffre: scellerCoffre, ouvrirCoffre: ouvrirCoffre
  };
})();
