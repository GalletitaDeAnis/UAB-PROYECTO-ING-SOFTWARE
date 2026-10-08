import { describe, expect, it } from "vitest";
import { VerListaDelDia } from "../src/aplicacion/verListaDelDia.js";
import type { Almuerzo, Empleado } from "../src/dominio/modelo.js";
import {
  AlmuerzosEnMemoria,
  ana,
  AutorizacionesEnMemoria,
  DirectorioEnMemoria,
  elena,
} from "./fakes.js";

const carlos: Empleado = {
  codigoInstitucional: "UB-101",
  nombreCompleto: "Carlos Mamani",
  activo: true,
};

function esporadico(codigo: string, fecha: string, estado: Almuerzo["estado"]): Almuerzo {
  return { codigoEmpleado: codigo, fecha, origen: "ESPORADICO", precioBs: 18, estado };
}

describe("HU04 lista del día", () => {
  const directorio = new DirectorioEnMemoria([ana, carlos, elena]);
  const autorizaciones = new AutorizacionesEnMemoria({ "UB-200": "ENCARGADO" });

  it("CA1 el encargado ve el total, el nombre y el tipo no pensionado", async () => {
    const almuerzos = new AlmuerzosEnMemoria([
      esporadico(ana.codigoInstitucional, "2026-10-07", "CONFIRMADO"),
      esporadico(carlos.codigoInstitucional, "2026-10-07", "CONFIRMADO"),
    ]);
    const caso = new VerListaDelDia(autorizaciones, almuerzos, directorio);

    const resultado = await caso.ejecutar(elena.codigoInstitucional, "2026-10-07");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toHaveLength(2);
    expect(resultado.valor.every((fila) => fila.tipo === "No pensionado")).toBe(true);
    expect(resultado.valor.map((fila) => fila.nombre).sort()).toEqual(["Ana Rojas", "Carlos Mamani"]);
  });

  it("CA2 quien canceló antes de las 9:00 no suma", async () => {
    const almuerzos = new AlmuerzosEnMemoria([
      esporadico(ana.codigoInstitucional, "2026-10-07", "CONFIRMADO"),
      esporadico(carlos.codigoInstitucional, "2026-10-07", "CANCELADO"),
    ]);
    const caso = new VerListaDelDia(autorizaciones, almuerzos, directorio);

    const resultado = await caso.ejecutar(elena.codigoInstitucional, "2026-10-07");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.map((fila) => fila.nombre)).toEqual(["Ana Rojas"]);
  });

  it("CA3 quien reservó y no canceló aparece, sin marcar asistencia física", async () => {
    const almuerzos = new AlmuerzosEnMemoria([
      esporadico(ana.codigoInstitucional, "2026-10-07", "CONFIRMADO"),
    ]);
    const caso = new VerListaDelDia(autorizaciones, almuerzos, directorio);

    const resultado = await caso.ejecutar(elena.codigoInstitucional, "2026-10-07");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor).toHaveLength(1);
    expect(resultado.valor[0]).not.toHaveProperty("asistio");
  });

  it("un empleado no abre la lista del encargado", async () => {
    const caso = new VerListaDelDia(autorizaciones, new AlmuerzosEnMemoria(), directorio);

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-07");

    expect(resultado.ok).toBe(false);
  });
});
