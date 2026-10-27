import type { VistaMenuSemanal } from "../aplicacion/menu.js";
import type { MiConsumo, MiFamilia, ReservaConPersona } from "../aplicacion/verMiConsumo.js";
import { nombreCompleto, PRECIO_NO_PENSIONADO_BS, PRECIO_PENSIONADO_BS } from "../dominio/modelo.js";
import {
  aviso,
  campo,
  escapar,
  etiquetaPersona,
  fechaLarga,
  insignia,
  layout,
  nombreMes,
  parentescoDe,
  valorMes,
  type Sesion,
} from "./vistas.js";

type Mensajes = { error?: string; mensaje?: string };
type Periodo = { anio: number; mes: number };

export function paginaIngreso(error?: string, cuentasDemo = false): string {
  const demo = cuentasDemo
    ? `<section class="tarjeta">
      <h2>Usuarios de prueba</h2>
      <p>Contraseña de todos: <strong>Demo2026</strong></p>
      <table class="compacta">
        <tbody>
          <tr><td><strong>evargas</strong></td><td>Elena Vargas, administradora</td></tr>
          <tr><td><strong>pflores</strong></td><td>Pedro Flores, cónyuge y 3 hijos, pensionado (tope 5)</td></tr>
          <tr><td><strong>arojas</strong></td><td>Ana Rojas, un hijo</td></tr>
          <tr><td><strong>cmamani</strong></td><td>Carlos Mamani, sin familiares</td></tr>
          <tr><td><strong>lquispe</strong></td><td>Laura Quispe, dada de baja: no entra</td></tr>
          <tr><td><strong>nuevo</strong></td><td>Usuario recién registrado: debe cambiar la contraseña</td></tr>
        </tbody>
      </table>
    </section>`
    : "";
  return layout(
    "Ingresar",
    `<div class="angosto">
    ${aviso(error)}
    <section class="tarjeta">
      <h1>Ingresar</h1>
      <p class="tenue">Usa el nombre de usuario y la contraseña que te asignó el administrador del restaurante.</p>
      <form method="post" action="/ingresar">
        ${campo("usuario", "Nombre de usuario", "", { extra: 'autocomplete="username" autofocus' })}
        ${campo("contrasena", "Contraseña", "", { tipo: "password", extra: 'autocomplete="current-password"' })}
        <p><button type="submit">Ingresar</button></p>
      </form>
    </section>
    ${demo}
    </div>`,
  );
}

export function paginaCambiarContrasena(datos: Mensajes & { obligatorio: boolean; sesion?: Sesion }): string {
  const motivo = datos.obligatorio
    ? `<p>Es tu primer ingreso o el administrador restableció tu contraseña. Antes de continuar, elige una nueva.</p>`
    : `<p class="tenue">Elige una contraseña nueva.</p>`;
  return layout(
    "Cambiar contraseña",
    `<div class="angosto">
    ${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <h1>Cambiar contraseña</h1>
      ${motivo}
      <form method="post" action="/contrasena">
        ${campo("actual", "Contraseña actual", "", { tipo: "password", extra: 'autocomplete="current-password"' })}
        ${campo("nueva", "Contraseña nueva", "", { tipo: "password", extra: 'autocomplete="new-password" minlength="8"' })}
        ${campo("confirmacion", "Repite la contraseña nueva", "", { tipo: "password", extra: 'autocomplete="new-password"' })}
        <p class="tenue">Al menos 8 caracteres, con letras y números.</p>
        <p><button type="submit">Guardar contraseña</button></p>
      </form>
    </section>
    </div>`,
    datos.obligatorio ? undefined : datos.sesion,
  );
}

function tarjetaMenu(semana: VistaMenuSemanal, hoy: string, titulo: string): string {
  const dias = semana.dias
    .map((dia) => {
      const pasado = dia.fecha < hoy;
      const texto = dia.descripcion
        ? escapar(dia.descripcion)
        : semana.publicado
          ? insignia("Sin atención", "apagado")
          : `<span class="tenue">Menú pendiente</span>`;
      return `<li class="${pasado ? "pasado" : ""}"><span class="dia">${escapar(fechaLarga(dia.fecha))}</span>${texto}</li>`;
    })
    .join("");
  return `<div class="semana"><h3>${titulo}</h3><ul class="menu">${dias}</ul></div>`;
}

function filaReserva(reserva: ReservaConPersona, hoy: string): string {
  const datos = `<input type="hidden" name="fecha" value="${escapar(reserva.fecha)}">
      <input type="hidden" name="personaId" value="${escapar(reserva.personaId)}">`;
  let accion = "";
  if (reserva.estado === "CONFIRMADA" && reserva.fecha >= hoy) {
    accion =
      reserva.modalidad === "NO_PENSIONADO"
        ? `<form class="en-linea" method="post" action="/cancelar">${datos}<button class="secundario" type="submit">Cancelar</button></form>`
        : `<form class="en-linea" method="post" action="/avisar">${datos}<button class="secundario" type="submit">Avisar que no asistirá</button></form>`;
  }
  const estado = {
    CONFIRMADA: insignia("Confirmada", "ok"),
    CANCELADA: insignia("Cancelada", "apagado"),
    INASISTENCIA_AVISADA: insignia("Inasistencia avisada", "apagado"),
  }[reserva.estado];
  return `<tr>
    <td>${escapar(fechaLarga(reserva.fecha))}</td>
    <td>${escapar(reserva.nombrePersona)}</td>
    <td>${reserva.modalidad === "PENSIONADO" ? "Pensionado" : "No pensionado"}</td>
    <td class="numero">${reserva.precioBs} Bs</td>
    <td>${estado}</td>
    <td>${accion}</td>
  </tr>`;
}

export function navegacionMes(ruta: string, periodo: Periodo): string {
  const anterior = periodo.mes === 1 ? { anio: periodo.anio - 1, mes: 12 } : { anio: periodo.anio, mes: periodo.mes - 1 };
  const siguiente = periodo.mes === 12 ? { anio: periodo.anio + 1, mes: 1 } : { anio: periodo.anio, mes: periodo.mes + 1 };
  return `<div class="pasos">
    <a class="enlace secundario" href="${ruta}?mes=${valorMes(anterior.anio, anterior.mes)}">← ${escapar(nombreMes(anterior.anio, anterior.mes))}</a>
    <strong>${escapar(nombreMes(periodo.anio, periodo.mes))}</strong>
    <a class="enlace secundario" href="${ruta}?mes=${valorMes(siguiente.anio, siguiente.mes)}">${escapar(nombreMes(siguiente.anio, siguiente.mes))} →</a>
  </div>`;
}

export function paginaReservas(
  datos: Mensajes & {
    sesion: Sesion;
    familia: MiFamilia;
    semanas: [VistaMenuSemanal, VistaMenuSemanal];
    fechaSugerida: string;
    reservas: ReservaConPersona[];
    periodo: Periodo;
    hoy: string;
  },
): string {
  const { familia, hoy } = datos;
  const fechas = datos.semanas.flatMap((semana) => semana.dias).filter((dia) => dia.descripcion && dia.fecha >= hoy);
  const formulario = fechas.length
    ? `<form method="post" action="/reservar">
        <fieldset>
          <legend>¿Para quién?</legend>
          ${[familia.titular, ...familia.familiares]
            .map(
              (persona) => `<label class="opcion"><input type="checkbox" name="personaId" value="${escapar(persona.id)}"${
                persona.id === familia.titular.id ? " checked" : ""
              }> ${escapar(etiquetaPersona(persona))}</label>`,
            )
            .join("")}
        </fieldset>
        <div class="fila">
          <div class="campo">
            <label for="fecha">Día</label>
            <select id="fecha" name="fecha">
              ${fechas
                .map(
                  (dia) =>
                    `<option value="${dia.fecha}"${dia.fecha === datos.fechaSugerida ? " selected" : ""}>${escapar(fechaLarga(dia.fecha))} · ${escapar(dia.descripcion)}</option>`,
                )
                .join("")}
            </select>
          </div>
          <button type="submit">Reservar</button>
        </div>
      </form>`
    : `<p class="tenue">Todavía no hay días con menú publicado para reservar.</p>`;
  const filas = datos.reservas.map((reserva) => filaReserva(reserva, hoy)).join("");
  return layout(
    "Reservas",
    `${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <h1>Menú de la semana</h1>
      <div class="semanas">
        ${tarjetaMenu(datos.semanas[0], hoy, "Esta semana")}
        ${tarjetaMenu(datos.semanas[1], hoy, "Semana siguiente")}
      </div>
    </section>
    <section class="tarjeta">
      <h2>Reservar almuerzo</h2>
      <p class="tenue">${PRECIO_NO_PENSIONADO_BS} Bs por persona. Un almuerzo por persona y por día, hasta las 9:00 del día que se sirve. Puedes reservar hasta ${familia.topeDiario} por día.</p>
      ${formulario}
    </section>
    <section class="tarjeta">
      <h2>Reservas de mi grupo familiar</h2>
      ${navegacionMes("/inicio", datos.periodo)}
      <div class="tabla">
      <table>
        <thead><tr><th>Día</th><th>Persona</th><th>Modalidad</th><th>Precio</th><th>Estado</th><th></th></tr></thead>
        <tbody>${filas || `<tr><td colspan="6" class="tenue">No hay reservas en este mes.</td></tr>`}</tbody>
      </table>
      </div>
    </section>`,
    datos.sesion,
    "/inicio",
  );
}

export function paginaPension(
  datos: Mensajes & {
    sesion: Sesion;
    familia: MiFamilia;
    siguiente: Periodo;
    pensionadosSiguiente: Set<string>;
    actual: Periodo;
    pensionadosActual: string[];
  },
): string {
  const personas = [datos.familia.titular, ...datos.familia.familiares];
  const disponibles = personas.filter((persona) => !datos.pensionadosSiguiente.has(persona.id));
  const yaPensionados = personas.filter((persona) => datos.pensionadosSiguiente.has(persona.id));
  const mesSiguiente = nombreMes(datos.siguiente.anio, datos.siguiente.mes);
  const formulario = disponibles.length
    ? `<form method="post" action="/pensionar">
        <input type="hidden" name="mes" value="${valorMes(datos.siguiente.anio, datos.siguiente.mes)}">
        <fieldset>
          <legend>¿A quién pensionas para ${escapar(mesSiguiente)}?</legend>
          ${disponibles
            .map((persona) => `<label class="opcion"><input type="checkbox" name="personaId" value="${escapar(persona.id)}"> ${escapar(etiquetaPersona(persona))}</label>`)
            .join("")}
        </fieldset>
        <p><button type="submit">Pensionar</button></p>
      </form>`
    : `<p class="tenue">Todo tu grupo familiar ya está pensionado para ${escapar(mesSiguiente)}.</p>`;
  return layout(
    "Pensión",
    `${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <h1>Pensión de ${escapar(mesSiguiente)}</h1>
      <p class="tenue">${PRECIO_PENSIONADO_BS} Bs por almuerzo. Se pide por persona antes de que empiece el mes. El almuerzo de cada pensionado se confirma solo en cada día con menú publicado. Cada pensionado consume al menos 10 almuerzos en el mes (o todos los días con atención, si son menos).</p>
      ${yaPensionados.length ? `<p>Ya pensionados: ${yaPensionados.map((p) => insignia(nombreCompleto(p), "ok")).join(" ")}</p>` : ""}
      ${formulario}
    </section>
    <section class="tarjeta">
      <h2>Pensionados de ${escapar(nombreMes(datos.actual.anio, datos.actual.mes))}</h2>
      ${
        datos.pensionadosActual.length
          ? `<p>${datos.pensionadosActual.map((nombre) => insignia(nombre, "info")).join(" ")}</p>
             <p class="tenue">Para que un pensionado no almuerce un día, usa «Avisar que no asistirá» en <a href="/inicio">Reservas</a>.</p>`
          : `<p class="tenue">Nadie de tu grupo familiar está pensionado este mes.</p>`
      }
    </section>`,
    datos.sesion,
    "/pension",
  );
}

export function paginaConsumo(datos: Mensajes & { sesion: Sesion; consumo: MiConsumo }): string {
  const { consumo } = datos;
  const filas = consumo.personas
    .map((detalle) => {
      const lineas = detalle.lineas.length
        ? detalle.lineas
            .map((linea) => `${linea.cantidad} × ${linea.precioUnitarioBs} Bs (${linea.modalidad === "PENSIONADO" ? "pensionado" : "no pensionado"})`)
            .join("<br>")
        : `<span class="tenue">Sin consumo</span>`;
      const avisos =
        detalle.inasistenciasDisponibles === null
          ? `<span class="tenue">—</span>`
          : `${detalle.inasistenciasDisponibles} <span class="tenue">(${detalle.programados} programados, mínimo ${detalle.minimo})</span>`;
      return `<tr>
        <td>${escapar(nombreCompleto(detalle.persona))}</td>
        <td>${escapar(parentescoDe(detalle.persona))}</td>
        <td>${lineas}</td>
        <td class="numero">${detalle.cantidad}</td>
        <td class="numero">${detalle.subtotalBs} Bs</td>
        <td>${avisos}</td>
      </tr>`;
    })
    .join("");
  const sinAtencion = consumo.diasSinAtencion.length
    ? `<ul class="lista-simple">${consumo.diasSinAtencion.map((fecha) => `<li>${escapar(fechaLarga(fecha))}: ${insignia("Sin atención – no se cobra", "apagado")}</li>`).join("")}</ul>`
    : `<p class="tenue">Ningún día sin atención hasta ahora.</p>`;
  return layout(
    "Mi consumo",
    `${aviso(datos.error, datos.mensaje)}
    <section class="tarjeta">
      <h1>Mi consumo</h1>
      ${navegacionMes("/consumo", consumo)}
      <div class="tabla">
      <table>
        <thead><tr><th>Persona</th><th>Parentesco</th><th>Detalle</th><th>Almuerzos</th><th>Subtotal</th><th>Inasistencias disponibles</th></tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr><th colspan="4">Total a descontar por planilla</th><th class="numero">${consumo.totalBs} Bs</th><th></th></tr></tfoot>
      </table>
      </div>
      <p class="tenue">Lo confirmado se cobra aunque la persona no asista; lo cancelado o avisado antes de las 9:00 no se cobra.</p>
    </section>
    <section class="tarjeta">
      <h2>Días sin atención</h2>
      ${sinAtencion}
    </section>`,
    datos.sesion,
    "/consumo",
  );
}
