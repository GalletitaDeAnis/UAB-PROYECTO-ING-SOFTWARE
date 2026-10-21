import { describe, expect, it } from "vitest";
import { SOLO_ENCARGADO } from "../src/aplicacion/comun.js";
import { ana, comoUsuario, dePension, encargada, escenario, esporadico } from "./fakes.js";

describe("HU04 ver almuerzos confirmados del día", () => {
  it("CA1 total y una fila por persona con tipo, titular y modalidad", async () => {
    const e = escenario({
      almuerzos: [
        esporadico("UB-100", "UB-100", "2026-10-07"),
        esporadico("FAM-1001", "UB-100", "2026-10-07"),
        dePension("UB-103", "UB-103", "2026-10-07"),
        dePension("FAM-2003", "UB-103", "2026-10-07"),
        esporadico("UB-101", "UB-101", "2026-10-08"),
      ],
    });

    const resultado = await e.casos.verLista.ejecutar(encargada, "2026-10-07");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.total).toBe(4);
    expect(resultado.valor.filas).toEqual([
      expect.objectContaining({ nombre: "Ana Flores", tipoPersona: "FAMILIAR", nombreTitular: "Pedro Flores", modalidad: "PENSION" }),
      expect.objectContaining({ nombre: "Ana Rojas", tipoPersona: "EMPLEADO", nombreTitular: "Ana Rojas", modalidad: "ESPORADICO" }),
      expect.objectContaining({ nombre: "Diego Rojas", tipoPersona: "FAMILIAR", parentesco: "Hijo", modalidad: "ESPORADICO" }),
      expect.objectContaining({ nombre: "Pedro Flores", tipoPersona: "EMPLEADO", modalidad: "PENSION" }),
    ]);
  });

  it("CA2 lo cancelado y lo avisado no aparece ni se cuenta", async () => {
    const e = escenario({
      almuerzos: [
        esporadico("UB-100", "UB-100", "2026-10-07", "CANCELADO"),
        dePension("UB-103", "UB-103", "2026-10-07", "INASISTENCIA_AVISADA"),
        esporadico("UB-101", "UB-101", "2026-10-07"),
      ],
    });

    const resultado = await e.casos.verLista.ejecutar(encargada, "2026-10-07");

    expect(resultado.ok && resultado.valor.filas.map((f) => f.personaId)).toEqual(["UB-101"]);
  });

  it("CA3 sin reservas: total 0", async () => {
    const e = escenario();

    const resultado = await e.casos.verLista.ejecutar(encargada, "2026-10-07");

    expect(resultado.ok && resultado.valor).toMatchObject({ total: 0, filas: [], esFeriado: false });
  });

  it("un feriado se informa como tal y no cuenta almuerzos", async () => {
    const e = escenario({
      feriados: [{ fecha: "2026-10-07", descripcion: "Prueba" }],
      almuerzos: [dePension("UB-103", "UB-103", "2026-10-07")],
    });

    const resultado = await e.casos.verLista.ejecutar(encargada, "2026-10-07");

    expect(resultado.ok && resultado.valor).toMatchObject({ esFeriado: true, total: 0 });
  });

  it("un empleado no abre la lista", async () => {
    const e = escenario();

    expect(await e.casos.verLista.ejecutar(comoUsuario(ana), "2026-10-07")).toEqual({ ok: false, mensaje: SOLO_ENCARGADO });
  });
});
