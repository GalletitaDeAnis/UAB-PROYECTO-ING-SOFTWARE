import { describe, expect, it } from "vitest";
import { admin, ANA, comoUsuario, DIEGO, escenario, noPensionado, pensionado, relojEn } from "./fakes.js";

const ana = comoUsuario(ANA);

describe("HU05 cancelar reserva", () => {
  it("CA1 antes de las 9:00 la reserva propia se cancela y no entra al reporte", async () => {
    const e = escenario({ reservas: [noPensionado(ANA, ANA, "2026-10-06")] });

    const resultado = await e.casos.cancelar.ejecutar(ana, ANA, "2026-10-06");
    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);

    expect(resultado.ok).toBe(true);
    expect(e.reservas.de(ANA)).toEqual([noPensionado(ANA, ANA, "2026-10-06", "CANCELADA")]);
    const deAna = reporte.ok ? reporte.valor.titulares.find((t) => t.titularId === ANA) : undefined;
    expect(deAna?.totalBs).toBe(0);
  });

  it("CA2 cancelar la del familiar deja la del titular", async () => {
    const e = escenario({ reservas: [noPensionado(ANA, ANA, "2026-10-06"), noPensionado(DIEGO, ANA, "2026-10-06")] });

    await e.casos.cancelar.ejecutar(ana, DIEGO, "2026-10-06");

    expect(e.reservas.guardadas).toEqual([
      noPensionado(ANA, ANA, "2026-10-06"),
      noPensionado(DIEGO, ANA, "2026-10-06", "CANCELADA"),
    ]);
  });

  it("CA3 a las 9:00 no se cancela e informa que se cobrará (borde)", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 9, 0), reservas: [noPensionado(ANA, ANA, "2026-10-06")] });

    const resultado = await e.casos.cancelar.ejecutar(ana, ANA, "2026-10-06");

    expect(resultado).toEqual({ ok: false, mensaje: "Ya son las 9:00. La reserva no se puede cancelar y el almuerzo se cobrará." });
    expect(e.reservas.de(ANA)[0].estado).toBe("CONFIRMADA");
  });

  it("CA3 a las 8:59 todavía se cancela; una reserva de mañana se cancela por la tarde (borde)", async () => {
    const a = escenario({ reloj: relojEn("2026-10-06", 8, 59), reservas: [noPensionado(ANA, ANA, "2026-10-06")] });
    const b = escenario({ reloj: relojEn("2026-10-06", 18, 0), reservas: [noPensionado(ANA, ANA, "2026-10-07")] });

    expect((await a.casos.cancelar.ejecutar(ana, ANA, "2026-10-06")).ok).toBe(true);
    expect((await b.casos.cancelar.ejecutar(ana, ANA, "2026-10-07")).ok).toBe(true);
  });

  it("CA4 sin cancelar y sin asistir, el reporte descuenta 18 Bs al titular", async () => {
    const e = escenario({ reloj: relojEn("2026-10-30", 18, 0), reservas: [noPensionado(DIEGO, ANA, "2026-10-06")] });

    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);

    const deAna = reporte.ok ? reporte.valor.titulares.find((t) => t.titularId === ANA) : undefined;
    expect(deAna?.lineas).toEqual([
      expect.objectContaining({ nombreCompleto: "Diego Rojas", modalidad: "NO_PENSIONADO", cantidad: 1, subtotalBs: 18 }),
    ]);
  });

  it("no hay nada que cancelar, ya cancelada, persona ajena o almuerzo de pensión", async () => {
    const e = escenario({
      reservas: [noPensionado(ANA, ANA, "2026-10-07", "CANCELADA"), pensionado(DIEGO, ANA, "2026-10-06")],
    });

    expect((await e.casos.cancelar.ejecutar(ana, ANA, "2026-10-06")).ok).toBe(false);
    expect((await e.casos.cancelar.ejecutar(ana, ANA, "2026-10-07")).ok).toBe(false);
    expect((await e.casos.cancelar.ejecutar(ana, "P-PEDRO", "2026-10-06")).ok).toBe(false);
    expect(await e.casos.cancelar.ejecutar(ana, DIEGO, "2026-10-06")).toEqual({
      ok: false,
      mensaje: "Es un almuerzo de pensión: en lugar de cancelar, avisa la inasistencia.",
    });
    expect((await e.casos.cancelar.ejecutar(admin, ANA, "2026-10-07")).ok).toBe(false);
  });
});
