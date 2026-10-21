import { describe, expect, it } from "vitest";
import { comoUsuario, encargada, escenario, esporadico, pedro, relojEn } from "./fakes.js";

const yo = comoUsuario(pedro);

describe("HU08 pensionarme (reserva automática de todo el mes)", () => {
  it("CA1 el 25 de septiembre pide octubre: queda pensionado con todos los lunes a jueves a 15 Bs", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });

    const resultado = await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    expect(resultado.ok && resultado.valor).toEqual([
      expect.objectContaining({ personaId: "UB-103", ok: true, diasConfirmados: 17, totalBs: 255 }),
    ]);
    const almuerzos = e.almuerzos.de("UB-103");
    expect(almuerzos).toHaveLength(17);
    expect(almuerzos.every((a) => a.origen === "PENSION" && a.precioBs === 15 && a.estado === "CONFIRMADO")).toBe(true);
    expect(almuerzos.map((a) => a.fecha).slice(0, 5)).toEqual([
      "2026-10-01",
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
    ]);
  });

  it("CA2 cualquier día de octubre aparece en la lista del encargado como pensionado sin hacer nada", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });
    await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    const lista = await e.casos.verLista.ejecutar(encargada, "2026-10-21");

    expect(lista.ok && lista.valor.filas).toEqual([expect.objectContaining({ nombre: "Pedro Flores", modalidad: "PENSION" })]);
  });

  it("CA3 un jueves feriado registrado no se confirma ni se cobra", async () => {
    const e = escenario({
      reloj: relojEn("2026-09-25", 10, 0),
      feriados: [{ fecha: "2026-10-08", descripcion: "Feriado" }],
    });

    const resultado = await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    expect(resultado.ok && resultado.valor[0]).toMatchObject({ diasConfirmados: 16, totalBs: 240 });
    expect(e.almuerzos.de("UB-103").some((a) => a.fecha === "2026-10-08")).toBe(false);
  });

  it("CA4 el 1 de octubre ya es tarde para octubre", async () => {
    const e = escenario({ reloj: relojEn("2026-10-01", 7, 0) });

    const resultado = await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    expect(resultado.ok).toBe(false);
    expect(e.pensiones.pensiones).toHaveLength(0);
    expect(e.almuerzos.guardados).toHaveLength(0);
  });

  it("CA4 tampoco se pide con dos meses de anticipación", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });

    expect((await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 11)).ok).toBe(false);
  });

  it("CA5 una segunda pensión de octubre no se duplica", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });
    await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    const otra = await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    expect(otra.ok && otra.valor[0]).toMatchObject({ ok: false, mensaje: expect.stringContaining("ya es pensionado") });
    expect(e.pensiones.pensiones).toHaveLength(1);
    expect(e.almuerzos.de("UB-103")).toHaveLength(17);
  });

  it("diciembre se pide en noviembre y enero en diciembre (cambio de año)", async () => {
    const e = escenario({ reloj: relojEn("2026-12-15", 10, 0) });

    const resultado = await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2027, 1);

    expect(resultado.ok && resultado.valor[0].ok).toBe(true);
  });

  it("un mes con menos de 10 días de servicio no admite pensión", async () => {
    const feriados = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]
      .map((fecha) => ({ fecha, descripcion: "Cierre" }));
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0), feriados });

    const resultado = await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    expect(resultado).toEqual({ ok: false, mensaje: "Ese mes tiene 9 días de servicio. La pensión exige al menos 10." });
  });

  it("una reserva esporádica previa en ese mes pasa a ser de pensión: sigue uno por día", async () => {
    const e = escenario({
      reloj: relojEn("2026-09-25", 10, 0),
      almuerzos: [esporadico("UB-103", "UB-103", "2026-10-06")],
    });

    await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 10);

    const delDia = e.almuerzos.de("UB-103").filter((a) => a.fecha === "2026-10-06");
    expect(delDia).toEqual([expect.objectContaining({ origen: "PENSION", precioBs: 15 })]);
  });

  it("valida el mes y que haya al menos una persona", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });

    expect((await e.casos.pensionar.ejecutar(yo, ["UB-103"], 2026, 0)).ok).toBe(false);
    expect((await e.casos.pensionar.ejecutar(yo, [], 2026, 10)).ok).toBe(false);
  });
});
