import { describe, expect, it } from "vitest";
import { diasDeServicio } from "../src/dominio/tiempo.js";
import { comoUsuario, dePension, encargada, escenario, esporadico, pedro, relojEn } from "./fakes.js";

const titular = comoUsuario(pedro);
const juan = "FAM-2002";
const diasOctubre = diasDeServicio(2026, 10, () => false);

/** Los primeros `cantidad` días de servicio de octubre como almuerzos de pensión confirmados. */
function pensionDe(personaId: string, cantidad: number) {
  return diasOctubre.slice(0, cantidad).map((fecha) => dePension(personaId, "UB-103", fecha));
}

describe("HU10 avisar inasistencia de un pensionado", () => {
  it("CA1 Juan con 16 almuerzos avisa hoy a las 8:00: le quedan 15 y nadie más cambia", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-06", 8, 0),
      almuerzos: [...pensionDe(juan, 16), ...pensionDe("UB-103", 16)],
    });

    const resultado = await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-06");

    expect(resultado.ok && resultado.valor.almuerzosRestantes).toBe(15);
    expect(e.almuerzos.de(juan).find((a) => a.fecha === "2026-10-06")?.estado).toBe("INASISTENCIA_AVISADA");
    expect(e.almuerzos.de("UB-103").every((a) => a.estado === "CONFIRMADO")).toBe(true);
  });

  it("CA2 a Juan le quedan 10 y al titular 14: el mínimo es por persona y se rechaza", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-01", 8, 0),
      almuerzos: [...pensionDe(juan, 10), ...pensionDe("UB-103", 14)],
    });

    const resultado = await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-01");

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("mínimo de 10");
    expect(e.almuerzos.de(juan).every((a) => a.estado === "CONFIRMADO")).toBe(true);
  });

  it("CA2 con 11 todavía se puede avisar una vez (borde)", async () => {
    const e = escenario({ reloj: relojEn("2026-10-01", 8, 0), almuerzos: pensionDe(juan, 11) });

    const resultado = await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-01");

    expect(resultado.ok && resultado.valor.almuerzosRestantes).toBe(10);
  });

  it("los feriados no cuentan para el mínimo", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-01", 8, 0),
      almuerzos: pensionDe(juan, 11),
      feriados: [{ fecha: diasOctubre[5], descripcion: "Feriado" }],
    });

    expect((await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-01")).ok).toBe(false);
  });

  it("CA3 a las 9:00 no se avisa y se cobra", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 9, 0), almuerzos: pensionDe(juan, 16) });

    const resultado = await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-06");

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("se cobra");
  });

  it("CA4 no avisó y no fue: el reporte lo descuenta a 15 Bs al titular", async () => {
    const e = escenario({ almuerzos: pensionDe(juan, 12) });

    const reporte = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);

    expect(reporte.ok && reporte.valor.titulares[0]).toMatchObject({ codigoTitular: "UB-103", totalBs: 180 });
  });

  it("solo se avisa sobre un almuerzo de pensión confirmado", async () => {
    const e = escenario({ almuerzos: [esporadico(juan, "UB-103", "2026-10-07")] });

    expect((await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-07")).ok).toBe(false);
    expect((await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-08")).ok).toBe(false);
  });

  it("un aviso ya hecho no se repite", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 8, 0), almuerzos: pensionDe(juan, 16) });
    await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-06");

    expect((await e.casos.avisarInasistencia.ejecutar(titular, juan, "2026-10-06")).ok).toBe(false);
  });
});
