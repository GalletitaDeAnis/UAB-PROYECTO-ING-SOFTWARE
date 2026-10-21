import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { crearSimuladorEmpresarial } from "../../simulador-empresarial/app.js";
import { crearServidorGraphql } from "../presentacion/graphql/servidorGraphql.js";
import { crearRutasWeb } from "../presentacion/web.js";
import { crearAplicacion } from "./composicion.js";
import { leerConfiguracion } from "./configuracion.js";

const config = leerConfiguracion();
const { db, casos } = crearAplicacion(config);
const estilos = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../presentacion/estilos.css"),
  "utf8",
);

const app = express();
app.disable("x-powered-by");

if (config.empresarialSimulado) {
  // Mismo proceso, pero el restaurante le habla por HTTP igual que a la API real.
  app.use("/simulador-empresarial", crearSimuladorEmpresarial({ apiKey: config.empresarialApiKey }));
}

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
    simulado: config.empresarialSimulado,
  }),
);

app.use((_req, res) => {
  res.status(404).type("text").send("Esa página no existe.");
});

const servidor = app.listen(config.puerto, () => {
  console.log(`Almuerzos en http://localhost:${config.puerto}`);
  console.log(`API GraphQL en http://localhost:${config.puerto}/graphql`);
  if (config.empresarialSimulado) console.log("API empresarial: simulador local (EMPRESARIAL_SIMULADO=true)");
});

async function cerrar() {
  servidor.close();
  await db.$disconnect();
  process.exit(0);
}
process.on("SIGINT", cerrar);
process.on("SIGTERM", cerrar);
