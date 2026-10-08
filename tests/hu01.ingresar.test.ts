import { describe, expect, it } from "vitest";
import { Ingresar } from "../src/aplicacion/ingresar.js";
import { AlmuerzosEnMemoria, ana, AutorizacionesEnMemoria, DirectorioEnMemoria, elena, inactiva } from "./fakes.js";

describe("HU01 ingresar", () => {
  it("CA1 un empleado activo entra y ve su nombre y sus almuerzos", async () => {
    const almuerzos = new AlmuerzosEnMemoria([
      {
        codigoEmpleado: ana.codigoInstitucional,
        fecha: "2026-10-08",
        origen: "ESPORADICO",
        precioBs: 18,
        estado: "CONFIRMADO",
      },
    ]);
    const ingresar = new Ingresar(
      new DirectorioEnMemoria([ana]),
      new AutorizacionesEnMemoria(),
      almuerzos,
    );

    const resultado = await ingresar.ejecutar("UB-100");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.empleado.nombreCompleto).toBe("Ana Rojas");
    expect(resultado.valor.rol).toBe("EMPLEADO");
    expect(resultado.valor.almuerzos).toHaveLength(1);
  });

  it("CA2 quien no está en la base o está inactivo no ingresa", async () => {
    const ingresar = new Ingresar(
      new DirectorioEnMemoria([inactiva]),
      new AutorizacionesEnMemoria(),
      new AlmuerzosEnMemoria(),
    );

    const desconocido = await ingresar.ejecutar("UB-999");
    const dadoDeBaja = await ingresar.ejecutar("UB-102");

    expect(desconocido.ok).toBe(false);
    expect(dadoDeBaja.ok).toBe(false);
  });

  it("CA3 si no reservó, no tiene almuerzos a su nombre", async () => {
    const ingresar = new Ingresar(
      new DirectorioEnMemoria([ana]),
      new AutorizacionesEnMemoria(),
      new AlmuerzosEnMemoria(),
    );

    const resultado = await ingresar.ejecutar("UB-100");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.almuerzos).toEqual([]);
  });

  it("el encargado usa el mismo ingreso y recibe su rol local", async () => {
    const ingresar = new Ingresar(
      new DirectorioEnMemoria([elena]),
      new AutorizacionesEnMemoria({ "UB-200": "ENCARGADO" }),
      new AlmuerzosEnMemoria(),
    );

    const resultado = await ingresar.ejecutar("UB-200");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.rol).toBe("ENCARGADO");
  });
});
