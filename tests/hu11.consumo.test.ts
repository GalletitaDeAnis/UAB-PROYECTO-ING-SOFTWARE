import { describe, expect, it } from "vitest";
import { diasSinAtencion } from "../src/aplicacion/verMiConsumo.js";
import {
  admin,
  ANA,
  comoUsuario,
  DIEGO,
  escenario,
  MARIA,
  menu,
  menusDeOctubre,
  noPensionado,
  pension,
  PEDRO,
  pensionado,
  relojEn,
} from "./fakes.js";

const ana = comoUsuario(ANA);
const pedro = comoUsuario(PEDRO);

describe("HU11 consultar mi consumo del mes", () => {
  it("CA1 4 almuerzos no pensionados son 72 Bs", async () => {
    const reservas = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"].map((f) => noPensionado(ANA, ANA, f));
    const e = escenario({ reservas: [...reservas, noPensionado(ANA, ANA, "2026-10-12", "CANCELADA")] });

    const consumo = await e.casos.verMiConsumo.ejecutar(ana, 2026, 10);

    expect(consumo.ok).toBe(true);
    if (!consumo.ok) return;
    const propia = consumo.valor.personas.find((p) => p.persona.id === ANA)!;
    expect([propia.cantidad, propia.subtotalBs, propia.pensionado]).toEqual([4, 72, false]);
    expect(consumo.valor.totalBs).toBe(72);
  });

  it("CA2 con 11 programados restantes puede avisar una inasistencia más", async () => {
    const dias = menusDeOctubre().flatMap((m) => m.dias.map((d) => d.fecha));
    const reservas = dias.map((f, i) => pensionado(MARIA, PEDRO, f, i < 5 ? "INASISTENCIA_AVISADA" : "CONFIRMADA"));
    const e = escenario({ menus: menusDeOctubre(), reservas, pensiones: [pension(MARIA, PEDRO)] });

    const consumo = await e.casos.verMiConsumo.ejecutar(pedro, 2026, 10);

    const maria = consumo.ok ? consumo.valor.personas.find((p) => p.persona.id === MARIA) : undefined;
    expect([maria?.pensionado, maria?.programados, maria?.minimo, maria?.inasistenciasDisponibles]).toEqual([true, 11, 10, 1]);
  });

  it("CA3 detalle por persona y total a descontar", async () => {
    const e = escenario({
      reservas: [noPensionado(ANA, ANA, "2026-10-06"), noPensionado(DIEGO, ANA, "2026-10-06"), noPensionado(DIEGO, ANA, "2026-10-07")],
    });

    const consumo = await e.casos.verMiConsumo.ejecutar(ana, 2026, 10);

    expect(consumo.ok && consumo.valor.personas.map((p) => [p.persona.nombres, p.cantidad, p.subtotalBs, p.inasistenciasDisponibles])).toEqual([
      ["Ana", 1, 18, null],
      ["Diego", 2, 36, null],
    ]);
    expect(consumo.ok && consumo.valor.totalBs).toBe(54);
  });

  it("CA3 un familiar dado de baja que consumió en el mes sigue en el detalle", async () => {
    const e = escenario({ reservas: [noPensionado(DIEGO, ANA, "2026-10-05")] });
    await e.personas.darDeBaja([DIEGO], "2026-10-06");

    const consumo = await e.casos.verMiConsumo.ejecutar(ana, 2026, 10);

    expect(consumo.ok && consumo.valor.totalBs).toBe(18);
  });

  it("CA4 los días sin menú se muestran como «Sin atención»", async () => {
    const e = escenario({ reloj: relojEn("2026-10-14", 10, 0), menus: [menu("2026-10-12", ["2026-10-12", "2026-10-13", "2026-10-15"])] });

    const consumo = await e.casos.verMiConsumo.ejecutar(ana, 2026, 10);

    // Semana 1 sin menú y ya pasada; el miércoles 14 que no se publicó; las semanas futuras aún no se saben.
    expect(consumo.ok && consumo.valor.diasSinAtencion).toEqual([
      "2026-10-01",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-14",
    ]);
  });

  it("días sin atención: una semana publicada sin un día futuro también cuenta", () => {
    expect(diasSinAtencion(2026, 10, ["2026-10-19"], "2026-10-01")).toEqual([
      "2026-10-01",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
    ]);
  });

  it("mis reservas del mes, ordenadas por fecha y persona; solo para empleados", async () => {
    const e = escenario({ reservas: [noPensionado(DIEGO, ANA, "2026-10-07"), noPensionado(ANA, ANA, "2026-10-07"), noPensionado(ANA, ANA, "2026-10-06")] });

    const mias = await e.casos.verMisReservas.ejecutar(ana, 2026, 10);

    expect(mias.ok && mias.valor.map((r) => [r.fecha, r.nombrePersona])).toEqual([
      ["2026-10-06", "Ana Rojas"],
      ["2026-10-07", "Ana Rojas"],
      ["2026-10-07", "Diego Rojas"],
    ]);
    expect((await e.casos.verMisReservas.ejecutar(admin, 2026, 10)).ok).toBe(false);
    expect((await e.casos.verMisReservas.ejecutar(ana, 2026, 13)).ok).toBe(false);
    expect((await e.casos.verMiConsumo.ejecutar(admin, 2026, 10)).ok).toBe(false);
    expect((await e.casos.verMiConsumo.ejecutar(ana, 1999, 10)).ok).toBe(false);
  });
});
