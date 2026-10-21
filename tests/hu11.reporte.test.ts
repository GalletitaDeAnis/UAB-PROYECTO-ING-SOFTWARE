import { describe, expect, it } from "vitest";
import { SOLO_ENCARGADO } from "../src/aplicacion/comun.js";
import { diasDeServicio } from "../src/dominio/tiempo.js";
import { ana, comoUsuario, dePension, encargada, escenario, esporadico } from "./fakes.js";

const dias = diasDeServicio(2026, 10, () => false);
const maria = "FAM-2001";
const juan = "FAM-2002";

/** Pedro pensionado con 12, su esposa con 10 y su hijo con 3 esporádicos (HU11 CA1). */
function octubreDePedro() {
  return [
    ...dias.slice(0, 12).map((fecha) => dePension("UB-103", "UB-103", fecha)),
    ...dias.slice(0, 10).map((fecha) => dePension(maria, "UB-103", fecha)),
    ...dias.slice(0, 3).map((fecha) => esporadico(juan, "UB-103", fecha)),
  ];
}

describe("HU11 reporte mensual por titular", () => {
  it("CA1 Pedro: 12 × 15 + 10 × 15 + 3 × 18 = 384 Bs, en tres líneas", async () => {
    const e = escenario({ almuerzos: octubreDePedro() });

    const resultado = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const [pedro] = resultado.valor.titulares;
    expect(pedro.nombreTitular).toBe("Pedro Flores");
    expect(pedro.lineas.map((l) => [l.nombreCompleto, l.modalidad, l.cantidad, l.precioUnitarioBs, l.subtotalBs])).toEqual([
      ["Pedro Flores", "PENSION", 12, 15, 180],
      ["Juan Flores", "ESPORADICO", 3, 18, 54],
      ["María Flores", "PENSION", 10, 15, 150],
    ]);
    expect(pedro.totalBs).toBe(384);
    expect(resultado.valor.totalBs).toBe(384);
  });

  it("CA2 un pensionado que faltó sin avisar está incluido; el que avisó, no", async () => {
    const e = escenario({
      almuerzos: [
        dePension(maria, "UB-103", dias[0]),
        dePension(maria, "UB-103", dias[1], "INASISTENCIA_AVISADA"),
        esporadico("UB-100", "UB-100", dias[0], "CANCELADO"),
      ],
    });

    const resultado = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);

    expect(resultado.ok && resultado.valor.titulares).toEqual([
      expect.objectContaining({ codigoTitular: "UB-103", totalBs: 15 }),
    ]);
  });

  it("CA3 exportar en Excel o PDF entrega el mismo cálculo al exportador elegido", async () => {
    const e = escenario({ almuerzos: octubreDePedro() });

    const excel = await e.casos.exportarReporte.ejecutar(encargada, 2026, 10, "EXCEL");
    const pdf = await e.casos.exportarReporte.ejecutar(encargada, 2026, 10, "PDF");

    expect(excel.ok && excel.valor.nombreArchivo).toBe("descuento-almuerzos-2026-10.xlsx");
    expect(pdf.ok && pdf.valor.nombreArchivo).toBe("descuento-almuerzos-2026-10.pdf");
    const enPantalla = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);
    expect(e.excel.recibido).toEqual(enPantalla.ok && enPantalla.valor.titulares);
    expect(e.pdf.recibido).toEqual(e.excel.recibido);
  });

  it("CA4 un feriado del mes no aparece como almuerzo de nadie", async () => {
    const e = escenario({
      almuerzos: [dePension(maria, "UB-103", "2026-10-07"), dePension(maria, "UB-103", "2026-10-08")],
      feriados: [{ fecha: "2026-10-08", descripcion: "Feriado" }],
    });

    const resultado = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);

    expect(resultado.ok && resultado.valor.titulares[0].lineas[0].cantidad).toBe(1);
  });

  it("CA5 un empleado sin consumo no aparece", async () => {
    const e = escenario({ almuerzos: octubreDePedro() });

    const resultado = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);

    expect(resultado.ok && resultado.valor.titulares.map((t) => t.codigoTitular)).toEqual(["UB-103"]);
  });

  it("solo los almuerzos del mes pedido entran", async () => {
    const e = escenario({ almuerzos: [esporadico("UB-100", "UB-100", "2026-11-03"), esporadico("UB-100", "UB-100", "2026-10-29")] });

    const resultado = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);

    expect(resultado.ok && resultado.valor.totalBs).toBe(18);
  });

  it("solo el encargado genera o exporta, y el formato tiene que existir", async () => {
    const e = escenario();

    expect(await e.casos.generarReporte.ejecutar(comoUsuario(ana), 2026, 10)).toEqual({ ok: false, mensaje: SOLO_ENCARGADO });
    expect((await e.casos.exportarReporte.ejecutar(comoUsuario(ana), 2026, 10, "PDF")).ok).toBe(false);
    expect((await e.casos.exportarReporte.ejecutar(encargada, 2026, 10, "CSV" as "PDF")).ok).toBe(false);
    expect((await e.casos.generarReporte.ejecutar(encargada, 2026, 13)).ok).toBe(false);
  });
});
