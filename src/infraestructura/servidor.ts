import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { crearServidorGraphql } from "../presentacion/graphql/servidorGraphql.js";
import { crearRutasWeb } from "../presentacion/web.js";
import { crearAplicacion } from "./composicion.js";
import { leerConfiguracion } from "./configuracion.js";

const config = leerConfiguracion();
const { db, casos } = crearAplicacion();
const estilos = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../presentacion/estilos.css"),
  "utf8",
);

const app = express();
app.disable("x-powered-by");

const graphql = crearServidorGraphql(casos, {
  graphiql: config.graphiql,
  origenesPermitidos: config.origenesPermitidos,
});
app.use(graphql.graphqlEndpoint, graphql);

app.get("/salud", async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ estado: "ok", baseDeDatos: "ok" });
  } catch {
    res.status(503).json({ estado: "degradado", baseDeDatos: "sin conexión" });
  }
});

app.use(
  crearRutasWeb(casos, {
    estilos,
    cookieSegura: config.produccion,
    cuentasDemo: config.cuentasDemo,
  }),
);

app.use((_req, res) => {
  res.status(404).type("text").send("Esa página no existe.");
});

const servidor = app.listen(config.puerto, () => {
  console.log(`Almuerzos en http://localhost:${config.puerto}`);
  console.log(`API GraphQL en http://localhost:${config.puerto}/graphql`);
});

async function cerrar() {
  servidor.close();
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
