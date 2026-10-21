"""Dibuja el diagrama de casos de uso (backlog v2) con posiciones fijas.

PlantUML deja las flechas cruzadas y el extend parece llegar al caso equivocado.
Este archivo es la fuente del PNG que se entrega. Ejecutar: python render_casos_de_uso.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
FONT = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONTB = Path(r"C:\Windows\Fonts\segoeuib.ttf")

W, H = 1700, 2100


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

    draw_center_lines(draw, W / 2, 36, ["Sistema de Reservas y Pensionamiento de Almuerzos"], font(22, bold=True), ink)
    draw_center_lines(draw, W / 2, 64, ["Restaurante de la Unión Boliviana · casos de uso del backlog v2"], font(15), "#34495E")

    sys = (420, 100, 1330, 1940)
    draw.rounded_rectangle(sys, radius=8, outline="#1A365D", width=3)
    draw.text((438, 112), "Sistema de reservas", font=font(14, bold=True), fill="#1A365D")

    # Casos de uso del actor, agrupados por el include que comparten.
    P = {
        "CU01": (640, 190, ["Iniciar sesión", "CU01 · HU01"]),
        "CU05": (640, 330, ["Consultar familiares", "CU05 · HU05"]),
        "CU08": (640, 470, ["Pensionarse", "CU08 · HU08"]),
        "CU09": (640, 610, ["Pensionar a un familiar", "CU09 · HU09"]),
        "CU02": (640, 760, ["Reservar almuerzo propio", "CU02 · HU02"]),
        "CU03": (640, 900, ["Cancelar reserva propia", "CU03 · HU03"]),
        "CU06": (640, 1040, ["Reservar para un familiar", "CU06 · HU06"]),
        "CU10": (640, 1180, ["Avisar inasistencia", "de un pensionado", "CU10 · HU10"]),
        "CU13": (640, 1320, ["Consultar consumo", "propio y familiar", "CU13 · HU12"]),
        "CU04": (640, 1480, ["Ver almuerzos confirmados", "del día", "CU04 · HU04"]),
        "CU07": (640, 1620, ["Registrar feriados", "CU07 · HU07"]),
        "CU11": (640, 1760, ["Generar reporte mensual", "por titular", "CU11 · HU11"]),
    }
    prx, pry = 128, 46

    I = {
        "API": (1060, 190, ["Validar credenciales", "y estado (API)"]),
        "FAM": (1060, 330, ["Obtener familiares", "de la API"]),
        "MES": (1060, 540, ["Registrar almuerzos del mes", "(L–J, sin feriados)"]),
        "HORA": (1060, 970, ["Validar hora límite", "(antes de las 9:00)"]),
        "MIN": (1060, 1180, ["Validar mínimo de 10", "por persona"]),
        "CALC": (1060, 1760, ["Calcular montos por titular", "(15 Bs / 18 Bs)"]),
    }
    irx, iry = 150, 40

    X = {"CU12": (1060, 1880, ["Exportar reporte", "CU12 · Excel o PDF"])}
    xrx, xry = 128, 34

    for cx, cy, lines in P.values():
        ellipse(draw, cx, cy, prx, pry, "#D6EAF8", blue)
        draw_center_lines(draw, cx, cy, lines, font(14), ink)
    for cx, cy, lines in I.values():
        ellipse(draw, cx, cy, irx, iry, "#F5EEF8", purple)
        draw_center_lines(draw, cx, cy, lines, font(13), ink)
    for cx, cy, lines in X.values():
        ellipse(draw, cx, cy, xrx, xry, "#E8F8F5", green)
        draw_center_lines(draw, cx, cy, lines, font(13), ink)

    def include(src, dst, lane=None, dy=0, text_at=None):
        x1 = P[src][0] + int(prx * (1 - (dy / pry) ** 2) ** 0.5)
        y1 = P[src][1] + dy
        x2 = I[dst][0] - irx
        y2 = I[dst][1]
        puntos = [(x1, y1), (x2, y2)] if lane is None else [(x1, y1), (lane, y1), (lane, y2), (x2, y2)]
        dashed(draw, puntos, purple)
        arrow_head(draw, (x2, y2), "right", purple)
        if text_at:
            label(draw, text_at, "«include»", font(12), purple)

    include("CU01", "API", text_at=(800, 168))
    include("CU05", "FAM", text_at=(800, 308))
    include("CU08", "MES", lane=800, text_at=(812, 518))
    include("CU09", "MES", lane=800)
    include("CU02", "HORA", lane=840, text_at=(852, 948))
    include("CU03", "HORA", lane=800)
    include("CU06", "HORA", lane=800)
    include("CU10", "HORA", lane=840, dy=-16)
    include("CU10", "MIN", dy=12, text_at=(800, 1196))
    include("CU11", "CALC", text_at=(800, 1738))
    include("CU13", "CALC", lane=870, text_at=(878, 1500))

    # extend: de la extensión hacia el caso base (CU12 extiende a CU11)
    x1 = X["CU12"][0] - xrx
    y1 = X["CU12"][1]
    dashed(draw, [(x1, y1), (P["CU11"][0], y1), (P["CU11"][0], P["CU11"][1] + pry)], green)
    arrow_head(draw, (P["CU11"][0], P["CU11"][1] + pry), "up", green)
    label(draw, (700, y1 - 24), "«extend»  si el encargado elige exportar", font(12), green)

    # Actor secundario: la API empresarial, fuera del sistema.
    actor(draw, 1520, 140, ["API del sistema", "empresarial (TI)"])
    poly(draw, [(I["API"][0] + irx, I["API"][1]), (1490, I["API"][1])], ink)
    poly(draw, [(I["FAM"][0] + irx, I["FAM"][1]), (1600, I["FAM"][1]), (1600, 200), (1546, 200)], ink)
    label(draw, (1350, 168), "solo lectura", font(12), "#34495E")

    # Actores principales
    actor(draw, 180, 700, ["Empleado", "(titular)"])
    actor(draw, 180, 1560, ["Encargado del", "restaurante"])

    def assoc(trunk_y, uc_key, lane_x):
        ucx, ucy, _ = P[uc_key]
        poly(draw, [(200, trunk_y), (lane_x, trunk_y), (lane_x, ucy), (ucx - prx, ucy)], ink)

    trunk = 726
    for clave, lane in (("CU01", 300), ("CU05", 320), ("CU08", 340), ("CU09", 360)):
        assoc(trunk, clave, lane)
    for clave, lane in (("CU13", 300), ("CU10", 320), ("CU06", 340), ("CU03", 360), ("CU02", 380)):
        assoc(trunk, clave, lane)

    trunk_enc = 1586
    for clave, lane in (("CU04", 340), ("CU11", 300), ("CU07", 320)):
        assoc(trunk_enc, clave, lane)
    # El encargado también inicia sesión: por la izquierda, sin cruzar al empleado.
    poly(draw, [(160, trunk_enc), (40, trunk_enc), (40, 176), (P["CU01"][0] - prx + 2, 176)], ink)

    # Nota: el familiar no es actor
    nota = (1350, 1420, 1690, 1620)
    draw.rectangle(nota, fill="#FEF9E7", outline="#B7950B")
    for i, linea in enumerate([
        "El familiar de primer grado",
        "no es actor: no ingresa (R9).",
        "El empleado titular reserva,",
        "pensiona o avisa por él,",
        "eligiéndolo de la lista de",
        "CU05 (R11). No hay nombre libre.",
    ]):
        label(draw, (1364, 1430 + i * 30), linea, font(14), ink)

    legend = (420, 1966, 1330, 2076)
    draw.rounded_rectangle(legend, radius=6, outline="#D0D7DE", width=1)
    ellipse(draw, 460, 2000, 16, 10, "#D6EAF8", blue)
    label(draw, (486, 1990), "Objetivo del actor, trazable a una historia del backlog.", font(13), ink)
    ellipse(draw, 460, 2030, 16, 10, "#F5EEF8", purple)
    label(draw, (486, 2020), "«include»: se ejecuta siempre, como parte del caso base.", font(13), ink)
    ellipse(draw, 460, 2060, 16, 10, "#E8F8F5", green)
    label(draw, (486, 2050), "«extend»: solo si el encargado elige exportar. Un rechazo (9:00, tope, mínimo) no es extend.", font(13), ink)

    png = OUT / "casos-de-uso.png"
    img.save(png, "PNG")
    print(png)


if __name__ == "__main__":
    main()
