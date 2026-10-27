import { describe, expect, it } from "vitest";
import { ULTIMO_ADMINISTRADOR } from "../src/aplicacion/gestionarUsuarios.js";
import {
  admin,
  ANA,
  CARLOS,
  CLAVE,
  comoUsuario,
  cuentasIniciales,
  DIEGO,
  ELENA,
  escenario,
  LAURA,
  noPensionado,
  pensionado,
  relojEn,
} from "./fakes.js";

const abuela = { nombres: "Rosa", apellidos: "Rojas", ci: "3332221", fechaNacimiento: "1955-02-02", telefono: "72000000", parentesco: "MADRE" };

describe("HU09 modificar o dar de baja usuarios y familiares", () => {
  it("lista los usuarios activos primero, con su grupo familiar y tope", async () => {
    const e = escenario();

    const lista = await e.casos.listarUsuarios.ejecutar(admin);

    expect(lista.ok && lista.valor.map((f) => [f.cuenta.nombreUsuario, f.persona.activo, f.topeDiario])).toEqual([
      ["pflores", true, 5],
      ["cmamani", true, 1],
      ["arojas", true, 2],
      ["evargas", true, 1],
      ["lquispe", false, 1],
    ]);
  });

  it("CA1 un familiar agregado queda disponible y el tope sube en uno", async () => {
    const e = escenario();

    const agregado = await e.casos.agregarFamiliar.ejecutar(admin, ANA, abuela);
    const ficha = await e.casos.verUsuario.ejecutar(admin, ANA);

    expect(agregado.ok).toBe(true);
    expect(ficha.ok && ficha.valor.topeDiario).toBe(3);
    if (!agregado.ok) return;
    expect((await e.casos.reservar.ejecutar(comoUsuario(ANA), [agregado.valor.id], "2026-10-06")).ok).toBe(true);
  });

  it("CA1 al agregar se validan datos, parentesco único, CI y que el titular sea un empleado activo", async () => {
    const e = escenario();

    expect((await e.casos.agregarFamiliar.ejecutar(admin, ANA, { ...abuela, ci: "" })).ok).toBe(false);
    expect((await e.casos.agregarFamiliar.ejecutar(admin, ANA, { ...abuela, parentesco: "TIO" })).ok).toBe(false);
    expect((await e.casos.agregarFamiliar.ejecutar(admin, ELENA, abuela)).ok).toBe(false);
    expect((await e.casos.agregarFamiliar.ejecutar(admin, LAURA, abuela)).ok).toBe(false);
    expect((await e.casos.agregarFamiliar.ejecutar(admin, "nadie", abuela)).ok).toBe(false);
    await e.casos.agregarFamiliar.ejecutar(admin, ANA, abuela);
    expect(await e.casos.agregarFamiliar.ejecutar(admin, ANA, { ...abuela, ci: "3332222" })).toEqual({
      ok: false,
      mensaje: "Familiar: ya hay un familiar registrado como madre.",
    });
    expect((await e.casos.agregarFamiliar.ejecutar(admin, CARLOS, abuela)).ok).toBe(false);
  });

  it("CA2 el familiar dado de baja pierde sus reservas futuras sin cobro y conserva lo consumido", async () => {
    const e = escenario({
      reloj: relojEn("2026-10-07", 10, 0),
      reservas: [noPensionado(DIEGO, ANA, "2026-10-06"), noPensionado(DIEGO, ANA, "2026-10-07"), noPensionado(DIEGO, ANA, "2026-10-08")],
    });

    const baja = await e.casos.darDeBaja.ejecutar(admin, DIEGO);

    expect(baja.ok && baja.valor.reservasAnuladasDesde).toBe("2026-10-08");
    expect(e.reservas.de(DIEGO).map((r) => r.estado)).toEqual(["CONFIRMADA", "CONFIRMADA", "CANCELADA"]);
    const familia = await e.casos.verMiFamilia.ejecutar(comoUsuario(ANA));
    expect(familia.ok && [familia.valor.familiares.length, familia.valor.topeDiario]).toEqual([0, 1]);
    const reporte = await e.casos.generarReporte.ejecutar(admin, 2026, 10);
    const deAna = reporte.ok ? reporte.valor.titulares.find((t) => t.titularId === ANA) : undefined;
    expect(deAna?.totalBs).toBe(36);
  });

  it("CA2 antes de las 9:00 también se anula la reserva de hoy (borde)", async () => {
    const e = escenario({ reloj: relojEn("2026-10-06", 8, 59), reservas: [noPensionado(DIEGO, ANA, "2026-10-06")] });

    const baja = await e.casos.darDeBaja.ejecutar(admin, DIEGO);

    expect(baja.ok && baja.valor.reservasAnuladasDesde).toBe("2026-10-06");
    expect(e.reservas.de(DIEGO)[0].estado).toBe("CANCELADA");
  });

  it("CA3 el usuario dado de baja no entra, pierde su sesión y su grupo familiar queda inactivo", async () => {
    const e = escenario({ reservas: [pensionado(DIEGO, ANA, "2026-10-08")] });
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", CLAVE);
    if (!sesion.ok) throw new Error(sesion.mensaje);

    const baja = await e.casos.darDeBaja.ejecutar(admin, ANA);

    expect(baja.ok && baja.valor.personas.map((p) => p.id)).toEqual([ANA, DIEGO]);
    expect((await e.casos.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(false);
    expect((await e.casos.iniciarSesion.ejecutar("arojas", CLAVE)).ok).toBe(false);
    expect((await e.personas.obtener(DIEGO))?.activo).toBe(false);
    expect(e.reservas.de(DIEGO)[0].estado).toBe("CANCELADA");
    expect((await e.casos.darDeBaja.ejecutar(admin, ANA)).ok).toBe(false);
  });

  it("CA4 de empleado a administrador: en el pedido siguiente ve las opciones de administrador", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("cmamani", CLAVE);
    if (!sesion.ok) throw new Error(sesion.mensaje);

    const cambio = await e.casos.cambiarTipoUsuario.ejecutar(admin, CARLOS, "ADMINISTRADOR");
    const ahora = await e.casos.validarSesion.ejecutar(sesion.valor.token);

    expect(cambio.ok).toBe(true);
    expect(ahora.ok && ahora.valor.tipo).toBe("ADMINISTRADOR");
    if (!ahora.ok) return;
    expect((await e.casos.verLista.ejecutar(ahora.valor, "2026-10-06")).ok).toBe(true);
  });

  it("CA5 restablecer genera una temporal y pide cambiarla en el siguiente ingreso", async () => {
    const e = escenario();

    const restablecida = await e.casos.restablecerContrasena.ejecutar(admin, ANA);

    expect(restablecida).toEqual({ ok: true, valor: { temporal: "Temporal99" } });
    expect((await e.casos.iniciarSesion.ejecutar("arojas", CLAVE)).ok).toBe(false);
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", "Temporal99");
    expect(sesion.ok && sesion.valor.usuario.debeCambiarContrasena).toBe(true);
  });

  it("CA6 el único administrador activo no se da de baja ni cambia de tipo", async () => {
    const e = escenario();

    expect(await e.casos.darDeBaja.ejecutar(admin, ELENA)).toEqual({ ok: false, mensaje: ULTIMO_ADMINISTRADOR });
    expect(await e.casos.cambiarTipoUsuario.ejecutar(admin, ELENA, "EMPLEADO")).toEqual({ ok: false, mensaje: ULTIMO_ADMINISTRADOR });
  });

  it("CA6 con otro administrador activo sí se puede", async () => {
    const e = escenario();
    await e.casos.cambiarTipoUsuario.ejecutar(admin, CARLOS, "ADMINISTRADOR");

    expect((await e.casos.cambiarTipoUsuario.ejecutar(admin, ELENA, "EMPLEADO")).ok).toBe(true);
    expect((await e.casos.darDeBaja.ejecutar(comoUsuario(CARLOS, "ADMINISTRADOR"), ELENA)).ok).toBe(true);
  });

  it("CA6 un administrador dado de baja no cuenta como activo", async () => {
    const cuentas = cuentasIniciales().map((c) => (c.personaId === LAURA ? { ...c, tipo: "ADMINISTRADOR" as const } : c));
    const e = escenario({ cuentas });

    expect(await e.casos.darDeBaja.ejecutar(admin, ELENA)).toEqual({ ok: false, mensaje: ULTIMO_ADMINISTRADOR });
  });

  it("modifica datos y parentesco sin repetir CI; valida los datos", async () => {
    const e = escenario();
    const diego = (await e.personas.obtener(DIEGO))!;
    const ana = (await e.personas.obtener(ANA))!;

    const modificado = await e.casos.modificarDatos.ejecutar(admin, DIEGO, { ...diego, telefono: "76543210" }, "HIJA");
    expect(modificado.ok && [modificado.valor.telefono, modificado.valor.parentesco]).toEqual(["76543210", "HIJA"]);
    expect((await e.casos.modificarDatos.ejecutar(admin, DIEGO, { ...diego, ci: ana.ci })).ok).toBe(false);
    expect((await e.casos.modificarDatos.ejecutar(admin, DIEGO, { ...diego, nombres: "" })).ok).toBe(false);
    expect((await e.casos.modificarDatos.ejecutar(admin, DIEGO, diego, "VECINO")).ok).toBe(false);
    expect((await e.casos.modificarDatos.ejecutar(admin, "nadie", diego)).ok).toBe(false);
    expect((await e.casos.modificarDatos.ejecutar(admin, ANA, { ...ana, apellidos: "Rojas Paz" }, "HIJO")).ok).toBe(true);
    expect((await e.personas.obtener(ANA))?.parentesco).toBeNull();
  });

  it("solo el administrador gestiona usuarios; el tipo y el usuario tienen que existir", async () => {
    const e = escenario();
    const ana = comoUsuario(ANA);

    expect((await e.casos.listarUsuarios.ejecutar(ana)).ok).toBe(false);
    expect((await e.casos.verUsuario.ejecutar(ana, ANA)).ok).toBe(false);
    expect((await e.casos.agregarFamiliar.ejecutar(ana, ANA, abuela)).ok).toBe(false);
    expect((await e.casos.modificarDatos.ejecutar(ana, ANA, (await e.personas.obtener(ANA))!)).ok).toBe(false);
    expect((await e.casos.cambiarTipoUsuario.ejecutar(ana, ANA, "ADMINISTRADOR")).ok).toBe(false);
    expect((await e.casos.darDeBaja.ejecutar(ana, DIEGO)).ok).toBe(false);
    expect((await e.casos.restablecerContrasena.ejecutar(ana, ANA)).ok).toBe(false);
    expect((await e.casos.cambiarTipoUsuario.ejecutar(admin, ANA, "JEFE")).ok).toBe(false);
    expect((await e.casos.cambiarTipoUsuario.ejecutar(admin, "nadie", "EMPLEADO")).ok).toBe(false);
    expect((await e.casos.cambiarTipoUsuario.ejecutar(admin, ANA, "EMPLEADO")).ok).toBe(true);
    expect((await e.casos.restablecerContrasena.ejecutar(admin, "nadie")).ok).toBe(false);
    expect((await e.casos.verUsuario.ejecutar(admin, "nadie")).ok).toBe(false);
    expect((await e.casos.darDeBaja.ejecutar(admin, "nadie")).ok).toBe(false);
  });
});
