/* Édition téléphone : met l'application en cache pour fonctionner hors ligne. */
var CACHE = "ndap-sukulu-0.1-202611081902";
var FICHIERS = ["./", "../ajouts.js", "./app.js", "./connexion.js", "./contenus.js", "./crypto_ns.js", "./donnees.js", "./eval.js", "../identifiants.js", "./img/icone-192.png", "./img/icone-32.png", "./img/icone-512.png", "./img/icone.ico", "./img/logo-maletyon.png", "./img/logo-ndap-sukulu.png", "./index.html", "./manifest.webmanifest", "../resultats.js", "./sha256.js", "./style.css"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FICHIERS); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Fichiers publiés par l'enseignant (identifiants, ajouts, résultats) : réseau d'abord, pour que
// les nouvelles publications arrivent sans réinstaller l'application ; cache si hors ligne.
var DYNAMIQUES = /\/(identifiants|ajouts|resultats)\.js$/;
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (DYNAMIQUES.test(url.pathname)) {
    e.respondWith(fetch(e.request, { cache: "no-store" }).then(function (r) {
      var copie = r.clone();
      if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copie); });
      return r;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || fetch(e.request); }));
});
