import { describe, expect, it } from "vitest";
import { SIN_ATENCION } from "../src/aplicacion/reservarAlmuerzo.js";
import { admin, ANA, comoUsuario, escenario, MARIA, menu, pension, PEDRO, pensionado, relojEn } from "./fakes.js";

const semana = (fechas: string[]) => fechas.map((fecha) => ({ fecha, descripcion: `Sopa y segundo del ${fecha}` }));

describe("HU03 publicar el menú semanal", () => {
  it("CA1 el domingo publica lunes a jueves y los empleados lo ven y reservan", async () => {
    const e = escenario({ reloj: relojEn("2026-10-18", 18, 0), menus: [] });

    const publicado = await e.casos.publicarMenu.ejecutar(
      admin,
      "2026-10-19",
      semana(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"]),
    );
    expect(publicado.ok).toBe(true);

    const vista = await e.casos.verMenuSemanal.ejecutar("2026-10-19");
    expect(vista.ok && vista.valor.dias.map((d) => d.descripcion)).toEqual([
      "Sopa y segundo del 2026-10-19",
      "Sopa y segundo del 2026-10-20",
      "Sopa y segundo del 2026-10-21",
      "Sopa y segundo del 2026-10-22",
    ]);
    expect((await e.casos.reservar.ejecutar(comoUsuario(ANA), [ANA], "2026-10-19")).ok).toBe(true);
  });

  it("CA2 un día que no se incluye queda «Sin atención» y no admite reservas", async () => {
    const e = escenario({ reloj: relojEn("2026-10-18", 18, 0), menus: [] });

    await e.casos.publicarMenu.ejecutar(admin, "2026-10-19", semana(["2026-10-19", "2026-10-21", "2026-10-22"]));

    const vista = await e.casos.verMenuSemanal.ejecutar("2026-10-19");
    expect(vista.ok && vista.valor.dias[1]).toEqual({ fecha: "2026-10-20", descripcion: null });
    expect(await e.casos.reservar.ejecutar(comoUsuario(ANA), [ANA], "2026-10-20")).toEqual({ ok: false, mensaje: SIN_ATENCION });
  });

  it("CA2 un día con descripción vacía tampoco entra al menú", async () => {
    const e = escenario({ reloj: relojEn("2026-10-18", 18, 0), menus: [] });

    const publicado = await e.casos.publicarMenu.ejecutar(admin, "2026-10-19", [
      ...semana(["2026-10-19"]),
      { fecha: "2026-10-20", descripcion: "   " },
    ]);

    expect(publicado.ok && publicado.valor.menu.dias.map((d) => d.fecha)).toEqual(["2026-10-19"]);
  });

  it("CA3 viernes, sábado o domingo no se admiten", async () => {
    const e = escenario({ reloj: relojEn("2026-10-18", 18, 0), menus: [] });

    for (const fecha of ["2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26"]) {
      const resultado = await e.casos.publicarMenu.ejecutar(admin, "2026-10-19", semana([fecha]));
      expect(resultado).toEqual({ ok: false, mensaje: "El menú solo admite días de lunes a jueves de esa semana." });
    }
    expect(e.menus.menus).toHaveLength(0);
  });

  it("CA4 un menú publicado no se modifica", async () => {
    const e = escenario({ reloj: relojEn("2026-10-04", 18, 0), menus: [menu("2026-10-05")] });

    const resultado = await e.casos.publicarMenu.ejecutar(admin, "2026-10-05", semana(["2026-10-05"]));

    expect(resultado).toEqual({ ok: false, mensaje: "El menú de esa semana ya fue publicado y no se puede modificar." });
    expect(e.menus.menus[0].dias).toHaveLength(4);
  });

  it("CA5 un día no incluido no registra la reserva", async () => {
    const e = escenario({ menus: [menu("2026-10-05", ["2026-10-05", "2026-10-07"])] });

    const resultado = await e.casos.reservar.ejecutar(comoUsuario(ANA), [ANA], "2026-10-06");

    expect(resultado).toEqual({ ok: false, mensaje: SIN_ATENCION });
    expect(e.reservas.guardadas).toHaveLength(0);
  });

  it("HU07 CA2 al publicar se confirma el almuerzo de cada pensionado activo de ese mes", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-18", 18, 0),
      menus: [],
      pensiones: [pension(PEDRO, PEDRO), pension(MARIA, PEDRO), pension(MARIA, PEDRO, 2026, 11)],
    });

    const publicado = await e.casos.publicarMenu.ejecutar(admin, "2026-10-19", semana(["2026-10-19", "2026-10-20"]));

    expect(publicado.ok && publicado.valor.reservasDePension).toBe(4);
    expect(e.reservas.de(MARIA)).toEqual([pensionado(MARIA, PEDRO, "2026-10-19"), pensionado(MARIA, PEDRO, "2026-10-20")]);
  });

  it("una semana que cruza de mes confirma a cada pensionado solo en los días de su mes", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-25", 18, 0),
      menus: [],
      pensiones: [pension(PEDRO, PEDRO, 2026, 11)],
    });

    await e.casos.publicarMenu.ejecutar(admin, "2026-10-26", semana(["2026-10-26", "2026-10-29"]));
    await e.casos.publicarMenu.ejecutar(admin, "2026-11-02", semana(["2026-11-02"]));

    expect(e.reservas.de(PEDRO).map((r) => r.fecha)).toEqual(["2026-11-02"]);
  });

  it("un pensionado dado de baja ya no recibe almuerzos", async () => {
    const e = escenario({ reloj: relojEn("2026-10-18", 18, 0), menus: [], pensiones: [pension(MARIA, PEDRO)] });
    await e.personas.darDeBaja([MARIA], "2026-10-18");

    const publicado = await e.casos.publicarMenu.ejecutar(admin, "2026-10-19", semana(["2026-10-19"]));

    expect(publicado.ok && publicado.valor.reservasDePension).toBe(0);
  });

  it("no se publica una semana que ya terminó, ni días ya pasados, ni sin ningún día", async () => {
    const e = escenario({ reloj: relojEn("2026-10-14", 10, 0), menus: [] });

    expect((await e.casos.publicarMenu.ejecutar(admin, "2026-10-05", semana(["2026-10-05"]))).ok).toBe(false);
    expect((await e.casos.publicarMenu.ejecutar(admin, "2026-10-12", semana(["2026-10-13"]))).ok).toBe(false);
    expect((await e.casos.publicarMenu.ejecutar(admin, "2026-10-12", [])).ok).toBe(false);
    expect((await e.casos.publicarMenu.ejecutar(admin, "2026-10-13", semana(["2026-10-14"]))).ok).toBe(false);
    expect(
      (await e.casos.publicarMenu.ejecutar(admin, "2026-10-12", [...semana(["2026-10-15"]), ...semana(["2026-10-15"])])).ok,
    ).toBe(false);

    const deHoy = await e.casos.publicarMenu.ejecutar(admin, "2026-10-12", semana(["2026-10-14", "2026-10-15"]));
    expect(deHoy.ok).toBe(true);
  });

  it("R2 solo el administrador publica; cualquiera ve el menú", async () => {
    const e = escenario({ reloj: relojEn("2026-10-18", 18, 0), menus: [] });

    const resultado = await e.casos.publicarMenu.ejecutar(comoUsuario(ANA), "2026-10-19", semana(["2026-10-19"]));

    expect(resultado).toEqual({ ok: false, mensaje: "Esta opción es solo para el usuario administrador." });
    const vista = await e.casos.verMenuSemanal.ejecutar("2026-10-19");
    expect(vista.ok && vista.valor.publicado).toBe(false);
    expect((await e.casos.verMenuSemanal.ejecutar("2026-10-20")).ok).toBe(false);
  });
});
