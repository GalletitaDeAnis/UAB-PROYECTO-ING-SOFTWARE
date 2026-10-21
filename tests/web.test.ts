import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearRutasWeb } from "../src/presentacion/web.js";
import { dePension, escenario, relojEn } from "./fakes.js";

/** Pantallas servidas por el backend y descarga del reporte, con dobles en memoria. */
describe("pantallas web y descarga del reporte", () => {
  const e = escenario({
    reloj: relojEn("2026-10-06", 8, 0),
    almuerzos: Array.from({ length: 12 }, (_, i) => dePension("FAM-2002", "UB-103", ["2026-10-06", "2026-10-07", "2026-10-08", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-26"][i])),
  });
  let base = "";
  let cerrar: () => void = () => {};

  beforeAll(async () => {
    const app = express();
    app.use(crearRutasWeb(e.casos, { estilos: "body{}", cookieSegura: false, simulado: true }));
    await new Promise<void>((listo) => {
      const servidor = app.listen(0, () => {
        base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
        cerrar = () => servidor.close();
        listo();
      });
    });
  });

  afterAll(() => cerrar());

  const pedir = (ruta: string, init: RequestInit = {}) => fetch(`${base}${ruta}`, { redirect: "manual", ...init });
  const formulario = (datos: Record<string, string>, cookie?: string): RequestInit => ({
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams(datos).toString(),
  });

  async function ingresar(usuario: string): Promise<string> {
    const r = await pedir("/ingresar", formulario({ usuario, contrasena: "demo123" }));
    return (r.headers.get("set-cookie") ?? "").split(";")[0];
  }

  it("la pantalla de ingreso pide usuario y contraseña y lista los usuarios del simulador", async () => {
    const html = await (await pedir("/")).text();

    expect(html).toContain('name="contrasena"');
    expect(html).toContain("pflores");
    expect(await (await pedir("/estilos.css")).text()).toBe("body{}");
  });

  it("credenciales incorrectas vuelven al ingreso con el mensaje", async () => {
    const r = await pedir("/ingresar", formulario({ usuario: "pflores", contrasena: "x" }));

    expect(r.status).toBe(302);
    expect(decodeURIComponent(r.headers.get("location") ?? "")).toContain("Usuario o contraseña incorrectos");
  });

  it("sin sesión, /inicio vuelve al ingreso y la API de reportes responde 401", async () => {
    expect((await pedir("/inicio")).headers.get("location")).toMatch(/^\/\?error=/);
    expect((await pedir("/api/reportes/2026/10.xlsx")).status).toBe(401);
  });

  it("el empleado entra, ve a su familia, reserva para un familiar, cancela y avisa inasistencia", async () => {
    const cookie = await ingresar("pflores");
    expect(cookie).toMatch(/^sesion=/);
    expect((await pedir("/", { headers: { cookie } })).headers.get("location")).toBe("/inicio");

    const inicio = await (await pedir("/inicio", { headers: { cookie } })).text();
    expect(inicio).toContain("Pedro Flores");
    expect(inicio).toContain("hasta 5 almuerzos");
    expect(inicio).toContain("Juan Flores (Hijo)");

    const reserva = await pedir("/reservar", formulario({ personaId: "FAM-2001", fecha: "2026-10-06" }, cookie));
    expect(decodeURIComponent(reserva.headers.get("location") ?? "")).toContain("Reserva confirmada");
    const repetida = await pedir("/reservar", formulario({ personaId: "FAM-2001", fecha: "2026-10-06" }, cookie));
    expect(repetida.headers.get("location")).toContain("error=");

    const cancelar = await pedir("/cancelar", formulario({ personaId: "FAM-2001", fecha: "2026-10-06" }, cookie));
    expect(decodeURIComponent(cancelar.headers.get("location") ?? "")).toContain("cancelada");

    const avisar = await pedir("/avisar", formulario({ personaId: "FAM-2002", fecha: "2026-10-06" }, cookie));
    expect(decodeURIComponent(avisar.headers.get("location") ?? "")).toContain("Inasistencia avisada");

    const conMensaje = await (await pedir("/inicio?mensaje=Hola", { headers: { cookie } })).text();
    expect(conMensaje).toContain("Hola");
    expect(conMensaje).toContain("INASISTENCIA_AVISADA");
  });

  it("un empleado no abre la lista del día ni descarga el reporte", async () => {
    const cookie = await ingresar("arojas");

    expect(decodeURIComponent((await pedir("/dia", { headers: { cookie } })).headers.get("location") ?? "")).toContain(
      "solo para el encargado",
    );
    expect((await pedir("/api/reportes/2026/10.pdf", { headers: { cookie } })).status).toBe(403);
  });

  it("la encargada ve la lista del día y descarga el reporte en Excel y PDF", async () => {
    const cookie = await ingresar("evargas");

    const inicio = await (await pedir("/inicio", { headers: { cookie } })).text();
    expect(inicio).toContain("/api/reportes/2026/10.xlsx");

    const lista = await (await pedir("/dia?fecha=2026-10-07", { headers: { cookie } })).text();
    expect(lista).toContain("Juan Flores");
    expect(lista).toContain("Pedro Flores");

    const excel = await pedir("/api/reportes/2026/10.xlsx", { headers: { cookie } });
    expect(excel.status).toBe(200);
    expect(excel.headers.get("content-disposition")).toContain("descuento-almuerzos-2026-10.xlsx");
    const pdf = await pedir("/api/reportes/2026/10.pdf", { headers: { authorization: `Bearer ${decodeURIComponent(cookie.split("=")[1])}` } });
    expect(pdf.status).toBe(200);

    expect((await pedir("/api/reportes/2026/10.csv", { headers: { cookie } })).status).toBe(404);
    expect((await pedir("/api/reportes/2026/13.pdf", { headers: { cookie } })).status).toBe(400);
  });

  it("un feriado o un día vacío se informan en la lista", async () => {
    const cookie = await ingresar("evargas");
    await e.casos.registrarFeriado.ejecutar({ codigoInstitucional: "UB-200", rol: "ENCARGADO" }, "2026-10-29", "Prueba");

    expect(await (await pedir("/dia?fecha=2026-10-29", { headers: { cookie } })).text()).toContain("feriado");
    expect(await (await pedir("/dia?fecha=2026-10-27", { headers: { cookie } })).text()).toContain("No hay almuerzos");
  });

  it("salir cierra la sesión", async () => {
    const cookie = await ingresar("arojas");

    const r = await pedir("/salir", { method: "POST", headers: { cookie } });

    expect(r.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await pedir("/inicio", { headers: { cookie } })).headers.get("location")).toMatch(/^\/\?error=/);
  });
});
