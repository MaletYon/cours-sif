"""Métadonnées du cours SIF (SEC3266) et répartition des 30 séances de 2 heures (60 heures).

Un code de chapitre suivi de a ou b désigne la première ou la seconde moitié de
ses sections (chapitres traités en deux séances)."""

COURS = r"C:\Users\Thierry MINKA\OneDrive\Documents\COURS"

SIF = {
    "sigle": "SIF",
    "code": "SEC3266",
    "titre": "Sécurité Informatique",
    "sous_titre": "Protéger, détecter, répondre, mesurer : la sécurité des systèmes d'information",
    "master": "Département de Génie Informatique · HN3",
    "bandeau": "Université de Yaoundé I",
    "ecole": "École Nationale Supérieure Polytechnique",
    "logo_g": "uy1",
    "logo_d": "enspy",
    "n_jours": 30,
    "annee": "2026-2027",
    "dossier": COURS + r"\ENSPY\SEC3266\Présentation",
    "fil_rouge": "GAROUA, LIZBIZ, WOURI, MEFOU",
    "parties": [
        ("Prologue", "Une nuit à Garoua", "P00"),
        ("Partie I", "Fondements", "C01–C05"),
        ("Partie II", "Gouvernance et risques", "C06–C09"),
        ("Partie III", "Normes, droit et éthique", "C10–C12"),
        ("Partie IV", "Sécurité technique", "C13–C22"),
        ("Partie V", "Défis avancés", "C23–C25"),
        ("Partie VI", "Mesurer la sécurité", "C26"),
    ],
    # jour : (thème court, contenu détaillé, ateliers, labs)
    "jours": {
        1: ("Ouverture · Une nuit à Garoua", "Présentation + Prologue", ["P00"], []),
        2: ("Objets et propriétés de la sécurité", "C01", ["C01"], []),
        3: ("Menaces, vulnérabilités et attaques", "C02", ["C02"], []),
        4: ("Cryptographie symétrique et hachage", "C03", ["C03"], ["LAB-01"]),
        5: ("Cryptographie asymétrique et certificats", "C04", ["C04"], ["LAB-02"]),
        6: ("Histoire des grandes attaques", "C05", ["C05"], []),
        7: ("Gouvernance de la sécurité", "C06", ["C06"], []),
        8: ("Analyse et gestion des risques", "C07", ["C07"], ["LAB-03"]),
        9: ("Actifs, classification, données", "C08", ["C08"], ["LAB-04"]),
        10: ("Le facteur humain", "C09", ["C09"], []),
        11: ("Normes et référentiels", "C10", ["C10"], []),
        12: ("Le droit de la sécurité au Cameroun et en Afrique", "C11", ["C11"], []),
        13: ("Éthique et responsabilité", "C12", ["C12"], []),
        14: ("Modèles formels de sécurité", "C13", ["C13"], []),
        15: ("Architecture de sécurité", "C14", ["C14"], []),
        16: ("Réseaux (1) : protocoles et attaques", "C15", ["C15"], ["LAB-05"]),
        17: ("Réseaux (2) : équipements et protocoles sûrs", "C16", ["C16"], ["LAB-06"]),
        18: ("Identités et accès (1) : authentifier", "C17a", ["C17a"], []),
        19: ("Identités et accès (2) : cycle de vie et revue", "C17b", ["C17b"], ["LAB-07"]),
        20: ("Sécurité des systèmes", "C18", ["C18"], ["LAB-08"]),
        21: ("Applications (1) : développer et modéliser", "C19a", ["C19a"], []),
        22: ("Applications (2) : injections, accès, tests", "C19b", ["C19b"], ["LAB-09"]),
        23: ("Sécurité du nuage et des mobiles", "C20", ["C20"], []),
        24: ("Évaluer la sécurité", "C21", ["C21"], []),
        25: ("Opérations (1) : SOC, SIEM, réponse", "C22a", ["C22a"], []),
        26: ("Opérations (2) : classer, guider, mesurer", "C22b", ["C22b"], ["LAB-10"]),
        27: ("Continuité et reprise", "C23", ["C23"], []),
        28: ("Premiers pas en investigation numérique", "C24", ["C24"], []),
        29: ("IA, objets connectés et post-quantique", "C25", ["C25"], []),
        30: ("Mesurer la sécurité · synthèse · clôture", "C26", ["C26"], []),
    },
}

ALL = {"SIF": SIF}
