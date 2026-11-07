# -*- coding: utf-8 -*-
"""Construit les specs des 30 séances de SIF (SEC3266) à partir des chapitres du livre.

Chaque séance reprend fidèlement le chapitre : question directrice, objectifs,
une diapositive par section (tableau, définition, scénario ou points clés),
le résumé, deux exercices, le travail à la maison et l'annonce de la séance
suivante. Les specs produites (specs/SIF/Jdd.py) peuvent ensuite être retouchées
à la main ; relancer ce script les régénère.

Usage : python gen_specs.py
"""
import glob, os, re, pprint

ICI = os.path.dirname(os.path.abspath(__file__))
LIVRE = os.path.normpath(os.path.join(ICI, "..", ".."))
SPECS = os.path.join(ICI, "specs", "SIF")
from courses import SIF as ASI

PARTIES = {0: "PROLOGUE OPÉRATIONNEL", 1: "PARTIE I · FONDEMENTS", 2: "PARTIE II · GOUVERNANCE ET RISQUES",
           3: "PARTIE III · NORMES, DROIT ET ÉTHIQUE", 4: "PARTIE IV · SÉCURITÉ TECHNIQUE",
           5: "PARTIE V · DÉFIS AVANCÉS", 6: "PARTIE VI · MESURER LA SÉCURITÉ"}
ROMAIN = {0: "Prologue", 1: "Partie I", 2: "Partie II", 3: "Partie III", 4: "Partie IV", 5: "Partie V", 6: "Partie VI"}


# ---------------------------------------------------------------- lecture
def fichiers():
    out = {}
    for f in sorted(glob.glob(os.path.join(LIVRE, "partie*", "P0*.tex"))):
        b = os.path.basename(f)
        m = re.match(r"P0(\d)_(C\d\d)?", b)
        code = m.group(2) or "P00"
        out[code] = (int(m.group(1)), f)
    return out


def accolade(t, i):
    """t[i] == '{' : renvoie (contenu, indice après l'accolade fermante)."""
    assert t[i] == "{", t[i:i + 20]
    n, j = 0, i
    while True:
        if t[j] == "\\":
            j += 2
            continue
        if t[j] == "{":
            n += 1
        elif t[j] == "}":
            n -= 1
            if n == 0:
                return t[i + 1:j], j + 1
        j += 1


LABELS = {}


def indexer(fs):
    for code, (part, f) in fs.items():
        n = 0 if code == "P00" else int(code[1:])
        t = sans_commentaires(open(f, encoding="utf-8").read())
        for m in re.finditer(r"\\label\{(chap:[^}]+)\}", t):
            LABELS[m.group(1)] = ("le prologue" if n == 0 else "chapitre %d" % n, str(n))
        k = 0
        for m in re.finditer(r"\\section\{|\\label\{(sec:[^}]+)\}", t):
            if m.group(0).startswith("\\section"):
                k += 1
            else:
                LABELS[m.group(1)] = ("section %d.%d" % (n, k), "%d.%d" % (n, k))


def sans_commentaires(t):
    return re.sub(r"(?m)(?<!\\)%.*$", "", t)


MATH = [(r"\mu", "µ"), (r"\times", "×"), (r"\approx", "≈"), (r"\le", "≤"), (r"\ge", "≥"), (r"\log_2", "log₂"),
        (r"\rightarrow", "→"), (r"\longrightarrow", "→"), (r"\sum", "Σ"), (r"\cdot", "·"), (r"\rho", "ρ"),
        (r"\beta", "β"), (r"\infty", "∞"), (r"\mathcal{S}", "S"), (r"\mathcal{A}", "A"), (r"\mathcal{I}", "I"),
        (r"\mathcal{G}", "G"), (r"\mathcal{T}", "T"), (r"\langle", "⟨"), (r"\rangle", "⟩"), (r"\pm", "±"),
        (r"\%", "%"), (r"\,", " "), (r"\;", " "), (r"\|", "‖")]


def propre(s, gras=True):
    """LaTeX -> texte de diapositive (gras en **…**)."""
    s = re.sub(r"\\(begin|end)\{[^}]*\}(\[[^\]]*\])?", " ", s)
    s = re.sub(r"\\(cite|index|label|vspace|hspace|addcontentsline)\*?(\[[^\]]*\])?\{[^}]*\}", "", s)
    s = re.sub(r"~?\\cite\{[^}]*\}", "", s)
    def ref(m):
        return LABELS.get(m.group(2), ("", "?"))[1]
    s = re.sub(r"\\(ref|pageref)\{([^}]*)\}", ref, s)
    s = s.replace(r"\OUI{}", "OUI").replace(r"\NON{}", "NON").replace(r"\NEK{}", "NEK")
    s = s.replace(r"\OUI", "OUI").replace(r"\NON", "NON").replace(r"\NEK", "NEK")
    s = re.sub(r"\\lecture\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}", r"µ = \1 · U = \2 · H = \3 bit", s)
    s = re.sub(r"\\(norme|loicam)\{([^}]*)\}", r"\2", s)
    if gras:
        s = re.sub(r"\\(textbf|termecle)\{([^{}]*)\}", r"**\2**", s)
    s = re.sub(r"\\(textbf|termecle|emph|textit|textsc|texttt|textup|mathrm|text|mathbf|underline|small|footnotesize)\{([^{}]*)\}", r"\2", s)
    s = re.sub(r"\\(textbf|termecle|emph|textit|textsc|texttt|textup|mathrm|text)\{([^{}]*)\}", r"\2", s)
    s = s.replace(r"{,}", ",")
    for a, b in MATH:
        s = s.replace(a, b)
    s = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"\1/\2", s)
    s = re.sub(r"\\textsuperscript\{([^}]*)\}", r"\1", s)
    s = s.replace(r"\ldots", "…").replace(r"\dots", "…").replace(r"\&", "&").replace(r"\_", "_")
    s = s.replace(r"\textasciitilde", "~").replace("---", "·").replace("--", "–")
    s = re.sub(r"\\(smallskip|medskip|bigskip|noindent|par|newline|hfill|centering|item)\b", " ", s)
    s = re.sub(r"\\\\", " ", s)
    s = re.sub(r"\\[a-zA-Z]+\*?", "", s)
    s = s.replace("$", "").replace("{", "").replace("}", "")
    s = s.replace("~", " ").replace("\u2014", "·")
    s = re.sub(r"\s+([:;!?»])", r" \1", s)
    s = re.sub(r"«\s*", "« ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("** **", " ").replace("****", "")
    s = re.sub(r"\s+([.,)])", r"\1", s)
    if s[:1].islower():
        s = s[:1].upper() + s[1:]
    return s


def court(s, n):
    if len(s) <= n:
        return s
    c = s[:n]
    for sep in (". ", " ; ", ", ", " "):
        k = c.rfind(sep)
        if k > n * 0.55:
            c = c[:k]
            break
    if c.count("**") % 2:
        c = c.rsplit("**", 1)[0] + c.rsplit("**", 1)[1]
    return c.rstrip(" ,;:") + "…"


def premiere_phrase(p):
    m = re.search(r"(.+?[.!?])(\s|$)", p)
    return m.group(1) if m else p


# ---------------------------------------------------------------- analyse d'un chapitre
def environnements(t, nom):
    out = []
    for m in re.finditer(r"\\begin\{" + nom + r"\}", t):
        j = t.index(r"\end{" + nom + "}", m.end())
        out.append((m.start(), t[m.end():j]))
    return out


def tableau(corps, apres):
    """corps commence juste après \\begin{tableaucours}."""
    cols, i = accolade(corps, corps.index("{"))
    k = corps.index("{", i)
    tete, i = accolade(corps, k)
    lignes = corps[i:]
    head = [propre(h, gras=False) for h in re.findall(r"\\tableauHeader\{((?:[^{}]|\{[^{}]*\})*)\}", tete)]
    larg = []
    for m in re.finditer(r"[LpP]\{([\d.]+)cm\}|([lcr])", cols):
        larg.append(float(m.group(1)) if m.group(1) else 2.0)
    rows = []
    for r in re.split(r"\\\\", lignes):
        r = r.strip()
        if not r or r.startswith(r"\hline") and len(r) < 8:
            continue
        cells = [propre(c, gras=False) for c in re.split(r"(?<!\\)&", r)]
        if len(cells) >= 2 and any(cells):
            rows.append(cells)
    cap = re.search(r"Tableau~\d+\.\d+\.\s*((?:[^}]|\}(?!\\end))*?)\}\\end\{center\}", apres[:400], re.S)
    titre = propre(cap.group(1), gras=False) if cap else ""
    return head, larg, rows, titre


def analyser(code, part, f):
    t = sans_commentaires(open(f, encoding="utf-8").read())
    n = 0 if code == "P00" else int(code[1:])
    ch = re.search(r"\\chapter(?:\[([^\]]*)\])?\{([^}]*)\}", t)
    titre_court = propre(ch.group(1) or ch.group(2), gras=False)
    titre = propre(ch.group(2), gras=False)
    qd = re.search(r"\\section\*\{Question directrice\s*:\s*([^}]*)\}", t)
    question = propre(qd.group(1), gras=False) if qd else ""
    objs = []
    for _, c in environnements(t, "boxobjectifs")[:1]:
        objs = [propre(x) for x in re.split(r"\\item", c)[1:]]
    resume = []
    for _, c in environnements(t, "boxresume")[:1]:
        resume = [propre(x) for x in re.split(r"\\item", c)[1:]]
    # exercices
    exos = []
    for m in re.finditer(r"\\begin\{boxexo\}\[title=\{\\ding\{45\}\\quad Exercice~[\d.]+\.\s*(.*?)\s*\\niveau(\w+)\}\]", t):
        j = t.index(r"\end{boxexo}", m.end())
        corps = t[m.end():j]
        items = [propre(x) for x in re.split(r"\\item", corps)[1:]]
        intro = propre(re.split(r"\\begin\{enumerate\}|\\begin\{itemize\}", corps)[0])
        exos.append({"titre": propre(m.group(1), gras=False), "niveau": m.group(2), "intro": intro, "items": items})
    # sections
    fin = t.find(r"\begin{boxresume}")
    secs = []
    pos = [(m.start(), m.end(), m.group(1)) for m in re.finditer(r"\\section\{((?:[^{}]|\{[^{}]*\})*)\}", t[:fin])]
    for k, (a, b, nom) in enumerate(pos):
        z = pos[k + 1][0] if k + 1 < len(pos) else fin
        secs.append({"num": "%d.%d" % (n, k + 1), "titre": propre(nom, gras=False), "corps": t[b:z]})
    return {"code": code, "n": n, "part": part, "titre": titre, "court": titre_court, "question": question,
            "objectifs": objs, "resume": resume, "exos": exos, "sections": secs}


def diapo_section(s):
    corps = s["corps"]
    kick = "Section " + s["num"]
    tabs = environnements(corps, "tableaucours")
    defs = environnements(corps, "boxdef")
    scen = [(m.start(), m.group(1), corps[m.end():corps.index(r"\end{boxscenario}", m.end())])
            for m in re.finditer(r"\\begin\{boxscenario\}\{([^}]*)\}", corps)]
    lect = [(m.start(), m.group(1), corps[m.end():corps.index(r"\end{boxlecture}", m.end())])
            for m in re.finditer(r"\\begin\{boxlecture\}\{([^}]*)\}", corps)]
    out = []
    # 1. tableau
    for a, c in tabs[:1]:
        head, larg, rows, titre = tableau(c, corps[a + len(c):])
        if 2 <= len(head) <= 4 and rows:
            tot = sum(larg[:len(head)]) or 1
            widths = [round(12.4 * w / tot, 2) for w in larg[:len(head)]]
            lim = 95 if len(head) <= 3 else 70
            rows = [[court(x, lim) for x in r[:len(head)]] + [""] * (len(head) - len(r)) for r in rows[:6]]
            out.append({"k": "table", "title": court(titre or s["titre"], 70), "kicker": kick,
                        "head": head, "widths": widths, "rows": rows})
            break
    # 2. définition
    for _, c in defs[:1]:
        txt = propre(c)
        m = re.match(r"\*\*([^*]+)\*\*\s*(\([^)]*\))?\s*:?\s*(.*)", txt)
        if m:
            terme, defin = m.group(1), m.group(3)
        else:
            terme, defin = s["titre"], txt
        parts = re.split(r"\s(?=\*\*[^*]{2,40}\*\*\s*(?:\([^)]*\)\s*)?:)", defin)
        items = [("Définition", court(parts[0], 260))]
        for p in parts[1:3]:
            mm = re.match(r"\*\*([^*]+)\*\*\s*(?:\([^)]*\)\s*)?:\s*(.*)", p)
            if mm:
                items.append((court(mm.group(1), 30), court(mm.group(2), 200)))
        out.append({"k": "definition", "title": court(terme[:1].upper() + terme[1:], 60), "kicker": "Définition · " + kick,
                    "items": items})
    # 3. scénario ou lecture
    for _, lab, c in (scen + lect)[:1]:
        paras = [propre(p) for p in re.split(r"\\medskip|\n\s*\n", re.sub(r"\\begin\{tableaucours\}.*?\\end\{tableaucours\}", "", c, flags=re.S))]
        paras = [court(p, 230) for p in paras if len(p) > 15][:3]
        if paras:
            out.append({"k": "scenario", "title": court(s["titre"], 60), "label": court(propre(lab, gras=False), 70),
                        "text": paras})
    # 4. points clés (texte courant)
    if not out:
        nu = re.sub(r"\\begin\{(\w+)\}.*?\\end\{\1\}", " ", corps, flags=re.S)
        nu = re.sub(r"\\subsection\{[^}]*\}", "\n\n", nu)
        paras = [propre(p) for p in re.split(r"\n\s*\n", nu)]
        items = [court(premiere_phrase(p), 150) for p in paras if len(p) > 40][:4]
        if items:
            out.append({"k": "points", "title": court(s["titre"], 60), "kicker": kick, "items": items})
    return out


# ---------------------------------------------------------------- séances
def items_resume(c, n=3, lim=110):
    out = []
    for r in c["resume"][:n]:
        m = re.match(r"\*\*([^*]+)\*\*\s*(.*)", r)
        out.append(court(r, lim))
    return out


def objectifs(c, n=5):
    return [court(o, 120) for o in c["objectifs"][:n]]


def exercice(c, prefere=("moyen", "base")):
    ex = None
    for niv in prefere:
        for e in c["exos"]:
            if e["niveau"] == niv and (e["items"] or len(e["intro"]) > 30):
                ex = e
                break
        if ex:
            break
    if not ex:
        return None
    qs = [court(q, 140) for q in ex["items"][:4]] or [court(ex["intro"], 220)]
    txt = court(ex["intro"], 220) if ex["items"] else "Travail individuel, puis mise en commun."
    return {"k": "exercice", "title": court(ex["titre"], 60), "duree": "20 minutes, en binôme", "text": txt, "questions": qs}


def bloc_chapitre(c, max_sections=9):
    out = [{"k": "chapitre", "num": c["code"], "short": "Prologue" if c["n"] == 0 else "Chapitre %d" % c["n"],
            "part": PARTIES[c["part"]], "title": c["court"], "question": c["question"] or c["titre"]}]
    if c["objectifs"]:
        out.append({"k": "objectifs", "items": objectifs(c)})
    sl = []
    for s in c["sections"]:
        sl.extend(diapo_section(s)[:2])
    out.extend(sl[:max_sections])
    return out


def seance(jour, chaps, prec, suiv_theme, suiv_chap):
    theme, contenu, ateliers, labs = ASI["jours"][jour]
    c0 = chaps[0]
    right = "%s · %s" % (ROMAIN[c0["part"]], " et ".join(("Prologue" if c["n"] == 0 else "Chapitre %d" % c["n"]) for c in chaps))
    spec = [{"k": "title", "tag": "Jour %d / 30 · Séance de 2 heures" % jour, "title": theme,
             "sub": court(c0["question"], 110) if c0["question"] else "", "right": right}]
    if prec:
        spec.append({"k": "synthese", "title": "Rappel de la séance précédente",
                     "kicker": "Jour %d · %s" % (jour - 1, ASI["jours"][jour - 1][0]), "items": items_resume(prec)})
    # déroulé
    secs = [s for c in chaps for s in c["sections"]]
    k = max(1, len(secs))
    rows = []
    if len(chaps) == 1:
        groupes = [secs[i:i + 2] for i in range(0, len(secs), 2)][:4]
        dur = [max(10, int(80 / len(groupes)) // 5 * 5)] * len(groupes) if groupes else []
        for g, d in zip(groupes, dur):
            rows.append(("%d min" % d, "**" + court(g[0]["titre"], 45) + "**" + (" ; " + court(g[1]["titre"], 40) if len(g) > 1 else "")))
    else:
        for c in chaps:
            rows.append(("40 min", "**" + court(c["court"], 60) + "**"))
    rows.append(("20 min", "**Exercice** en séance"))
    rows.append(("10 min", "**À retenir**, travail à la maison"))
    spec.append({"k": "agenda", "items": rows[:6]})
    for c in chaps:
        spec.extend(bloc_chapitre(c, 9 if len(chaps) == 1 else 5))
        if c["resume"]:
            spec.append({"k": "synthese", "title": "À retenir", "kicker": ("Prologue" if c["n"] == 0 else "Chapitre %d" % c["n"]),
                         "items": [court(r, 130) for r in c["resume"][:5]]})
    ex = exercice(chaps[-1])
    if ex:
        spec.append(ex)
    lect = ["%s, à relire avec ses exercices" % ("Le prologue" if c["n"] == 0 else "Chapitre %d" % c["n"]) for c in chaps]
    if suiv_chap:
        lect.append("Préparer : %s" % ("chapitre %d" % suiv_chap["n"]))
    spec.append({"k": "maison", "lecture": lect})
    if suiv_theme:
        spec.append({"k": "fin", "next": "Jour %d · %s" % (jour + 1, suiv_theme),
                     "items": [court(re.sub(r"\*\*", "", o), 70) for o in (suiv_chap["objectifs"][:3] if suiv_chap else [])]})
    else:
        spec.append({"k": "fin", "label": "CLÔTURE DU COURS", "next": "La sécurité est un cycle, pas un état",
                     "items": ["Connaître, protéger, détecter, répondre, reprendre, mesurer",
                               "Dire ce que l'on ne sait pas : NEK",
                               "Rendre chaque conclusion opposable"]})
    return spec


def main():
    fs = fichiers()
    indexer(fs)
    C = {code: analyser(code, part, f) for code, (part, f) in fs.items()}
    jours = ASI["jours"]
    def moitie(code):
        c = dict(C[code[:3]])
        if len(code) == 3:
            return c
        h = (len(c["sections"]) + 1) // 2
        o = (len(c["objectifs"]) + 1) // 2
        if code[3] == "a":
            c["sections"], c["objectifs"] = c["sections"][:h], c["objectifs"][:o]
        else:
            c["sections"], c["objectifs"] = c["sections"][h:], c["objectifs"][o:] or c["objectifs"]
        return c

    def chaps_du(j):
        return [moitie(a) for a in jours[j][2]]
    os.makedirs(SPECS, exist_ok=True)
    for j in range(1, 31):
        prec = chaps_du(j - 1)[-1] if j > 1 else None
        suiv = chaps_du(j + 1)[0] if j < 30 else None
        spec = seance(j, chaps_du(j), prec, jours[j + 1][0] if j < 30 else None, suiv)
        with open(os.path.join(SPECS, "J%02d.py" % j), "w", encoding="utf-8") as f:
            f.write("# Généré par gen_specs.py à partir du livre SIF (SEC3266) ; retouches possibles à la main.\n")
            f.write("SPEC = " + pprint.pformat(spec, width=110, sort_dicts=False) + "\n")
        print("J%02d" % j, len(spec), "diapositives prévues")


if __name__ == "__main__":
    main()
