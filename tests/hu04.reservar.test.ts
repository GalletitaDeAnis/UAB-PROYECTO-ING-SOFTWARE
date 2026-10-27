import { describe, expect, it } from "vitest";
import { HORARIO_CERRADO, SIN_ATENCION } from "../src/aplicacion/reservarAlmuerzo.js";
import {
  admin,
  ANA,
  CARLOS,
  comoUsuario,
  DIEGO,
  escenario,
  JUAN,
  LUCIA,
  LUIS,
  MARIA,
  menu,
  noPensionado,
  pension,
  PEDRO,
  pensionado,
  relojEn,
} from "./fakes.js";

const ana = comoUsuario(ANA);
const pedro = comoUsuario(PEDRO);

describe("HU04 reservar almuerzo", () => {
  it("CA1 el martes a las 8:30 la reserva propia queda a su nombre a 18 Bs", async () => {
    const e = escenario();

    const resultado = await e.casos.reservar.ejecutar(ana, [ANA], "2026-10-06");

    expect(resultado.ok && resultado.valor).toEqual([
      { personaId: ANA, nombre: "Ana Rojas", ok: true, mensaje: "Reserva de Ana Rojas confirmada a 18 Bs." },
    ]);
    expect(e.reservas.guardadas).toEqual([noPensionado(ANA, ANA, "2026-10-06")]);
  });

  it("CA2 una reserva por familiar, a 18 Bs, con el usuario como titular", async () => {
    const e = escenario();

    const resultado = await e.casos.reservar.ejecutar(pedro, [MARIA, JUAN], "2026-10-07");

    expect(resultado.ok && resultado.valor.every((r) => r.ok)).toBe(true);
    expect(e.reservas.guardadas).toEqual([noPensionado(MARIA, PEDRO, "2026-10-07"), noPensionado(JUAN, PEDRO, "2026-10-07")]);
  });

  it("CA3 una persona con reserva no se duplica; las demás sí se reservan", async () => {
    const e = escenario({ reservas: [noPensionado(ANA, ANA, "2026-10-06")] });

    const resultado = await e.casos.reservar.ejecutar(ana, [ANA, DIEGO], "2026-10-06");

    expect(resultado.ok && resultado.valor.map((r) => [r.personaId, r.ok, r.mensaje])).toEqual([
      [ANA, false, "Ana Rojas ya tiene una reserva para ese día."],
      [DIEGO, true, "Reserva de Diego Rojas confirmada a 18 Bs."],
    ]);
    expect(e.reservas.guardadas).toHaveLength(2);
  });

  it("CA3 después de cancelar se puede volver a reservar el mismo día", async () => {
    const e = escenario({ reservas: [noPensionado(ANA, ANA, "2026-10-06", "CANCELADA")] });

    expect((await e.casos.reservar.ejecutar(ana, [ANA], "2026-10-06")).ok).toBe(true);
    expect(e.reservas.de(ANA)).toEqual([noPensionado(ANA, ANA, "2026-10-06")]);
  });

  it("CA4 Pedro y sus cuatro familiares llenan el tope de 5 el mismo día", async () => {
    const e = escenario();

    const todos = await e.casos.reservar.ejecutar(pedro, [PEDRO, MARIA, JUAN, LUCIA, LUIS], "2026-10-06");

    expect(todos.ok && todos.valor.every((r) => r.ok)).toBe(true);
    expect(e.reservas.guardadas).toHaveLength(5);
  });

  it("CA4 con el tope alcanzado se indica y no se registra otra reserva", async () => {
    // Luis almorzó el martes y lo dieron de baja esa tarde: el tope baja a 4 pero el día ya tiene 5.
    // Al registrar a la abuela el tope vuelve a 5, que ya está lleno.
    const e = escenario({ reservas: [PEDRO, MARIA, JUAN, LUCIA, LUIS].map((id) => noPensionado(id, PEDRO, "2026-10-06")) });
    await e.personas.darDeBaja([LUIS], "2026-10-07");
    const abuela = await e.personas.agregarFamiliar(PEDRO, {
      nombres: "Rosa",
      apellidos: "Flores",
      ci: "8889990",
      fechaNacimiento: "1950-01-01",
      telefono: "70000000",
      parentesco: "MADRE",
    });

    const resultado = await e.casos.reservar.ejecutar(pedro, [abuela.id], "2026-10-06");

    expect(resultado.ok && resultado.valor[0]).toMatchObject({ ok: false, mensaje: "Se alcanzó el tope diario de 5 almuerzos." });
    expect(e.reservas.de(abuela.id)).toHaveLength(0);
  });

  it("CA4 de varias personas a la vez, se reservan hasta llenar el tope", async () => {
    const e = escenario({ reservas: [noPensionado(DIEGO, ANA, "2026-10-06", "CANCELADA")] });

    const resultado = await e.casos.reservar.ejecutar(ana, [ANA, DIEGO], "2026-10-06");

    expect(resultado.ok && resultado.valor.map((r) => r.ok)).toEqual([true, true]);
  });

  it("CA5 a las 9:00 en punto ya no se reserva para hoy (borde)", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 9, 0) });

    expect(await e.casos.reservar.ejecutar(ana, [ANA], "2026-10-06")).toEqual({ ok: false, mensaje: HORARIO_CERRADO });
    expect(e.reservas.guardadas).toHaveLength(0);
  });

  it("CA5 a las 8:59 todavía se reserva, y después de las 9:00 se reserva para otro día (borde)", async () => {
    expect((await escenario({ reloj: relojEn("2026-10-06", 8, 59) }).casos.reservar.ejecutar(ana, [ANA], "2026-10-06")).ok).toBe(true);
    expect((await escenario({ reloj: relojEn("2026-10-06", 15, 0) }).casos.reservar.ejecutar(ana, [ANA], "2026-10-07")).ok).toBe(true);
  });

  it("CA6 un día sin menú publicado no admite reservas", async () => {
    const e = escenario({ menus: [menu("2026-10-05", ["2026-10-05", "2026-10-07", "2026-10-08"])] });

    expect(await e.casos.reservar.ejecutar(ana, [ANA], "2026-10-06")).toEqual({ ok: false, mensaje: SIN_ATENCION });
    expect(await e.casos.reservar.ejecutar(ana, [ANA], "2026-10-20")).toEqual({ ok: false, mensaje: SIN_ATENCION });
  });

  it("CA7 solo se elige al propio usuario o a un familiar activo a su cargo", async () => {
    const e = escenario();

    const ajena = await e.casos.reservar.ejecutar(ana, [MARIA, CARLOS, "inexistente"], "2026-10-06");

    expect(ajena.ok && ajena.valor.map((r) => r.mensaje)).toEqual([
      "Esa persona no está registrada en tu grupo familiar.",
      "Esa persona no está registrada en tu grupo familiar.",
      "Esa persona no está registrada en tu grupo familiar.",
    ]);
    expect(e.reservas.guardadas).toHaveLength(0);
  });

  it("HU07 CA7 un pensionado con almuerzo confirmado no recibe una reserva adicional", async () => {
    const e = escenario({ reservas: [pensionado(MARIA, PEDRO, "2026-10-06")], pensiones: [pension(MARIA, PEDRO)] });

    const mismoDia = await e.casos.reservar.ejecutar(pedro, [MARIA], "2026-10-06");
    const otroDia = await e.casos.reservar.ejecutar(pedro, [MARIA], "2026-10-07");

    expect(mismoDia.ok && mismoDia.valor[0].mensaje).toBe("María Flores es pensionado y ya tiene su almuerzo de ese día.");
    expect(otroDia.ok && otroDia.valor[0].mensaje).toBe("María Flores es pensionado de ese mes: un almuerzo por persona por día.");
  });

  it("fin de semana, día pasado, fecha inválida o sin personas se rechazan", async () => {
    const e = escenario({ menus: [menu("2026-10-05"), menu("2026-10-12")] });

    for (const fecha of ["2026-10-09", "2026-10-10", "2026-10-05", "2026-02-30", "mañana"]) {
      expect((await e.casos.reservar.ejecutar(ana, [ANA], fecha)).ok).toBe(false);
    }
    expect((await e.casos.reservar.ejecutar(ana, [], "2026-10-06")).ok).toBe(false);
    expect(e.reservas.guardadas).toHaveLength(0);
  });

  it("R2 el administrador no reserva", async () => {
    const e = escenario();

    expect(await e.casos.reservar.ejecutar(admin, [ANA], "2026-10-06")).toEqual({
      ok: false,
      mensaje: "Esta opción es solo para el usuario empleado.",
    });
  });
});
