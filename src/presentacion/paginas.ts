import type { Almuerzo, Rol } from "../dominio/modelo.js";
import type { FilaDelDia } from "../aplicacion/verListaDelDia.js";

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

export function paginaIngreso(error?: string): string {
  return layout(
    "Ingresar",
    `${aviso(error)}
    <section class="tarjeta">
      <h1>Ingresar</h1>
      <p>Usa tu identificador de la base de empleados. Este sistema no pide ni guarda contraseñas.</p>
      <form method="post" action="/ingresar">
        <label for="codigo">Identificador institucional</label>
        <input id="codigo" name="codigo" type="text" autocomplete="username" required>
        <p><button type="submit">Entrar</button></p>
      </form>
    </section>
    <section class="tarjeta">
      <h2>Datos de prueba</h2>
      <div class="cuentas">
        <div><strong>UB-100</strong> Ana Rojas, empleada</div>
        <div><strong>UB-101</strong> Carlos Mamani, empleado</div>
        <div><strong>UB-102</strong> Laura Quispe, inactiva: no entra</div>
        <div><strong>UB-200</strong> Elena Vargas, encargada</div>
      </div>
    </section>`,
  );
}

function filaAlmuerzo(almuerzo: Almuerzo): string {
  const puedeCancelar = almuerzo.estado === "CONFIRMADO" && almuerzo.origen === "ESPORADICO";
  const accion = puedeCancelar
    ? `<form class="inline" method="post" action="/cancelar">
         <input type="hidden" name="fecha" value="${escapar(almuerzo.fecha)}">
         <button class="secundario" type="submit">Cancelar</button>
       </form>`
    : "";
  return `<tr>
    <td>${escapar(almuerzo.fecha)}</td>
    <td>${escapar(almuerzo.origen === "PENSION" ? "Pensión" : "Esporádico")}</td>
    <td>${almuerzo.precioBs} Bs</td>
    <td>${escapar(almuerzo.estado)}</td>
    <td>${accion}</td>
  </tr>`;
}

export function paginaInicio(datos: {
  nombre: string;
  rol: Rol;
  almuerzos: Almuerzo[];
  fechaSugerida: string;
  error?: string;
  mensaje?: string;
}): string {
  const filas = datos.almuerzos.map(filaAlmuerzo).join("");
  const enlaceEncargado =
    datos.rol === "ENCARGADO"
      ? `<p><a class="enlace" href="/dia">Ver almuerzos confirmados del día</a></p>`
      : "";
  return layout(
    "Mis reservas",
    `${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <h1>${escapar(datos.nombre)}</h1>
      <p>${datos.rol === "ENCARGADO" ? "Encargada del restaurante" : "Empleado"}</p>
      ${enlaceEncargado}
      <form method="post" action="/salir"><button class="secundario" type="submit">Salir</button></form>
    </section>
    <section class="tarjeta">
      <h2>Reservar almuerzo</h2>
      <p>18 Bs. Un almuerzo por día, de lunes a jueves, hasta las 9:00 del día en que se sirve.</p>
      <form method="post" action="/reservar">
        <div class="fila">
          <div>
            <label for="fecha">Día</label>
            <input id="fecha" name="fecha" type="date" value="${escapar(datos.fechaSugerida)}" required>
          </div>
          <button type="submit">Reservar</button>
        </div>
      </form>
    </section>
    <section class="tarjeta">
      <h2>Mis almuerzos</h2>
      <table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
        <tbody>${filas || `<tr><td colspan="5">Todavía no tienes almuerzos.</td></tr>`}</tbody>
      </table>
    </section>`,
  );
}

export function paginaLista(datos: {
  fecha: string;
  filas: FilaDelDia[];
  error?: string;
}): string {
  const cuerpoFilas = datos.filas
    .map(
      (fila) =>
        `<tr><td>${escapar(fila.nombre)}</td><td>${escapar(fila.codigo)}</td><td>${escapar(fila.tipo)}</td></tr>`,
    )
    .join("");
  return layout(
    "Lista del día",
    `${aviso(datos.error)}
    <section class="tarjeta">
      <h1>Almuerzos confirmados</h1>
      <p class="total">${datos.filas.length}</p>
      <form method="get" action="/dia">
        <div class="fila">
          <div>
            <label for="fecha">Día</label>
            <input id="fecha" name="fecha" type="date" value="${escapar(datos.fecha)}" required>
          </div>
          <button type="submit">Ver</button>
        </div>
      </form>
      <p><a class="enlace secundario" href="/inicio">Volver</a></p>
    </section>
    <section class="tarjeta">
      <table>
        <thead><tr><th>Nombre</th><th>Identificador</th><th>Tipo</th></tr></thead>
        <tbody>${cuerpoFilas || `<tr><td colspan="3">No hay almuerzos confirmados para este día.</td></tr>`}</tbody>
      </table>
    </section>`,
  );
}
