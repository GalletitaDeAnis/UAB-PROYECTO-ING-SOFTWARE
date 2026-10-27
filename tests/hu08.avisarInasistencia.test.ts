import { describe, expect, it } from "vitest";
import type { Reserva } from "../src/dominio/modelo.js";
import { comoUsuario, escenario, MARIA, menu, menusDeOctubre, noPensionado, pension, PEDRO, pensionado, relojEn } from "./fakes.js";

const pedro = comoUsuario(PEDRO);
const diasDeOctubre = menusDeOctubre().flatMap((m) => m.dias.map((d) => d.fecha));

/** Los 16 días con menú de octubre confirmados, menos los que ya se avisaron. */
function mesDe(personaId: string, avisados: number): Reserva[] {
  return diasDeOctubre.map((fecha, i) =>
    pensionado(personaId, PEDRO, fecha, i >= diasDeOctubre.length - avisados ? "INASISTENCIA_AVISADA" : "CONFIRMADA"),
  );
}

function conOctubre(reservas: Reserva[], reloj = relojEn("2026-10-06", 8, 0)) {
  return escenario({
    reloj,
    menus: menusDeOctubre(),
    reservas,
    pensiones: [pension(PEDRO, PEDRO), pension(MARIA, PEDRO)],
  });
}

describe("HU08 avisar inasistencia de un pensionado", () => {
  it("CA1 con más almuerzos que el mínimo, el aviso libera ese día y no toca a los demás", async () => {
    const e = conOctubre([...mesDe(PEDRO, 0), ...mesDe(MARIA, 0)]);

    const resultado = await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-06");

    expect(resultado.ok && [resultado.valor.programadosRestantes, resultado.valor.minimo]).toEqual([15, 10]);
    expect(e.reservas.de(MARIA).find((r) => r.fecha === "2026-10-06")?.estado).toBe("INASISTENCIA_AVISADA");
    expect(e.reservas.de(PEDRO).every((r) => r.estado === "CONFIRMADA")).toBe(true);
  });

  it("CA2 al familiar con exactamente 10 no se le acepta otro aviso aunque al titular le sobren", async () => {
    const e = conOctubre([...mesDe(PEDRO, 0), ...mesDe(MARIA, 6)]);

    const familiar = await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-06");
    const titular = await e.casos.avisarInasistencia.ejecutar(pedro, PEDRO, "2026-10-06");

    expect(familiar).toEqual({
      ok: false,
      mensaje: "María Flores tiene 10 almuerzos programados en el mes y su mínimo es 10. Con otro aviso quedaría por debajo.",
    });
    expect(titular.ok).toBe(true);
  });

  it("CA2 con 11 programados se acepta un aviso más y quedan 10 (borde)", async () => {
    const e = conOctubre(mesDe(MARIA, 5));

    const resultado = await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-06");

    expect(resultado.ok && resultado.valor.programadosRestantes).toBe(10);
  });

  it("CA3 a las 9:00 no se avisa e informa que se cobrará (borde)", async () => {
    const e = conOctubre(mesDe(MARIA, 0), relojEn("2026-10-06", 9, 0));

    expect(await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-06")).toEqual({
      ok: false,
      mensaje: "Ya son las 9:00. No se puede avisar y el almuerzo se cobrará.",
    });
  });

  it("CA4 sin aviso y sin asistir, el reporte cuenta el almuerzo a 15 Bs", async () => {
    const e = conOctubre(mesDe(MARIA, 1));

    const consumo = await e.casos.verMiConsumo.ejecutar(pedro, 2026, 10);

    const maria = consumo.ok ? consumo.valor.personas.find((p) => p.persona.id === MARIA) : undefined;
    expect([maria?.cantidad, maria?.subtotalBs]).toEqual([15, 225]);
  });

  it("CA5 un día sin menú no es inasistencia ni gasta avisos", async () => {
    const e = conOctubre(mesDe(MARIA, 0));

    const resultado = await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-09");

    expect(resultado).toEqual({ ok: false, mensaje: "Esa persona no tiene un almuerzo de pensión confirmado ese día." });
  });

  it("CA6 un mes con 8 días de menú tiene mínimo 8: ningún aviso posible", async () => {
    const dosSemanas = [menu("2026-10-05"), menu("2026-10-12")];
    const ocho = dosSemanas.flatMap((m) => m.dias.map((d) => pensionado(MARIA, PEDRO, d.fecha)));
    const e = escenario({ reloj: relojEn("2026-10-06", 8, 0), menus: dosSemanas, reservas: ocho, pensiones: [pension(MARIA, PEDRO)] });

    const resultado = await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-07");

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("su mínimo es 8");
  });

  it("no se avisa por una reserva no pensionada, ya avisada, ajena o desde el administrador", async () => {
    const e = conOctubre([noPensionado(MARIA, PEDRO, "2026-10-06"), pensionado(MARIA, PEDRO, "2026-10-07", "INASISTENCIA_AVISADA")]);

    expect((await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-06")).ok).toBe(false);
    expect((await e.casos.avisarInasistencia.ejecutar(pedro, MARIA, "2026-10-07")).ok).toBe(false);
    expect((await e.casos.avisarInasistencia.ejecutar(comoUsuario("P-ANA"), MARIA, "2026-10-08")).ok).toBe(false);
    expect((await e.casos.avisarInasistencia.ejecutar(comoUsuario(PEDRO, "ADMINISTRADOR"), MARIA, "2026-10-08")).ok).toBe(false);
  });
});
