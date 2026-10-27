"""Dibuja los diagramas del backlog final: casos de uso, clases y capas.

Las posiciones son fijas para que ninguna flecha cruce un caso de uso ni llegue al lugar equivocado.
Este archivo es la fuente de los PNG que se entregan. Ejecutar: python render_diagramas.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
FONT = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONTB = Path(r"C:\Windows\Fonts\segoeuib.ttf")
FONTI = Path(r"C:\Windows\Fonts\segoeuii.ttf")

INK = "#1C2833"
GRIS = "#5D6D7E"
AZUL = "#1A5276"
MORADO = "#6C3483"
VERDE = "#0E6655"


def font(size, bold=False, italic=False):
    ruta = FONTB if bold else FONTI if italic else FONT
    return ImageFont.truetype(str(ruta), size)


def medir(draw, texto, f):
    caja = draw.textbbox((0, 0), texto, font=f)
    return caja[2] - caja[0], caja[3] - caja[1]


def centrado(draw, cx, cy, lineas, f, color=INK):
    altos = [medir(draw, linea, f)[1] for linea in lineas]
    total = sum(altos) + 3 * (len(lineas) - 1)
    y = cy - total / 2 - 2
    for linea, alto in zip(lineas, altos):
        ancho, _ = medir(draw, linea, f)
        draw.text((cx - ancho / 2, y), linea, font=f, fill=color)
        y += alto + 3


def punteada(draw, puntos, color, ancho=2, on=9, off=6):
    for (x1, y1), (x2, y2) in zip(puntos, puntos[1:]):
        largo = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        if largo == 0:
            continue
        dx, dy = (x2 - x1) / largo, (y2 - y1) / largo
        d, pinta = 0.0, True
        while d < largo:
            siguiente = min(d + (on if pinta else off), largo)
            if pinta:
                draw.line((x1 + dx * d, y1 + dy * d, x1 + dx * siguiente, y1 + dy * siguiente), fill=color, width=ancho)
            d, pinta = siguiente, not pinta


def punta(draw, extremo, direccion, color, abierta=True, tam=12):
    x, y = extremo
    vectores = {"derecha": (-1, 0), "izquierda": (1, 0), "arriba": (0, 1), "abajo": (0, -1)}
    vx, vy = vectores[direccion]
    p1 = (x + vx * tam - vy * 6, y + vy * tam - vx * 6)
    p2 = (x + vx * tam + vy * 6, y + vy * tam + vx * 6)
    if abierta:
        draw.line((p1, extremo, p2), fill=color, width=2)
    else:
        draw.polygon((extremo, p1, p2), fill=color)


def triangulo(draw, extremo, direccion):
    """Punta de generalización: triángulo hueco."""
    x, y = extremo
    h, w = 16, 11
    puntos = {
        "arriba": [(x, y), (x - w, y + h), (x + w, y + h)],
        "abajo": [(x, y), (x - w, y - h), (x + w, y - h)],
        "izquierda": [(x, y), (x + h, y - w), (x + h, y + w)],
        "derecha": [(x, y), (x - h, y - w), (x - h, y + w)],
    }[direccion]
    draw.polygon(puntos, fill="white", outline=INK)


def rombo(draw, extremo, direccion, lleno):
    """Composición (lleno) o agregación (hueco), apoyado en el lado del todo."""
    x, y = extremo
    largo, medio = 22, 8
    if direccion in ("derecha", "izquierda"):
        s = 1 if direccion == "derecha" else -1
        puntos = [(x, y), (x + s * largo / 2, y - medio), (x + s * largo, y), (x + s * largo / 2, y + medio)]
    else:
        s = 1 if direccion == "abajo" else -1
        puntos = [(x, y), (x - medio, y + s * largo / 2), (x, y + s * largo), (x + medio, y + s * largo / 2)]
    draw.polygon(puntos, fill=INK if lleno else "white", outline=INK)


def actor(draw, cx, cabeza, lineas):
    r = 13
    draw.ellipse((cx - r, cabeza, cx + r, cabeza + 2 * r), outline=INK, width=2)
    cuello = cabeza + 2 * r
    cadera = cuello + 28
    draw.line((cx, cuello, cx, cadera), fill=INK, width=2)
    draw.line((cx - 18, cuello + 14, cx + 18, cuello + 14), fill=INK, width=2)
    draw.line((cx, cadera, cx - 16, cadera + 24), fill=INK, width=2)
    draw.line((cx, cadera, cx + 16, cadera + 24), fill=INK, width=2)
    centrado(draw, cx, cadera + 48, lineas, font(14, bold=True))
    return cabeza, cadera + 24


# --- Casos de uso ------------------------------------------------------------------------


def casos_de_uso():
    W, H = 1760, 2240
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    centrado(d, W / 2, 34, ["Diagrama de casos de uso · Sistema de reservas y pensionamiento de almuerzos"], font(22, bold=True))
    centrado(d, W / 2, 64, ["Restaurante de la Unión Boliviana · backlog final (HU01–HU11)"], font(15), GRIS)

    d.rounded_rectangle((430, 100, 1500, 2080), radius=8, outline="#1A365D", width=3)
    d.text((448, 110), "Sistema de reservas del restaurante", font=font(15, bold=True), fill="#1A365D")

    rx, ry = 150, 44
    P = {
        "IS": (680, 200, ["Iniciar sesión", "CU01 · HU02"]),
        "RU": (680, 390, ["Registrar usuario y", "su grupo familiar", "CU02 · HU01"]),
        "PM": (680, 520, ["Publicar el menú semanal", "CU03 · HU03"]),
        "LD": (680, 650, ["Ver almuerzos", "confirmados del día", "CU04 · HU06"]),
        "MB": (680, 830, ["Modificar o dar de baja", "usuarios y familiares", "CU05 · HU09"]),
        "RM": (680, 1100, ["Generar reporte mensual", "CU06 · HU10"]),
        "CO": (680, 1290, ["Consultar mi consumo", "del mes", "CU07 · HU11"]),
        "VM": (680, 1420, ["Consultar el menú semanal", "CU08 · HU03"]),
        "RA": (680, 1550, ["Reservar almuerzo", "CU09 · HU04"]),
        "CR": (680, 1690, ["Cancelar reserva", "CU10 · HU05"]),
        "AI": (680, 1830, ["Avisar inasistencia", "de un pensionado", "CU11 · HU08"]),
        "PE": (680, 1970, ["Pensionar", "CU12 · HU07"]),
    }
    irx, iry = 170, 38
    I = {
        "CRED": (1260, 160, ["Validar credenciales", "y usuario activo"]),
        "DUP": (1260, 390, ["Validar datos obligatorios,", "duplicados y parentesco"]),
        "CONF": (1260, 560, ["Confirmar almuerzos", "de los pensionados"]),
        "ADM": (1260, 760, ["Validar que quede un", "administrador activo"]),
        "CALC": (1260, 1195, ["Calcular montos por persona", "y total por titular"]),
        "TOPE": (1260, 1480, ["Validar una por persona", "por día y tope diario"]),
        "HORA": (1260, 1690, ["Validar día con menú y", "hora límite (9:00)"]),
        "MIN": (1260, 1850, ["Validar mínimo de", "almuerzos por persona"]),
        "PLAZO": (1260, 1990, ["Validar plazo (antes del mes)", "y pensión no duplicada"]),
    }
    exr, exy = 160, 32
    X = {
        "CAMB": (1260, 260, ["Cambiar contraseña", "en el primer ingreso"]),
        "TIPO": (1260, 850, ["Cambiar tipo de usuario"]),
        "REST": (1260, 920, ["Restablecer contraseña"]),
        "ANUL": (1260, 995, ["Anular reservas futuras", "de la persona dada de baja"]),
        "EXP": (1260, 1100, ["Exportar en Excel o PDF"]),
    }

    for cx, cy, lineas in P.values():
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill="#D6EAF8", outline=AZUL, width=2)
        centrado(d, cx, cy, lineas, font(14))
    for cx, cy, lineas in I.values():
        d.ellipse((cx - irx, cy - iry, cx + irx, cy + iry), fill="#F5EEF8", outline=MORADO, width=2)
        centrado(d, cx, cy, lineas, font(13))
    for cx, cy, lineas in X.values():
        d.ellipse((cx - exr, cy - exy, cx + exr, cy + exy), fill="#E8F8F5", outline=VERDE, width=2)
        centrado(d, cx, cy, lineas, font(13))

    def borde_derecho(clave, dy=0):
        cx, cy, _ = P[clave]
        return cx + int(rx * (1 - (dy / ry) ** 2) ** 0.5), cy + dy

    def include(origen, destino, carril=None, dy=0, rotulo=True):
        x1, y1 = borde_derecho(origen, dy)
        x2, y2 = I[destino][0] - irx, I[destino][1]
        puntos = [(x1, y1), (x2, y2)] if carril is None else [(x1, y1), (carril, y1), (carril, y2), (x2, y2)]
        punteada(d, puntos, MORADO)
        punta(d, (x2, y2), "derecha", MORADO)
        if rotulo:
            mx = (x1 + (carril or x2)) / 2 if carril else (x1 + x2) / 2
            my = y1 if carril else (y1 + y2) / 2
            d.text((mx - 34, my - 22), "«include»", font=font(12), fill=MORADO)

    def extend(extension, base, carril, dy=0):
        """La flecha va de la extensión al caso base."""
        x1, y1 = X[extension][0] - exr, X[extension][1]
        x2, y2 = borde_derecho(base, dy)
        punteada(d, [(x1, y1), (carril, y1), (carril, y2), (x2, y2)], VERDE)
        punta(d, (x2, y2), "izquierda", VERDE)
        d.text((carril + 6, y1 - 22), "«extend»", font=font(12), fill=VERDE)

    include("IS", "CRED", carril=960, dy=-18)
    extend("CAMB", "IS", carril=960, dy=18)
    include("RU", "DUP")
    include("PM", "CONF", dy=-10)
    include("MB", "ADM", carril=980, dy=-26)
    extend("TIPO", "MB", carril=1000, dy=-6)
    extend("REST", "MB", carril=1020, dy=12)
    extend("ANUL", "MB", carril=1040, dy=28)
    include("RM", "CALC", carril=960, dy=20)
    extend("EXP", "RM", carril=1000, dy=-14)
    include("CO", "CALC", carril=980, rotulo=False)
    include("RA", "TOPE", carril=960, dy=-18)
    include("RA", "HORA", carril=1000, dy=18, rotulo=False)
    include("CR", "HORA")
    include("AI", "HORA", carril=1000, dy=-18, rotulo=False)
    include("AI", "MIN", dy=14)
    include("PE", "PLAZO")
    # Pensionar también confirma los días ya publicados: se rodea por fuera de los demás casos.
    cx, cy, _ = P["PE"]
    destino = (I["CONF"][0] + irx, I["CONF"][1])
    punteada(d, [(cx, cy + ry), (cx, 2050), (1470, 2050), (1470, destino[1]), destino], MORADO)
    punta(d, destino, "izquierda", MORADO)
    d.text((1300, 2056), "«include»", font=font(12), fill=MORADO)

    # Actores: Usuario (general) y sus dos especializaciones.
    _, pies_usuario = actor(d, 140, 150, ["Usuario"])
    d.line((165, 200, P["IS"][0] - rx, 200), fill=INK, width=2)

    cabeza_admin, pies_admin = actor(d, 230, 560, ["Usuario", "administrador"])
    cabeza_emp, pies_emp = actor(d, 230, 1560, ["Usuario", "empleado"])
    # Generalización: de la especialización hacia el general.
    d.line((230, cabeza_admin, 230, 400, 150, 400, 150, pies_usuario + 54), fill=INK, width=2)
    triangulo(d, (150, pies_usuario + 54), "arriba")
    d.line((205, cabeza_emp, 205, 1480, 60, 1480, 60, 400, 150, 400), fill=INK, width=2)

    def asociacion(tronco_y, clave, carril, desde=252):
        cx, cy, _ = P[clave]
        d.line((desde, tronco_y, carril, tronco_y, carril, cy, cx - rx, cy), fill=INK, width=2)

    for clave, carril in (("RU", 330), ("PM", 350), ("LD", 370), ("MB", 350), ("RM", 330)):
        asociacion(608, clave, carril)
    for clave, carril in (("CO", 330), ("VM", 350), ("RA", 370), ("CR", 370), ("AI", 350), ("PE", 330)):
        asociacion(1608, clave, carril)

    # Nota: el familiar no es actor.
    d.rectangle((24, 1880, 312, 2070), fill="#FEF9E7", outline="#B7950B")
    for i, linea in enumerate([
        "Los familiares de primer grado",
        "no son actores: no ingresan al",
        "sistema (R4). El usuario empleado",
        "reserva, pensiona, cancela y avisa",
        "a su nombre (R15), eligiéndolos",
        "de su grupo familiar activo.",
    ]):
        d.text((36, 1892 + i * 28), linea, font=font(13), fill=INK)

    d.rounded_rectangle((430, 2100, 1500, 2216), radius=6, outline="#D0D7DE")
    leyenda = [
        ("#D6EAF8", AZUL, "Caso de uso de un actor, trazable a una historia del backlog (CUxx · HUxx)."),
        ("#F5EEF8", MORADO, "«include»: comportamiento obligatorio que el caso base siempre ejecuta."),
        ("#E8F8F5", VERDE, "«extend»: opcional; la flecha va de la extensión al caso que extiende."),
    ]
    for i, (relleno, borde, texto) in enumerate(leyenda):
        y = 2130 + i * 30
        d.ellipse((450, y - 10, 484, y + 10), fill=relleno, outline=borde, width=2)
        d.text((498, y - 11), texto, font=font(13), fill=INK)

    img.save(OUT / "casos-de-uso.png", "PNG")


# --- Clases ------------------------------------------------------------------------------


def clase(d, x, y, ancho, nombre, atributos, operaciones=(), estereotipo=None, abstracta=False, tono="#EBF5FB"):
    f = font(13)
    alto_titulo = 30 + (18 if estereotipo else 0)
    alto_attr = 10 + 20 * max(1, len(atributos))
    alto_ops = (10 + 20 * len(operaciones)) if operaciones else 0
    alto = alto_titulo + alto_attr + alto_ops
    d.rectangle((x, y, x + ancho, y + alto), fill="white", outline=INK, width=2)
    d.rectangle((x, y, x + ancho, y + alto_titulo), fill=tono, outline=INK, width=2)
    ty = y + 6
    if estereotipo:
        centrado(d, x + ancho / 2, ty + 7, [f"«{estereotipo}»"], font(12), GRIS)
        ty += 18
    centrado(d, x + ancho / 2, ty + 10, [nombre], font(15, bold=not abstracta, italic=abstracta))
    for i, atributo in enumerate(atributos):
        d.text((x + 10, y + alto_titulo + 5 + 20 * i), atributo, font=f, fill=INK)
    if operaciones:
        yo = y + alto_titulo + alto_attr
        d.line((x, yo, x + ancho, yo), fill=INK, width=2)
        for i, operacion in enumerate(operaciones):
            d.text((x + 10, yo + 5 + 20 * i), operacion, font=f, fill=INK)
    return (x, y, x + ancho, y + alto)


def rotulo(d, xy, texto, color=INK, tam=13):
    d.text(xy, texto, font=font(tam), fill=color)


def clases():
    W, H = 1900, 1500
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    centrado(d, W / 2, 30, ["Diagrama de clases del dominio · Sistema de reservas del restaurante"], font(22, bold=True))
    centrado(d, W / 2, 58, ["Backlog final · atributos y relaciones que usan los casos de uso HU01–HU11"], font(15), GRIS)

    persona = clase(d, 760, 110, 300, "Persona", [
        "+ nombres: texto", "+ apellidos: texto", "+ ci: texto {único}", "+ fechaNacimiento: fecha",
        "+ telefono: texto", "+ activo: booleano",
    ], ["+ nombreCompleto(): texto"], abstracta=True)
    usuario = clase(d, 520, 480, 330, "Usuario", [
        "+ codigoEmpleado: texto {único}", "+ nombreUsuario: texto {único}", "+ contrasenaHash: texto",
        "+ tipo: TipoUsuario", "+ debeCambiarContrasena: booleano",
    ], ["+ topeDiario(): entero  {1 + familiares activos}"])
    familiar = clase(d, 1120, 480, 260, "Familiar", ["+ parentesco: Parentesco"], [], tono="#EBF5FB")

    # Generalización hacia Persona.
    base_y = persona[3]
    d.line((685, usuario[1], 685, 400, 1250, 400, 1250, familiar[1]), fill=INK, width=2)
    d.line((910, 400, 910, base_y + 16), fill=INK, width=2)
    triangulo(d, (910, base_y), "arriba")

    # Usuario 1 ◇── 0..* Familiar (titular)
    y_titular = 520
    d.line((usuario[2] + 22, y_titular, familiar[0], y_titular), fill=INK, width=2)
    rombo(d, (usuario[2], y_titular), "derecha", lleno=False)
    rotulo(d, (usuario[2] + 26, y_titular - 22), "1")
    rotulo(d, (familiar[0] - 40, y_titular - 22), "0..*")
    rotulo(d, (usuario[2] + 70, y_titular + 6), "titular de", GRIS, 12)

    menu = clase(d, 40, 110, 280, "MenuSemanal", ["+ lunes: fecha {id}", "+ publicadoEl: fecha"], ["+ publicar()  {no se modifica}"])
    dia = clase(d, 40, 330, 280, "MenuDia", ["+ fecha: fecha {lunes a jueves}", "+ descripcion: texto"])
    d.line((180, menu[3] + 22, 180, dia[1]), fill=INK, width=2)
    rombo(d, (180, menu[3]), "abajo", lleno=True)
    rotulo(d, (190, menu[3] + 24), "1")
    rotulo(d, (190, dia[1] - 22), "1..4")

    reserva = clase(d, 40, 760, 330, "Reserva", [
        "+ fecha: fecha", "+ modalidad: Modalidad", "+ precioBs: entero  {18 | 15}", "+ estado: EstadoReserva",
    ], ["+ cuentaParaCobro(): booleano", "+ cancelar()", "+ avisarInasistencia()"])
    pension = clase(d, 40, 1120, 330, "Pension", [
        "+ anio: entero", "+ mes: entero", "+ solicitadaEl: fecha",
    ], ["+ minimoDelMes(diasConMenu): entero"])

    # Reserva * ── 1 MenuDia
    d.line((180, dia[3], 180, reserva[1]), fill=INK, width=2)
    rotulo(d, (190, dia[3] + 4), "1")
    rotulo(d, (190, reserva[1] - 22), "*")
    rotulo(d, (196, (dia[3] + reserva[1]) / 2 - 8), "se sirve el", GRIS, 12)

    # Reserva * ── 1 Persona (beneficiario)
    d.line((reserva[2], 790, 1410, 790, 1410, 330, persona[2], 330), fill=INK, width=2)
    rotulo(d, (reserva[2] + 6, 766), "*")
    rotulo(d, (persona[2] + 6, 306), "1")
    rotulo(d, (reserva[2] + 70, 766), "beneficiario (consume)", GRIS, 12)

    # Reserva * ── 1 Usuario (titular del descuento)
    d.line((reserva[2], 850, 600, 850, 600, usuario[3]), fill=INK, width=2)
    rotulo(d, (reserva[2] + 6, 826), "*")
    rotulo(d, (606, usuario[3] + 4), "1")
    rotulo(d, (reserva[2] + 70, 856), "se descuenta al titular", GRIS, 12)

    # Pension * ── 1 Persona (pensionado) y * ── 1 Usuario (titular)
    d.line((pension[2], 1150, 1430, 1150, 1430, 360, persona[2], 360), fill=INK, width=2)
    rotulo(d, (pension[2] + 6, 1126), "*")
    rotulo(d, (persona[2] + 6, 364), "1")
    rotulo(d, (pension[2] + 70, 1126), "pensionado", GRIS, 12)
    d.line((pension[2], 1210, 640, 1210, 640, usuario[3]), fill=INK, width=2)
    rotulo(d, (pension[2] + 6, 1186), "*")
    rotulo(d, (646, usuario[3] + 24), "1")
    rotulo(d, (pension[2] + 70, 1216), "titular", GRIS, 12)

    # Pension - - > Reserva: origina las reservas de cada día con menú.
    punteada(d, [(120, pension[1]), (120, reserva[3])], INK)
    punta(d, (120, reserva[3]), "arriba", INK)
    rotulo(d, (128, (reserva[3] + pension[1]) / 2 - 18), "«crea» una por día", GRIS, 12)
    rotulo(d, (128, (reserva[3] + pension[1]) / 2), "con menú publicado", GRIS, 12)

    sesion = clase(d, 1460, 640, 300, "Sesion", ["+ tokenHash: texto", "+ ultimaActividad: instante"], ["+ expirada(): booleano  {30 min}"])
    d.line((usuario[2], 640, 1300, 640, 1300, 700, sesion[0], 700), fill=INK, width=2)
    rotulo(d, (usuario[2] + 6, 616), "1")
    rotulo(d, (sesion[0] - 22, 676), "*")

    reporte = clase(d, 760, 960, 300, "ReporteMensual", ["+ anio: entero", "+ mes: entero", "+ totalBs: entero"],
                    ["+ exportar(formato): archivo"], estereotipo="calculado, no se guarda", tono="#F4ECF7")
    titular = clase(d, 1500, 960, 310, "DescuentoTitular", ["+ codigoEmpleado: texto", "+ totalBs: entero"],
                    estereotipo="calculado", tono="#F4ECF7")
    linea = clase(d, 1500, 1210, 310, "LineaDescuento", [
        "+ modalidad: Modalidad", "+ cantidad: entero", "+ precioUnitarioBs: entero", "+ subtotalBs: entero",
    ], estereotipo="calculado", tono="#F4ECF7")
    d.line((reporte[2] + 22, 1040, titular[0], 1040), fill=INK, width=2)
    rombo(d, (reporte[2], 1040), "derecha", lleno=True)
    rotulo(d, (reporte[2] + 26, 1016), "1")
    rotulo(d, (titular[0] - 40, 1016), "0..*")
    d.line((1655, titular[3] + 22, 1655, linea[1]), fill=INK, width=2)
    rombo(d, (1655, titular[3]), "abajo", lleno=True)
    rotulo(d, (1663, titular[3] + 24), "1")
    rotulo(d, (1663, linea[1] - 22), "0..*")
    punteada(d, [(titular[0], 985), (1450, 985), (1450, 580), (usuario[2], 580)], GRIS)
    punta(d, (usuario[2], 580), "izquierda", GRIS)
    rotulo(d, (1456, 880), "por cada usuario", GRIS, 12)
    rotulo(d, (1456, 898), "empleado (HU10 CA5)", GRIS, 12)

    # Enumeraciones.
    clase(d, 1460, 110, 200, "TipoUsuario", ["ADMINISTRADOR", "EMPLEADO"], estereotipo="enumeración", tono="#FEF9E7")
    clase(d, 1680, 110, 190, "Modalidad", ["NO_PENSIONADO", "PENSIONADO"], estereotipo="enumeración", tono="#FEF9E7")
    clase(d, 1460, 300, 200, "Parentesco", ["CONYUGE", "HIJO / HIJA", "PADRE / MADRE"], estereotipo="enumeración", tono="#FEF9E7")
    clase(d, 1680, 300, 190, "EstadoReserva", ["CONFIRMADA", "CANCELADA", "INASISTENCIA_AVISADA"], estereotipo="enumeración", tono="#FEF9E7")

    d.rectangle((420, 1290, 1080, 1460), fill="#FEF9E7", outline="#B7950B")
    for i, texto in enumerate([
        "Reglas que viven en estas clases (src/dominio):",
        "· precio 18 Bs no pensionado, 15 Bs pensionado (R8, R10)",
        "· una reserva por persona y día; solo días con MenuDia (R7, R15)",
        "· tope diario = 1 + familiares activos (R14)",
        "· mínimo del mes = min(10, días con menú) por persona (R11)",
        "· lo CONFIRMADA se cobra aunque no asista (R13)",
    ]):
        d.text((434, 1302 + i * 26), texto, font=font(14, bold=i == 0), fill=INK)

    img.save(OUT / "clases.png", "PNG")


# --- Arquitectura por capas -------------------------------------------------------------


def caja(d, rect, titulo, lineas, relleno, borde, tam=14):
    d.rounded_rectangle(rect, radius=10, fill=relleno, outline=borde, width=3)
    x1, y1, x2, _ = rect
    centrado(d, (x1 + x2) / 2, y1 + 22, [titulo], font(17, bold=True), borde)
    for i, linea in enumerate(lineas):
        d.text((x1 + 18, y1 + 48 + i * (tam + 9)), linea, font=font(tam), fill=INK)


def arquitectura():
    W, H = 1700, 1300
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    centrado(d, W / 2, 30, ["Arquitectura por capas · las dependencias apuntan hacia el dominio"], font(22, bold=True))
    centrado(d, W / 2, 58, ["Node.js + TypeScript · Express · GraphQL Yoga · Prisma · PostgreSQL (Supabase) · desplegado en Render"], font(15), GRIS)

    caja(d, (60, 100, 460, 260), "Usuarios", [
        "Navegador: pantallas del administrador", "y del empleado (HTML del servidor)", "Frontend aparte: API GraphQL /graphql",
    ], "#FDFEFE", GRIS)
    pres = (560, 100, 1640, 300)
    caja(d, pres, "Presentación  · src/presentacion", [
        "web.ts: rutas y formularios (HU01–HU11)       paginasEmpleado.ts · paginasAdministrador.ts · vistas.ts",
        "graphql/: esquema, resolvers y servidor Yoga   token.ts: cookie HttpOnly o Authorization: Bearer",
        "Lee el pedido, llama a un caso de uso y muestra su resultado. No decide reglas ni abre la base.",
    ], "#EBF5FB", AZUL)
    app = (560, 370, 1640, 600)
    caja(d, app, "Aplicación  · src/aplicacion", [
        "Un caso de uso por historia: RegistrarUsuario, IniciarSesion, CambiarContrasena, PublicarMenu,",
        "ReservarAlmuerzo, CancelarReserva, VerListaDelDia, Pensionar, AvisarInasistencia,",
        "ListarUsuarios · AgregarFamiliar · ModificarDatos · CambiarTipoUsuario · DarDeBaja · RestablecerContrasena,",
        "GenerarReporteMensual · ExportarReporteMensual, VerMiConsumo. comun.ts: sinPermiso() (R2, HU02 CA6).",
        "Cada uno recibe por constructor solo los puertos que usa (inyección de dependencias).",
    ], "#F4ECF7", MORADO)
    dom = (560, 670, 1640, 900)
    caja(d, dom, "Dominio  · src/dominio  (no importa nada de afuera)", [
        "modelo.ts: Persona, Cuenta, Reserva, Pension, MenuSemanal, precios, tope, mínimo, validación de datos",
        "tiempo.ts: hora límite 9:00, lunes a jueves, semanas y meses        reporte.ts: descuento por titular",
        "puertos.ts (interfaces): PersonaRepositorio, CuentaRepositorio, ReservaRepositorio, PensionRepositorio,",
        "MenuRepositorio, SesionRepositorio, CifradorDeContrasenas, GeneradorDeTokens, ExportadorReporte, Reloj",
    ], "#E8F8F5", VERDE)
    infra = (60, 980, 1100, 1220)
    caja(d, infra, "Infraestructura  · src/infraestructura  (implementa los puertos)", [
        "repositoriosPrisma.ts: un repositorio por puerto; transacciones al publicar menú, pensionar y dar de baja",
        "contrasenas.ts: scrypt con sal       tokens.ts: token aleatorio y SHA-256       relojSistema.ts: hora de La Paz",
        "exportadores.ts: Excel (exceljs) y PDF (pdfkit)       configuracion.ts: variables de entorno",
        "composicion.ts: raíz de composición, el único lugar que conoce las clases concretas",
        "servidor.ts: Express + /graphql + /salud",
    ], "#FEF5E7", "#AF601A")
    caja(d, (1200, 980, 1640, 1220), "PostgreSQL · Supabase", [
        "persona, cuenta, menu_semanal,", "menu_dia, reserva, pension, sesion", "CHECK de precios, días y tipo;",
        "RLS activo: la API de datos de", "Supabase no ve nada",
    ], "#FDFEFE", GRIS)

    def flecha(puntos, color=INK, texto=None, en=None, punteado=False):
        if punteado:
            punteada(d, puntos, color)
        else:
            d.line(puntos, fill=color, width=3)
        (x1, y1), (x2, y2) = puntos[-2], puntos[-1]
        direccion = "abajo" if y2 > y1 else "arriba" if y2 < y1 else "derecha" if x2 > x1 else "izquierda"
        punta(d, (x2, y2), direccion, color, abierta=False, tam=14)
        if texto:
            d.text(en, texto, font=font(13), fill=color)

    flecha([(460, 180), (pres[0], 180)], texto="HTTP", en=(478, 156))
    flecha([(1100, pres[3]), (1100, app[1])], texto="usa casos de uso", en=(1112, 318))
    flecha([(1100, app[3]), (1100, dom[1])], texto="usa entidades, reglas y puertos", en=(1112, 618))
    flecha([(580, infra[1]), (580, dom[3])], VERDE, texto="implementa los puertos (DIP)", en=(592, 930), punteado=True)
    flecha([(infra[2], 1100), (1200, 1100)], texto="SQL", en=(1130, 1076))
    d.text((60, 1250), "Flecha llena: depende de / llama a.  Flecha punteada: implementa una interfaz del dominio. "
                       "tests/capas.test.ts falla si una capa importa a otra en sentido contrario.", font=font(14), fill=GRIS)

    img.save(OUT / "arquitectura.png", "PNG")


if __name__ == "__main__":
    casos_de_uso()
    clases()
    arquitectura()
    print("casos-de-uso.png, clases.png y arquitectura.png generados en", OUT)
