"""Moteur de génération des diapositives de cours (ENSPY / Chaire UNESCO ACCES-TIC).

Chaque séance est décrite par une liste de dictionnaires {"k": type, ...} ;
ce module transforme cette description en fichier .pptx.
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from lxml import etree
from notes import compose

# logos du cours : <cours>/figures/logos (copiés depuis COURS/Logos)
LOGOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "figures", "logos")
ENSPY = os.path.join(LOGOS, "enspy_logo.jpg")
UNESCO = os.path.join(LOGOS, "unesco_logo.jpeg")
UY1 = os.path.join(LOGOS, "uy1_logo.png")
# logo : (chemin, rapport largeur/hauteur)
LOGO = {"enspy": (ENSPY, 1.0), "unesco": (UNESCO, 1080 / 1053), "uy1": (UY1, 370 / 480)}

ORANGE = RGBColor(0xE3, 0x6C, 0x0A)
ORANGE_L = RGBColor(0xFD, 0xEB, 0xD9)
NAVY = RGBColor(0x0C, 0x2A, 0x44)
BLUE = RGBColor(0x2A, 0x7F, 0xBF)
BLUE_L = RGBColor(0xE4, 0xF0, 0xF9)
GREY_L = RGBColor(0xF2, 0xF4, 0xF7)
TEXT = RGBColor(0x1F, 0x29, 0x33)
MUTED = RGBColor(0x5B, 0x67, 0x70)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREEN = RGBColor(0x2E, 0x7D, 0x4F)
GREEN_L = RGBColor(0xE3, 0xF2, 0xE8)
RED = RGBColor(0xB0, 0x30, 0x2A)
RED_L = RGBColor(0xFB, 0xE6, 0xE4)

HEAD = "Cambria"
BODY = "Calibri"
W, H = 13.333, 7.5
MX = 0.6  # marge latérale


# ---------------------------------------------------------------- utilitaires
def _rgb(shape_fill, color):
    shape_fill.solid()
    shape_fill.fore_color.rgb = color


def box(slide, x, y, w, h, fill=None, line=None, shape=MSO_SHAPE.RECTANGLE, radius=None, name=None, shadow=False):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None:
        s.fill.background()
    else:
        _rgb(s.fill, fill)
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(1)
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    if not shadow:
        sp = s._element.spPr
        etree.SubElement(sp, qn("a:effectLst"))
    if name:
        s.name = name
    s.text_frame.text = ""
    return s


def text(slide, x, y, w, h, content, size=16, color=TEXT, bold=False, font=BODY, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, italic=False, margin=0.0, spacing=6, bullets=False, line_spacing=None):
    """content : str ou liste ; un élément de liste = paragraphe.
    Un paragraphe peut être une chaîne, ou une liste de runs (texte, {options})."""
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, side, Inches(margin))
    paras = content if isinstance(content, list) else [content]
    if paras and isinstance(paras[0], tuple):  # une seule liste de runs = un paragraphe
        paras = [paras]
    for i, p in enumerate(paras):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = align
        if spacing:
            para.space_after = Pt(spacing)
        if line_spacing:
            para.line_spacing = line_spacing
        runs = p if isinstance(p, list) else [(p, {})]
        if bullets:
            _bullet(para, size)
        for r in runs:
            if isinstance(r, str):
                r = (r, {})
            t, o = r
            run = para.add_run()
            run.text = t
            f = run.font
            f.name = o.get("font", font)
            f.size = Pt(o.get("size", size))
            f.bold = o.get("bold", bold)
            f.italic = o.get("italic", italic)
            f.color.rgb = o.get("color", color)
    return tb


def _bullet(para, size):
    pPr = para._p.get_or_add_pPr()
    pPr.set("marL", str(int(Inches(0.28))))
    pPr.set("indent", str(-int(Inches(0.28))))
    for tag in ("a:buNone", "a:buChar", "a:buAutoNum", "a:buClr", "a:buFont"):
        for e in pPr.findall(qn(tag)):
            pPr.remove(e)
    buClr = etree.SubElement(pPr, qn("a:buClr"))
    srgb = etree.SubElement(buClr, qn("a:srgbClr"))
    srgb.set("val", "E36C0A")
    buFont = etree.SubElement(pPr, qn("a:buFont"))
    buFont.set("typeface", "Arial")
    bu = etree.SubElement(pPr, qn("a:buChar"))
    bu.set("char", "•")


def rich(s, color=TEXT, size=None):
    """Convertit '**gras**' en runs."""
    parts = s.split("**")
    runs = []
    for i, p in enumerate(parts):
        if not p:
            continue
        o = {"bold": i % 2 == 1}
        if i % 2 == 1:
            o["color"] = NAVY
        if size:
            o["size"] = size
        runs.append((p, o))
    return runs or [("", {})]


def fit(items, base, floor, budget):
    """Taille de police qui fait tenir ~budget caractères à la taille de base."""
    n = sum(len(i if isinstance(i, str) else str(i)) for i in items) + 40 * len(items)
    size = base
    while size > floor and n * (size / base) ** 2 > budget:
        size -= 1
    return size


def _plain(p):
    if isinstance(p, str):
        return p.replace("**", "")
    return "".join(r if isinstance(r, str) else r[0] for r in p)


def est_h(paras, w, size, spacing=6, indent=0.0):
    """Hauteur estimée (pouces) d'une liste de paragraphes dans une largeur w."""
    import math
    cpl = max(8, (w - indent) * 150 / size)  # caractères par ligne
    lh = size * 1.22 / 72
    tot = 0
    for p in paras:
        n = 0
        if max((len(x) for x in _plain(p).split()), default=0) * 1.12 > cpl:
            return 99  # un mot ne tient pas sur une ligne : il serait coupé
        for chunk in _plain(p).split("\n"):
            n += max(1, math.ceil(len(chunk) / cpl))
        tot += n * lh + spacing / 72
    return tot


def best(paras, w, h, hi=22, lo=13, spacing=6, indent=0.0):
    for s in range(hi, lo - 1, -1):
        if est_h(paras, w, s, spacing, indent) <= h:
            return s
    return lo


def circle_num(slide, x, y, d, label, fill=ORANGE, color=WHITE, size=16):
    c = box(slide, x, y, d, d, fill=fill, shape=MSO_SHAPE.OVAL)
    tf = c.text_frame
    for side in ("margin_left", "margin_right", "margin_top", "margin_bottom"):
        setattr(tf, side, 0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = str(label)
    r.font.size = Pt(size)
    r.font.bold = True
    r.font.name = BODY
    r.font.color.rgb = color
    return c


# ------------------------------------------------------------------ le deck
class Deck:
    def _logos_pair(self, s, x, y, h):
        """Deux petits logos côte à côte (gauche, droite) à partir de x."""
        (pg, rg), (pd, rd) = LOGO[self.c.get("logo_g", "enspy")], LOGO[self.c.get("logo_d", "unesco")]
        s.shapes.add_picture(pg, Inches(x + (h - h * rg) / 2), Inches(y), Inches(h * rg), Inches(h))
        s.shapes.add_picture(pd, Inches(x + 0.7), Inches(y), Inches(h * rd), Inches(h))

    def _logos_ends(self, s, y, h):
        """Logo gauche à la marge gauche, logo droit à la marge droite."""
        (pg, rg), (pd, rd) = LOGO[self.c.get("logo_g", "enspy")], LOGO[self.c.get("logo_d", "unesco")]
        s.shapes.add_picture(pg, Inches(MX), Inches(y), Inches(h * rg), Inches(h))
        s.shapes.add_picture(pd, Inches(W - MX - h * rd), Inches(y), Inches(h * rd), Inches(h))

    def __init__(self, course, day=None, theme=""):
        self.nj = course.get("n_jours", 15)
        self.c = course
        self.day = day
        self.theme = theme
        self.prs = Presentation()
        self.prs.slide_width = Inches(W)
        self.prs.slide_height = Inches(H)
        self.blank = self.prs.slide_layouts[6]
        self.n = 0
        self.chapter = ""
        self.pages = []  # zones « page i/N », complétées à la fin

    # -- cadre commun des diapositives de contenu
    def _frame(self, title, kicker=None, dark=False):
        s = self.prs.slides.add_slide(self.blank)
        self.n += 1
        bg = s.background.fill
        _rgb(bg, NAVY if dark else WHITE)
        if title:
            if kicker:
                text(s, MX, 0.32, 9.6, 0.32, kicker.upper(), size=12, bold=True, color=ORANGE, margin=0, spacing=0)
            text(s, MX, 0.62, 10.4, 0.95, title, size=28 if len(title) <= 50 else 24 if len(title) <= 60 else 21, bold=True, font=HEAD,
                 color=WHITE if dark else NAVY, anchor=MSO_ANCHOR.TOP, margin=0, spacing=0)
        self._footer(s, dark)
        return s

    def _footer(self, s, dark=False):
        # logos en haut à droite, pied de page discret
        self._logos_pair(s, W - 1.62, 0.28, 0.62)
        if dark:
            # pastille blanche derrière les logos sur fond sombre
            pass
        jour = f"jour {self.day}/{self.nj}" if self.day else "vue d'ensemble"
        lab = f"{self.c['sigle']} · {self.c['code']} - maletyon@proton.me · {jour} · · ·"
        coul = RGBColor(0xB8, 0xC4, 0xD0) if dark else MUTED
        text(s, MX, H - 0.45, 9.4, 0.3, lab, size=10, color=coul, margin=0, spacing=0)
        tb = text(s, W - 2.6, H - 0.45, 2.0, 0.3, f"page {self.n}", size=10, color=coul,
                  align=PP_ALIGN.RIGHT, margin=0, spacing=0)
        self.pages.append((tb, self.n))

    def notes(self, s, n):
        # remplacé à l'assemblage par les notes rédigées (voir build)
        self._last_slide = s

    # -- types de diapositives ------------------------------------------------
    def title_slide(self, d):
        s = self.prs.slides.add_slide(self.blank)
        self.n += 1
        _rgb(s.background.fill, NAVY)
        # bandeau blanc des logos
        panel = box(s, 0, 0, W, 1.55, fill=WHITE)
        self._logos_ends(s, 0.18, 1.2)
        # cours de l'ENSPY : l'université en petit, l'école en grand ;
        # cours de la Chaire UNESCO : l'école et l'université en petit, la Chaire en grand
        if self.c.get("bandeau") == "Université de Yaoundé I":
            haut, grand = "Université de Yaoundé I", "École Nationale Supérieure Polytechnique"
        else:
            haut = "École Nationale Supérieure Polytechnique de l'Université de Yaoundé I"
            grand = self.c.get("bandeau", "Chaire UNESCO d'Afrique Centrale ACCES-TIC")
        text(s, 2.1, 0.12, W - 4.2, 0.3, haut,
             size=12, color=NAVY, bold=True, align=PP_ALIGN.CENTER, margin=0, spacing=0)
        text(s, 2.1, 0.42, W - 4.2, 0.55, grand,
             size=24, color=ORANGE, bold=True, align=PP_ALIGN.CENTER, margin=0, spacing=0)
        text(s, 2.1, 1.08, W - 4.2, 0.35, self.c["master"], size=12, color=MUTED, align=PP_ALIGN.CENTER, margin=0, spacing=0)
        # bloc titre
        tag = d.get("tag") or f"{self.c['sigle']} · {self.c['code']}"
        pill = box(s, MX, 2.05, 4.6, 0.46, fill=ORANGE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.5)
        text(s, MX, 2.05, 4.6, 0.46, tag, size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
        text(s, MX, 2.75, W - 2 * MX, 0.9, self.c["titre"], size=24, color=RGBColor(0xB8, 0xC4, 0xD0), font=HEAD, margin=0, spacing=0)
        text(s, MX, 3.35, W - 2 * MX, 1.9, d["title"], size=d.get("size", 40), bold=True, color=WHITE, font=HEAD,
             margin=0, spacing=0, anchor=MSO_ANCHOR.TOP)
        if d.get("sub"):
            text(s, MX, 5.25, W - 2 * MX, 0.8, d["sub"], size=18, italic=True, color=RGBColor(0xF6, 0xB2, 0x6B), margin=0, spacing=0)
        text(s, MX, 6.45, 8.5, 0.6, [[("MINKA MI NGUIDJOÏ Thierry Emmanuel", {"bold": True})],
                                     "Enseignant-chercheur · LIMSI · ENSPY  ·  " + self.c["annee"]],
             size=13, color=WHITE, margin=0, spacing=2)
        if d.get("right"):
            text(s, W - MX - 4.5, 6.45, 4.5, 0.6, d["right"], size=13, color=RGBColor(0xB8, 0xC4, 0xD0), align=PP_ALIGN.RIGHT,
                 margin=0, spacing=2)
        self.notes(s, d.get("notes"))

    def agenda(self, d):
        """Déroulé de la séance : liste de (durée, intitulé)."""
        s = self._frame(d.get("title", "Déroulé de la séance"), d.get("kicker", "2 heures"))
        rows = d["items"]
        n = len(rows)
        top, avail = 1.75, H - 1.75 - 0.75
        step = min(0.82, avail / n)
        for i, (dur, lab) in enumerate(rows):
            y = top + i * step
            circle_num(s, MX, y + 0.04, 0.5, i + 1, size=15)
            box(s, MX + 0.75, y, W - 2 * MX - 0.75, step - 0.14, fill=GREY_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.15)
            text(s, MX + 0.95, y, 8.6, step - 0.14, rich(lab), size=17 if step > 0.7 else 15, anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
            text(s, W - MX - 1.9, y, 1.7, step - 0.14, dur, size=14, bold=True, color=ORANGE, align=PP_ALIGN.RIGHT,
                 anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def objectifs(self, d):
        s = self._frame(d.get("title", "Objectifs de la séance"), d.get("kicker", "À l'issue de la séance, vous saurez"))
        items = d["items"]
        n = len(items)
        cols = 2 if n > 4 else 1
        rows = -(-n // cols)
        top = 1.8
        gap = 0.25
        cw = (W - 2 * MX - (cols - 1) * 0.35) / cols
        ch = min(1.15, (H - top - 0.75 - (rows - 1) * gap) / rows)
        size = 17 if ch >= 0.95 else 15
        for i, it in enumerate(items):
            r, c = (i % rows, i // rows) if cols == 2 else (i, 0)
            x = MX + c * (cw + 0.35)
            y = top + r * (ch + gap)
            box(s, x, y, cw, ch, fill=BLUE_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12)
            circle_num(s, x + 0.2, y + (ch - 0.5) / 2, 0.5, i + 1, size=15)
            text(s, x + 0.9, y, cw - 1.1, ch, rich(it), size=size, anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def chapitre(self, d):
        """Intercalaire de chapitre (fond sombre)."""
        self.chapter = d.get("short", d["num"])
        s = self.prs.slides.add_slide(self.blank)
        self.n += 1
        _rgb(s.background.fill, NAVY)
        big = box(s, MX, 1.5, 2.3, 2.3, fill=ORANGE, shape=MSO_SHAPE.OVAL)
        text(s, MX, 1.5, 2.3, 2.3, d["num"], size=40 if len(d["num"]) <= 3 else 30, bold=True, color=WHITE, font=HEAD,
             align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
        text(s, 3.4, 1.35, W - 3.4 - MX, 0.4, d.get("part", ""), size=14, bold=True, color=RGBColor(0xF6, 0xB2, 0x6B), margin=0, spacing=0)
        text(s, 3.4, 1.8, W - 3.4 - MX, 2.1, d["title"], size=36 if len(d["title"]) < 60 else 30, bold=True, color=WHITE, font=HEAD,
             margin=0, spacing=0, anchor=MSO_ANCHOR.TOP)
        if d.get("question"):
            box(s, 3.4, 4.35, W - 3.4 - MX, 1.5, fill=RGBColor(0x16, 0x3B, 0x5C), shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.1)
            text(s, 3.65, 4.45, W - 3.9 - MX, 0.35, "QUESTION DIRECTRICE", size=12, bold=True, color=RGBColor(0xF6, 0xB2, 0x6B), margin=0, spacing=0)
            text(s, 3.65, 4.8, W - 3.9 - MX, 1.0, d["question"], size=20, italic=True, color=WHITE, font=HEAD, margin=0, spacing=0)
        # logos sur pastille blanche
        box(s, W - 1.78, 0.2, 1.6, 0.78, fill=WHITE, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.2)
        self._logos_pair(s, W - 1.7, 0.28, 0.62)
        lab = f"{self.c['sigle']} · {self.c['code']} · Jour {self.day}/{self.nj}"
        text(s, MX, H - 0.45, 9, 0.3, lab, size=10, color=RGBColor(0xB8, 0xC4, 0xD0), margin=0, spacing=0)
        text(s, W - 1.6, H - 0.45, 1.0, 0.3, str(self.n), size=10, color=RGBColor(0xB8, 0xC4, 0xD0), align=PP_ALIGN.RIGHT, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def points(self, d):
        """Liste à puces, avec encadré latéral facultatif (side: {head, text})."""
        s = self._frame(d["title"], d.get("kicker"))
        items = d["items"]
        side = d.get("side")
        w = W - 2 * MX - (4.3 if side else 0)
        hh = H - 1.8 - 0.85
        size = best(items, w, hh, 22, 14, 10, 0.3)
        text(s, MX, 1.8, w, hh, [rich(i) for i in items], size=size, bullets=True, spacing=10, margin=0)
        if side:
            x = W - MX - 3.95
            col = {"orange": (ORANGE_L, ORANGE), "green": (GREEN_L, GREEN), "red": (RED_L, RED)}.get(side.get("tone"), (BLUE_L, BLUE))
            box(s, x, 1.8, 3.95, hh, fill=col[0], shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08)
            text(s, x + 0.3, 2.0, 3.35, 0.5, side["head"].upper(), size=13, bold=True, color=col[1], margin=0, spacing=0)
            st = side["text"] if isinstance(side["text"], list) else [side["text"]]
            ssize = best(st, 3.35, hh - 0.9, 20, 13, 8)
            text(s, x + 0.3, 2.5, 3.35, hh - 0.9, [rich(t) for t in st], size=ssize, margin=0, spacing=8)
        self.notes(s, d.get("notes"))

    def cards(self, d):
        """Grille de cartes {head, text} (2 à 6)."""
        s = self._frame(d["title"], d.get("kicker"))
        cs = d["items"]
        n = len(cs)
        cols = d.get("cols") or (2 if n in (2, 4) else 3)
        rows = -(-n // cols)
        top = 1.8 if not d.get("lead") else 2.45
        if d.get("lead"):
            text(s, MX, 1.72, W - 2 * MX, 0.6, rich(d["lead"]), size=17, color=MUTED, margin=0, spacing=0)
        gap = 0.3
        cw = (W - 2 * MX - (cols - 1) * gap) / cols
        ch = (H - top - 0.75 - (rows - 1) * gap) / rows
        size = min(best([c.get("text", "")], cw - 0.5, ch - 1.05, 22, 12, 0) for c in cs)
        for i, c in enumerate(cs):
            r, k = divmod(i, cols)
            x = MX + k * (cw + gap)
            y = top + r * (ch + gap)
            fill = c.get("fill", GREY_L)
            for key in ("fill", "color"):
                if isinstance(c.get(key), str):
                    c[key] = RGBColor.from_string(c[key])
            fill = c.get("fill", GREY_L)
            box(s, x, y, cw, ch, fill=fill, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
            badge = c.get("badge", str(i + 1))
            circle_num(s, x + 0.22, y + 0.22, 0.5, badge, fill=c.get("color", ORANGE), size=14 if len(badge) < 3 else 11)
            text(s, x + 0.85, y + 0.2, cw - 1.05, 0.6, c["head"], size=17, bold=True, color=NAVY, anchor=MSO_ANCHOR.MIDDLE,
                 margin=0, spacing=0)
            text(s, x + 0.25, y + 0.9, cw - 0.5, ch - 1.0, rich(c.get("text", "")), size=size, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def definition(self, d):
        """Une ou deux définitions encadrées."""
        s = self._frame(d.get("title", "Définition"), d.get("kicker", "Définition"))
        defs = d["items"]
        n = len(defs)
        top = 1.85
        gap = 0.3
        tw = W - 2 * MX - 0.7
        hmax = (H - top - 0.85 - (n - 1) * gap) / n
        if n >= 3:  # terme à gauche, définition à droite
            gap = 0.22
            hmax = (H - top - 0.85 - (n - 1) * gap) / n
            lw, rw = 3.3, W - 2 * MX - 3.3 - 0.75
            size = min(best([t], rw, hmax - 0.3, 20, 13, 0) for _, t in defs)
            for i, (term, txt) in enumerate(defs):
                y = top + i * (hmax + gap)
                box(s, MX, y, W - 2 * MX, hmax, fill=BLUE_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.1)
                text(s, MX + 0.3, y, lw - 0.3, hmax, term, size=19, bold=True, color=BLUE, font=HEAD, anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
                text(s, MX + lw + 0.3, y, rw, hmax, rich(txt), size=size, anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
            if d.get("source"):
                text(s, MX, H - 0.8, W - 2 * MX, 0.3, d["source"], size=11, italic=True, color=MUTED, margin=0, spacing=0)
            self.notes(s, d.get("notes"))
            return
        size = min(best([t], tw, hmax - 0.92, 26 if n == 1 else 22, 14, 0) for _, t in defs)
        hs = [min(hmax, est_h([t], tw, size, 0) + 1.0) for _, t in defs]
        y = top + max(0, (H - top - 0.85 - sum(hs) - (n - 1) * gap) / 3)
        for (term, txt), hh in zip(defs, hs):
            box(s, MX, y, W - 2 * MX, hh, fill=BLUE_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.08)
            text(s, MX + 0.35, y + 0.18, tw, 0.5, term, size=22 if n < 3 else 19, bold=True, color=BLUE, font=HEAD, margin=0, spacing=0)
            text(s, MX + 0.35, y + 0.72 if n < 3 else y + 0.62, tw, hh - 0.8, rich(txt), size=size, margin=0, spacing=0)
            y += hh + gap
        if d.get("source"):
            text(s, MX, H - 0.8, W - 2 * MX, 0.3, d["source"], size=11, italic=True, color=MUTED, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def table(self, d):
        s = self._frame(d["title"], d.get("kicker"))
        head, rows = d["head"], d["rows"]
        widths = d.get("widths")
        nrows, ncols = len(rows) + 1, len(head)
        top = 1.8
        avail = H - top - 0.85 - (0.5 if d.get("note") else 0)
        tw = W - 2 * MX
        ws = widths or [1] * ncols
        cws = [tw * wv / sum(ws) - 0.22 for wv in ws]
        allrows = [head] + rows

        def heights(sz):
            return [max(est_h([c], cws[j], sz, 0) for j, c in enumerate(r)) + 0.16 for r in allrows]
        size = d.get("size")
        if not size:
            size = 11
            for sz in range(20, 10, -1):
                if sum(heights(sz)) <= avail:
                    size = sz
                    break
        hs = heights(size)
        extra = max(0, avail - sum(hs)) / nrows
        hs = [h_ + min(extra, 0.35) for h_ in hs]
        gt = s.shapes.add_table(nrows, ncols, Inches(MX), Inches(top), Inches(tw), Inches(sum(hs)))
        tbl = gt.table
        tblPr = tbl._tbl.tblPr
        style = tblPr.find(qn("a:tableStyleId"))
        if style is not None:
            style.text = "{5940675A-B579-460E-94D1-54222C63F5DA}"  # sans style, grille
        for j, wv in enumerate(ws):
            tbl.columns[j].width = Inches(tw * wv / sum(ws))
        for i in range(nrows):
            tbl.rows[i].height = Inches(hs[i])
            for j in range(ncols):
                cell = tbl.cell(i, j)
                val = head[j] if i == 0 else rows[i - 1][j]
                cell.fill.solid()
                cell.fill.fore_color.rgb = NAVY if i == 0 else (GREY_L if i % 2 == 0 else WHITE)
                cell.margin_left = cell.margin_right = Inches(0.1)
                cell.margin_top = cell.margin_bottom = Inches(0.04)
                cell.vertical_anchor = MSO_ANCHOR.MIDDLE
                tf = cell.text_frame
                tf.word_wrap = True
                p = tf.paragraphs[0]
                for t, o in rich(val):
                    r = p.add_run()
                    r.text = t
                    r.font.size = Pt(size)
                    r.font.name = BODY
                    r.font.bold = i == 0 or o.get("bold", False) or (j == 0 and d.get("bold_first", True))
                    r.font.color.rgb = WHITE if i == 0 else (NAVY if (j == 0 and d.get("bold_first", True)) else TEXT)
        if d.get("note"):
            text(s, MX, top + sum(hs) + 0.15, W - 2 * MX, 0.45, rich(d["note"]), size=14, italic=True, color=MUTED, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def scenario(self, d):
        """Épisode du cas fil rouge."""
        s = self._frame(d["title"], d.get("kicker", "Fil rouge"))
        box(s, MX, 1.8, W - 2 * MX, H - 1.8 - 0.8, fill=ORANGE_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
        text(s, MX + 0.4, 1.98, 7, 0.4, d.get("label", "Scénario").upper(), size=13, bold=True, color=ORANGE, margin=0, spacing=0)
        paras = d["text"] if isinstance(d["text"], list) else [d["text"]]
        size = best(paras, W - 2 * MX - 0.8, H - 2.45 - 1.0, 24, 14, 10)
        text(s, MX + 0.4, 2.45, W - 2 * MX - 0.8, H - 2.45 - 1.0, [rich(p) for p in paras], size=size, margin=0, spacing=10)
        self.notes(s, d.get("notes"))

    def steps(self, d):
        """Processus en étapes numérotées (horizontal si ≤ 5, sinon vertical en 2 colonnes)."""
        s = self._frame(d["title"], d.get("kicker"))
        st = d["items"]
        n = len(st)
        if d.get("lead"):
            text(s, MX, 1.72, W - 2 * MX, 0.6, rich(d["lead"]), size=17, color=MUTED, margin=0, spacing=0)
        top = 2.45 if d.get("lead") else 1.9
        if n <= 5:
            gap = 0.22
            cw = (W - 2 * MX - (n - 1) * gap) / n
            ch = H - top - 0.85
            size = min(best([t], cw - 0.44, ch - 1.75, 20, 12, 0) for _, t in st)
            for i, (h, t) in enumerate(st):
                x = MX + i * (cw + gap)
                box(s, x, top, cw, ch, fill=GREY_L if i % 2 else BLUE_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
                circle_num(s, x + 0.22, top + 0.22, 0.55, i + 1, size=17)
                if i < n - 1:
                    a = box(s, x + cw - 0.05, top + 0.36, gap + 0.1, 0.28, fill=ORANGE, shape=MSO_SHAPE.RIGHT_ARROW)
                text(s, x + 0.22, top + 0.9, cw - 0.44, 0.75, h, size=17, bold=True, color=NAVY, margin=0, spacing=0)
                text(s, x + 0.22, top + 1.6, cw - 0.44, ch - 1.7, rich(t), size=size, margin=0, spacing=0)
        else:
            cols = 2
            rows = -(-n // cols)
            gap = 0.2
            cw = (W - 2 * MX - 0.4) / 2
            rh = (H - top - 0.8 - (rows - 1) * gap) / rows
            size = min(best([h + " : " + t], cw - 0.95, rh - 0.1, 18, 12, 0) for h, t in st)
            for i, (h, t) in enumerate(st):
                c, r = divmod(i, rows)
                x = MX + c * (cw + 0.4)
                y = top + r * (rh + gap)
                box(s, x, y, cw, rh, fill=GREY_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.1)
                circle_num(s, x + 0.15, y + (rh - 0.48) / 2, 0.48, i + 1, size=14)
                text(s, x + 0.8, y, cw - 0.95, rh, [[(h + " : ", {"bold": True, "color": NAVY})] + rich(t)], size=size,
                     anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def compare(self, d):
        """Deux colonnes comparées."""
        s = self._frame(d["title"], d.get("kicker"))
        L, R = d["left"], d["right"]
        cw = (W - 2 * MX - 0.4) / 2
        top = 1.85
        hh = H - top - 0.8 - (0.6 if d.get("bottom") else 0)
        for k, (col, fill, acc) in enumerate(((L, BLUE_L, BLUE), (R, ORANGE_L, ORANGE))):
            x = MX + k * (cw + 0.4)
            box(s, x, top, cw, hh, fill=fill, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
            text(s, x + 0.3, top + 0.2, cw - 0.6, 0.55, col["head"], size=20 if len(col["head"]) <= 34 else 16, bold=True, color=acc, font=HEAD, margin=0, spacing=0)
            size = min(best(c["items"], cw - 0.6, hh - 1.05, 22, 13, 8, 0.3) for c in (L, R))
            text(s, x + 0.3, top + 0.85, cw - 0.6, hh - 1.0, [rich(i) for i in col["items"]], size=size, bullets=True, spacing=8, margin=0)
        if d.get("bottom"):
            text(s, MX, H - 1.3, W - 2 * MX, 0.5, rich(d["bottom"]), size=16, italic=True, color=NAVY, margin=0, spacing=0,
                 anchor=MSO_ANCHOR.MIDDLE)
        self.notes(s, d.get("notes"))

    def stats(self, d):
        """Chiffres clés : liste de (valeur, libellé)."""
        s = self._frame(d["title"], d.get("kicker"))
        st = d["items"]
        n = len(st)
        gap = 0.3
        cw = (W - 2 * MX - (n - 1) * gap) / n
        top = 2.0
        ch = 3.0 if d.get("bottom") else 3.6
        for i, (v, lab) in enumerate(st):
            x = MX + i * (cw + gap)
            box(s, x, top, cw, ch, fill=GREY_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
            vs = 44 if len(v) <= 6 else 34 if len(v) <= 10 else 26
            text(s, x + 0.2, top + 0.25, cw - 0.4, 1.2, v, size=vs, bold=True, color=ORANGE, font=HEAD, align=PP_ALIGN.CENTER,
                 anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
            text(s, x + 0.25, top + 1.5, cw - 0.5, ch - 1.6, lab, size=15, color=TEXT, align=PP_ALIGN.CENTER, margin=0, spacing=0)
        if d.get("bottom"):
            text(s, MX, top + ch + 0.35, W - 2 * MX, 1.0, rich(d["bottom"]), size=17, color=NAVY, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def quote(self, d):
        s = self._frame(d.get("title", ""), d.get("kicker"))
        text(s, MX + 0.2, 1.3, 1.3, 1.7, "«", size=96, bold=True, color=ORANGE, font=HEAD, margin=0, spacing=0)
        text(s, MX + 1.4, 2.0, W - 2 * MX - 2.0, 3.0, d["text"], size=d.get("size", 28), italic=True, color=NAVY, font=HEAD,
             margin=0, spacing=0, anchor=MSO_ANCHOR.MIDDLE)
        text(s, MX + 1.4, 5.2, W - 2 * MX - 2.0, 0.6, d["author"], size=16, color=MUTED, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def exercice(self, d):
        s = self._frame(d.get("title", "À vous de jouer"), d.get("kicker", "Exercice en séance"))
        dur = d.get("duree", "")
        box(s, MX, 1.8, W - 2 * MX, H - 1.8 - 0.8, fill=GREEN_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
        text(s, MX + 0.4, 1.98, 8, 0.4, ("Exercice" + (f" · {dur}" if dur else "")).upper(), size=13, bold=True, color=GREEN,
             margin=0, spacing=0)
        y = 2.45
        tw = W - 2 * MX - 0.8
        qs = d.get("questions", [])
        allp = ([d["text"]] if d.get("text") else []) + qs
        size = best(allp, tw, H - y - 1.1 - (0.2 if d.get("text") else 0), 22, 13, 8, 0.3)
        if d.get("text"):
            text(s, MX + 0.4, y, tw, 1.3, rich(d["text"]), size=size, margin=0, spacing=0)
            y += est_h([d["text"]], tw, size, 0) + 0.25
        if qs:
            text(s, MX + 0.4, y, tw, H - y - 1.0,
                 [[(f"{i + 1}. ", {"bold": True, "color": GREEN})] + rich(q) for i, q in enumerate(qs)], size=size, spacing=8, margin=0)
        self.notes(s, d.get("notes"))

    def synthese(self, d):
        s = self._frame(d.get("title", "Ce qu'il faut retenir"), d.get("kicker", "Synthèse"))
        items = d["items"]
        n = len(items)
        top = 1.8
        gap = 0.16
        rh = min(1.05, (H - top - 0.8 - (n - 1) * gap) / n)
        size = min(best([it], W - 2 * MX - 1.1, rh - 0.12, 20, 13, 0) for it in items)
        for i, it in enumerate(items):
            y = top + i * (rh + gap)
            box(s, MX, y, W - 2 * MX, rh, fill=BLUE_L if i % 2 == 0 else GREY_L, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.12)
            circle_num(s, MX + 0.18, y + (rh - 0.44) / 2, 0.44, "✓", fill=GREEN, size=14)
            text(s, MX + 0.85, y, W - 2 * MX - 1.1, rh, rich(it), size=size, anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def maison(self, d):
        """Travail à faire à la maison (hors des heures de présentiel)."""
        s = self._frame("Travail à la maison", "Hors présentiel · indicatif")
        cols = [("Ateliers questions-réponses", d.get("ateliers", []), BLUE_L, BLUE, "Q/R"),
                ("Labs de NDAP SUKULU", d.get("labs", []) or ["Pas de lab associé à cette séance"], ORANGE_L, ORANGE, "LAB"),
                ("Lecture préparatoire", d.get("lecture", []), GREEN_L, GREEN, "LIRE")]
        cw = (W - 2 * MX - 2 * 0.3) / 3
        top = 1.85
        hh = H - top - 1.35
        for k, (h, its, fill, acc, badge) in enumerate(cols):
            x = MX + k * (cw + 0.3)
            box(s, x, top, cw, hh, fill=fill, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
            circle_num(s, x + 0.25, top + 0.25, 0.62, badge, fill=acc, size=11)
            text(s, x + 1.0, top + 0.25, cw - 1.2, 0.62, h, size=17, bold=True, color=acc, anchor=MSO_ANCHOR.MIDDLE, margin=0, spacing=0)
            size = min(best(c[1] or [""], cw - 0.6, hh - 1.3, 18, 12, 6, 0.3) for c in cols)
            text(s, x + 0.3, top + 1.1, cw - 0.6, hh - 1.25, [rich(i) for i in its], size=size, bullets=True, spacing=6, margin=0)
        text(s, MX, H - 1.3, W - 2 * MX, 0.5,
             rich("Fiches et labs sur **NDAP SUKULU**, code " + self.c["code"] + ". Ce travail personnel ne fait pas partie des " + str(2 * self.nj) + " heures de présentiel ; la répartition est indicative."),
             size=13, italic=True, color=MUTED, margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    def fin(self, d):
        s = self.prs.slides.add_slide(self.blank)
        self.n += 1
        _rgb(s.background.fill, NAVY)
        box(s, 0, 0, W, 1.3, fill=WHITE)
        self._logos_ends(s, 0.15, 1.0)
        text(s, MX, 1.9, W - 2 * MX, 0.5, d.get("label", "PROCHAINE SÉANCE"), size=14, bold=True, color=RGBColor(0xF6, 0xB2, 0x6B), margin=0, spacing=0)
        text(s, MX, 2.4, W - 2 * MX, 1.6, d["next"], size=34, bold=True, color=WHITE, font=HEAD, margin=0, spacing=0)
        if d.get("items"):
            text(s, MX, 4.2, W - 2 * MX, 2.0, [rich(i, color=WHITE) for i in d["items"]], size=18, color=WHITE, bullets=True, spacing=8,
                 margin=0)
        text(s, MX, H - 0.75, W - 2 * MX, 0.4, d.get("foot", "Merci de votre attention · questions ?"), size=16, italic=True,
             color=RGBColor(0xB8, 0xC4, 0xD0), margin=0, spacing=0)
        self.notes(s, d.get("notes"))

    # -- assemblage ------------------------------------------------------------
    def build(self, spec, path):
        for d in spec:
            k = d["k"]
            avant = len(self.prs.slides)
            if k == "title":
                self.title_slide(d)
            elif k == "chapitre":
                self.chapitre(d)
            else:
                getattr(self, k)(d)
            for sl in list(self.prs.slides)[avant:]:
                sl.notes_slide.notes_text_frame.text = compose(d, self.c, self.day)
        total = len(self.prs.slides)
        for tb, i in self.pages:
            tb.text_frame.paragraphs[0].runs[0].text = f"page {i}/{total}"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.prs.core_properties.author = "Thierry MINKA"
        self.prs.core_properties.title = spec[0].get("title", "")
        self.prs.save(path)
        return self.n
