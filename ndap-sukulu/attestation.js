/* NDAP SUKULU autonome : gabarit de l'attestation de module, commun à l'espace enseignant (qui la
   délivre et la signe) et à la version apprenant (qui l'affiche une fois acceptée et l'imprime).
   Ce fichier ne signe rien et ne calcule rien : il met en page une attestation déjà délivrée.
   Il a besoin de qr.js (fonction globale qrcode). */
(function () {
  "use strict";
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function dateLongue(iso) {
    var d = new Date(iso + "T12:00:00"), j = d.getDate();
    return (j === 1 ? "1er" : j) + " " + d.toLocaleDateString("fr-FR", { month: "long" }) + " " + d.getFullYear();
  }
  // Dessin SVG d'un QR code ; couleur facultative.
  function qr(lien, couleur) {
    if (!window.qrcode) return "";
    var q = window.qrcode(0, "M");
    q.addData(lien, "Byte"); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }).replace(/fill="black"/g, 'fill="' + (couleur || "#012F6B") + '"');
  }
  var STYLE = "@page{size:A4 landscape;margin:0}" +
    "body.mode-att{background:#D5DCE3}body.mode-att header.barre,body.mode-att footer.pied{display:none}body.mode-att main{max-width:none;padding:0;margin:0}" +
    ".att-outils{display:flex;gap:10px;justify-content:center;align-items:center;padding:14px;font:14px system-ui,sans-serif;color:#1e1e1e}" +
    ".att{position:relative;width:297mm;height:209.5mm;margin:0 auto 20px;background:#fff;color:#1e1e1e;display:flex;flex-direction:column;overflow:hidden;" +
    "font-family:'Latin Modern Roman','CMU Serif',Cambria,Georgia,serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-after:always;break-after:page}" +
    ".att:last-of-type{page-break-after:auto;break-after:auto}" +
    ".att-haut{display:flex;align-items:center;gap:10mm;background:#051B31;color:#fff;padding:0 12mm;height:33mm;flex:none}.att-haut img{height:19mm;display:block}" +
    ".att-haut div{flex:1;text-align:center}.att-haut p{margin:0 0 1.2mm;font-size:12pt;font-weight:700}.att-haut h2{margin:0;color:#DDB764;font-size:18pt;font-weight:700}" +
    ".att-filet{height:2mm;background:#C28D10;flex:none}.att-centre{flex:1;text-align:center;padding:9mm 16mm 0}" +
    ".att-centre h1{margin:0;font-size:33pt;font-weight:700;color:#012F6B;letter-spacing:.5px}.att-sous{margin:1.5mm 0 6.5mm;font-size:14.5pt;font-weight:700;color:#C28D10}" +
    ".att-texte{margin:0;font-size:15pt}.att-nom{margin:3.5mm 0 4mm;font-size:27pt;font-weight:700;color:#012F6B}" +
    ".att-chiffres{display:flex;justify-content:center;gap:6mm;margin:6mm 0 5.5mm}.att-chiffres div{width:47mm;border:1px solid #D5DCE3;border-radius:3mm;padding:3mm 1mm;background:#F2F4F7}" +
    ".att-chiffres b{display:block;font-size:21pt;color:#012F6B}.att-chiffres span{font-size:10pt;color:#5B6770}.att-chap{margin:0 auto;max-width:255mm;font-size:11.5pt;line-height:1.3}" +
    ".att-bas{display:flex;align-items:center;gap:6mm;margin:0 12mm;padding:3.5mm 0 6mm;border-top:1px solid #D5DCE3;flex:none}.att-qr{flex:none;width:27mm;height:27mm}.att-qr svg{width:27mm;height:27mm;display:block}" +
    ".att-bas p{margin:0;font-size:9.6pt;line-height:1.3;color:#5B6770;text-align:justify}.att-bas p.att-ens{margin-top:1.4mm;color:#012F6B;text-align:left;font-size:9.1pt}.att-ens span{white-space:nowrap}" +
    ".att-sig{flex:none;width:54mm;text-align:center;color:#012F6B;font-size:9.1pt;line-height:1.25}.att-sig span{display:block;font-size:8.8pt;color:#5B6770}" +
    ".att-sig img{display:block;height:20mm;max-width:54mm;margin:.6mm auto 0;object-fit:contain}.att-sig b{display:block}" +
    "@media print{body.mode-att{background:#fff}.att-outils{display:none}.att{margin:0}}";
  // a : attestation délivrée ; x : { titre, sigle, pied, seuil, enseignant, mention, lien, logo, signature }
  // signature : image de la signature de l'enseignant (adresse data:), facultative. L'image porte le nom du signataire.
  function html(a, x) {
    var segs = String(x.pied || "").split(" · "), contexte = segs.slice(1).filter(function (s) { return !/^©/.test(s); }).join(" · ");
    var tuiles = [[a.note + " %", "Note du module"], [a.fiches + " / " + a.fiches, "Fiches de chapitre remises"]];
    if (a.labs) tuiles.push([a.labs + " / " + a.labs, "Laboratoires réalisés"]);
    tuiles.push([x.seuil + " %", "Seuil de réussite"]);
    return '<article class="att"><header class="att-haut"><img src="' + esc(x.logo || "maletyon_logo.jpeg") + '" alt="MaletYon"><div><p>Les cours ouverts en audit, sécurité et investigation numérique</p><h2>' +
      esc(x.titre) + '</h2></div><img src="img/logo-ndap-sukulu.png" alt="NDAP SUKULU"></header><div class="att-filet"></div>' +
      '<div class="att-centre"><h1>ATTESTATION DE RÉUSSITE</h1><p class="att-sous">Module ' + a.module + " · " + esc(a.titre) + '</p><p class="att-texte">MaletYon atteste que</p><p class="att-nom">' +
      esc((a.nom + " " + (a.prenom || "")).trim()) + '</p><p class="att-texte">a validé, le <b>' + esc(dateLongue(a.date)) + "</b>, le module " + a.module + " du cours <b>" + esc(x.titre) + " (" + esc(x.sigle) + ")</b>.</p>" +
      '<div class="att-chiffres">' + tuiles.map(function (t) { return "<div><b>" + t[0] + "</b><span>" + t[1] + "</span></div>"; }).join("") + "</div>" +
      '<p class="att-chap"><b>Chapitres évalués :</b> ' + esc((a.chapitres || []).join(" · ")) + "</p></div>" +
      '<footer class="att-bas"><div class="att-qr" data-lien="' + esc(x.lien) + '">' + qr(x.lien) + "</div><div><p>Attestation produite par l'espace enseignant NDAP SUKULU sous le N° <b>" + esc(a.numero) +
      "</b>. Elle atteste un résultat de contrôle continu obtenu à distance, sans surveillance des épreuves. Elle n'est ni un diplôme ni un relevé de notes officiel et n'engage pas l'établissement où le cours est dispensé. " +
      "Son authenticité se vérifie en scannant le code ci-contre." + (x.mention ? " " + esc(x.mention) : "") + "</p>" +
      '<p class="att-ens">' + (x.enseignant && !x.signature ? "<b>Enseignant :</b> " + esc(x.enseignant) + " · " : "") + esc(contexte) + " · <span>" + esc(a.annee) + "</span></p></div>" +
      (x.signature ? '<div class="att-sig"><span>L\'enseignant</span><img src="' + esc(x.signature) + '" alt="Signature de ' + esc(x.enseignant || "l'enseignant") + '"></div>' : "") +
      "</footer></article>";
  }
  // Passe la page en mode impression (A4 paysage) ; quitter() remet l'affichage normal.
  function entrer() {
    if (!document.getElementById("style-att")) { var st = document.createElement("style"); st.id = "style-att"; st.textContent = STYLE; document.head.appendChild(st); }
    document.body.classList.add("mode-att");
  }
  function quitter() {
    document.body.classList.remove("mode-att");
    var st = document.getElementById("style-att"); if (st) st.remove();
  }
  window.NS_ATTESTATION = { STYLE: STYLE, html: html, qr: qr, dateLongue: dateLongue, entrer: entrer, quitter: quitter };
})();
