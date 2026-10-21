import { describe, expect, it } from "vitest";
import { topeDiario } from "../src/dominio/modelo.js";
import { carlos, comoUsuario, escenario, pedro } from "./fakes.js";

describe("HU05 ver mis familiares habilitados", () => {
  it("CA1 cónyuge y 3 hijos: 4 familiares con parentesco y tope de 5", async () => {
    const e = escenario();

    const resultado = await e.casos.verMiFamilia.ejecutar(comoUsuario(pedro));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.familiares.map((f) => [f.nombreCompleto, f.parentesco])).toEqual([
      ["Ana Flores", "Hija"],
      ["Juan Flores", "Hijo"],
      ["Luis Flores", "Hijo"],
      ["María Flores", "Cónyuge"],
    ]);
    expect(resultado.valor.topeDiario).toBe(5);
  });

  it("CA2 quien no viene de la API no aparece ni se puede usar para reservar", async () => {
    const e = escenario();

    const reserva = await e.casos.reservar.ejecutar(comoUsuario(pedro), "SOBRINO-1", "2026-10-06");

    expect(reserva.ok).toBe(false);
    const familia = await e.casos.verMiFamilia.ejecutar(comoUsuario(pedro));
    expect(familia.ok && familia.valor.familiares.some((f) => f.id === "SOBRINO-1")).toBe(false);
  });

  it("CA3 un hijo nuevo registrado por RRHH aparece al volver a iniciar sesión", async () => {
    const e = escenario({ personas: [] });
    await e.casos.iniciarSesion.ejecutar("cmamani", "demo123");
    e.empresarial.cuentas
      .find((c) => c.usuario === "cmamani")!
      .familiares.push({ id: "FAM-3001", nombreCompleto: "Sara Mamani", parentesco: "Hija" });

    await e.casos.iniciarSesion.ejecutar("cmamani", "demo123");

    const familia = await e.casos.verMiFamilia.ejecutar(comoUsuario(carlos));
    expect(familia.ok && familia.valor.familiares.map((f) => f.nombreCompleto)).toEqual(["Sara Mamani"]);
  });

  it("CA4 sin familiares registrados: lista vacía y tope 1", async () => {
    const e = escenario();

    const resultado = await e.casos.verMiFamilia.ejecutar(comoUsuario(carlos));

    expect(resultado.ok && resultado.valor).toMatchObject({ familiares: [], topeDiario: 1 });
  });

  it("un familiar que la API ya no entrega queda no vigente, sin borrar su historial", async () => {
    const e = escenario({ personas: [] });
    await e.casos.iniciarSesion.ejecutar("pflores", "demo123");
    const cuenta = e.empresarial.cuentas.find((c) => c.usuario === "pflores")!;
    cuenta.familiares = cuenta.familiares.filter((f) => f.id !== "FAM-2004");

    await e.casos.iniciarSesion.ejecutar("pflores", "demo123");

    expect(await e.personas.obtener("FAM-2004")).toMatchObject({ vigente: false, nombreCompleto: "Luis Flores" });
    const familia = await e.casos.verMiFamilia.ejecutar(comoUsuario(pedro));
    expect(familia.ok && familia.valor.topeDiario).toBe(4);
  });

  it("R10 el tope es 1 más los familiares", () => {
    expect(topeDiario(0)).toBe(1);
    expect(topeDiario(4)).toBe(5);
  });
});
