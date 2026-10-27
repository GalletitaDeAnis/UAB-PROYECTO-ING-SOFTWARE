import { describe, expect, it } from "vitest";
import {
  admin,
  ANA,
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
  relojEn,
} from "./fakes.js";

const pedro = comoUsuario(PEDRO);
const enOctubre = () => relojEn("2026-10-20", 10, 0);

describe("HU07 pensionar", () => {
  it("CA1 una pensión a nombre de cada persona elegida, a 15 Bs, con el usuario como titular", async () => {
    const e = escenario({ reloj: enOctubre() });

    const resultado = await e.casos.pensionar.ejecutar(pedro, [PEDRO, MARIA], 2026, 11);

    expect(resultado.ok && resultado.valor.map((r) => [r.nombre, r.ok, r.mensaje])).toEqual([
      ["Pedro Flores", true, "Pedro Flores queda pensionado a 15 Bs por almuerzo."],
      ["María Flores", true, "María Flores queda pensionado a 15 Bs por almuerzo."],
    ]);
    expect(e.pensiones.pensiones).toEqual([
      { personaId: PEDRO, titularId: PEDRO, anio: 2026, mes: 11, solicitadaEl: "2026-10-20" },
      { personaId: MARIA, titularId: PEDRO, anio: 2026, mes: 11, solicitadaEl: "2026-10-20" },
    ]);
  });

  it("CA2 si el menú del mes ya salió, esos días quedan confirmados al pensionar", async () => {
    const e = escenario({ reloj: relojEn("2026-10-30", 10, 0), menus: [menu("2026-11-02")] });

    const resultado = await e.casos.pensionar.ejecutar(pedro, [MARIA], 2026, 11);

    expect(resultado.ok && resultado.valor[0].diasConfirmados).toBe(4);
    expect(e.reservas.de(MARIA).map((r) => [r.fecha, r.modalidad, r.precioBs])).toEqual([
      ["2026-11-02", "PENSIONADO", 15],
      ["2026-11-03", "PENSIONADO", 15],
      ["2026-11-04", "PENSIONADO", 15],
      ["2026-11-05", "PENSIONADO", 15],
    ]);
  });

  it("CA2 publicar después el menú confirma al pensionado y aparece en la lista como pensionado", async () => {
    const e = escenario({ reloj: enOctubre(), menus: [] });
    await e.casos.pensionar.ejecutar(pedro, [MARIA], 2026, 11);
    e.reloj.fijar("2026-11-01", 18, 0);

    await e.casos.publicarMenu.ejecutar(admin, "2026-11-02", [{ fecha: "2026-11-03", descripcion: "Silpancho" }]);
    const lista = await e.casos.verLista.ejecutar(admin, "2026-11-03");

    expect(lista.ok && lista.valor.filas.map((f) => [f.nombre, f.modalidad])).toEqual([["María Flores", "PENSIONADO"]]);
  });

  it("CA3 un día sin menú no se confirma ni se cobra", async () => {
    const e = escenario({ reloj: relojEn("2026-10-30", 10, 0), menus: [menu("2026-11-02", ["2026-11-02", "2026-11-04"])] });

    await e.casos.pensionar.ejecutar(pedro, [MARIA], 2026, 11);

    expect(e.reservas.de(MARIA).map((r) => r.fecha)).toEqual(["2026-11-02", "2026-11-04"]);
  });

  it("CA4 con el mes ya iniciado la solicitud se rechaza", async () => {
    const e = escenario({ reloj: relojEn("2026-11-01", 7, 0) });

    for (const [anio, mes] of [[2026, 11], [2026, 10], [2027, 1]]) {
      expect(await e.casos.pensionar.ejecutar(pedro, [PEDRO], anio, mes)).toEqual({
        ok: false,
        mensaje: "La pensión se solicita antes de que empiece el mes, solo para el mes siguiente.",
      });
    }
    expect(e.pensiones.pensiones).toHaveLength(0);
  });

  it("CA4 el último día del mes anterior todavía se puede (borde) y diciembre pasa a enero", async () => {
    expect((await escenario({ reloj: relojEn("2026-10-31", 23, 59) }).casos.pensionar.ejecutar(pedro, [PEDRO], 2026, 11)).ok).toBe(true);
    expect((await escenario({ reloj: relojEn("2026-12-15", 9, 0) }).casos.pensionar.ejecutar(pedro, [PEDRO], 2027, 1)).ok).toBe(true);
  });

  it("CA5 una persona con pensión para el mes no se duplica", async () => {
    const e = escenario({ reloj: enOctubre(), pensiones: [pension(MARIA, PEDRO, 2026, 11)] });

    const resultado = await e.casos.pensionar.ejecutar(pedro, [MARIA, JUAN], 2026, 11);

    expect(resultado.ok && resultado.valor.map((r) => [r.personaId, r.ok, r.mensaje])).toEqual([
      [MARIA, false, "María Flores ya tiene pensión para ese mes."],
      [JUAN, true, "Juan Flores queda pensionado a 15 Bs por almuerzo."],
    ]);
    expect(e.pensiones.pensiones).toHaveLength(2);
  });

  it("CA6 el usuario no pensionado pensiona solo a un familiar", async () => {
    const e = escenario({ reloj: enOctubre() });

    await e.casos.pensionar.ejecutar(comoUsuario(ANA), [DIEGO], 2026, 11);

    expect(e.pensiones.pensiones.map((p) => p.personaId)).toEqual([DIEGO]);
    expect(await e.pensiones.obtener(ANA, 2026, 11)).toBeNull();
  });

  it("CA7 la pensión reemplaza una reserva no pensionada del mismo día: sigue siendo una por día", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-30", 10, 0),
      menus: [menu("2026-11-02")],
      reservas: [noPensionado(MARIA, PEDRO, "2026-11-02")],
    });

    await e.casos.pensionar.ejecutar(pedro, [MARIA], 2026, 11);

    expect(e.reservas.de(MARIA).filter((r) => r.fecha === "2026-11-02")).toEqual([
      expect.objectContaining({ modalidad: "PENSIONADO", precioBs: 15 }),
    ]);
  });

  it("R14 hasta 1 + familiares activos pensionados por mes", async () => {
    const e = escenario({ reloj: enOctubre() });
    const nuevo = await e.personas.agregarFamiliar(PEDRO, {
      nombres: "Rosa", apellidos: "Flores", ci: "8889990", fechaNacimiento: "1950-01-01", telefono: "70000000", parentesco: "MADRE",
    });
    await e.casos.pensionar.ejecutar(pedro, [PEDRO, MARIA, JUAN, LUCIA, LUIS], 2026, 11);
    await e.personas.darDeBaja([nuevo.id], "2026-10-20");
    e.personas.personas.get(nuevo.id)!.activo = true;
    e.personas.personas.get(LUIS)!.activo = false;

    const resultado = await e.casos.pensionar.ejecutar(pedro, [nuevo.id], 2026, 11);

    expect(resultado.ok && resultado.valor[0].mensaje).toBe("Ya hay 5 personas pensionadas ese mes, que es el tope diario.");
  });

  it("persona ajena, lista vacía, mes inválido o administrador se rechazan", async () => {
    const e = escenario({ reloj: enOctubre() });

    const ajena = await e.casos.pensionar.ejecutar(pedro, [ANA], 2026, 11);
    expect(ajena.ok && ajena.valor[0].ok).toBe(false);
    expect((await e.casos.pensionar.ejecutar(pedro, [], 2026, 11)).ok).toBe(false);
    expect((await e.casos.pensionar.ejecutar(pedro, [PEDRO], 2026, 13)).ok).toBe(false);
    expect((await e.casos.pensionar.ejecutar(admin, [PEDRO], 2026, 11)).ok).toBe(false);
  });
});
