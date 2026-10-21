import express from "express";
import { crearSimuladorEmpresarial } from "./app.js";

/** Arranque aparte, para probar el restaurante contra una API que corre en otro proceso o máquina. */
const apiKey = process.env.EMPRESARIAL_API_KEY ?? "clave-de-desarrollo";
const puerto = Number(process.env.SIMULADOR_PORT ?? 4000);

const app = express();
app.use(crearSimuladorEmpresarial({ apiKey }));
app.listen(puerto, () => {
  console.log(`API empresarial simulada en http://localhost:${puerto}`);
});
