"""Dibuja el diagrama de casos de uso con posiciones fijas.

PlantUML deja las flechas cruzadas y el extend parece llegar al caso equivocado.
Este archivo es la fuente del PNG y del SVG que se entregan.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
FONT = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONTB = Path(r"C:\Windows\Fonts\segoeuib.ttf")

W, H = 1680, 1860


def font(size, bold=False):
    return ImageFont.truetype(str(FONTB if bold else FONT), size)


def text_size(draw, text, f):
    box = draw.textbbox((0, 0), text, font=f)
    return box[2] - box[0], box[3] - box[1]


def draw_center_lines(draw, cx, cy, lines, f, fill):
    heights = [text_size(draw, line, f)[1] for line in lines]
    total = sum(heights) + 2 * (len(lines) - 1)
    y = cy - total / 2
    for line, h in zip(lines, heights):
        w, _ = text_size(draw, line, f)
        draw.text((cx - w / 2, y), line, font=f, fill=fill)
        y += h + 2


def ellipse(draw, cx, cy, rx, ry, fill, outline):
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill, outline=outline, width=2)


def actor(draw, cx, head_y, lines):
    r = 13
    draw.ellipse((cx - r, head_y, cx + r, head_y + 2 * r), outline="#1C2833", width=2)
    neck = head_y + 2 * r
    hip = neck + 28
    draw.line((cx, neck, cx, hip), fill="#1C2833", width=2)
    draw.line((cx - 18, neck + 14, cx + 18, neck + 14), fill="#1C2833", width=2)
    draw.line((cx, hip, cx - 16, hip + 24), fill="#1C2833", width=2)
    draw.line((cx, hip, cx + 16, hip + 24), fill="#1C2833", width=2)
    draw_center_lines(draw, cx, hip + 46, lines, font(13), "#1C2833")


def poly(draw, points, fill, width=2):
    draw.line(points, fill=fill, width=width)


def dashed(draw, points, fill, width=2, on=9, off=6):
    # Orthogonal or straight segments, dashed along the polyline.
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        length = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        if length == 0:
            continue
        dx, dy = (x2 - x1) / length, (y2 - y1) / length
        dist = 0
        drawing = True
        while dist < length:
            step = on if drawing else off
            nxt = min(dist + step, length)
            if drawing:
                draw.line(
                    (x1 + dx * dist, y1 + dy * dist, x1 + dx * nxt, y1 + dy * nxt),
                    fill=fill,
                    width=width,
                )
            dist = nxt
            drawing = not drawing


def arrow_head(draw, tip, direction, fill, open_arrow=True):
    x, y = tip
    size = 12
    if direction == "right":
        p1, p2 = (x - size, y - 6), (x - size, y + 6)
    elif direction == "left":
        p1, p2 = (x + size, y - 6), (x + size, y + 6)
    elif direction == "up":
        p1, p2 = (x - 6, y + size), (x + 6, y + size)
    else:
        p1, p2 = (x - 6, y - size), (x + 6, y - size)
    if open_arrow:
        draw.line((p1, tip, p2), fill=fill, width=2)
    else:
        draw.polygon((tip, p1, p2), outline=fill)


def hollow_triangle(draw, tip, direction):
    x, y = tip
    h, w = 16, 12
    if direction == "up":
        pts = [(x, y), (x - w, y + h), (x + w, y + h)]
    elif direction == "down":
        pts = [(x, y), (x - w, y - h), (x + w, y - h)]
    elif direction == "left":
        pts = [(x, y), (x + h, y - w), (x + h, y + w)]
    else:
        pts = [(x, y), (x - h, y - w), (x - h, y + w)]
    draw.polygon(pts, fill="white", outline="#1C2833")


def label(draw, xy, text, f, fill):
    draw.text(xy, text, font=f, fill=fill)


def main():
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    ink = "#1C2833"
    blue = "#1A5276"
    purple = "#6C3483"
    green = "#0E6655"

    draw_center_lines(
        draw,
        W / 2,
        36,
        ["Sistema de Reservas y Pensionamiento de Almuerzos"],
        font(22, bold=True),
        ink,
    )
    draw_center_lines(
        draw,
        W / 2,
        64,
        ["Restaurante de la Unión Boliviana"],
        font(15),
        "#34495E",
    )

    # System boundary
    sys = (390, 100, 1320, 1688)
    draw.rounded_rectangle(sys, radius=8, outline="#1A365D", width=3)
    draw.text((408, 112), "Sistema", font=font(14, bold=True), fill="#1A365D")

    # Primary use cases, top to bottom, grouped by actor.
    P = {
        "UC01": (640, 190, ["Ingresar al sistema", "UC01 · HU01"]),
        "UC06": (640, 340, ["Solicitar pensionamiento", "UC06 · HU06"]),
        "UC09": (640, 490, ["Ver mi consumo del mes", "UC09 · HU09"]),
        "UC02": (640, 660, ["Reservar almuerzo", "UC02 · HU02"]),
        "UC03": (640, 810, ["Cancelar reserva", "UC03 · HU03"]),
        "UC07": (640, 960, ["Avisar inasistencia", "UC07 · HU07"]),
        "UC04": (640, 1130, ["Ver almuerzos confirmados", "del día", "UC04 · HU04"]),
        "UC05": (640, 1290, ["Registrar feriados del mes", "UC05 · HU05"]),
        "UC08": (640, 1480, ["Generar reporte mensual", "UC08 · HU08"]),
    }
    prx, pry = 128, 46

    I = {
        "I1": (1040, 190, ["Validar empleado", "en base de datos"]),
        "I5": (1040, 340, ["Registrar almuerzos del mes", "(L–J, sin feriados)"]),
        "I2": (1040, 620, ["Verificar día de servicio", "(L–J, no feriado, no pasado)"]),
        "I3": (1040, 810, ["Validar hora límite", "(antes de las 9:00)"]),
        "I6": (1040, 960, ["Validar mínimo", "de 10 almuerzos"]),
        "I4": (1040, 1290, ["Bloquear reservas", "y confirmaciones"]),
        "I7": (1040, 1410, ["Calcular montos", "(15 Bs / 18 Bs)"]),
    }
    irx, iry = 150, 40

    X = {
        "X1": (1040, 1545, ["Exportar a Excel"]),
        "X2": (1040, 1635, ["Exportar a PDF"]),
    }
    xrx, xry = 120, 28

    for cx, cy, lines in P.values():
        ellipse(draw, cx, cy, prx, pry, "#D6EAF8", blue)
        draw_center_lines(draw, cx, cy, lines, font(14), ink)

    for cx, cy, lines in I.values():
        ellipse(draw, cx, cy, irx, iry, "#F5EEF8", purple)
        draw_center_lines(draw, cx, cy, lines, font(13), ink)

    for cx, cy, lines in X.values():
        ellipse(draw, cx, cy, xrx, xry, "#E8F8F5", green)
        draw_center_lines(draw, cx, cy, lines, font(13), ink)

    def include(src, dst, text_at):
        x1 = P[src][0] + prx
        y1 = P[src][1]
        x2 = I[dst][0] - irx
        y2 = I[dst][1]
        if abs(y1 - y2) < 4:
            dashed(draw, [(x1, y1), (x2, y2)], purple)
            arrow_head(draw, (x2, y2), "right", purple)
            label(draw, text_at, "«include»", font(12), purple)
        else:
            mid = x1 + 36
            dashed(draw, [(x1, y1), (mid, y1), (mid, y2), (x2, y2)], purple)
            arrow_head(draw, (x2, y2), "right", purple)
            label(draw, text_at, "«include»", font(12), purple)

    include("UC01", "I1", (760, 158))
    include("UC06", "I5", (760, 308))
    include("UC02", "I2", (790, 590))
    include("UC02", "I3", (800, 760))
    include("UC03", "I3", (760, 778))
    include("UC07", "I3", (800, 900))
    include("UC07", "I6", (760, 928))
    include("UC05", "I4", (760, 1258))
    include("UC08", "I7", (800, 1378))

    # extend: from the extension toward the base use case
    for key, y_end, text_y in (("X1", 1510, 1518), ("X2", 1560, 1588)):
        x1 = X[key][0] - xrx
        y1 = X[key][1]
        x2 = P["UC08"][0] + prx
        dashed(draw, [(x1, y1), (x1 - 30, y1), (x1 - 30, y_end), (x2, y_end)], green)
        arrow_head(draw, (x2, y_end), "left", green)
        label(draw, (x1 - 28, text_y), "«extend»", font(12), green)

    label(draw, (900, 1508), "si elige Excel", font(11), green)
    label(draw, (900, 1662), "si elige PDF", font(11), green)

    # Secondary actor
    actor(draw, 1500, 150, ["Base de empleados", "de la institución"])
    # line from I1 across the boundary
    i1_right = I["I1"][0] + irx
    poly(draw, [(i1_right, I["I1"][1]), (1455, I["I1"][1])], ink)
    label(draw, (1330, 158), "consulta", font(12), "#34495E")

    # Actors
    actor(draw, 180, 250, ["Empleado"])
    actor(draw, 110, 620, ["Empleado", "no pensionado"])
    actor(draw, 250, 900, ["Empleado", "pensionado"])
    actor(draw, 180, 1240, ["Encargado del", "restaurante"])

    # Generalization: children point to parent with hollow triangle
    # Parent feet are around y=250+26+28+24 = 328, triangle just below the name? 
    # Place triangle under the parent figure, tip up toward the parent.
    parent_tip = (180, 400)
    hollow_triangle(draw, parent_tip, "up")
    # no pensionado (110, 620 head) up to triangle left
    poly(draw, [(110, 620), (110, 430), (168, 430), (168, 416)], ink)
    # pensionado (250, 900) 
    poly(draw, [(250, 900), (250, 430), (192, 430), (192, 416)], ink)

    def assoc(actor_x, actor_y, uc_key, lane_x):
        ucx, ucy, _ = P[uc_key]
        left = ucx - prx
        start_y = actor_y + 26
        poly(draw, [(actor_x + 20, start_y), (lane_x, start_y), (lane_x, ucy), (left, ucy)], ink)

    # Lanes in the corridor between actors and the system
    assoc(180, 276, "UC01", 330)
    assoc(180, 276, "UC06", 350)
    assoc(180, 276, "UC09", 370)
    assoc(110, 646, "UC02", 300)
    assoc(110, 646, "UC03", 320)
    assoc(250, 926, "UC07", 300)
    assoc(180, 1266, "UC04", 330)
    assoc(180, 1266, "UC05", 350)
    assoc(180, 1266, "UC08", 370)
    # Encargado also logs in. Route along the far left so it does not cross the other actors.
    poly(
        draw,
        [(160, 1292), (40, 1292), (40, 190), (640 - prx, 190)],
        ink,
    )

    # Legend
    legend = (390, 1718, 1320, 1828)
    draw.rounded_rectangle(legend, radius=6, outline="#D0D7DE", width=1)
    ellipse(draw, 430, 1752, 16, 10, "#D6EAF8", blue)
    label(draw, (456, 1742), "Objetivo del actor, trazable a una historia del backlog.", font(13), ink)
    ellipse(draw, 430, 1782, 16, 10, "#F5EEF8", purple)
    label(draw, (456, 1772), "«include»: se ejecuta siempre, como parte del caso base.", font(13), ink)
    ellipse(draw, 430, 1812, 16, 10, "#E8F8F5", green)
    label(
        draw,
        (456, 1802),
        "«extend»: solo si el encargado elige ese formato. El rechazo por hora o por el mínimo de 10 no es un extend.",
        font(13),
        ink,
    )

    png = OUT / "casos-de-uso.png"
    img.save(png, "PNG")
    print(png)


if __name__ == "__main__":
    main()
