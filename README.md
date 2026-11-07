# Sécurité Informatique (SIF)

[← Tous les cours de MaletYon](https://github.com/maletyon) · [Livre (PDF)](SIF_main.pdf) · [Présentations](Présentation/) · [Fiches par chapitre](fiches/) · [Corrigés](correction/README.md)

**UE SEC3266** · École Nationale Supérieure Polytechnique de l'Université de Yaoundé I · Département de Génie Informatique · HN3 · 60 heures
Auteur : MINKA MI NGUIDJOÏ Thierry Emmanuel, enseignant-chercheur (LIMSI, ENSPY) · contact : maletyon@proton.me · année académique 2026-2027

> *Une attaque réussie n'est presque jamais une prouesse : c'est une suite de portes laissées ouvertes.*

Ce cours est le socle de sécurité de l'élève ingénieur. Il part d'un incident, une nuit de mars à l'agence de Garoua de la société LiZbiZ, et remonte vers les propriétés, les menaces et la cryptographie, puis vers la gouvernance, les risques, les normes et le droit camerounais, la sécurité technique (réseaux, identités, systèmes, applications, nuage), la réponse aux incidents, la continuité et la mesure de la sécurité. Chaque notion est confrontée à quatre opérations fictives : GAROUA et LIZBIZ (logistique), WOURI (BANQUE SANAGA) et MEFOU (ANPP). Les noms, dates et montants sont fictifs ; les normes et les textes de loi sont cités d'après leur version officielle.

## Ce que contient ce dépôt

| Élément | Où | Description |
|---|---|---|
| Le livre du cours | [`SIF_main.pdf`](SIF_main.pdf) | Traité complet (prologue, six parties, 26 chapitres, annexes), compilé depuis [`SIF_main.tex`](SIF_main.tex) |
| Les présentations | [`Présentation/`](Présentation/) | 31 présentations PowerPoint : vision d'ensemble et 30 séances de 2 heures, avec notes du présentateur |
| Les fiches d'exercices | [`fiches/`](fiches/) | 27 fiches de 40 questions au format texte, une par chapitre (prologue compris) |
| Le livret de correction | [`correction/`](correction/) | Accès réservé : voir la page du dossier |
| Les sources LaTeX | `front/`, `partie0/` à `partie6/`, `annexes/`, `bibliographie/`, `figures/`, [`Style_SIF.sty`](Style_SIF.sty) | Sources du livre |

## Organisation du cours (60 heures, 30 séances de 2 heures)

| Partie | Chapitres | Séances | Fichiers |
|---|---|---|---|
| **Prologue** | Une nuit à Garoua | J01 | [`partie0/`](partie0/) |
| **I. Fondements** | 1. Objets et propriétés · 2. Menaces et attaques · 3. Cryptographie symétrique · 4. Cryptographie asymétrique · 5. Histoire des grandes attaques | J02 – J06 | [`partie1/`](partie1/) |
| **II. Gouvernance et risques** | 6. Gouvernance · 7. Risques · 8. Actifs et données · 9. Facteur humain | J07 – J10 | [`partie2/`](partie2/) |
| **III. Normes, droit et éthique** | 10. Normes et référentiels · 11. Droit au Cameroun et en Afrique · 12. Éthique | J11 – J13 | [`partie3/`](partie3/) |
| **IV. Sécurité technique** | 13. Modèles formels · 14. Architecture · 15. Réseaux (1) · 16. Réseaux (2) · 17. Identités et accès · 18. Systèmes · 19. Applications · 20. Nuage et mobiles · 21. Évaluer · 22. Opérations et incidents | J14 – J26 | [`partie4/`](partie4/) |
| **V. Défis avancés** | 23. Continuité et reprise · 24. Investigation numérique · 25. IA, objets connectés, post-quantique | J27 – J29 | [`partie5/`](partie5/) |
| **VI. Mesurer la sécurité** | 26. Indicateurs, OUI / NON / NEK, synthèse | J30 | [`partie6/`](partie6/) |
| **Annexes** | A. Glossaire · B. Outils · C. Modèles · D. Textes juridiques et normatifs · E. Bibliographie commentée · F. Contacts | | [`annexes/`](annexes/) |

Les chapitres 17, 19 et 22 occupent chacun deux séances. Chaque chapitre compte dix exercices gradués ; leurs corrigés, et ceux des fiches, sont dans le livret de correction. Les fiches et les labs se font hors des 60 heures.

## NDAP SUKULU, la salle de classe compagnon

*Ndap sukulu* signifie « la salle de classe » en bassa, et *Malet Yon* « ton enseignant ». NDAP SUKULU est l'environnement compagnon du cours : une fiche d'auto-évaluation de 40 questions par chapitre, corrigée automatiquement, des labs sur pièces et un tableau de bord de progression. Le code de cours est **SEC3266**.

> **NDAP SUKULU en local.** La version téléchargeable et installable sur votre poste, avec un module autonome pour ce cours, est en cours de finalisation. En attendant, les fiches d'auto-évaluation de chaque chapitre (40 questions) sont fournies au format texte dans [`fiches/`](fiches/).

| Lab | Chapitre | Sujet |
|---|---|---|
| SIF-LAB-01 | 3 | Empreintes et HMAC : retrouver les fichiers modifiés |
| SIF-LAB-02 | 4 | Certificats : lire une chaîne, repérer les défauts |
| SIF-LAB-03 | 7 | Analyse de risques EBIOS simplifiée |
| SIF-LAB-04 | 8 | Classer les actifs et coter les besoins |
| SIF-LAB-05 | 15 | Capture réseau : clair, balayage, ARP |
| SIF-LAB-06 | 16 | Règles de pare-feu |
| SIF-LAB-07 | 17 | Revue des comptes |
| SIF-LAB-08 | 18 | Durcissement Linux |
| SIF-LAB-09 | 19 | Revue de code |
| SIF-LAB-10 | 22 | Journaux : reconstituer l'attaque |

## Compiler le livre

Avec une distribution LaTeX : `pdflatex SIF_main`, `biber SIF_main`, `makeindex SIF_main`, puis deux fois `pdflatex SIF_main`.
Les présentations se régénèrent avec `python Présentation/_sources/gen_specs.py` puis `python Présentation/_sources/run.py SIF all` (Python 3 et python-pptx).

## Suite du parcours

Audit des systèmes d'information ([UE INF3226](https://github.com/maletyon/cours-asi)), investigation numérique ([UE SEC4031](https://github.com/maletyon/cours-iin) et [SEC4052](https://github.com/maletyon/cours-ina)), hacking éthique ([UE SEC4062](https://github.com/maletyon/cours-he2)), analyse des risques et gestion de crise ([UE GES4062](https://github.com/maletyon/cours-argc)).

## Normes et documents sous licence

Les normes ISO/IEC et les autres documents sous licence cités dans le cours **ne sont pas fournis** dans ce dépôt.

## Licence

Contenu pédagogique : [CC BY-NC-SA 4.0](LICENSE.md). Code du générateur de présentations : MIT. Voir [`LICENSE.md`](LICENSE.md).
