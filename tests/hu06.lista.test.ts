import { describe, expect, it } from "vitest";
import { admin, ANA, comoUsuario, DIEGO, escenario, MARIA, menu, noPensionado, PEDRO, pensionado } from "./fakes.js";

describe("HU06 ver almuerzos confirmados del día", () => {
  it("CA1 total y, por persona, nombre, tipo, titular y modalidad", async () => {
    const e = escenario({
      reservas: [noPensionado(ANA, ANA, "2026-10-06"), noPensionado(DIEGO, ANA, "2026-10-06"), pensionado(MARIA, PEDRO, "2026-10-06")],
    });

    const lista = await e.casos.verLista.ejecutar(admin, "2026-10-06");

    expect(lista.ok).toBe(true);
    if (!lista.ok) return;
    expect(lista.valor.total).toBe(3);
    expect(lista.valor.menu).toBe("Almuerzo del 2026-10-06");
    expect(lista.valor.filas.map((f) => [f.nombre, f.tipoPersona, f.parentesco, f.nombreTitular, f.modalidad])).toEqual([
      ["Ana Rojas", "EMPLEADO", null, "Ana Rojas", "NO_PENSIONADO"],
      ["Diego Rojas", "FAMILIAR", "HIJO", "Ana Rojas", "NO_PENSIONADO"],
      ["María Flores", "FAMILIAR", "CONYUGE", "Pedro Flores", "PENSIONADO"],
    ]);
  });

  it("CA2 lo cancelado antes de las 9:00 y lo avisado no aparece ni cuenta", async () => {
    const e = escenario({
      reservas: [
        noPensionado(ANA, ANA, "2026-10-06", "CANCELADA"),
        pensionado(MARIA, PEDRO, "2026-10-06", "INASISTENCIA_AVISADA"),
        noPensionado(DIEGO, ANA, "2026-10-06"),
      ],
    });

    const lista = await e.casos.verLista.ejecutar(admin, "2026-10-06");

    expect(lista.ok && [lista.valor.total, lista.valor.filas.map((f) => f.personaId)]).toEqual([1, [DIEGO]]);
  });

  it("CA3 un día sin menú publicado muestra «Sin atención» y total cero", async () => {
    const e = escenario({ menus: [menu("2026-10-05", ["2026-10-05"])] });

    const lista = await e.casos.verLista.ejecutar(admin, "2026-10-06");

    expect(lista).toEqual({ ok: true, valor: { fecha: "2026-10-06", sinAtencion: true, menu: null, total: 0, filas: [] } });
  });

  it("un día con menú y sin reservas da cero, sin «Sin atención»", async () => {
    const e = escenario();

    const lista = await e.casos.verLista.ejecutar(admin, "2026-10-08");

    expect(lista.ok && [lista.valor.sinAtencion, lista.valor.total]).toEqual([false, 0]);
  });

  it("solo el administrador la ve y la fecha tiene que ser válida", async () => {
    const e = escenario();

    expect((await e.casos.verLista.ejecutar(comoUsuario(ANA), "2026-10-06")).ok).toBe(false);
    expect(await e.casos.verLista.ejecutar(admin, "06/10/2026")).toEqual({ ok: false, mensaje: "La fecha no es válida." });
  });
});
