import express, { type Request, type Response } from "express";
import type { CasosDeUso } from "../aplicacion/casosDeUso.js";
import { SOLO_ENCARGADO } from "../aplicacion/comun.js";
import type { Usuario } from "../dominio/modelo.js";
import type { FormatoReporte } from "../dominio/puertos.js";
import { anioMes, mesSiguiente, sugerirFechaReserva } from "../dominio/tiempo.js";
import { paginaIngreso, paginaInicio, paginaLista } from "./paginas.js";
import { cookieDeSesion, cookieVacia, tokenDe } from "./token.js";

export type OpcionesWeb = {
  estilos: string;
  cookieSegura: boolean;
  simulado: boolean;
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

function volver(res: Response, resultado: { ok: boolean; mensaje?: string }, exito: string): void {
  const destino = resultado.ok
    ? `/inicio?mensaje=${encodeURIComponent(exito)}`
    : `/inicio?error=${encodeURIComponent(resultado.mensaje ?? "")}`;
  res.redirect(destino);
}

/** Pantallas de HU01 a HU04 y la descarga del reporte (HU11 CA3). La lógica está en los casos de uso. */
export function crearRutasWeb(casos: CasosDeUso, opciones: OpcionesWeb): express.Router {
  const router = express.Router();
  router.use(express.urlencoded({ extended: false }));

  async function usuarioDe(req: Request, res: Response): Promise<Usuario | null> {
    const token = tokenDe(req.headers.authorization, req.headers.cookie);
    const sesion = await casos.validarSesion.ejecutar(token);
    if (sesion.ok) return sesion.valor;
    res.setHeader("Set-Cookie", cookieVacia());
    if (req.path.startsWith("/api/")) res.status(401).json({ error: sesion.mensaje });
    else res.redirect(`/?error=${encodeURIComponent(sesion.mensaje)}`);
    return null;
  }

  router.get("/estilos.css", (_req, res) => {
    res.type("css").send(opciones.estilos);
  });

  router.get("/", (req, res) => {
    if (tokenDe(undefined, req.headers.cookie)) {
      res.redirect("/inicio");
      return;
    }
    res.type("html").send(paginaIngreso(texto(req.query.error) || undefined, opciones.simulado));
  });

  router.post("/ingresar", async (req, res) => {
    const resultado = await casos.iniciarSesion.ejecutar(texto(req.body.usuario), texto(req.body.contrasena));
    if (!resultado.ok) {
      res.redirect(`/?error=${encodeURIComponent(resultado.mensaje)}`);
      return;
    }
    res.setHeader("Set-Cookie", cookieDeSesion(resultado.valor.token, opciones.cookieSegura));
    res.redirect("/inicio");
  });

  router.post("/salir", async (req, res) => {
    const token = tokenDe(undefined, req.headers.cookie);
    if (token) await casos.cerrarSesion.ejecutar(token);
    res.setHeader("Set-Cookie", cookieVacia());
    res.redirect("/");
  });

  router.get("/inicio", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    const familia = await casos.verMiFamilia.ejecutar(usuario);
    if (!familia.ok) {
      res.setHeader("Set-Cookie", cookieVacia());
      res.redirect(`/?error=${encodeURIComponent(familia.mensaje)}`);
      return;
    }
    const ahora = casos.reloj.ahora();
    const periodo = anioMes(ahora.fecha);
    const almuerzos = await casos.verMisAlmuerzos.ejecutar(usuario, periodo.anio, periodo.mes);
    const siguiente = mesSiguiente(ahora.fecha);
    const feriados = new Set<string>();
    for (const mes of [periodo, siguiente]) {
      const lista = await casos.listarFeriados.ejecutar(mes.anio, mes.mes);
      if (lista.ok) lista.valor.forEach((feriado) => feriados.add(feriado.fecha));
    }
    res.type("html").send(
      paginaInicio({
        ...familia.valor,
        rol: usuario.rol,
        almuerzos: almuerzos.ok ? almuerzos.valor : [],
        fechaSugerida: sugerirFechaReserva(ahora, (fecha) => feriados.has(fecha)),
        periodo,
        error: texto(req.query.error) || undefined,
        mensaje: texto(req.query.mensaje) || undefined,
      }),
    );
  });

  router.post("/reservar", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    const personaId = texto(req.body.personaId) || usuario.codigoInstitucional;
    const resultado = await casos.reservar.ejecutar(usuario, personaId, texto(req.body.fecha));
    volver(res, resultado, "Reserva confirmada a 18 Bs.");
  });

  router.post("/cancelar", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    const personaId = texto(req.body.personaId) || usuario.codigoInstitucional;
    const resultado = await casos.cancelar.ejecutar(usuario, personaId, texto(req.body.fecha));
    volver(res, resultado, "La reserva quedó cancelada y no se cobra.");
  });

  router.post("/avisar", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    const personaId = texto(req.body.personaId) || usuario.codigoInstitucional;
    const resultado = await casos.avisarInasistencia.ejecutar(usuario, personaId, texto(req.body.fecha));
    volver(res, resultado, "Inasistencia avisada. Ese día no se cobra.");
  });

  router.get("/dia", async (req, res) => {
    const usuario = await usuarioDe(req, res);
    if (!usuario) return;
    const fecha = texto(req.query.fecha) || casos.reloj.ahora().fecha;
    const resultado = await casos.verLista.ejecutar(usuario, fecha);
    if (!resultado.ok) {
      res.redirect(`/inicio?error=${encodeURIComponent(resultado.mensaje)}`);
      return;
    }
    res.type("html").send(paginaLista({ lista: resultado.valor }));
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
    const resultado = await casos.exportarReporte.ejecutar(
      usuario,
      Number(req.params.anio),
      Number(coincide[1]),
      formato,
    );
    if (!resultado.ok) {
      res.status(resultado.mensaje === SOLO_ENCARGADO ? 403 : 400).json({ error: resultado.mensaje });
      return;
    }
    res.setHeader("Content-Type", resultado.valor.tipoContenido);
    res.setHeader("Content-Disposition", `attachment; filename="${resultado.valor.nombreArchivo}"`);
    res.send(Buffer.from(resultado.valor.contenido));
  });

  return router;
}
