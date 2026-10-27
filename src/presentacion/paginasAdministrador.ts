import type { FichaUsuario } from "../aplicacion/gestionarUsuarios.js";
import type { VistaMenuSemanal } from "../aplicacion/menu.js";
import type { ReporteMensual } from "../aplicacion/reporteMensual.js";
import type { ListaDelDia } from "../aplicacion/verListaDelDia.js";
import { nombreCompleto, type Persona } from "../dominio/modelo.js";
import { sumarDias } from "../dominio/tiempo.js";
import { navegacionMes } from "./paginasEmpleado.js";
import {
  aviso,
  campo,
  escapar,
  fechaLarga,
  insignia,
  layout,
  OPCIONES_PARENTESCO,
  parentescoDe,
  selector,
  type Sesion,
} from "./vistas.js";

type Mensajes = { error?: string; mensaje?: string };

/** Cuántos familiares se pueden cargar en el mismo formulario de registro (los vacíos se ignoran). */
export const FAMILIARES_EN_FORMULARIO = 5;

const TIPOS: [string, string][] = [
  ["EMPLEADO", "Empleado"],
  ["ADMINISTRADOR", "Administrador"],
];

function estado(persona: Persona): string {
  return persona.activo ? insignia("Activo", "ok") : insignia("De baja", "apagado");
}

export function paginaUsuarios(datos: Mensajes & { sesion: Sesion; fichas: FichaUsuario[] }): string {
  const filas = datos.fichas
    .map(
      ({ persona, cuenta, familiares, topeDiario }) => `<tr class="${persona.activo ? "" : "inactiva"}">
        <td><a href="/usuarios/${escapar(persona.id)}">${escapar(nombreCompleto(persona))}</a></td>
        <td>${escapar(cuenta.codigoEmpleado)}</td>
        <td>${escapar(cuenta.nombreUsuario)}</td>
        <td>${cuenta.tipo === "ADMINISTRADOR" ? "Administrador" : "Empleado"}</td>
        <td class="numero">${familiares.filter((f) => f.activo).length}</td>
        <td class="numero">${cuenta.tipo === "EMPLEADO" ? topeDiario : "—"}</td>
        <td>${estado(persona)}</td>
      </tr>`,
    )
    .join("");
  return layout(
    "Usuarios",
    `${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <div class="titulo-con-accion">
        <h1>Usuarios</h1>
        <a class="enlace" href="/usuarios/nuevo">Registrar usuario</a>
      </div>
      <div class="tabla">
      <table>
        <thead><tr><th>Nombre</th><th>Código</th><th>Usuario</th><th>Tipo</th><th>Familiares</th><th>Tope diario</th><th>Estado</th></tr></thead>
        <tbody>${filas || `<tr><td colspan="7" class="tenue">Todavía no hay usuarios.</td></tr>`}</tbody>
      </table>
      </div>
    </section>`,
    datos.sesion,
    "/usuarios",
  );
}

/** Los campos de datos personales (§1.2 del backlog) con un prefijo, para reutilizarlos por familiar. */
function datosPersonales(prefijo: string, valores: Record<string, string>, requerido = true): string {
  const v = (campoNombre: string) => valores[`${prefijo}${campoNombre}`] ?? "";
  return `<div class="rejilla">
    ${campo(`${prefijo}nombres`, "Nombres", v("nombres"), { requerido })}
    ${campo(`${prefijo}apellidos`, "Apellidos", v("apellidos"), { requerido })}
    ${campo(`${prefijo}ci`, "CI", v("ci"), { requerido, extra: 'inputmode="text" placeholder="4567890 o 4567890-1B"' })}
    ${campo(`${prefijo}fechaNacimiento`, "Fecha de nacimiento", v("fechaNacimiento"), { tipo: "date", requerido })}
    ${campo(`${prefijo}telefono`, "Teléfono", v("telefono"), { tipo: "tel", requerido })}
  </div>`;
}

export function paginaNuevoUsuario(datos: Mensajes & { sesion: Sesion; valores: Record<string, string> }): string {
  const v = datos.valores;
  const familiares = Array.from({ length: FAMILIARES_EN_FORMULARIO }, (_, i) => {
    const prefijo = `fam${i + 1}_`;
    return `<details class="familiar"${v[`${prefijo}nombres`] ? " open" : ""}>
      <summary>Familiar ${i + 1}</summary>
      ${selector(`${prefijo}parentesco`, "Parentesco", OPCIONES_PARENTESCO, v[`${prefijo}parentesco`] ?? "HIJO")}
      ${datosPersonales(prefijo, v, false)}
    </details>`;
  }).join("");
  return layout(
    "Registrar usuario",
    `${aviso(datos.error, datos.mensaje)}
    <form method="post" action="/usuarios" class="tarjeta">
      <h1>Registrar usuario</h1>
      <h2>Datos personales</h2>
      ${datosPersonales("", v)}
      <h2>Acceso al sistema</h2>
      <div class="rejilla">
        ${campo("codigoEmpleado", "Código de empleado", v.codigoEmpleado ?? "")}
        ${campo("nombreUsuario", "Nombre de usuario", v.nombreUsuario ?? "", { extra: 'autocomplete="off"' })}
        ${campo("contrasenaInicial", "Contraseña inicial", v.contrasenaInicial ?? "", { extra: 'autocomplete="off" minlength="8"' })}
        ${selector("tipo", "Tipo de usuario", TIPOS, v.tipo ?? "EMPLEADO")}
      </div>
      <p class="tenue">El usuario cambia la contraseña inicial en su primer ingreso.</p>
      <h2>Grupo familiar <span class="tenue">(solo usuarios empleados; los bloques vacíos no se guardan)</span></h2>
      <p class="tenue">Familiares de primer grado. No ingresan al sistema: el usuario reserva y pensiona a su nombre.</p>
      ${familiares}
      <p class="acciones"><button type="submit">Guardar registro</button> <a class="enlace secundario" href="/usuarios">Volver</a></p>
    </form>`,
    datos.sesion,
    "/usuarios",
  );
}

function valoresDe(persona: Persona, prefijo = ""): Record<string, string> {
  return {
    [`${prefijo}nombres`]: persona.nombres,
    [`${prefijo}apellidos`]: persona.apellidos,
    [`${prefijo}ci`]: persona.ci,
    [`${prefijo}fechaNacimiento`]: persona.fechaNacimiento,
    [`${prefijo}telefono`]: persona.telefono,
  };
}

function formularioBaja(persona: Persona, titularId: string, texto: string): string {
  if (!persona.activo) return "";
  return `<form class="en-linea" method="post" action="/personas/${escapar(persona.id)}/baja" onsubmit="return confirm('¿Dar de baja a ${escapar(nombreCompleto(persona)).replaceAll("'", "")}? Se anulan sus reservas futuras.')">
    <input type="hidden" name="volver" value="${escapar(titularId)}">
    <button class="peligro" type="submit">${texto}</button>
  </form>`;
}

export function paginaFichaUsuario(datos: Mensajes & { sesion: Sesion; ficha: FichaUsuario; temporal?: string }): string {
  const { persona, cuenta, familiares, topeDiario } = datos.ficha;
  const temporal = datos.temporal
    ? `<p class="aviso ok" role="status">Contraseña temporal: <strong class="clave">${escapar(datos.temporal)}</strong>. Entrégala al usuario: se muestra solo esta vez y la cambiará al ingresar.</p>`
    : "";
  const filasFamiliares = familiares
    .map(
      (familiar) => `<details class="familiar${familiar.activo ? "" : " inactiva"}">
        <summary>${escapar(nombreCompleto(familiar))} · ${escapar(parentescoDe(familiar))} · CI ${escapar(familiar.ci)} ${estado(familiar)}</summary>
        <form method="post" action="/personas/${escapar(familiar.id)}/datos">
          <input type="hidden" name="volver" value="${escapar(persona.id)}">
          ${selector("parentesco", "Parentesco", OPCIONES_PARENTESCO, familiar.parentesco ?? "")}
          ${datosPersonales("", valoresDe(familiar))}
          <p class="acciones"><button class="secundario" type="submit">Guardar cambios</button> ${formularioBaja(familiar, persona.id, "Dar de baja")}</p>
        </form>
      </details>`,
    )
    .join("");
  const grupo =
    cuenta.tipo === "EMPLEADO"
      ? `<section class="tarjeta">
        <h2>Grupo familiar <span class="tenue">· tope diario ${topeDiario}</span></h2>
        ${filasFamiliares || `<p class="tenue">Sin familiares registrados.</p>`}
        ${
          persona.activo
            ? `<details class="familiar">
          <summary>Agregar familiar</summary>
          <form method="post" action="/usuarios/${escapar(persona.id)}/familiares">
            ${selector("parentesco", "Parentesco", OPCIONES_PARENTESCO, "HIJO")}
            ${datosPersonales("", {})}
            <p><button type="submit">Agregar familiar</button></p>
          </form>
        </details>`
            : ""
        }
      </section>`
      : "";
  return layout(
    nombreCompleto(persona),
    `${aviso(datos.error, datos.mensaje)}${temporal}
    <section class="tarjeta">
      <div class="titulo-con-accion">
        <h1>${escapar(nombreCompleto(persona))} ${estado(persona)}</h1>
        <a class="enlace secundario" href="/usuarios">Volver a usuarios</a>
      </div>
      <p>Código ${escapar(cuenta.codigoEmpleado)} · usuario <strong>${escapar(cuenta.nombreUsuario)}</strong>${
        cuenta.debeCambiarContrasena ? ` · ${insignia("Debe cambiar la contraseña", "aviso")}` : ""
      }</p>
      <form method="post" action="/personas/${escapar(persona.id)}/datos">
        <input type="hidden" name="volver" value="${escapar(persona.id)}">
        ${datosPersonales("", valoresDe(persona))}
        <p><button class="secundario" type="submit">Guardar datos personales</button></p>
      </form>
    </section>
    <section class="tarjeta">
      <h2>Acceso</h2>
      <div class="fila">
        <form class="fila" method="post" action="/usuarios/${escapar(persona.id)}/tipo">
          ${selector("tipo", "Tipo de usuario", TIPOS, cuenta.tipo)}
          <button class="secundario" type="submit">Cambiar tipo</button>
        </form>
        <form method="post" action="/usuarios/${escapar(persona.id)}/contrasena">
          <button class="secundario" type="submit">Restablecer contraseña</button>
        </form>
        ${formularioBaja(persona, persona.id, "Dar de baja al usuario y su grupo familiar")}
      </div>
    </section>
    ${grupo}`,
    datos.sesion,
    "/usuarios",
  );
}

export function paginaMenu(
  datos: Mensajes & { sesion: Sesion; vista: VistaMenuSemanal; hoy: string; valores: Record<string, string> },
): string {
  const { vista, hoy } = datos;
  const anterior = sumarDias(vista.lunes, -7);
  const siguiente = sumarDias(vista.lunes, 7);
  const termino = sumarDias(vista.lunes, 3) < hoy;
  let contenido: string;
  if (vista.publicado) {
    contenido = `<p>${insignia("Publicado", "ok")} el ${escapar(fechaLarga(vista.publicadoEl!))}. Un menú publicado no se modifica.</p>
      <ul class="menu">${vista.dias
        .map((dia) => `<li><span class="dia">${escapar(fechaLarga(dia.fecha))}</span>${dia.descripcion ? escapar(dia.descripcion) : insignia("Sin atención", "apagado")}</li>`)
        .join("")}</ul>`;
  } else if (termino) {
    contenido = `<p class="tenue">Esa semana terminó sin menú publicado: no tuvo atención.</p>`;
  } else {
    contenido = `<form method="post" action="/menu">
        <input type="hidden" name="lunes" value="${vista.lunes}">
        ${vista.dias
          .map((dia) => {
            const pasado = dia.fecha < hoy;
            return `<div class="campo">
              <label for="menu_${dia.fecha}">${escapar(fechaLarga(dia.fecha))}${pasado ? " <span class=\"tenue\">(ya pasó)</span>" : ""}</label>
              <input id="menu_${dia.fecha}" name="menu_${dia.fecha}" type="text" maxlength="200" value="${escapar(datos.valores[`menu_${dia.fecha}`] ?? "")}" placeholder="Vacío = sin atención"${pasado ? " disabled" : ""}>
            </div>`;
          })
          .join("")}
        <p class="tenue">El día que quede vacío no tendrá atención: no admite reservas, no se cobra y no cuenta como falta. Al publicar se confirma el almuerzo de cada pensionado en los días con menú.</p>
        <p><button type="submit">Publicar menú</button></p>
      </form>`;
  }
  return layout(
    "Menú semanal",
    `${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <h1>Menú semanal</h1>
      <div class="pasos">
        <a class="enlace secundario" href="/menu?semana=${anterior}">← Semana anterior</a>
        <strong>Semana del ${escapar(fechaLarga(vista.lunes))}</strong>
        <a class="enlace secundario" href="/menu?semana=${siguiente}">Semana siguiente →</a>
      </div>
      ${contenido}
    </section>`,
    datos.sesion,
    "/menu",
  );
}

export function paginaLista(datos: { sesion: Sesion; lista: ListaDelDia }): string {
  const { lista } = datos;
  const filas = lista.filas
    .map(
      (fila) => `<tr>
        <td>${escapar(fila.nombre)}</td>
        <td>${fila.tipoPersona === "EMPLEADO" ? "Empleado" : `Familiar (${escapar(parentescoDe({ tipo: "FAMILIAR", parentesco: fila.parentesco }).toLowerCase())})`}</td>
        <td>${escapar(fila.nombreTitular)}</td>
        <td>${fila.modalidad === "PENSIONADO" ? insignia("Pensionado", "info") : "No pensionado"}</td>
      </tr>`,
    )
    .join("");
  const encabezado = lista.sinAtencion
    ? `<p>${insignia("Sin atención", "apagado")} Ese día no tiene menú publicado.</p>`
    : `<p class="tenue">Menú: ${escapar(lista.menu)}</p>`;
  return layout(
    "Almuerzos del día",
    `<section class="tarjeta">
      <h1>Almuerzos confirmados</h1>
      <form method="get" action="/dia" class="fila">
        ${campo("fecha", "Día", lista.fecha, { tipo: "date" })}
        <button type="submit">Ver</button>
      </form>
      <p class="total">${lista.total} <span>almuerzos el ${escapar(fechaLarga(lista.fecha))}</span></p>
      ${encabezado}
      <div class="tabla">
      <table>
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Usuario titular</th><th>Modalidad</th></tr></thead>
        <tbody>${filas || `<tr><td colspan="4" class="tenue">No hay almuerzos confirmados.</td></tr>`}</tbody>
      </table>
      </div>
    </section>`,
    datos.sesion,
    "/dia",
  );
}

export function paginaReporte(datos: { sesion: Sesion; reporte: ReporteMensual }): string {
  const { reporte } = datos;
  const filas = reporte.titulares
    .map((titular) => {
      const lineas = titular.lineas.length
        ? titular.lineas
            .map(
              (linea) => `<tr>
              <td></td>
              <td>${escapar(linea.nombreCompleto)}</td>
              <td>${escapar(parentescoDe({ tipo: linea.tipo, parentesco: linea.parentesco }))}</td>
              <td>${linea.modalidad === "PENSIONADO" ? "Pensionado" : "No pensionado"}</td>
              <td class="numero">${linea.cantidad}</td>
              <td class="numero">${linea.precioUnitarioBs} Bs</td>
              <td class="numero">${linea.subtotalBs} Bs</td>
            </tr>`,
            )
            .join("")
        : `<tr><td></td><td colspan="6" class="tenue">Sin consumo en el mes</td></tr>`;
      return `<tr class="titular"><td colspan="6">${escapar(titular.nombreTitular)} <span class="tenue">· ${escapar(titular.codigoEmpleado)}</span></td><td class="numero">${titular.totalBs} Bs</td></tr>${lineas}`;
    })
    .join("");
  const base = `/api/reportes/${reporte.anio}/${reporte.mes}`;
  return layout(
    "Reporte mensual",
    `<section class="tarjeta">
      <div class="titulo-con-accion">
        <h1>Reporte para planilla</h1>
        <span><a class="enlace" href="${base}.xlsx">Exportar Excel</a> <a class="enlace" href="${base}.pdf">Exportar PDF</a></span>
      </div>
      ${navegacionMes("/reporte", reporte)}
      <div class="tabla">
      <table>
        <thead><tr><th>Usuario titular</th><th>Persona</th><th>Parentesco</th><th>Modalidad</th><th>Almuerzos</th><th>Precio</th><th>Subtotal</th></tr></thead>
        <tbody>${filas || `<tr><td colspan="7" class="tenue">No hay usuarios empleados.</td></tr>`}</tbody>
        <tfoot><tr><th colspan="6">Total del mes</th><th class="numero">${reporte.totalBs} Bs</th></tr></tfoot>
      </table>
      </div>
      <p class="tenue">Incluye a todos los usuarios empleados, también a los que no consumieron. Lo confirmado se cobra aunque la persona no asista.</p>
    </section>`,
    datos.sesion,
    "/reporte",
  );
}

