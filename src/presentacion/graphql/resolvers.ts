// createGraphQLError usa la misma clase GraphQLError que Yoga reconoce al enmascarar errores.
import { createGraphQLError } from "graphql-yoga";
import type { CasosDeUso } from "../../aplicacion/casosDeUso.js";
import { CAMBIO_PENDIENTE, SOLO_ADMINISTRADOR, SOLO_EMPLEADO, type ResultadoPorPersona } from "../../aplicacion/comun.js";
import type { FichaUsuario } from "../../aplicacion/gestionarUsuarios.js";
import type { SolicitudRegistro } from "../../aplicacion/registrarUsuario.js";
import { INACTIVIDAD_MAXIMA_MS, SIN_SESION } from "../../aplicacion/sesion.js";
import { nombreCompleto, type DatosPersonales, type MenuDia, type Persona, type Usuario } from "../../dominio/modelo.js";
import type { Resultado } from "../../dominio/puertos.js";
import { HORA_LIMITE, lunesDe } from "../../dominio/tiempo.js";

export type Contexto = {
  casos: CasosDeUso;
  token: string | null;
  usuario: Usuario | null;
  /** Por qué no hay usuario: sin token, token desconocido o sesión vencida. */
  motivoSinSesion: string;
};

type Mes = { anio: number; mes: number };
type DePersona = { fecha: string; personaId?: string | null };
type FamiliarInput = DatosPersonales & { parentesco: string };

/** Sin sesión válida no se responde nada salvo `hoy` e `iniciarSesion`. */
function requerirUsuario(ctx: Contexto): Usuario {
  if (!ctx.usuario) {
    throw createGraphQLError(ctx.motivoSinSesion || SIN_SESION, { extensions: { code: "UNAUTHENTICATED" } });
  }
  return ctx.usuario;
}

const PROHIBIDOS = [SOLO_ADMINISTRADOR, SOLO_EMPLEADO];

/** En las consultas, una regla que no se cumple es un error con código; el mensaje se puede mostrar tal cual. */
function valorDe<T>(resultado: Resultado<T>): T {
  if (resultado.ok) return resultado.valor;
  const code = resultado.mensaje === CAMBIO_PENDIENTE
    ? "PASSWORD_CHANGE_REQUIRED"
    : PROHIBIDOS.includes(resultado.mensaje)
      ? "FORBIDDEN"
      : "BAD_USER_INPUT";
  throw createGraphQLError(resultado.mensaje, { extensions: { code } });
}

/** En las mutaciones, el rechazo es una respuesta esperada: ok=false y el mensaje para el usuario. */
function payload<T, P extends object>(resultado: Resultado<T>, armar: (valor: T) => P) {
  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };
  return { ok: true, mensaje: null, ...armar(resultado.valor) };
}

function variasPersonas(resultado: Resultado<ResultadoPorPersona[]>) {
  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje, resultados: [] };
  const todas = resultado.valor.every((r) => r.ok);
  return {
    ok: todas,
    mensaje: todas ? null : "Una o más personas no se pudieron registrar. Mira el detalle.",
    resultados: resultado.valor,
  };
}

function ficha(f: FichaUsuario) {
  return { ...f, cuenta: { ...f.cuenta } };
}

export const resolvers = {
  Persona: {
    nombreCompleto: (persona: Persona) => nombreCompleto(persona),
  },

  Query: {
    hoy: (_: unknown, __: unknown, ctx: Contexto) => {
      const ahora = ctx.casos.reloj.ahora();
      return { fecha: ahora.fecha, horaLimite: HORA_LIMITE, lunes: lunesDe(ahora.fecha) };
    },
    yo: (_: unknown, __: unknown, ctx: Contexto) => requerirUsuario(ctx),
    menuSemanal: async (_: unknown, args: { lunes: string }, ctx: Contexto) => {
      requerirUsuario(ctx);
      return valorDe(await ctx.casos.verMenuSemanal.ejecutar(args.lunes));
    },
    miFamilia: async (_: unknown, __: unknown, ctx: Contexto) =>
      valorDe(await ctx.casos.verMiFamilia.ejecutar(requerirUsuario(ctx))),
    misReservas: async (_: unknown, args: Mes, ctx: Contexto) =>
      valorDe(await ctx.casos.verMisReservas.ejecutar(requerirUsuario(ctx), args.anio, args.mes)),
    miConsumo: async (_: unknown, args: Mes, ctx: Contexto) =>
      valorDe(await ctx.casos.verMiConsumo.ejecutar(requerirUsuario(ctx), args.anio, args.mes)),
    usuarios: async (_: unknown, __: unknown, ctx: Contexto) =>
      valorDe(await ctx.casos.listarUsuarios.ejecutar(requerirUsuario(ctx))).map(ficha),
    usuario: async (_: unknown, args: { id: string }, ctx: Contexto) =>
      ficha(valorDe(await ctx.casos.verUsuario.ejecutar(requerirUsuario(ctx), args.id))),
    listaDelDia: async (_: unknown, args: { fecha?: string | null }, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      return valorDe(await ctx.casos.verLista.ejecutar(usuario, args.fecha || ctx.casos.reloj.ahora().fecha));
    },
    reporteMensual: async (_: unknown, args: Mes, ctx: Contexto) => {
      const reporte = valorDe(await ctx.casos.generarReporte.ejecutar(requerirUsuario(ctx), args.anio, args.mes));
      const base = `/api/reportes/${args.anio}/${args.mes}`;
      return { ...reporte, urlExcel: `${base}.xlsx`, urlPdf: `${base}.pdf` };
    },
  },

  Mutation: {
    iniciarSesion: async (_: unknown, args: { usuario: string; contrasena: string }, ctx: Contexto) => ({
      minutosDeInactividad: INACTIVIDAD_MAXIMA_MS / 60000,
      ...payload(await ctx.casos.iniciarSesion.ejecutar(args.usuario, args.contrasena), (sesion) => sesion),
    }),
    cerrarSesion: async (_: unknown, __: unknown, ctx: Contexto) => {
      if (ctx.token) await ctx.casos.cerrarSesion.ejecutar(ctx.token);
      return true;
    },
    cambiarContrasena: async (
      _: unknown,
      args: { actual: string; nueva: string; confirmacion: string },
      ctx: Contexto,
    ) =>
      payload(
        await ctx.casos.cambiarContrasena.ejecutar(requerirUsuario(ctx), args.actual, args.nueva, args.confirmacion),
        (usuario) => ({ usuario }),
      ),
    registrarUsuario: async (
      _: unknown,
      args: { registro: Omit<SolicitudRegistro, "familiares"> & { familiares?: FamiliarInput[] | null } },
      ctx: Contexto,
    ) => {
      const resultado = await ctx.casos.registrarUsuario.ejecutar(requerirUsuario(ctx), {
        ...args.registro,
        familiares: args.registro.familiares ?? [],
      });
      return payload(resultado, (registrado) => ({ ficha: ficha(registrado) }));
    },
    publicarMenu: async (_: unknown, args: { lunes: string; dias: MenuDia[] }, ctx: Contexto) => {
      const resultado = await ctx.casos.publicarMenu.ejecutar(requerirUsuario(ctx), args.lunes, args.dias);
      return payload(resultado, (publicado) => ({
        reservasDePension: publicado.reservasDePension,
        menu: {
          lunes: publicado.menu.lunes,
          publicado: true,
          publicadoEl: publicado.menu.publicadoEl,
          dias: publicado.menu.dias,
        },
      }));
    },
    reservarAlmuerzo: async (_: unknown, args: { fecha: string; personaIds?: string[] | null }, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const personaIds = args.personaIds?.length ? args.personaIds : [usuario.id];
      return variasPersonas(await ctx.casos.reservar.ejecutar(usuario, personaIds, args.fecha));
    },
    cancelarReserva: async (_: unknown, args: DePersona, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const resultado = await ctx.casos.cancelar.ejecutar(usuario, args.personaId ?? usuario.id, args.fecha);
      return payload(resultado, (reserva) => ({ reserva }));
    },
    pensionar: async (_: unknown, args: Mes & { personaIds: string[] }, ctx: Contexto) =>
      variasPersonas(await ctx.casos.pensionar.ejecutar(requerirUsuario(ctx), args.personaIds, args.anio, args.mes)),
    avisarInasistencia: async (_: unknown, args: DePersona, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const resultado = await ctx.casos.avisarInasistencia.ejecutar(usuario, args.personaId ?? usuario.id, args.fecha);
      return payload(resultado, (aviso) => aviso);
    },
    agregarFamiliar: async (_: unknown, args: { titularId: string; familiar: FamiliarInput }, ctx: Contexto) =>
      payload(await ctx.casos.agregarFamiliar.ejecutar(requerirUsuario(ctx), args.titularId, args.familiar), (persona) => ({
        persona,
      })),
    modificarDatos: async (
      _: unknown,
      args: { personaId: string; datos: DatosPersonales; parentesco?: string | null },
      ctx: Contexto,
    ) =>
      payload(
        await ctx.casos.modificarDatos.ejecutar(requerirUsuario(ctx), args.personaId, args.datos, args.parentesco ?? undefined),
        (persona) => ({ persona }),
      ),
    cambiarTipoUsuario: async (_: unknown, args: { personaId: string; tipo: string }, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const resultado = await ctx.casos.cambiarTipoUsuario.ejecutar(usuario, args.personaId, args.tipo);
      if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };
      return payload(await ctx.casos.verUsuario.ejecutar(usuario, args.personaId), (f) => ({ ficha: ficha(f) }));
    },
    darDeBaja: async (_: unknown, args: { personaId: string }, ctx: Contexto) =>
      payload(await ctx.casos.darDeBaja.ejecutar(requerirUsuario(ctx), args.personaId), (baja) => baja),
    restablecerContrasena: async (_: unknown, args: { personaId: string }, ctx: Contexto) =>
      payload(await ctx.casos.restablecerContrasena.ejecutar(requerirUsuario(ctx), args.personaId), (r) => r),
  },
};
