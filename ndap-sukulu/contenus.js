/* NDAP SUKULU autonome : fusion du contenu de base (donnees.js, produit par le générateur)
   et des ajouts de l'enseignant (réglages des évaluations, nouvelles questions, nouveaux labs).
   Utilisée à l'identique par l'espace enseignant (ajouts avec corrigés, tirés du coffre) et par
   la version apprenant (ajouts.js, signé, sans corrigés). */
(function () {
  "use strict";
  // D : données de base ; A : ajouts { reglages, questions, labs } (peut être null)
  function fusionner(D, A, telephone) {
    A = A || {};
    var reg = A.reglages || {};
    var questions = D.questions.concat(A.questions || []);
    var labs = D.labs.concat(A.labs || []);
    var defaut = ((D.config.evaluations || [])[0] || {}).tentatives || 2;
    var toutes = (D.config.evaluations || []).map(function (e) { return Object.assign({}, e); });
    (A.labs || []).forEach(function (l) {
      toutes.push({ id: l.id, type: "lab", ch: l.chapitre, titre: l.titre, duree: Number(l.duree) || 60, tentatives: defaut, ajout: true });
    });
    toutes.forEach(function (e) {
      var r = reg[e.id];
      if (!r) return;
      if (r.duree) e.duree = Number(r.duree);
      if (r.tentatives) e.tentatives = Number(r.tentatives);
      if (r.active === false) e.active = false;
    });
    var actives = toutes.filter(function (e) { return e.active !== false && (!telephone || e.type !== "lab"); });
    return { questions: questions, labs: labs, evaluations: actives, toutes: toutes };
  }
  // Retire les corrigés avant publication dans la version apprenant.
  function sansCorriges(A) {
    return {
      reglages: A.reglages || {},
      questions: (A.questions || []).map(function (q) {
        var x = {}; Object.keys(q).forEach(function (k) { if (["r", "expl"].indexOf(k) < 0) x[k] = q[k]; }); return x;
      }),
      labs: (A.labs || []).map(function (l) {
        var x = Object.assign({}, l);
        x.controles = l.controles.map(function (c) {
          var y = {}; Object.keys(c).forEach(function (k) { if (["attendu", "tolerance"].indexOf(k) < 0) y[k] = c[k]; }); return y;
        });
        return x;
      })
    };
  }
  window.NS_CONTENUS = { fusionner: fusionner, sansCorriges: sansCorriges };
})();
