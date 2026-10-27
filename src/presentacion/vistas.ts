import { nombreCompleto, PARENTESCOS, type Persona, type TipoUsuario } from "../dominio/modelo.js";

/**
 * Piezas comunes de las pantallas servidas por el backend. Solo arman HTML: las reglas
 * están en los casos de uso y los mensajes que se muestran vienen de ellos.
 */
export function escapar(texto: string | number | null | undefined): string {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "2026-10-06" → "martes 6 de octubre". */
export function fechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const semana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return `${DIAS[semana]} ${dia} de ${MESES[mes - 1]}`;
}

export function nombreMes(anio: number, mes: number): string {
  return `${MESES[mes - 1]} de ${anio}`;
}

export function valorMes(anio: number, mes: number): string {
  return `${anio}-${String(mes).padStart(2, "0")}`;
}

export function parentescoDe(persona: Pick<Persona, "tipo" | "parentesco">): string {
  if (persona.tipo === "EMPLEADO") return "Titular";
  return persona.parentesco ? PARENTESCOS[persona.parentesco] : "Familiar";
}

export function etiquetaPersona(persona: Persona): string {
  return `${nombreCompleto(persona)} (${persona.tipo === "EMPLEADO" ? "yo" : parentescoDe(persona).toLowerCase()})`;
}

export type Sesion = { tipo: TipoUsuario; nombre: string };

const MENU: Record<TipoUsuario, [string, string][]> = {
  EMPLEADO: [
    ["/inicio", "Reservas"],
    ["/pension", "Pensión"],
    ["/consumo", "Mi consumo"],
  ],
  ADMINISTRADOR: [
    ["/usuarios", "Usuarios"],
    ["/menu", "Menú semanal"],
    ["/dia", "Almuerzos del día"],
    ["/reporte", "Reporte mensual"],
  ],
};

export function layout(titulo: string, cuerpo: string, sesion?: Sesion, activa = ""): string {
  const navegacion = sesion
    ? `<nav>
        ${MENU[sesion.tipo]
          .map(([ruta, texto]) => `<a href="${ruta}"${ruta === activa ? ' class="activa" aria-current="page"' : ""}>${texto}</a>`)
          .join("")}
        <span class="quien">${escapar(sesion.nombre)} · ${sesion.tipo === "ADMINISTRADOR" ? "Administrador" : "Empleado"}</span>
        <form method="post" action="/salir"><button class="enlace-boton" type="submit">Salir</button></form>
      </nav>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(titulo)} · Almuerzos Unión Boliviana</title>
  <link rel="stylesheet" href="/estilos.css">
</head>
<body>
  <header>
    <div class="marca"><strong>Almuerzos · Unión Boliviana</strong><span>Lunes a jueves · reservas hasta las 9:00</span></div>
    ${navegacion}
  </header>
  <main>${cuerpo}</main>
</body>
</html>`;
}

export function aviso(error?: string, mensaje?: string): string {
  if (error) return `<p class="aviso error" role="alert">${escapar(error)}</p>`;
  if (mensaje) return `<p class="aviso ok" role="status">${escapar(mensaje)}</p>`;
  return "";
}

export function campo(
  nombre: string,
  etiqueta: string,
  valor = "",
  opciones: { tipo?: string; requerido?: boolean; extra?: string } = {},
): string {
  const { tipo = "text", requerido = true, extra = "" } = opciones;
  return `<div class="campo">
    <label for="${nombre}">${etiqueta}</label>
    <input id="${nombre}" name="${nombre}" type="${tipo}" value="${escapar(valor)}"${requerido ? " required" : ""} ${extra}>
  </div>`;
}

export function selector(nombre: string, etiqueta: string, opciones: [string, string][], elegido = ""): string {
  return `<div class="campo">
    <label for="${nombre}">${etiqueta}</label>
    <select id="${nombre}" name="${nombre}">
      ${opciones.map(([valor, texto]) => `<option value="${escapar(valor)}"${valor === elegido ? " selected" : ""}>${escapar(texto)}</option>`).join("")}
    </select>
  </div>`;
}

export const OPCIONES_PARENTESCO: [string, string][] = Object.entries(PARENTESCOS);

export function insignia(texto: string, tono: "ok" | "aviso" | "apagado" | "info" = "info"): string {
  return `<span class="insignia ${tono}">${escapar(texto)}</span>`;
}
