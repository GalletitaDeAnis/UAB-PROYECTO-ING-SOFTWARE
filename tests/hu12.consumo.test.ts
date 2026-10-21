import { describe, expect, it } from "vitest";
import { diasDeServicio } from "../src/dominio/tiempo.js";
import { ana, carlos, comoUsuario, dePension, escenario, esporadico, pedro } from "./fakes.js";

const dias = diasDeServicio(2026, 10, () => false);
const pension = (personaId: string) => ({
  personaId,
  codigoTitular: "UB-103",
  anio: 2026,
  mes: 10,
  solicitadaEl: "2026-09-20",
});

describe("HU12 ver mi consumo del mes (y el de mi familia)", () => {
  it("CA1 cuatro reservas propias: 4 almuerzos y 72 Bs", async () => {
    const e = escenario({ almuerzos: dias.slice(0, 4).map((fecha) => esporadico("UB-101", "UB-101", fecha)) });

    const resultado = await e.casos.verMiConsumo.ejecutar(comoUsuario(carlos), 2026, 10);

    expect(resultado.ok && resultado.valor.totalBs).toBe(72);
    expect(resultado.ok && resultado.valor.personas[0]).toMatchObject({ cantidad: 4, pensionado: false, inasistenciasDisponibles: null });
  });

  it("CA2 pensionado con 11 almuerzos: puede avisar 1 inasistencia más", async () => {
    const e = escenario({
      almuerzos: dias.slice(0, 11).map((fecha) => dePension("UB-103", "UB-103", fecha)),
      pensiones: [pension("UB-103")],
    });

    const resultado = await e.casos.verMiConsumo.ejecutar(comoUsuario(pedro), 2026, 10);

    const propio = resultado.ok ? resultado.valor.personas.find((p) => p.persona.id === "UB-103") : undefined;
    expect(propio).toMatchObject({ cantidad: 11, pensionado: true, inasistenciasDisponibles: 1 });
  });

  it("CA3 hijo pensionado con 12 y titular con 2 esporádicos: 216 Bs y el hijo aún puede avisar 2", async () => {
    const e = escenario({
      almuerzos: [
        ...dias.slice(0, 12).map((fecha) => dePension("FAM-2002", "UB-103", fecha)),
        ...dias.slice(0, 2).map((fecha) => esporadico("UB-103", "UB-103", fecha)),
      ],
      pensiones: [pension("FAM-2002")],
    });

    const resultado = await e.casos.verMiConsumo.ejecutar(comoUsuario(pedro), 2026, 10);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.totalBs).toBe(216);
    const juan = resultado.valor.personas.find((p) => p.persona.id === "FAM-2002");
    expect(juan).toMatchObject({ subtotalBs: 180, inasistenciasDisponibles: 2 });
    const titular = resultado.valor.personas.find((p) => p.persona.id === "UB-103");
    expect(titular).toMatchObject({ subtotalBs: 36, pensionado: false });
  });

  it("sin almuerzos: cada persona en 0 y total 0", async () => {
    const e = escenario();

    const resultado = await e.casos.verMiConsumo.ejecutar(comoUsuario(ana), 2026, 10);

    expect(resultado.ok && resultado.valor.totalBs).toBe(0);
    expect(resultado.ok && resultado.valor.personas.map((p) => [p.persona.nombreCompleto, p.cantidad])).toEqual([
      ["Ana Rojas", 0],
      ["Diego Rojas", 0],
    ]);
  });

  it("solo ve lo suyo y rechaza un mes inválido", async () => {
    const e = escenario({ almuerzos: [esporadico("UB-103", "UB-103", dias[0])] });

    const resultado = await e.casos.verMiConsumo.ejecutar(comoUsuario(ana), 2026, 10);

    expect(resultado.ok && resultado.valor.totalBs).toBe(0);
    expect((await e.casos.verMiConsumo.ejecutar(comoUsuario(ana), 2026, 0)).ok).toBe(false);
  });
});
