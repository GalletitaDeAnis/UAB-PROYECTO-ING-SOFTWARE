import { describe, expect, it } from "vitest";
import type { Reserva } from "../src/dominio/modelo.js";
import {
  admin,
  ANA,
  CARLOS,
  comoUsuario,
  DIEGO,
  escenario,
  JUAN,
  LAURA,
  MARIA,
  menusDeOctubre,
  noPensionado,
  PEDRO,
  pensionado,
} from "./fakes.js";

const dias = menusDeOctubre().flatMap((m) => m.dias.map((d) => d.fecha));

/** HU10 CA1: 12 pensionados propios, 10 de la cónyuge y 3 no pensionados del hijo. */
function mesDePedro(): Reserva[] {
  return [
    ...dias.slice(0, 12).map((fecha) => pensionado(PEDRO, PEDRO, fecha)),
    ...dias.slice(12).map((fecha) => pensionado(PEDRO, PEDRO, fecha, "INASISTENCIA_AVISADA")),
    ...dias.slice(0, 10).map((fecha) => pensionado(MARIA, PEDRO, fecha)),
    ...dias.slice(0, 3).map((fecha) => noPensionado(JUAN, PEDRO, fecha)),
    noPensionado(JUAN, PEDRO, dias[3], "CANCELADA"),
  ];
}

describe("HU10 generar reporte mensual", () => {
  it("CA1 detalle 12 × 15, 10 × 15 y 3 × 18, total 384 Bs", async () => {
    const e = escenario({ menus: menusDeOctubre(), reservas: mesDePedro() });

    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);

    expect(reporte.ok).toBe(true);
    if (!reporte.ok) return;
    const pedro = reporte.valor.titulares.find((t) => t.titularId === PEDRO)!;
    expect(pedro.lineas.map((l) => [l.nombreCompleto, l.modalidad, l.cantidad, l.precioUnitarioBs, l.subtotalBs])).toEqual([
      ["Pedro Flores", "PENSIONADO", 12, 15, 180],
      ["Juan Flores", "NO_PENSIONADO", 3, 18, 54],
      ["María Flores", "PENSIONADO", 10, 15, 150],
    ]);
    expect([pedro.codigoEmpleado, pedro.totalBs]).toEqual(["UB-103", 384]);
    expect(reporte.valor.totalBs).toBe(384);
  });

  it("CA2 un pensionado que no avisó y no asistió aparece incluido", async () => {
    const e = escenario({ reservas: [pensionado(MARIA, PEDRO, "2026-10-06")] });

    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);

    const pedro = reporte.ok ? reporte.valor.titulares.find((t) => t.titularId === PEDRO) : undefined;
    expect(pedro?.totalBs).toBe(15);
  });

  it("CA3 Excel y PDF reciben lo mismo que se ve en pantalla, con nombre de archivo por mes", async () => {
    const e = escenario({ menus: menusDeOctubre(), reservas: mesDePedro() });

    const pantalla = await e.casos.generarReporte.ejecutar(admin, 2026, 10);
    const excel = await e.casos.exportarReporte.ejecutar(admin, 2026, 10, "EXCEL");
    const pdf = await e.casos.exportarReporte.ejecutar(admin, 2026, 10, "PDF");

    expect(excel.ok && excel.valor.nombreArchivo).toBe("descuento-almuerzos-2026-10.xlsx");
    expect(pdf.ok && pdf.valor.nombreArchivo).toBe("descuento-almuerzos-2026-10.pdf");
    expect(e.excel.recibido).toEqual(pantalla.ok && pantalla.valor.titulares);
    expect(e.pdf.recibido).toEqual(e.excel.recibido);
  });

  it("CA4 los días sin menú no aparecen como almuerzo ni como falta", async () => {
    const e = escenario({ reservas: [noPensionado(ANA, ANA, "2026-10-06")] });

    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);

    const ana = reporte.ok ? reporte.valor.titulares.find((t) => t.titularId === ANA) : undefined;
    expect(ana?.lineas).toEqual([expect.objectContaining({ cantidad: 1, subtotalBs: 18 })]);
  });

  it("CA5 cada usuario empleado activo figura aunque no haya consumido; el administrador y los de baja sin consumo no", async () => {
    const e = escenario({ reservas: [noPensionado(ANA, ANA, "2026-10-06")] });

    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);

    expect(reporte.ok && reporte.valor.titulares.map((t) => [t.nombreTitular, t.codigoEmpleado, t.totalBs])).toEqual([
      ["Ana Rojas", "UB-100", 18],
      ["Carlos Mamani", "UB-101", 0],
      ["Pedro Flores", "UB-103", 0],
    ]);
  });

  it("HU09 CA2 un titular dado de baja con consumo en el mes sigue en el reporte", async () => {
    const e = escenario({ reservas: [noPensionado(LAURA, LAURA, "2026-10-01"), noPensionado(DIEGO, ANA, "2026-10-01")] });

    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);

    const laura = reporte.ok ? reporte.valor.titulares.find((t) => t.titularId === LAURA) : undefined;
    expect([laura?.codigoEmpleado, laura?.totalBs]).toEqual(["UB-102", 18]);
  });

  it("solo el administrador; mes inválido o formato desconocido se rechazan", async () => {
    const e = escenario();

    expect((await e.casos.generarReporte.ejecutar(comoUsuario(CARLOS), 2026, 10)).ok).toBe(false);
    expect((await e.casos.exportarReporte.ejecutar(comoUsuario(CARLOS), 2026, 10, "PDF")).ok).toBe(false);
    expect((await e.casos.generarReporte.ejecutar(admin, 2026, 0)).ok).toBe(false);
    expect((await e.casos.exportarReporte.ejecutar(admin, 2026, 10, "CSV" as "PDF")).ok).toBe(false);
  });
});
