"""Notes du présentateur : un texte rédigé, à lire en mode présentation, composé
à partir du contenu de chaque diapositive. Les notes écrites à la main dans les
specs (clé « notes ») sont conservées et placées à la suite.
"""
import re

ORD = ["Premièrement", "Deuxièmement", "Troisièmement", "Quatrièmement", "Cinquièmement",
       "Sixièmement", "Septièmement", "Huitièmement", "Neuvièmement", "Dixièmement"]


def clean(s):
    s = str(s).replace("**", "").replace("\n", " ")
    return re.sub(r"\s+", " ", s).strip()


def phrase(s):
    s = clean(s)
    if s and s[-1] not in ".!?:»)":
        s += "."
    return s[:1].upper() + s[1:] if s else s


def enum(items):
    out = []
    for i, it in enumerate(items):
        lab = ORD[i] if i < len(ORD) else "Ensuite"
        out.append(f"{lab}, {clean(it)[:1].lower() + clean(it)[1:]}" + ("" if clean(it).endswith((".", "?", "!")) else "."))
    return " ".join(out)


def _side(side):
    if not side:
        return ""
    t = side.get("text", "")
    t = " ".join(clean(x) for x in t) if isinstance(t, list) else clean(t)
    return f" Encadré « {clean(side.get('head', ''))} » : {t}"


def compose(d, course, day):
    k = d["k"]
    titre = clean(d.get("title", ""))
    kick = clean(d.get("kicker", ""))
    L = []
    if k == "title":
        if day:
            L.append(f"Bonjour à toutes et à tous. Nous voici au jour {day} sur {course.get('n_jours', 15)} du cours « {course['titre']} ».")
        else:
            L.append(f"Bonjour à toutes et à tous. Cette présentation donne la vision d'ensemble du cours « {course['titre']} ».")
        L.append(f"La séance d'aujourd'hui s'intitule : {titre}.")
        if d.get("sub"):
            L.append(f"Je vous propose de garder en tête cette phrase : {clean(d['sub'])}")
        if d.get("right"):
            L.append(f"Nous travaillerons sur : {clean(d['right'])}.")
        L.append("Prenez de quoi noter : chaque notion vue aujourd'hui sera vérifiée par la fiche NDAP SUKULU du chapitre.")
    elif k == "synthese":
        L.append(f"{kick or 'Synthèse'}. Avant d'avancer, fixons ce qu'il faut retenir.")
        L.append(enum(d["items"]))
        L.append("Si l'un de ces points n'est pas clair, c'est le moment de poser la question.")
    elif k == "agenda":
        L.append("Voici le déroulé de nos deux heures.")
        for dur, it in d["items"]:
            L.append(f"Nous consacrerons {clean(dur)} à : {clean(it)}.")
        L.append("Je vous signalerai chaque changement de partie.")
    elif k == "chapitre":
        L.append(f"Nous ouvrons maintenant le {clean(d.get('short', d.get('num', '')))}, « {titre} ».")
        if d.get("part"):
            L.append(f"Il appartient à la {clean(d['part']).capitalize()}.")
        if d.get("question"):
            L.append(f"La question qui guide tout le chapitre est la suivante : {clean(d['question'])} "
                     "Gardez-la en tête : nous y répondrons à la fin.")
    elif k == "objectifs":
        L.append("Voici ce que vous devez savoir faire à la fin de ce chapitre.")
        L.append(enum(d["items"]))
        L.append("Ces objectifs sont exactement ceux que vérifient les exercices du livre et la fiche d'auto-évaluation.")
    elif k == "table":
        L.append(f"{kick + '. ' if kick else ''}Ce tableau porte sur : {titre}.")
        head = [clean(h) for h in d["head"]]
        L.append("Lisons-le ligne par ligne.")
        for r in d["rows"]:
            cells = [clean(c) for c in r]
            if len(cells) > 1:
                parts = "; ".join(f"{head[i].lower()} : {cells[i]}" for i in range(1, min(len(cells), len(head))) if cells[i])
                L.append(f"{cells[0]} : {parts}.")
            else:
                L.append(phrase(cells[0]))
        if d.get("note"):
            L.append(f"À retenir : {clean(d['note'])}")
    elif k == "steps":
        L.append(f"{titre}. La démarche compte {len(d['items'])} étapes, à suivre dans l'ordre.")
        for i, (h, t) in enumerate(d["items"], 1):
            L.append(f"Étape {i}, {clean(h)} : {clean(t)}")
    elif k == "stats":
        L.append(f"{titre}{', ' + kick if kick else ''}. Trois chiffres à retenir.")
        for v, lab in d["items"]:
            L.append(f"{clean(v)} : {clean(lab)}.")
        if d.get("bottom"):
            L.append(phrase(d["bottom"]))
    elif k == "points":
        L.append(f"{kick + '. ' if kick else ''}{titre}.")
        L.append(enum(d["items"]))
        L.append(_side(d.get("side")).strip())
    elif k == "cards":
        L.append(f"{kick + '. ' if kick else ''}{titre}.")
        if d.get("lead"):
            L.append(phrase(d["lead"]))
        for c in d["items"]:
            L.append(f"{clean(c.get('head', ''))} : {clean(c.get('text', ''))}")
    elif k == "definition":
        L.append("Arrêtons-nous sur une définition, à noter mot pour mot.")
        for item in d["items"]:
            terme, df = item[0], item[1]
            L.append(f"{clean(terme)} : {clean(df)}")
        if d.get("source"):
            L.append(f"Source : {clean(d['source'])}.")
        L.append("Demandez-vous à chaque fois : quel exemple du fil rouge illustre cette définition ?")
    elif k == "scenario":
        L.append(f"Passons au cas. {titre}{' (' + clean(d['label']) + ')' if d.get('label') else ''}.")
        for p in d.get("text", []):
            L.append(clean(p))
        L.append("Distinguez bien, dans ce récit, ce qui est constaté de ce qui est interprété.")
    elif k == "compare":
        L.append(f"{kick + '. ' if kick else ''}{titre}. Comparons les deux colonnes.")
        for side in ("left", "right"):
            s = d.get(side) or {}
            items = "; ".join(clean(x) for x in s.get("items", []))
            L.append(f"{clean(s.get('head', ''))} : {items}.")
        if d.get("bottom"):
            L.append(phrase(d["bottom"]))
    elif k == "quote":
        L.append(f"Écoutons cette citation : « {clean(d['text'])} », {clean(d['author'])}.")
        L.append("Je vous laisse un instant pour réagir : que nous dit-elle de la gouvernance ?")
    elif k == "exercice":
        L.append(f"Place à l'exercice : {clean(d.get('title', 'à vous de jouer'))}.")
        if d.get("duree"):
            L.append(f"Durée : {clean(d['duree'])}.")
        if d.get("text"):
            L.append(f"Consigne : {clean(d['text'])}")
        for i, q in enumerate(d.get("questions", []), 1):
            L.append(f"Question {i} : {clean(q)}")
        L.append("Laissez travailler, circulez entre les groupes, puis faites restituer deux ou trois réponses "
                 "avant de donner le corrigé.")
    elif k == "maison":
        L.append("Pour la prochaine séance, voici le travail personnel.")
        if d.get("ateliers"):
            L.append("Ateliers de questions-réponses : " + "; ".join(clean(a) for a in d["ateliers"]) + ".")
        if d.get("labs"):
            L.append("Labs de NDAP SUKULU : " + "; ".join(clean(a) for a in d["labs"]) + ".")
        if d.get("lecture"):
            L.append("Lecture préparatoire : " + "; ".join(clean(a) for a in d["lecture"]) + ".")
        L.append("Si le portail n'est pas encore ouvert, les fiches papier sont dans le dossier fiches du cours.")
    elif k == "fin":
        L.append(f"Pour conclure : la prochaine séance portera sur {clean(d['next'])}.")
        if d.get("items"):
            L.append("Nous y verrons notamment : " + "; ".join(clean(i) for i in d["items"]) + ".")
        L.append("Merci de votre attention. Je prends maintenant vos questions.")
    else:
        L.append(titre)
    txt = " ".join(x for x in L if x)
    if d.get("notes"):
        txt += "\n\nNote pour le présentateur : " + clean(d["notes"])
    return txt
