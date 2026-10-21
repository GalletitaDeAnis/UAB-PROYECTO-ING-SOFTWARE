import { describe, expect, it } from "vitest";
import { SOLO_ENCARGADO } from "../src/aplicacion/comun.js";
import { ana, comoUsuario, dePension, encargada, escenario, pedro, relojEn } from "./fakes.js";

describe("HU07 registrar feriados del mes", () => {
  it("CA1 el jueves 6 de agosto registrado como feriado no se reserva ni se confirma a pensionados", async () => {
    const e = escenario({ reloj: relojEn("2026-07-20", 10, 0) });

    const registro = await e.casos.registrarFeriado.ejecutar(encargada, "2026-08-06", "Día de la Patria");
    expect(registro.ok).toBe(true);

    const reserva = await e.casos.reservar.ejecutar(comoUsuario(ana), "UB-100", "2026-08-06");
    expect(reserva.ok).toBe(false);
    if (!reserva.ok) expect(reserva.mensaje).toContain("feriado");

    const pension = await e.casos.pensionar.ejecutar(comoUsuario(pedro), ["UB-103"], 2026, 8);
    expect(pension.ok && pension.valor[0].ok).toBe(true);
    expect(e.almuerzos.de("UB-103").some((a) => a.fecha === "2026-08-06")).toBe(false);
  });

  it("CA2 si el feriado se registra después de confirmar la pensión, no se cuenta ni se cobra", async () => {
    const e = escenario({
      almuerzos: [dePension("UB-103", "UB-103", "2026-10-07"), dePension("UB-103", "UB-103", "2026-10-08")],
    });

    await e.casos.registrarFeriado.ejecutar(encargada, "2026-10-08", "Feriado tardío");

    const reporte = await e.casos.generarReporte.ejecutar(encargada, 2026, 10);
    expect(reporte.ok && reporte.valor.titulares[0]).toMatchObject({ totalBs: 15 });
    const lista = await e.casos.verLista.ejecutar(encargada, "2026-10-08");
    expect(lista.ok && lista.valor.total).toBe(0);
  });

  it("viernes a domingo no hace falta registrarlos", async () => {
    const e = escenario();

    const resultado = await e.casos.registrarFeriado.ejecutar(encargada, "2026-10-09", "Viernes");

    expect(resultado.ok).toBe(false);
    expect(e.feriados.feriados).toHaveLength(0);
  });

  it("no se duplica, pide motivo y valida la fecha", async () => {
    const e = escenario({ feriados: [{ fecha: "2026-10-08", descripcion: "Ya estaba" }] });

    expect((await e.casos.registrarFeriado.ejecutar(encargada, "2026-10-08", "Otra vez")).ok).toBe(false);
    expect((await e.casos.registrarFeriado.ejecutar(encargada, "2026-10-07", "   ")).ok).toBe(false);
    expect((await e.casos.registrarFeriado.ejecutar(encargada, "2026-13-01", "Mal")).ok).toBe(false);
    expect(e.feriados.feriados).toHaveLength(1);
  });

  it("solo el encargado registra feriados; todos pueden verlos", async () => {
    const e = escenario({ feriados: [{ fecha: "2026-10-08", descripcion: "Visible" }] });

    expect(await e.casos.registrarFeriado.ejecutar(comoUsuario(ana), "2026-10-07", "X")).toEqual({
      ok: false,
      mensaje: SOLO_ENCARGADO,
    });
    const lista = await e.casos.listarFeriados.ejecutar(2026, 10);
    expect(lista.ok && lista.valor).toEqual([{ fecha: "2026-10-08", descripcion: "Visible" }]);
    expect((await e.casos.listarFeriados.ejecutar(2026, 13)).ok).toBe(false);
  });

  it("los días de servicio del mes descuentan los feriados", async () => {
    const e = escenario({ feriados: [{ fecha: "2026-10-08", descripcion: "X" }] });

    const dias = await e.casos.verDiasDeServicio.ejecutar(2026, 10);

    expect(dias.ok && dias.valor).toHaveLength(16);
    expect(dias.ok && dias.valor.includes("2026-10-08")).toBe(false);
  });
});
