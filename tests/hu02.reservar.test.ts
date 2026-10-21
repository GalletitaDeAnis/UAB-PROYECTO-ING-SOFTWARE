import { describe, expect, it } from "vitest";
import { ana, comoUsuario, dePension, escenario, esporadico, relojEn } from "./fakes.js";

const yo = comoUsuario(ana);

describe("HU02 reservar mi almuerzo (uso esporádico)", () => {
  it("CA1 el martes a las 8:30 queda confirmado a su nombre a 18 Bs", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 8, 30) });

    const resultado = await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-06");

    expect(resultado.ok).toBe(true);
    expect(e.almuerzos.guardados).toEqual([esporadico("UB-100", "UB-100", "2026-10-06")]);
  });

  it("CA1 aparece en mis reservas", async () => {
    const e = escenario();
    await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-06");

    const mias = await e.casos.verMisAlmuerzos.ejecutar(yo, 2026, 10);

    expect(mias.ok && mias.valor.map((a) => [a.fecha, a.nombrePersona, a.precioBs])).toEqual([
      ["2026-10-06", "Ana Rojas", 18],
    ]);
  });

  it("CA2 a las 9:00 en punto ya no se reserva para hoy (borde)", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 9, 0) });

    const resultado = await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-06");

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.mensaje).toContain("9:00");
    expect(e.almuerzos.guardados).toHaveLength(0);
  });

  it("CA2 a las 8:59 todavía se reserva (borde)", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 8, 59) });

    expect((await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-06")).ok).toBe(true);
  });

  it("CA2 después de las 9:00 se puede reservar para un día siguiente", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 15, 0) });

    expect((await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-07")).ok).toBe(true);
  });

  it("CA3 viernes, sábado y domingo se rechazan", async () => {
    const e = escenario({ reloj: relojEn("2026-10-07", 8, 0) });

    for (const fecha of ["2026-10-09", "2026-10-10", "2026-10-11"]) {
      const resultado = await e.casos.reservar.ejecutar(yo, "UB-100", fecha);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) expect(resultado.mensaje).toContain("lunes a jueves");
    }
    expect(e.almuerzos.guardados).toHaveLength(0);
  });

  it("CA4 una segunda reserva para el mismo día no se duplica", async () => {
    const e = escenario({ almuerzos: [esporadico("UB-100", "UB-100", "2026-10-06")] });

    const resultado = await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-06");

    expect(resultado.ok).toBe(false);
    expect(e.almuerzos.guardados).toHaveLength(1);
  });

  it("CA4 después de cancelar se puede volver a reservar el mismo día", async () => {
    const e = escenario({ almuerzos: [esporadico("UB-100", "UB-100", "2026-10-06", "CANCELADO")] });

    const resultado = await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-06");

    expect(resultado.ok).toBe(true);
    expect(e.almuerzos.de("UB-100")).toEqual([esporadico("UB-100", "UB-100", "2026-10-06")]);
  });

  it("un feriado, un día pasado o una fecha inválida no se reservan", async () => {
    const e = escenario({ feriados: [{ fecha: "2026-10-07", descripcion: "Prueba" }] });

    for (const fecha of ["2026-10-07", "2026-10-05", "2026-02-30", "mañana"]) {
      expect((await e.casos.reservar.ejecutar(yo, "UB-100", fecha)).ok).toBe(false);
    }
    expect(e.almuerzos.guardados).toHaveLength(0);
  });

  it("HU08 CA6 un pensionado no agrega una reserva esporádica en su mes", async () => {
    const e = escenario({
      almuerzos: [dePension("UB-100", "UB-100", "2026-10-06")],
      pensiones: [{ personaId: "UB-100", codigoTitular: "UB-100", anio: 2026, mes: 10, solicitadaEl: "2026-09-20" }],
    });

    const resultado = await e.casos.reservar.ejecutar(yo, "UB-100", "2026-10-07");

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("pensionado");
  });

  it("no se puede reservar a nombre de alguien que no está a cargo", async () => {
    const e = escenario();

    const resultado = await e.casos.reservar.ejecutar(yo, "UB-101", "2026-10-06");

    expect(resultado.ok).toBe(false);
    expect(e.almuerzos.guardados).toHaveLength(0);
  });
});
