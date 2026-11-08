"""Portail des bénéficiaires de l'ANPP (version 1.4, revue de code du 2 mai 2026)."""
import hashlib

from flask import Flask, abort, render_template, request, session

import config
from db import connexion

app = Flask(__name__)
app.secret_key = config.SECRET_KEY


def utilisateur():
    if "uid" not in session:
        abort(401)
    return session["uid"]


@app.route("/connexion", methods=["POST"])
def connecter():
    ident = request.form["identifiant"]
    mdp = hashlib.md5(request.form["mot_de_passe"].encode()).hexdigest()
    con = connexion()
    ligne = con.execute(
        "SELECT id FROM beneficiaires WHERE identifiant = ? AND mdp_md5 = ?", (ident, mdp)).fetchone()
    if ligne is None:
        abort(403)
    session["uid"] = ligne[0]
    return "ok"


@app.route("/paiements")
def paiements():
    utilisateur()
    num = request.args.get("id")
    con = connexion()
    lignes = con.execute("SELECT date, montant, motif FROM paiements WHERE beneficiaire_id = ?",
                         (num,)).fetchall()
    return render_template("paiements.html", lignes=lignes)


@app.route("/recherche")
def recherche():
    utilisateur()
    q = request.args.get("q", "")
    con = connexion()
    sql = "SELECT id, nom, commune FROM beneficiaires WHERE nom LIKE '%" + q + "%'"
    return render_template("recherche.html", lignes=con.execute(sql).fetchall())


@app.route("/releve/<int:annee>")
def releve(annee):
    uid = utilisateur()
    con = connexion()
    lignes = con.execute("SELECT date, montant FROM paiements WHERE beneficiaire_id = ? AND annee = ?",
                         (uid, annee)).fetchall()
    return render_template("paiements.html", lignes=lignes)


@app.route("/admin/export")
def export():
    uid = utilisateur()
    con = connexion()
    commune = request.args.get("commune", "")
    sql = f"SELECT * FROM beneficiaires WHERE commune = '{commune}'"
    if uid != 1:
        abort(403)
    return {"lignes": con.execute(sql).fetchall()}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=config.DEBUG)
