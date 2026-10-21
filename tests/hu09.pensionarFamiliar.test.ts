import { describe, expect, it } from "vitest";
import { personaDelEmpleado, personaDelFamiliar } from "../src/dominio/modelo.js";
import { ana, comoUsuario, diego, encargada, escenario, familiaPedro, pedro, relojEn } from "./fakes.js";

const titular = comoUsuario(pedro);
const [maria, juan, anaFlores] = familiaPedro.map((f) => f.id);

describe("HU09 pensionar a un familiar", () => {
  it("CA1 esposa y dos hijos: tres pensiones nominales, cada una con sus días a 15 Bs, a cargo del titular", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });

    const resultado = await e.casos.pensionar.ejecutar(titular, [maria, juan, anaFlores], 2026, 10);

    expect(resultado.ok && resultado.valor.map((r) => [r.personaId, r.ok, r.diasConfirmados])).toEqual([
      [maria, true, 17],
      [juan, true, 17],
      [anaFlores, true, 17],
    ]);
    expect(e.pensiones.pensiones.map((p) => [p.personaId, p.codigoTitular])).toEqual([
      [maria, "UB-103"],
      [juan, "UB-103"],
      [anaFlores, "UB-103"],
    ]);
    for (const id of [maria, juan, anaFlores]) {
      expect(e.almuerzos.de(id).every((a) => a.codigoTitular === "UB-103" && a.precioBs === 15)).toBe(true);
    }
  });

  it("CA2 la hija sale en la lista como familiar pensionada con el nombre del titular", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });
    await e.casos.pensionar.ejecutar(titular, [anaFlores], 2026, 10);

    const lista = await e.casos.verLista.ejecutar(encargada, "2026-10-14");

    expect(lista.ok && lista.valor.filas).toEqual([
      expect.objectContaining({ nombre: "Ana Flores", tipoPersona: "FAMILIAR", modalidad: "PENSION", nombreTitular: "Pedro Flores" }),
    ]);
  });

  it("CA3 el titular sin pensión puede pensionar a su hijo", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });

    const resultado = await e.casos.pensionar.ejecutar(titular, [juan], 2026, 10);

    expect(resultado.ok && resultado.valor[0].ok).toBe(true);
    expect(e.pensiones.pensiones.some((p) => p.personaId === "UB-103")).toBe(false);
  });

  it("CA4 el 1 de octubre ya no se pensiona a un familiar para octubre", async () => {
    const e = escenario({ reloj: relojEn("2026-10-01", 8, 0) });

    expect((await e.casos.pensionar.ejecutar(titular, [juan], 2026, 10)).ok).toBe(false);
  });

  it("CA5 Juan ya pensionado no se duplica, y los demás de la misma solicitud sí quedan", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });
    await e.casos.pensionar.ejecutar(titular, [juan], 2026, 10);

    const resultado = await e.casos.pensionar.ejecutar(titular, [juan, maria], 2026, 10);

    expect(resultado.ok && resultado.valor.map((r) => r.ok)).toEqual([false, true]);
    expect(e.pensiones.pensiones.filter((p) => p.personaId === juan)).toHaveLength(1);
  });

  it("CA6 con las 5 personas pensionadas no queda nadie más disponible", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });
    const todos = ["UB-103", ...familiaPedro.map((f) => f.id)];
    await e.casos.pensionar.ejecutar(titular, todos, 2026, 10);

    const otra = await e.casos.pensionar.ejecutar(titular, todos, 2026, 10);

    expect(e.pensiones.pensiones).toHaveLength(5);
    expect(otra.ok && otra.valor.every((r) => !r.ok)).toBe(true);
  });

  it("CA6 si la familia cambió en la API, no se pasa del tope de pensionados del mes", async () => {
    const sofia = personaDelFamiliar("UB-100", { id: "FAM-1002", nombreCompleto: "Sofía Rojas", parentesco: "Hija" });
    const e = escenario({
      reloj: relojEn("2026-09-25", 10, 0),
      personas: [personaDelEmpleado(ana), { ...personaDelFamiliar("UB-100", diego), vigente: false }, sofia],
      pensiones: [
        { personaId: "UB-100", codigoTitular: "UB-100", anio: 2026, mes: 10, solicitadaEl: "2026-09-20" },
        { personaId: diego.id, codigoTitular: "UB-100", anio: 2026, mes: 10, solicitadaEl: "2026-09-20" },
      ],
    });

    const resultado = await e.casos.pensionar.ejecutar(comoUsuario(ana), [sofia.id], 2026, 10);

    expect(resultado.ok && resultado.valor[0]).toMatchObject({ ok: false, mensaje: expect.stringContaining("tope") });
  });

  it("no se pensiona a un familiar ajeno", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });

    const resultado = await e.casos.pensionar.ejecutar(comoUsuario(ana), [juan], 2026, 10);

    expect(resultado.ok && resultado.valor[0].ok).toBe(false);
    expect(e.pensiones.pensiones).toHaveLength(0);
  });
});
