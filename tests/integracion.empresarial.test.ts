import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { crearSimuladorEmpresarial } from "../simulador-empresarial/app.js";
import { SistemaEmpresarialNoDisponible } from "../src/dominio/puertos.js";
import { SistemaEmpresarialHttp } from "../src/infraestructura/sistemaEmpresarialHttp.js";

/** El adaptador HTTP real contra el simulador por la red local: misma forma que la API de TI. */
describe("cliente HTTP de la API empresarial", () => {
  let url = "";
  let cerrar: () => void = () => {};

  beforeAll(async () => {
    const app = express();
    app.use(crearSimuladorEmpresarial({ apiKey: "clave", demoraLentoMs: 400 }));
    app.get("/roto/empleados/:codigo", (_req, res) => {
      res.status(500).send("error");
    });
    await new Promise<void>((listo) => {
      const servidor = app.listen(0, () => {
        url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
        cerrar = () => servidor.close();
        listo();
      });
    });
  });

  afterAll(() => cerrar());

  const cliente = (opciones: { apiKey?: string; tiempoMaximoMs?: number; base?: string } = {}) =>
    new SistemaEmpresarialHttp({
      urlBase: opciones.base ?? url,
      apiKey: opciones.apiKey ?? "clave",
      tiempoMaximoMs: opciones.tiempoMaximoMs,
    });

  it("autentica, lee al empleado y a sus familiares", async () => {
    const api = cliente();

    expect(await api.autenticar("pflores", "demo123")).toEqual({ valida: true, codigoInstitucional: "UB-103" });
    expect(await api.obtenerEmpleado("UB-103")).toEqual({ codigoInstitucional: "UB-103", nombreCompleto: "Pedro Flores", activo: true });
    expect((await api.obtenerFamiliares("UB-103")).map((f) => f.parentesco)).toEqual(["Cónyuge", "Hijo", "Hija", "Hijo"]);
  });

  it("contraseña incorrecta es inválida, no un error de conexión", async () => {
    expect(await cliente().autenticar("pflores", "mala")).toEqual({ valida: false });
  });

  it("empleado inexistente: null y sin familiares", async () => {
    const api = cliente();

    expect(await api.obtenerEmpleado("UB-999")).toBeNull();
    expect(await api.obtenerFamiliares("UB-999")).toEqual([]);
  });

  it("HU01 CA4: si la API pasa el tiempo máximo, lanza SistemaEmpresarialNoDisponible y lo registra", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(cliente({ tiempoMaximoMs: 100 }).autenticar("lento", "demo123")).rejects.toBeInstanceOf(
      SistemaEmpresarialNoDisponible,
    );
    expect(log.mock.calls[0][0]).toContain("sin respuesta en 100 ms");
    expect(log.mock.calls[0][0]).not.toContain("demo123");
    log.mockRestore();
  });

  it("una API key incorrecta, un 500 o un servidor apagado también cuentan como no disponible", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(cliente({ apiKey: "otra" }).obtenerEmpleado("UB-103")).rejects.toBeInstanceOf(SistemaEmpresarialNoDisponible);
    await expect(cliente({ base: `${url}/roto` }).obtenerEmpleado("UB-103")).rejects.toBeInstanceOf(SistemaEmpresarialNoDisponible);
    await expect(cliente({ base: "http://127.0.0.1:9" }).obtenerEmpleado("UB-103")).rejects.toBeInstanceOf(
      SistemaEmpresarialNoDisponible,
    );
    log.mockRestore();
  });
});
