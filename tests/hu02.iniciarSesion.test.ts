import { describe, expect, it } from "vitest";
import { CAMBIO_PENDIENTE } from "../src/aplicacion/comun.js";
import { CREDENCIALES_INCORRECTAS, USUARIO_DE_BAJA } from "../src/aplicacion/iniciarSesion.js";
import { SESION_EXPIRADA, SIN_SESION } from "../src/aplicacion/sesion.js";
import { ANA, CLAVE, ELENA, escenario } from "./fakes.js";

describe("HU02 iniciar sesión", () => {
  it("CA1 un usuario activo con credenciales correctas entra y recibe su sesión", async () => {
    const e = escenario();

    const resultado = await e.casos.iniciarSesion.ejecutar("arojas", CLAVE);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.usuario).toEqual({ id: ANA, nombreUsuario: "arojas", tipo: "EMPLEADO", debeCambiarContrasena: false });
    expect(resultado.valor.persona.nombres).toBe("Ana");
    // Se guarda el hash del token, no el token.
    expect([...e.sesiones.sesiones.keys()]).toEqual([`hash:${resultado.valor.token}`]);
  });

  it("CA1 el nombre de usuario no distingue mayúsculas ni espacios", async () => {
    const e = escenario();

    expect((await e.casos.iniciarSesion.ejecutar("  AROJAS ", CLAVE)).ok).toBe(true);
  });

  it("CA2 el administrador entra con tipo ADMINISTRADOR", async () => {
    const e = escenario();

    const resultado = await e.casos.iniciarSesion.ejecutar("evargas", CLAVE);

    expect(resultado.ok && resultado.valor.usuario).toMatchObject({ id: ELENA, tipo: "ADMINISTRADOR" });
  });

  it("CA3 el empleado no puede usar las opciones del administrador", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", CLAVE);
    if (!sesion.ok) throw new Error(sesion.mensaje);

    const lista = await e.casos.verLista.ejecutar(sesion.valor.usuario, "2026-10-06");
    const reporte = await e.casos.generarReporte.ejecutar(sesion.valor.usuario, 2026, 10);

    expect(lista).toEqual({ ok: false, mensaje: "Esta opción es solo para el usuario administrador." });
    expect(reporte.ok).toBe(false);
  });

  it("CA4 una contraseña incorrecta muestra el mensaje y no crea sesión", async () => {
    const e = escenario();

    for (const [usuario, clave] of [["arojas", "otra1234"], ["nadie", CLAVE], ["", ""], ["arojas", ""]]) {
      expect(await e.casos.iniciarSesion.ejecutar(usuario, clave)).toEqual({ ok: false, mensaje: CREDENCIALES_INCORRECTAS });
    }
    expect(e.sesiones.sesiones.size).toBe(0);
  });

  it("CA5 un usuario dado de baja no entra", async () => {
    const e = escenario();

    expect(await e.casos.iniciarSesion.ejecutar("lquispe", CLAVE)).toEqual({ ok: false, mensaje: USUARIO_DE_BAJA });
    expect(e.sesiones.sesiones.size).toBe(0);
  });

  it("CA6 con la contraseña inicial solo puede cambiarla antes de continuar", async () => {
    const e = escenario();
    const cuenta = (await e.cuentas.obtener(ANA))!;
    await e.cuentas.actualizar({ ...cuenta, debeCambiarContrasena: true });

    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", CLAVE);
    if (!sesion.ok) throw new Error(sesion.mensaje);
    expect(sesion.valor.usuario.debeCambiarContrasena).toBe(true);

    const reserva = await e.casos.reservar.ejecutar(sesion.valor.usuario, [ANA], "2026-10-06");
    expect(reserva).toEqual({ ok: false, mensaje: CAMBIO_PENDIENTE });

    const cambio = await e.casos.cambiarContrasena.ejecutar(sesion.valor.usuario, CLAVE, "Nueva2026", "Nueva2026");
    expect(cambio.ok).toBe(true);
    expect((await e.cuentas.obtener(ANA))).toMatchObject({ contrasenaHash: "cifrada:Nueva2026", debeCambiarContrasena: false });

    const validado = await e.casos.validarSesion.ejecutar(sesion.valor.token);
    expect(validado.ok && validado.valor.debeCambiarContrasena).toBe(false);
    expect((await e.casos.iniciarSesion.ejecutar("arojas", "Nueva2026")).ok).toBe(true);
  });

  it("CA6 el cambio exige la contraseña actual, confirmación, otra distinta y una segura", async () => {
    const e = escenario();
    const yo = { id: ANA, nombreUsuario: "arojas", tipo: "EMPLEADO" as const, debeCambiarContrasena: true };

    expect((await e.casos.cambiarContrasena.ejecutar(yo, "mala", "Nueva2026", "Nueva2026")).ok).toBe(false);
    expect((await e.casos.cambiarContrasena.ejecutar(yo, CLAVE, "Nueva2026", "Nueva2027")).ok).toBe(false);
    expect((await e.casos.cambiarContrasena.ejecutar(yo, CLAVE, CLAVE, CLAVE)).ok).toBe(false);
    expect((await e.casos.cambiarContrasena.ejecutar(yo, CLAVE, "corta1", "corta1")).ok).toBe(false);
    expect((await e.casos.cambiarContrasena.ejecutar(yo, CLAVE, "solamenteletras", "solamenteletras")).ok).toBe(false);
    expect((await e.cuentas.obtener(ANA))!.contrasenaHash).toBe(`cifrada:${CLAVE}`);
  });

  it("CA7 a los 29 minutos sin actividad la sesión sigue y se renueva", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", CLAVE);
    if (!sesion.ok) throw new Error(sesion.mensaje);

    e.reloj.avanzarMinutos(29);
    expect((await e.casos.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(true);
    e.reloj.avanzarMinutos(29);
    expect((await e.casos.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(true);
  });

  it("CA7 a los 30 minutos sin actividad pide ingresar de nuevo (borde)", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", CLAVE);
    if (!sesion.ok) throw new Error(sesion.mensaje);

    e.reloj.avanzarMinutos(30);

    expect(await e.casos.validarSesion.ejecutar(sesion.valor.token)).toEqual({ ok: false, mensaje: SESION_EXPIRADA });
    expect(await e.casos.validarSesion.ejecutar(sesion.valor.token)).toEqual({ ok: false, mensaje: SIN_SESION });
  });

  it("sin token o con un token desconocido no hay sesión; cerrar sesión la elimina", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", CLAVE);
    if (!sesion.ok) throw new Error(sesion.mensaje);

    expect(await e.casos.validarSesion.ejecutar(null)).toEqual({ ok: false, mensaje: SIN_SESION });
    expect(await e.casos.validarSesion.ejecutar("inventado")).toEqual({ ok: false, mensaje: SIN_SESION });
    await e.casos.cerrarSesion.ejecutar(sesion.valor.token);
    expect((await e.casos.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(false);
  });
});
