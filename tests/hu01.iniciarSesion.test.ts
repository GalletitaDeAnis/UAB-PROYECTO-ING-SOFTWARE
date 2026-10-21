import { describe, expect, it } from "vitest";
import { SOLO_ENCARGADO } from "../src/aplicacion/comun.js";
import { API_NO_DISPONIBLE, CREDENCIALES_INCORRECTAS, USUARIO_INACTIVO } from "../src/aplicacion/iniciarSesion.js";
import { SESION_EXPIRADA, SIN_SESION } from "../src/aplicacion/sesion.js";
import { ana, comoUsuario, escenario } from "./fakes.js";

describe("HU01 iniciar sesión con el usuario del sistema empresarial", () => {
  it("CA1 credenciales correctas y empleado activo: entra, con su nombre y su familia", async () => {
    const e = escenario({ personas: [] });

    const resultado = await e.casos.iniciarSesion.ejecutar("arojas", "demo123");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.empleado.nombreCompleto).toBe("Ana Rojas");
    expect(resultado.valor.usuario).toEqual({ codigoInstitucional: "UB-100", rol: "EMPLEADO" });
    expect(resultado.valor.familiares.map((f) => f.nombreCompleto)).toEqual(["Diego Rojas"]);
    expect(await e.personas.obtener("FAM-1001")).toMatchObject({ codigoTitular: "UB-100", vigente: true });
  });

  it("CA1 la contraseña no se guarda: solo queda el hash del token de la sesión", async () => {
    const e = escenario();

    const resultado = await e.casos.iniciarSesion.ejecutar("arojas", "demo123");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const guardado = JSON.stringify([...e.sesiones.sesiones.values()]);
    expect(guardado).not.toContain("demo123");
    expect(guardado).not.toContain(`"${resultado.valor.token}"`);
    expect(e.sesiones.sesiones.has(`hash:${resultado.valor.token}`)).toBe(true);
  });

  it("CA2 contraseña incorrecta: mensaje y sin sesión", async () => {
    const e = escenario();

    const resultado = await e.casos.iniciarSesion.ejecutar("arojas", "otra");

    expect(resultado).toEqual({ ok: false, mensaje: CREDENCIALES_INCORRECTAS });
    expect(e.sesiones.sesiones.size).toBe(0);
  });

  it("CA2 usuario o contraseña vacíos no llegan a la API", async () => {
    const e = escenario();

    expect(await e.casos.iniciarSesion.ejecutar("  ", "demo123")).toEqual({ ok: false, mensaje: CREDENCIALES_INCORRECTAS });
    expect(await e.casos.iniciarSesion.ejecutar("arojas", "")).toEqual({ ok: false, mensaje: CREDENCIALES_INCORRECTAS });
    expect(e.empresarial.llamadas).toEqual([]);
  });

  it("CA3 empleado inactivo en el sistema empresarial: no entra", async () => {
    const e = escenario();

    const resultado = await e.casos.iniciarSesion.ejecutar("lquispe", "demo123");

    expect(resultado).toEqual({ ok: false, mensaje: USUARIO_INACTIVO });
    expect(e.sesiones.sesiones.size).toBe(0);
  });

  it("CA3 credenciales válidas de alguien que la API ya no tiene como empleado: no entra", async () => {
    const e = escenario();
    e.empresarial.cuentas.push({
      usuario: "fantasma",
      contrasena: "demo123",
      empleado: { codigoInstitucional: "UB-999", nombreCompleto: "X", activo: true },
      familiares: [],
    });
    e.empresarial.obtenerEmpleado = async () => null;

    const resultado = await e.casos.iniciarSesion.ejecutar("fantasma", "demo123");

    expect(resultado).toEqual({ ok: false, mensaje: USUARIO_INACTIVO });
  });

  it("CA4 la API no responde en 5 segundos: mensaje y sin ingreso", async () => {
    const e = escenario();
    e.empresarial.caido = true;

    const resultado = await e.casos.iniciarSesion.ejecutar("arojas", "demo123");

    expect(resultado).toEqual({ ok: false, mensaje: API_NO_DISPONIBLE });
    expect(e.sesiones.sesiones.size).toBe(0);
  });

  it("CA5 a los 29 minutos sin uso la sesión sigue; a los 30 pide ingresar de nuevo", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", "demo123");
    if (!sesion.ok) throw new Error(sesion.mensaje);

    e.reloj.avanzarMinutos(29);
    expect((await e.casos.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(true);

    e.reloj.avanzarMinutos(30);
    expect(await e.casos.validarSesion.ejecutar(sesion.valor.token)).toEqual({ ok: false, mensaje: SESION_EXPIRADA });
    expect(e.sesiones.sesiones.size).toBe(0);
  });

  it("CA5 cada acción renueva los 30 minutos", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", "demo123");
    if (!sesion.ok) throw new Error(sesion.mensaje);

    for (let i = 0; i < 4; i++) {
      e.reloj.avanzarMinutos(20);
      expect((await e.casos.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(true);
    }
  });

  it("un token desconocido, vacío o de una sesión cerrada no sirve", async () => {
    const e = escenario();
    const sesion = await e.casos.iniciarSesion.ejecutar("arojas", "demo123");
    if (!sesion.ok) throw new Error(sesion.mensaje);

    expect(await e.casos.validarSesion.ejecutar("inventado")).toEqual({ ok: false, mensaje: SIN_SESION });
    expect(await e.casos.validarSesion.ejecutar(null)).toEqual({ ok: false, mensaje: SIN_SESION });
    await e.casos.cerrarSesion.ejecutar(sesion.valor.token);
    expect((await e.casos.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(false);
  });

  it("CA6 el encargado recibe su rol; un empleado sin ese rol no abre sus opciones", async () => {
    const e = escenario();

    const elena = await e.casos.iniciarSesion.ejecutar("evargas", "demo123");
    expect(elena.ok && elena.valor.usuario.rol).toBe("ENCARGADO");

    const lista = await e.casos.verLista.ejecutar(comoUsuario(ana), "2026-10-06");
    expect(lista).toEqual({ ok: false, mensaje: SOLO_ENCARGADO });
  });
});
