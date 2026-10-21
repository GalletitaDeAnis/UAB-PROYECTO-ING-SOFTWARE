import { describe, expect, it } from "vitest";
import { personaDelEmpleado, personaDelFamiliar } from "../src/dominio/modelo.js";
import { ana, comoUsuario, diego, encargada, escenario, esporadico, familiaPedro, pedro, relojEn } from "./fakes.js";

const titular = comoUsuario(pedro);
const juan = "FAM-2002";

describe("HU06 reservar almuerzo para un familiar", () => {
  it("CA1 queda a nombre de Juan, a 18 Bs, descontado al titular, y sale en la lista como familiar", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 8, 30) });

    const resultado = await e.casos.reservar.ejecutar(titular, juan, "2026-10-06");

    expect(resultado.ok && resultado.valor).toEqual(esporadico(juan, "UB-103", "2026-10-06"));
    const lista = await e.casos.verLista.ejecutar(encargada, "2026-10-06");
    expect(lista.ok && lista.valor.filas[0]).toMatchObject({
      nombre: "Juan Flores",
      tipoPersona: "FAMILIAR",
      nombreTitular: "Pedro Flores",
    });
  });

  it("CA2 Juan no recibe un segundo almuerzo el mismo día", async () => {
    const e = escenario({ almuerzos: [esporadico(juan, "UB-103", "2026-10-06")] });

    const resultado = await e.casos.reservar.ejecutar(titular, juan, "2026-10-06");

    expect(resultado.ok).toBe(false);
    expect(e.almuerzos.de(juan)).toHaveLength(1);
  });

  it("CA3 con las 5 personas reservadas no entra una sexta", async () => {
    const e = escenario();
    for (const id of ["UB-103", ...familiaPedro.map((f) => f.id)]) {
      expect((await e.casos.reservar.ejecutar(titular, id, "2026-10-06")).ok).toBe(true);
    }

    const otra = await e.casos.reservar.ejecutar(titular, juan, "2026-10-06");

    expect(otra.ok).toBe(false);
    expect(e.almuerzos.guardados).toHaveLength(5);
  });

  it("CA3 si la familia cambió en la API, el tope del día se respeta aunque haya alguien nuevo", async () => {
    // Diego reservó y luego dejó de figurar; llegó Sofía. Tope = 1 + 1, ya hay 2 almuerzos ese día.
    const sofia = personaDelFamiliar("UB-100", { id: "FAM-1002", nombreCompleto: "Sofía Rojas", parentesco: "Hija" });
    const e = escenario({
      personas: [personaDelEmpleado(ana), { ...personaDelFamiliar("UB-100", diego), vigente: false }, sofia],
      almuerzos: [esporadico("UB-100", "UB-100", "2026-10-06"), esporadico(diego.id, "UB-100", "2026-10-06")],
    });

    const resultado = await e.casos.reservar.ejecutar(comoUsuario(ana), sofia.id, "2026-10-06");

    expect(resultado).toEqual({ ok: false, mensaje: "Alcanzaste el tope de 2 almuerzos para ese día." });
  });

  it("CA4 a las 9:01 no se reserva ni se cancela para un familiar", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-06", 9, 1),
      almuerzos: [esporadico("FAM-2001", "UB-103", "2026-10-06")],
    });

    expect((await e.casos.reservar.ejecutar(titular, juan, "2026-10-06")).ok).toBe(false);
    expect((await e.casos.cancelar.ejecutar(titular, "FAM-2001", "2026-10-06")).ok).toBe(false);
  });

  it("CA5 cancelar la de Juan deja vigente la del titular", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-06", 8, 45),
      almuerzos: [esporadico("UB-103", "UB-103", "2026-10-06"), esporadico(juan, "UB-103", "2026-10-06")],
    });

    const resultado = await e.casos.cancelar.ejecutar(titular, juan, "2026-10-06");

    expect(resultado.ok).toBe(true);
    expect(e.almuerzos.de(juan)[0].estado).toBe("CANCELADO");
    expect(e.almuerzos.de("UB-103")[0].estado).toBe("CONFIRMADO");
  });

  it("R9 nadie reserva ni cancela por un familiar ajeno", async () => {
    const e = escenario({ almuerzos: [esporadico(juan, "UB-103", "2026-10-06")] });

    expect((await e.casos.reservar.ejecutar(comoUsuario(ana), juan, "2026-10-07")).ok).toBe(false);
    expect((await e.casos.cancelar.ejecutar(comoUsuario(ana), juan, "2026-10-06")).ok).toBe(false);
  });

  it("un familiar que dejó de figurar en la API ya no se puede elegir", async () => {
    const e = escenario({
      personas: [personaDelEmpleado(ana), { ...personaDelFamiliar("UB-100", diego), vigente: false }],
    });

    const resultado = await e.casos.reservar.ejecutar(comoUsuario(ana), diego.id, "2026-10-06");

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("ya no figura");
  });
});
