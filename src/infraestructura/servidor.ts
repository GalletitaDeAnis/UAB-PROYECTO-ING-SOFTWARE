import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { sugerirFechaReserva } from "../dominio/tiempo.js";
import { crearAplicacion } from "./composicion.js";
import { paginaInicio, paginaIngreso, paginaLista } from "../presentacion/paginas.js";
import { cookieDe, cookieVacia, leerCodigo } from "./sesion.js";

const aplicacion = crearAplicacion();
const estilos = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../presentacion/estilos.css"),
  "utf8",
);
const app = express();
app.use(express.urlencoded({ extended: false }));

app.get("/estilos.css", (_req, res) => {
  res.type("css").send(estilos);
});

app.get("/", (req, res) => {
  if (leerCodigo(req.headers.cookie)) {
    res.redirect("/inicio");
    return;
  }
  const error = typeof req.query.error === "string" ? req.query.error : undefined;
  res.type("html").send(paginaIngreso(error));
});

app.post("/ingresar", async (req, res) => {
  const codigo = typeof req.body.codigo === "string" ? req.body.codigo : "";
  const resultado = await aplicacion.ingresar.ejecutar(codigo);
  if (!resultado.ok) {
    res.redirect(`/?error=${encodeURIComponent(resultado.mensaje)}`);
    return;
  }
  res.setHeader("Set-Cookie", cookieDe(resultado.valor.empleado.codigoInstitucional));
  res.redirect("/inicio");
});

app.post("/salir", (_req, res) => {
  res.setHeader("Set-Cookie", cookieVacia());
  res.redirect("/");
});

app.get("/inicio", async (req, res) => {
  const codigo = leerCodigo(req.headers.cookie);
  if (!codigo) {
    res.redirect("/");
    return;
  }
  const sesion = await aplicacion.ingresar.ejecutar(codigo);
  if (!sesion.ok) {
    res.setHeader("Set-Cookie", cookieVacia());
    res.redirect(`/?error=${encodeURIComponent(sesion.mensaje)}`);
    return;
  }
  const feriados = new Set((await aplicacion.feriados.listar()).map((feriado) => feriado.fecha));
  res.type("html").send(
    paginaInicio({
      nombre: sesion.valor.empleado.nombreCompleto,
      rol: sesion.valor.rol,
      almuerzos: sesion.valor.almuerzos,
      fechaSugerida: sugerirFechaReserva(aplicacion.reloj.ahora(), (fecha) => feriados.has(fecha)),
      error: typeof req.query.error === "string" ? req.query.error : undefined,
      mensaje: typeof req.query.mensaje === "string" ? req.query.mensaje : undefined,
    }),
  );
});

app.post("/reservar", async (req, res) => {
  const codigo = leerCodigo(req.headers.cookie);
  if (!codigo) {
    res.redirect("/");
    return;
  }
  const fecha = typeof req.body.fecha === "string" ? req.body.fecha : "";
  const resultado = await aplicacion.reservar.ejecutar(codigo, fecha);
  const destino = resultado.ok
    ? `/inicio?mensaje=${encodeURIComponent("Reserva confirmada a 18 Bs.")}`
    : `/inicio?error=${encodeURIComponent(resultado.mensaje)}`;
  res.redirect(destino);
});

app.post("/cancelar", async (req, res) => {
  const codigo = leerCodigo(req.headers.cookie);
  if (!codigo) {
    res.redirect("/");
    return;
  }
  const fecha = typeof req.body.fecha === "string" ? req.body.fecha : "";
  const resultado = await aplicacion.cancelar.ejecutar(codigo, fecha);
  const destino = resultado.ok
    ? `/inicio?mensaje=${encodeURIComponent("La reserva quedó cancelada y no se cobra.")}`
    : `/inicio?error=${encodeURIComponent(resultado.mensaje)}`;
  res.redirect(destino);
});

app.get("/dia", async (req, res) => {
  const codigo = leerCodigo(req.headers.cookie);
  if (!codigo) {
    res.redirect("/");
    return;
  }
  const fecha =
    typeof req.query.fecha === "string" && req.query.fecha
      ? req.query.fecha
      : aplicacion.reloj.ahora().fecha;
  const resultado = await aplicacion.verLista.ejecutar(codigo, fecha);
  if (!resultado.ok) {
    res.redirect(`/inicio?error=${encodeURIComponent(resultado.mensaje)}`);
    return;
  }
  res.type("html").send(paginaLista({ fecha, filas: resultado.valor }));
});

app.use((_req, res) => {
  res.status(404).type("html").send(paginaIngreso("Esa página no existe."));
});

const puerto = Number(process.env.PORT ?? 3000);
app.listen(puerto, () => {
  console.log(`Almuerzos en http://localhost:${puerto}`);
});
