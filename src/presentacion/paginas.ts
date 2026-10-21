import { tipoParaLista, type Persona, type Rol } from "../dominio/modelo.js";
import type { ListaDelDia } from "../aplicacion/verListaDelDia.js";
import type { AlmuerzoConPersona } from "../aplicacion/verMiConsumo.js";

/**
 * Pantallas mínimas servidas por el backend, para recorrer HU01 a HU04 sin frontend aparte.
 * El frontend del equipo consume /graphql; estas pantallas usan los mismos casos de uso.
 */
function escapar(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(titulo: string, cuerpo: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(titulo)}</title>
  <link rel="stylesheet" href="/estilos.css">
</head>
<body>
  <header>
    <strong>Reservas de almuerzo</strong>
    <p>Restaurante de la Unión Boliviana · lunes a jueves · límite 9:00</p>
  </header>
  <main>${cuerpo}</main>
</body>
</html>`;
}

function aviso(error?: string, mensaje?: string): string {
  if (error) return `<p class="aviso error">${escapar(error)}</p>`;
  if (mensaje) return `<p class="aviso ok">${escapar(mensaje)}</p>`;
  return "";
}

export function paginaIngreso(error?: string, simulado = false): string {
  const cuentas = simulado
    ? `<section class="tarjeta">
      <h2>Usuarios del simulador</h2>
      <p>La contraseña de todos es <strong>demo123</strong>.</p>
      <div class="cuentas">
        <div><strong>arojas</strong> Ana Rojas, con un hijo</div>
        <div><strong>pflores</strong> Pedro Flores, cónyuge y 3 hijos (tope 5)</div>
        <div><strong>cmamani</strong> Carlos Mamani, sin familiares</div>
        <div><strong>lquispe</strong> Laura Quispe, inactiva: no entra</div>
        <div><strong>evargas</strong> Elena Vargas, encargada</div>
        <div><strong>lento</strong> la API tarda más de 5 s</div>
      </div>
    </section>`
    : "";
  return layout(
    "Ingresar",
    `${aviso(error)}
    <section class="tarjeta">
      <h1>Ingresar</h1>
      <p>Usa tu usuario y contraseña del sistema empresarial. El restaurante no guarda tu contraseña.</p>
      <form method="post" action="/ingresar">
        <label for="usuario">Usuario</label>
        <input id="usuario" name="usuario" type="text" autocomplete="username" required>
        <label for="contrasena">Contraseña</label>
        <input id="contrasena" name="contrasena" type="password" autocomplete="current-password" required>
        <p><button type="submit">Ingresar</button></p>
      </form>
    </section>
    ${cuentas}`,
  );
}

function filaAlmuerzo(almuerzo: AlmuerzoConPersona): string {
  const datos = `<input type="hidden" name="fecha" value="${escapar(almuerzo.fecha)}">
         <input type="hidden" name="personaId" value="${escapar(almuerzo.personaId)}">`;
  let accion = "";
  if (almuerzo.estado === "CONFIRMADO" && almuerzo.origen === "ESPORADICO") {
    accion = `<form class="inline" method="post" action="/cancelar">${datos}
         <button class="secundario" type="submit">Cancelar</button></form>`;
  } else if (almuerzo.estado === "CONFIRMADO" && almuerzo.origen === "PENSION") {
    accion = `<form class="inline" method="post" action="/avisar">${datos}
         <button class="secundario" type="submit">No asistirá</button></form>`;
  }
  return `<tr>
    <td>${escapar(almuerzo.fecha)}</td>
    <td>${escapar(almuerzo.nombrePersona)}</td>
    <td>${escapar(almuerzo.origen === "PENSION" ? "Pensión" : "Esporádico")}</td>
    <td>${almuerzo.precioBs} Bs</td>
    <td>${escapar(almuerzo.estado)}</td>
    <td>${accion}</td>
  </tr>`;
}

export function paginaInicio(datos: {
  titular: Persona;
  familiares: Persona[];
  topeDiario: number;
  rol: Rol;
  almuerzos: AlmuerzoConPersona[];
  fechaSugerida: string;
  periodo: { anio: number; mes: number };
  error?: string;
  mensaje?: string;
}): string {
  const filas = datos.almuerzos.map(filaAlmuerzo).join("");
  const opciones = [datos.titular, ...datos.familiares]
    .map(
      (persona) =>
        `<option value="${escapar(persona.id)}">${escapar(persona.nombreCompleto)}${
          persona.parentesco ? ` (${escapar(persona.parentesco)})` : " (yo)"
        }</option>`,
    )
    .join("");
  const { anio, mes } = datos.periodo;
  const opcionesEncargado =
    datos.rol === "ENCARGADO"
      ? `<p><a class="enlace" href="/dia">Ver almuerzos confirmados del día</a></p>
         <p>Reporte de ${mes}/${anio}:
           <a class="enlace secundario" href="/api/reportes/${anio}/${mes}.xlsx">Excel</a>
           <a class="enlace secundario" href="/api/reportes/${anio}/${mes}.pdf">PDF</a></p>`
      : "";
  return layout(
    "Mis reservas",
    `${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <h1>${escapar(datos.titular.nombreCompleto)}</h1>
      <p>${datos.rol === "ENCARGADO" ? "Encargado del restaurante" : "Empleado"} · puedes reservar hasta ${datos.topeDiario} almuerzos por día</p>
      ${opcionesEncargado}
      <form method="post" action="/salir"><button class="secundario" type="submit">Salir</button></form>
    </section>
    <section class="tarjeta">
      <h2>Reservar almuerzo</h2>
      <p>18 Bs. Un almuerzo por persona y por día, de lunes a jueves, hasta las 9:00 del día en que se sirve.</p>
      <form method="post" action="/reservar">
        <div class="fila">
          <div>
            <label for="personaId">Para</label>
            <select id="personaId" name="personaId">${opciones}</select>
          </div>
          <div>
            <label for="fecha">Día</label>
            <input id="fecha" name="fecha" type="date" value="${escapar(datos.fechaSugerida)}" required>
          </div>
          <button type="submit">Reservar</button>
        </div>
      </form>
    </section>
    <section class="tarjeta">
      <h2>Almuerzos de ${mes}/${anio}</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Persona</th><th>Tipo</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
        <tbody>${filas || `<tr><td colspan="6">No hay almuerzos en este mes.</td></tr>`}</tbody>
      </table>
    </section>`,
  );
}

export function paginaLista(datos: { lista: ListaDelDia }): string {
  const { lista } = datos;
  const cuerpoFilas = lista.filas
    .map(
      (fila) => `<tr>
        <td>${escapar(fila.nombre)}</td>
        <td>${fila.tipoPersona === "EMPLEADO" ? "Empleado" : `Familiar (${escapar(fila.parentesco ?? "")})`}</td>
        <td>${escapar(fila.nombreTitular)}</td>
        <td>${escapar(tipoParaLista(fila.modalidad))}</td>
      </tr>`,
    )
    .join("");
  const vacio = lista.esFeriado
    ? "Ese día es feriado: no hay almuerzos."
    : "No hay almuerzos confirmados para este día.";
  return layout(
    "Lista del día",
    `<section class="tarjeta">
      <h1>Almuerzos confirmados</h1>
      <p class="total">${lista.total}</p>
      <form method="get" action="/dia">
        <div class="fila">
          <div>
            <label for="fecha">Día</label>
            <input id="fecha" name="fecha" type="date" value="${escapar(lista.fecha)}" required>
          </div>
          <button type="submit">Ver</button>
        </div>
      </form>
      <p><a class="enlace secundario" href="/inicio">Volver</a></p>
    </section>
    <section class="tarjeta">
      <table>
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Titular</th><th>Modalidad</th></tr></thead>
        <tbody>${cuerpoFilas || `<tr><td colspan="4">${vacio}</td></tr>`}</tbody>
      </table>
    </section>`,
  );
}
