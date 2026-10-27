import express, { type Request, type Response } from "express";
import type { CasosDeUso } from "../aplicacion/casosDeUso.js";
import type { ResultadoPorPersona } from "../aplicacion/comun.js";
import type { FamiliarIngresado } from "../aplicacion/registrarUsuario.js";
import { nombreCompleto, type DatosPersonales, type TipoUsuario, type Usuario } from "../dominio/modelo.js";
import type { FormatoReporte } from "../dominio/puertos.js";
import { anioMes, esFechaValida, lunesDe, mesSiguiente, sugerirFechaReserva, sumarDias } from "../dominio/tiempo.js";
import {
  FAMILIARES_EN_FORMULARIO,
  paginaFichaUsuario,
  paginaLista,
  paginaMenu,
  paginaNuevoUsuario,
  paginaReporte,
  paginaUsuarios,
} from "./paginasAdministrador.js";
import { paginaCambiarContrasena, paginaConsumo, paginaIngreso, paginaPension, paginaReservas } from "./paginasEmpleado.js";
import { cookieDeSesion, cookieVacia, tokenDe } from "./token.js";
import type { Sesion } from "./vistas.js";

export type OpcionesWeb = {
  estilos: string;
  cookieSegura: boolean;
  /** Muestra en el ingreso los usuarios de prueba que siembra la demo. */
  cuentasDemo: boolean;
};

const INICIO: Record<TipoUsuario, string> = { EMPLEADO: "/inicio", ADMINISTRADOR: "/usuarios" };

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

/** Un checkbox repetido llega como arreglo; uno solo, como texto. */
function lista(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter((v): v is string => typeof v === "string");
  return typeof valor === "string" && valor ? [valor] : [];
}

function mensajes(req: Request) {
  return { error: texto(req.query.error) || undefined, mensaje: texto(req.query.mensaje) || undefined };
}

function irA(res: Response, ruta: string, resultado: { ok: boolean; mensaje?: string }, exito = ""): void {
  const separador = ruta.includes("?") ? "&" : "?";
  const destino = resultado.ok
    ? `${ruta}${separador}mensaje=${encodeURIComponent(exito)}`
    : `${ruta}${separador}error=${encodeURIComponent(resultado.mensaje ?? "")}`;
  res.redirect(destino);
}

/** Varias personas en una sola acción: si alguna no se pudo, se muestra como error con el detalle. */
function resumen(resultados: ResultadoPorPersona[]): { ok: boolean; mensaje: string } {
  const fallidos = resultados.filter((r) => !r.ok);
  const hechos = resultados.filter((r) => r.ok);
  if (fallidos.length === 0) return { ok: true, mensaje: hechos.map((r) => r.mensaje).join(" ") };
  const detalle = fallidos.map((r) => (r.nombre === r.personaId ? r.mensaje : `${r.nombre}: ${r.mensaje}`));
  return { ok: false, mensaje: [...hechos.map((r) => r.mensaje), ...detalle].join(" ") };
}

/** "2026-10" o nada → el mes pedido o el actual. */
function periodoDe(valor: unknown, hoy: string): { anio: number; mes: number } {
  const coincide = /^(\d{4})-(\d{2})$/.exec(texto(valor));
  if (coincide) {
    const mes = Number(coincide[2]);
    if (mes >= 1 && mes <= 12) return { anio: Number(coincide[1]), mes };
  }
  return anioMes(hoy);
}

function datosPersonales(cuerpo: Record<string, unknown>, prefijo = ""): DatosPersonales {
  return {
    nombres: texto(cuerpo[`${prefijo}nombres`]),
    apellidos: texto(cuerpo[`${prefijo}apellidos`]),
    ci: texto(cuerpo[`${prefijo}ci`]),
    fechaNacimiento: texto(cuerpo[`${prefijo}fechaNacimiento`]),
    telefono: texto(cuerpo[`${prefijo}telefono`]),
  };
}

/** Los bloques de familiar del formulario que tienen algo escrito. */
function familiaresDelFormulario(cuerpo: Record<string, unknown>): FamiliarIngresado[] {
  const familiares: FamiliarIngresado[] = [];
  for (let i = 1; i <= FAMILIARES_EN_FORMULARIO; i++) {
    const prefijo = `fam${i}_`;
    const datos = datosPersonales(cuerpo, prefijo);
    if (Object.values(datos).some((valor) => valor.trim())) {
      familiares.push({ ...datos, parentesco: texto(cuerpo[`${prefijo}parentesco`]) });
    }
  }
  return familiares;
}

/**
 * Pantallas de HU01 a HU11 y la descarga del reporte. Cada ruta lee el formulario, llama a un
 * caso de uso y muestra su resultado; ninguna decide una regla del negocio.
 */
export function crearRutasWeb(casos: CasosDeUso, opciones: OpcionesWeb): express.Router {
  const router = express.Router();
  router.use(express.urlencoded({ extended: false }));

  /** Valida la sesión. Con la contraseña pendiente (HU02 CA6) solo deja pasar al cambio. */
  async function usuarioDe(req: Request, res: Response, tipo?: TipoUsuario): Promise<Usuario | null> {
    const token = tokenDe(req.headers.authorization, req.headers.cookie);
    const sesion = await casos.validarSesion.ejecutar(token);
    if (!sesion.ok) {
      res.setHeader("Set-Cookie", cookieVacia());
      if (req.path.startsWith("/api/")) res.status(401).json({ error: sesion.mensaje });
      else res.redirect(`/?error=${encodeURIComponent(sesion.mensaje)}`);
      return null;
    }
    const usuario = sesion.valor;
    if (usuario.debeCambiarContrasena && req.path !== "/contrasena") {
      res.redirect("/contrasena");
      return null;
    }
    if (tipo && usuario.tipo !== tipo) {
      res.redirect(INICIO[usuario.tipo]);
      return null;
    }
    return usuario;
  }

  async function sesionDe(usuario: Usuario): Promise<Sesion> {
    const familia = await casos.verMiFamilia.ejecutar(usuario);
    return { tipo: usuario.tipo, nombre: familia.ok ? nombreCompleto(familia.valor.titular) : usuario.nombreUsuario };
  }

  router.get("/estilos.css", (_req, res) => {
    res.type("css").send(opciones.estilos);
  });

  // --- HU02 iniciar sesión ------------------------------------------------------------------

  router.get("/", async (req, res) => {
    const sesion = await casos.validarSesion.ejecutar(tokenDe(undefined, req.headers.cookie));
    if (sesion.ok) {
      res.redirect(sesion.valor.debeCambiarContrasena ? "/contrasena" : INICIO[sesion.valor.tipo]);
      return;
    }
    res.type("html").send(paginaIngreso(texto(req.query.error) || undefined, opciones.cuentasDemo));
  });

  router.post("/ingresar", async (req, res) => {
    const resultado = await casos.iniciarSesion.ejecutar(texto(req.body.usuario), texto(req.body.contrasena));
    if (!resultado.ok) {
      res.redirect(`/?error=${encodeURIComponent(resultado.mensaje)}`);
      return;
    }
    res.setHeader("Set-Cookie", cookieDeSesion(resultado.valor.token, opciones.cookieSegura));
    const { usuario } = resultado.valor;
    res.redirect(usuario.debeCambiarContrasena ? "/contrasena" : INICIO[usuario.tipo]);
  });

  router.post("/salir", async (req, res) => {
    const token = tokenDe(undefined, req.headers.cookie);
    if (token) await casos.cerrarSesion.ejecutar(token);
    res.setHeader("Set-Cookie", cookieVacia());
    res.redirect("/");
  });

  router.get("/contrasena", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    res.type("html").send(
      paginaCambiarContrasena({ ...mensajes(req), obligatorio: usuario.debeCambiarContrasena, sesion: await sesionDe(usuario) }),
    );
  });

  router.post("/contrasena", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    const resultado = await casos.cambiarContrasena.ejecutar(
      usuario,
      texto(req.body.actual),
      texto(req.body.nueva),
      texto(req.body.confirmacion),
    );
    if (!resultado.ok) {
      irA(res, "/contrasena", resultado, "");
      return;
    }
    irA(res, INICIO[usuario.tipo], resultado, "Contraseña cambiada.");
  });

  // --- Usuario empleado: HU04, HU05, HU07, HU08, HU11 ---------------------------------------

  router.get("/inicio", async (req, res) => {
    const usuario = await usuarioDe(req, res, "EMPLEADO");
    if (!usuario) return;
    const familia = await casos.verMiFamilia.ejecutar(usuario);
    if (!familia.ok) {
      res.redirect(`/?error=${encodeURIComponent(familia.mensaje)}`);
      return;
    }
    const ahora = casos.reloj.ahora();
    const lunes = lunesDe(ahora.fecha);
    const semanas = await Promise.all([lunes, sumarDias(lunes, 7)].map((l) => casos.verMenuSemanal.ejecutar(l)));
    const vistas = semanas.flatMap((s) => (s.ok ? [s.valor] : []));
    const conMenu = new Set(vistas.flatMap((v) => v.dias.filter((d) => d.descripcion).map((d) => d.fecha)));
    const periodo = periodoDe(req.query.mes, ahora.fecha);
    const reservas = await casos.verMisReservas.ejecutar(usuario, periodo.anio, periodo.mes);
    res.type("html").send(
      paginaReservas({
        ...mensajes(req),
        sesion: { tipo: usuario.tipo, nombre: nombreCompleto(familia.valor.titular) },
        familia: familia.valor,
        semanas: [vistas[0], vistas[1]],
        fechaSugerida: sugerirFechaReserva(ahora, (fecha) => conMenu.has(fecha)),
        reservas: reservas.ok ? reservas.valor : [],
        periodo,
        hoy: ahora.fecha,
      }),
    );
  });

  router.post("/reservar", async (req, res) => {
    const usuario = await usuarioDe(req, res, "EMPLEADO");
    if (!usuario) return;
    const resultado = await casos.reservar.ejecutar(usuario, lista(req.body.personaId), texto(req.body.fecha));
    const final = resultado.ok ? resumen(resultado.valor) : resultado;
    irA(res, "/inicio", final, final.mensaje);
  });

  router.post("/cancelar", async (req, res) => {
    const usuario = await usuarioDe(req, res, "EMPLEADO");
    if (!usuario) return;
    const resultado = await casos.cancelar.ejecutar(usuario, texto(req.body.personaId), texto(req.body.fecha));
    irA(res, "/inicio", resultado, "La reserva quedó cancelada y no se cobra.");
  });

  router.post("/avisar", async (req, res) => {
    const usuario = await usuarioDe(req, res, "EMPLEADO");
    if (!usuario) return;
    const resultado = await casos.avisarInasistencia.ejecutar(usuario, texto(req.body.personaId), texto(req.body.fecha));
    const exito = resultado.ok
      ? `Inasistencia avisada: ese almuerzo no se cobra. Quedan ${resultado.valor.programadosRestantes} almuerzos programados (mínimo ${resultado.valor.minimo}).`
      : "";
    irA(res, "/inicio", resultado, exito);
  });

  router.get("/pension", async (req, res) => {
    const usuario = await usuarioDe(req, res, "EMPLEADO");
    if (!usuario) return;
    const familia = await casos.verMiFamilia.ejecutar(usuario);
    if (!familia.ok) {
      res.redirect(`/?error=${encodeURIComponent(familia.mensaje)}`);
      return;
    }
    const hoy = casos.reloj.ahora().fecha;
    const actual = anioMes(hoy);
    const siguiente = mesSiguiente(hoy);
    const consumoSiguiente = await casos.verMiConsumo.ejecutar(usuario, siguiente.anio, siguiente.mes);
    const consumoActual = await casos.verMiConsumo.ejecutar(usuario, actual.anio, actual.mes);
    res.type("html").send(
      paginaPension({
        ...mensajes(req),
        sesion: { tipo: usuario.tipo, nombre: nombreCompleto(familia.valor.titular) },
        familia: familia.valor,
        siguiente,
        actual,
        pensionadosSiguiente: new Set(
          consumoSiguiente.ok ? consumoSiguiente.valor.personas.filter((p) => p.pensionado).map((p) => p.persona.id) : [],
        ),
        pensionadosActual: consumoActual.ok
          ? consumoActual.valor.personas.filter((p) => p.pensionado).map((p) => nombreCompleto(p.persona))
          : [],
      }),
    );
  });

  router.post("/pensionar", async (req, res) => {
    const usuario = await usuarioDe(req, res, "EMPLEADO");
    if (!usuario) return;
    const periodo = periodoDe(req.body.mes, "0000-00-00");
    const resultado = await casos.pensionar.ejecutar(usuario, lista(req.body.personaId), periodo.anio, periodo.mes);
    const final = resultado.ok ? resumen(resultado.valor) : resultado;
    irA(res, "/pension", final, final.mensaje);
  });

  router.get("/consumo", async (req, res) => {
    const usuario = await usuarioDe(req, res, "EMPLEADO");
    if (!usuario) return;
    const periodo = periodoDe(req.query.mes, casos.reloj.ahora().fecha);
    const consumo = await casos.verMiConsumo.ejecutar(usuario, periodo.anio, periodo.mes);
    if (!consumo.ok) {
      res.redirect(`/inicio?error=${encodeURIComponent(consumo.mensaje)}`);
      return;
    }
    res.type("html").send(paginaConsumo({ ...mensajes(req), sesion: await sesionDe(usuario), consumo: consumo.valor }));
  });

  // --- Usuario administrador: HU01, HU09 ----------------------------------------------------

  router.get("/usuarios", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const fichas = await casos.listarUsuarios.ejecutar(usuario);
    res.type("html").send(
      paginaUsuarios({ ...mensajes(req), sesion: await sesionDe(usuario), fichas: fichas.ok ? fichas.valor : [] }),
    );
  });

  router.get("/usuarios/nuevo", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    res.type("html").send(paginaNuevoUsuario({ ...mensajes(req), sesion: await sesionDe(usuario), valores: {} }));
  });

  router.post("/usuarios", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const cuerpo = req.body as Record<string, unknown>;
    const resultado = await casos.registrarUsuario.ejecutar(usuario, {
      datos: datosPersonales(cuerpo),
      codigoEmpleado: texto(cuerpo.codigoEmpleado),
      nombreUsuario: texto(cuerpo.nombreUsuario),
      contrasenaInicial: texto(cuerpo.contrasenaInicial),
      tipo: texto(cuerpo.tipo),
      familiares: familiaresDelFormulario(cuerpo),
    });
    if (!resultado.ok) {
      // Se vuelve a mostrar el formulario con lo escrito, para no tener que llenarlo de nuevo.
      const valores = Object.fromEntries(Object.entries(cuerpo).map(([clave, valor]) => [clave, texto(valor)]));
      res.status(400).type("html").send(
        paginaNuevoUsuario({ error: resultado.mensaje, sesion: await sesionDe(usuario), valores }),
      );
      return;
    }
    const { persona, familiares, topeDiario } = resultado.valor;
    irA(
      res,
      `/usuarios/${persona.id}`,
      resultado,
      `Usuario registrado con ${familiares.length} familiar(es). Tope diario: ${topeDiario}.`,
    );
  });

  router.get("/usuarios/:id", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const ficha = await casos.verUsuario.ejecutar(usuario, req.params.id);
    if (!ficha.ok) {
      res.redirect(`/usuarios?error=${encodeURIComponent(ficha.mensaje)}`);
      return;
    }
    res.type("html").send(
      paginaFichaUsuario({
        ...mensajes(req),
        sesion: await sesionDe(usuario),
        ficha: ficha.valor,
        temporal: texto(req.query.temporal) || undefined,
      }),
    );
  });

  router.post("/usuarios/:id/familiares", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const cuerpo = req.body as Record<string, unknown>;
    const resultado = await casos.agregarFamiliar.ejecutar(usuario, req.params.id, {
      ...datosPersonales(cuerpo),
      parentesco: texto(cuerpo.parentesco),
    });
    irA(res, `/usuarios/${req.params.id}`, resultado, "Familiar agregado: el tope diario subió en uno.");
  });

  router.post("/usuarios/:id/tipo", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const resultado = await casos.cambiarTipoUsuario.ejecutar(usuario, req.params.id, texto(req.body.tipo));
    irA(res, `/usuarios/${req.params.id}`, resultado, "Tipo de usuario actualizado.");
  });

  router.post("/usuarios/:id/contrasena", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const resultado = await casos.restablecerContrasena.ejecutar(usuario, req.params.id);
    if (!resultado.ok) {
      irA(res, `/usuarios/${req.params.id}`, resultado, "");
      return;
    }
    res.redirect(`/usuarios/${req.params.id}?temporal=${encodeURIComponent(resultado.valor.temporal)}`);
  });

  router.post("/personas/:id/datos", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const cuerpo = req.body as Record<string, unknown>;
    const parentesco = typeof cuerpo.parentesco === "string" ? cuerpo.parentesco : undefined;
    const resultado = await casos.modificarDatos.ejecutar(usuario, req.params.id, datosPersonales(cuerpo), parentesco);
    irA(res, `/usuarios/${texto(cuerpo.volver) || req.params.id}`, resultado, "Datos guardados.");
  });

  router.post("/personas/:id/baja", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const resultado = await casos.darDeBaja.ejecutar(usuario, req.params.id);
    const exito = resultado.ok
      ? `Baja registrada (${resultado.valor.personas.map(nombreCompleto).join(", ")}). Reservas anuladas sin cobro desde el ${resultado.valor.reservasAnuladasDesde}.`
      : "";
    irA(res, `/usuarios/${texto(req.body.volver) || req.params.id}`, resultado, exito);
  });

  // --- Usuario administrador: HU03, HU06, HU10 ----------------------------------------------

  router.get("/menu", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const hoy = casos.reloj.ahora().fecha;
    const pedida = texto(req.query.semana);
    // Sin semana elegida se propone la próxima: el menú se publica el domingo para la semana que viene.
    const lunes = esFechaValida(pedida) ? lunesDe(pedida) : lunesDe(sumarDias(hoy, 1));
    const vista = await casos.verMenuSemanal.ejecutar(lunes);
    if (!vista.ok) {
      res.redirect(`/menu?error=${encodeURIComponent(vista.mensaje)}`);
      return;
    }
    res.type("html").send(paginaMenu({ ...mensajes(req), sesion: await sesionDe(usuario), vista: vista.valor, hoy, valores: {} }));
  });

  router.post("/menu", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const cuerpo = req.body as Record<string, unknown>;
    const lunes = texto(cuerpo.lunes);
    const dias = Object.entries(cuerpo)
      .filter(([clave]) => clave.startsWith("menu_"))
      .map(([clave, valor]) => ({ fecha: clave.slice("menu_".length), descripcion: texto(valor) }));
    const resultado = await casos.publicarMenu.ejecutar(usuario, lunes, dias);
    if (!resultado.ok) {
      const vista = await casos.verMenuSemanal.ejecutar(lunes);
      if (!vista.ok) {
        irA(res, "/menu", resultado, "");
        return;
      }
      const valores = Object.fromEntries(Object.entries(cuerpo).map(([clave, valor]) => [clave, texto(valor)]));
      res.status(400).type("html").send(
        paginaMenu({
          error: resultado.mensaje,
          sesion: await sesionDe(usuario),
          vista: vista.valor,
          hoy: casos.reloj.ahora().fecha,
          valores,
        }),
      );
      return;
    }
    irA(
      res,
      `/menu?semana=${lunes}`,
      resultado,
      `Menú publicado con ${resultado.valor.menu.dias.length} día(s) de atención. Almuerzos de pensionados confirmados: ${resultado.valor.reservasDePension}.`,
    );
  });

  router.get("/dia", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const fecha = texto(req.query.fecha) || casos.reloj.ahora().fecha;
    const resultado = await casos.verLista.ejecutar(usuario, fecha);
    if (!resultado.ok) {
      res.redirect(`/usuarios?error=${encodeURIComponent(resultado.mensaje)}`);
      return;
    }
    res.type("html").send(paginaLista({ sesion: await sesionDe(usuario), lista: resultado.valor }));
  });

  router.get("/reporte", async (req, res) => {
    const usuario = await usuarioDe(req, res, "ADMINISTRADOR");
    if (!usuario) return;
    const periodo = periodoDe(req.query.mes, casos.reloj.ahora().fecha);
    const reporte = await casos.generarReporte.ejecutar(usuario, periodo.anio, periodo.mes);
    if (!reporte.ok) {
      res.redirect(`/usuarios?error=${encodeURIComponent(reporte.mensaje)}`);
      return;
    }
    res.type("html").send(paginaReporte({ sesion: await sesionDe(usuario), reporte: reporte.valor }));
  });

  router.get("/api/reportes/:anio/:archivo", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    const coincide = /^(\d{1,2})\.(xlsx|pdf)$/.exec(req.params.archivo);
    if (!coincide) {
      res.status(404).json({ error: "Usa /api/reportes/AAAA/M.xlsx o /api/reportes/AAAA/M.pdf" });
      return;
    }
    const formato: FormatoReporte = coincide[2] === "pdf" ? "PDF" : "EXCEL";
    const resultado = await casos.exportarReporte.ejecutar(usuario, Number(req.params.anio), Number(coincide[1]), formato);
    if (!resultado.ok) {
      res.status(usuario.tipo === "ADMINISTRADOR" ? 400 : 403).json({ error: resultado.mensaje });
      return;
    }
    res.setHeader("Content-Type", resultado.valor.tipoContenido);
    res.setHeader("Content-Disposition", `attachment; filename="${resultado.valor.nombreArchivo}"`);
    res.send(Buffer.from(resultado.valor.contenido));
  });

  return router;
}
