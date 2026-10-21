import { describe, expect, it } from "vitest";
import { ana, comoUsuario, dePension, encargada, escenario, esporadico, relojEn } from "./fakes.js";

const yo = comoUsuario(ana);

describe("HU03 cancelar mi reserva (uso esporádico)", () => {
  it("CA1 a las 8:59 se cancela y no entra al reporte", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-06", 8, 59),
      almuerzos: [esporadico("UB-100", "UB-100", "2026-10-06")],
    });

    const resultado = await e.casos.cancelar.ejecutar(yo, "UB-100", "2026-10-06");

    expect(resultado.ok).toBe(true);
    expect(e.almuerzos.de("UB-100")[0].estado).toBe("CANCELADO");
    const reporte = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);
    expect(reporte.ok && reporte.valor.titulares).toEqual([]);
  });

  it("CA2 a las 9:00 ya no se cancela y se avisa que se cobra", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-06", 9, 0),
      almuerzos: [esporadico("UB-100", "UB-100", "2026-10-06")],
    });

    const resultado = await e.casos.cancelar.ejecutar(yo, "UB-100", "2026-10-06");

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("se cobra");
    expect(e.almuerzos.de("UB-100")[0].estado).toBe("CONFIRMADO");
  });

  it("CA3 reservó, no canceló y no fue: el reporte lo descuenta a 18 Bs", async () => {
    const e = escenario({ almuerzos: [esporadico("UB-100", "UB-100", "2026-10-06")] });

    const reporte = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);

    expect(reporte.ok && reporte.valor.titulares[0]).toMatchObject({ codigoTitular: "UB-100", totalBs: 18 });
  });

  it("no hay nada que cancelar si no reservó o si el almuerzo es de pensión", async () => {
    const e = escenario({ almuerzos: [dePension("UB-100", "UB-100", "2026-10-07")] });

    expect((await e.casos.cancelar.ejecutar(yo, "UB-100", "2026-10-06")).ok).toBe(false);
    expect((await e.casos.cancelar.ejecutar(yo, "UB-100", "2026-10-07")).ok).toBe(false);
  });
});
