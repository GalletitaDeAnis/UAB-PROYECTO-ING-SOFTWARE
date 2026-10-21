// createGraphQLError usa la misma clase GraphQLError que Yoga reconoce al enmascarar errores.
import { createGraphQLError } from "graphql-yoga";
import type { CasosDeUso } from "../../aplicacion/casosDeUso.js";
import { SOLO_ENCARGADO } from "../../aplicacion/comun.js";
import { INACTIVIDAD_MAXIMA_MS, SIN_SESION } from "../../aplicacion/sesion.js";
import { topeDiario, type Almuerzo, type Usuario } from "../../dominio/modelo.js";
import type { Resultado } from "../../dominio/puertos.js";
import { mesSiguiente, sugerirFechaReserva } from "../../dominio/tiempo.js";

export type Contexto = {
  casos: CasosDeUso;
  token: string | null;
  usuario: Usuario | null;
  /** Por qué no hay usuario: sin token, token desconocido o sesión vencida. */
  motivoSinSesion: string;
};

type Mes = { anio: number; mes: number };
type DePersona = { fecha: string; personaId?: string | null };

/** Sin sesión válida no se responde nada salvo `hoy` e `iniciarSesion`. */
function requerirUsuario(ctx: Contexto): Usuario {
  if (!ctx.usuario) {
    throw createGraphQLError(ctx.motivoSinSesion || SIN_SESION, { extensions: { code: "UNAUTHENTICATED" } });
  }
  return ctx.usuario;
}

/** En las consultas, una regla que no se cumple es un error con código; el mensaje se puede mostrar tal cual. */
function valorDe<T>(resultado: Resultado<T>): T {
  if (resultado.ok) return resultado.valor;
  const code = resultado.mensaje === SOLO_ENCARGADO ? "FORBIDDEN" : "BAD_USER_INPUT";
  throw createGraphQLError(resultado.mensaje, { extensions: { code } });
}

/** En las mutaciones, el rechazo es una respuesta esperada: ok=false y el mensaje para el usuario. */
function payload<T, P extends object>(resultado: Resultado<T>, armar: (valor: T) => P) {
  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };
  return { ok: true, mensaje: null, ...armar(resultado.valor) };
}

function almuerzoGraphql(almuerzo: Almuerzo & { nombrePersona?: string }) {
  return { ...almuerzo, modalidad: almuerzo.origen, nombrePersona: almuerzo.nombrePersona ?? null };
}

export const resolvers = {
  Query: {
    hoy: async (_: unknown, __: unknown, ctx: Contexto) => {
      const ahora = ctx.casos.reloj.ahora();
      const [anio, mes] = ahora.fecha.split("-").map(Number);
      const siguiente = mesSiguiente(ahora.fecha);
      const feriados = new Set<string>();
      for (const periodo of [{ anio, mes }, siguiente]) {
        const lista = await ctx.casos.listarFeriados.ejecutar(periodo.anio, periodo.mes);
        if (lista.ok) lista.valor.forEach((feriado) => feriados.add(feriado.fecha));
      }
      return {
        fecha: ahora.fecha,
        horaLimite: "09:00",
        fechaSugerida: sugerirFechaReserva(ahora, (fecha) => feriados.has(fecha)),
      };
    },
    yo: (_: unknown, __: unknown, ctx: Contexto) => requerirUsuario(ctx),
    miFamilia: async (_: unknown, __: unknown, ctx: Contexto) =>
      valorDe(await ctx.casos.verMiFamilia.ejecutar(requerirUsuario(ctx))),
    misAlmuerzos: async (_: unknown, args: Mes, ctx: Contexto) =>
      valorDe(await ctx.casos.verMisAlmuerzos.ejecutar(requerirUsuario(ctx), args.anio, args.mes)).map(
        almuerzoGraphql,
      ),
    miConsumo: async (_: unknown, args: Mes, ctx: Contexto) =>
      valorDe(await ctx.casos.verMiConsumo.ejecutar(requerirUsuario(ctx), args.anio, args.mes)),
    feriados: async (_: unknown, args: Mes, ctx: Contexto) => {
      requerirUsuario(ctx);
      return valorDe(await ctx.casos.listarFeriados.ejecutar(args.anio, args.mes));
    },
    diasDeServicio: async (_: unknown, args: Mes, ctx: Contexto) => {
      requerirUsuario(ctx);
      return valorDe(await ctx.casos.verDiasDeServicio.ejecutar(args.anio, args.mes));
    },
    listaDelDia: async (_: unknown, args: { fecha?: string | null }, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const fecha = args.fecha || ctx.casos.reloj.ahora().fecha;
      return valorDe(await ctx.casos.verLista.ejecutar(usuario, fecha));
    },
    reporteMensual: async (_: unknown, args: Mes, ctx: Contexto) => {
      const reporte = valorDe(await ctx.casos.generarReporte.ejecutar(requerirUsuario(ctx), args.anio, args.mes));
      const base = `/api/reportes/${args.anio}/${args.mes}`;
      return { ...reporte, urlExcel: `${base}.xlsx`, urlPdf: `${base}.pdf` };
    },
  },

  Mutation: {
    iniciarSesion: async (_: unknown, args: { usuario: string; contrasena: string }, ctx: Contexto) => {
      const resultado = await ctx.casos.iniciarSesion.ejecutar(args.usuario, args.contrasena);
      return {
        minutosDeInactividad: INACTIVIDAD_MAXIMA_MS / 60000,
        ...payload(resultado, (sesion) => ({
          token: sesion.token,
          usuario: sesion.usuario,
          familia: {
            titular: sesion.empleado,
            familiares: sesion.familiares,
            topeDiario: topeDiario(sesion.familiares.length),
          },
        })),
      };
    },
    cerrarSesion: async (_: unknown, __: unknown, ctx: Contexto) => {
      if (ctx.token) await ctx.casos.cerrarSesion.ejecutar(ctx.token);
      return true;
    },
    reservarAlmuerzo: async (_: unknown, args: DePersona, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const personaId = args.personaId ?? usuario.codigoInstitucional;
      const resultado = await ctx.casos.reservar.ejecutar(usuario, personaId, args.fecha);
      return payload(resultado, (almuerzo) => ({ almuerzo: almuerzoGraphql(almuerzo) }));
    },
    cancelarReserva: async (_: unknown, args: DePersona, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const personaId = args.personaId ?? usuario.codigoInstitucional;
      const resultado = await ctx.casos.cancelar.ejecutar(usuario, personaId, args.fecha);
      return payload(resultado, (almuerzo) => ({ almuerzo: almuerzoGraphql(almuerzo) }));
    },
    pensionar: async (_: unknown, args: Mes & { personaIds: string[] }, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const resultado = await ctx.casos.pensionar.ejecutar(usuario, args.personaIds, args.anio, args.mes);
      if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje, resultados: [] };
      const todas = resultado.valor.every((r) => r.ok);
      return {
        ok: todas,
        mensaje: todas ? null : "Una o más personas no quedaron pensionadas. Mira el detalle.",
        resultados: resultado.valor,
      };
    },
    avisarInasistencia: async (_: unknown, args: DePersona, ctx: Contexto) => {
      const usuario = requerirUsuario(ctx);
      const personaId = args.personaId ?? usuario.codigoInstitucional;
      const resultado = await ctx.casos.avisarInasistencia.ejecutar(usuario, personaId, args.fecha);
      return payload(resultado, (aviso) => ({
        almuerzo: almuerzoGraphql(aviso.almuerzo),
        almuerzosRestantes: aviso.almuerzosRestantes,
      }));
    },
    registrarFeriado: async (_: unknown, args: { fecha: string; descripcion: string }, ctx: Contexto) => {
      const resultado = await ctx.casos.registrarFeriado.ejecutar(
        requerirUsuario(ctx),
        args.fecha,
        args.descripcion,
      );
      return payload(resultado, (feriado) => ({ feriado }));
    },
  },
};
