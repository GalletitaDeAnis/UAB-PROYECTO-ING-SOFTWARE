import { describe, expect, it } from "vitest";
import type { SolicitudRegistro } from "../src/aplicacion/registrarUsuario.js";
import { admin, ANA, comoUsuario, escenario, personasIniciales } from "./fakes.js";

function solicitud(cambios: Partial<SolicitudRegistro> = {}): SolicitudRegistro {
  return {
    datos: { nombres: "Rosa", apellidos: "Choque", ci: "7654321", fechaNacimiento: "1988-03-14", telefono: "71234567" },
    codigoEmpleado: "UB-300",
    nombreUsuario: "rchoque",
    contrasenaInicial: "Inicio2026",
    tipo: "EMPLEADO",
    familiares: [],
    ...cambios,
  };
}

const hijo = { nombres: "Tomás", apellidos: "Choque", ci: "9876543", fechaNacimiento: "2015-08-01", telefono: "71234567", parentesco: "HIJO" };

describe("HU01 registrar usuario y su grupo familiar", () => {
  it("CA1 crea el usuario activo con el tipo asignado y la contraseña cifrada", async () => {
    const e = escenario();

    const resultado = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ tipo: "ADMINISTRADOR" }));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const { persona, cuenta } = resultado.valor;
    expect(persona).toMatchObject({ nombres: "Rosa", apellidos: "Choque", tipo: "EMPLEADO", activo: true });
    expect(cuenta).toMatchObject({ codigoEmpleado: "UB-300", nombreUsuario: "rchoque", tipo: "ADMINISTRADOR" });
    expect(cuenta.contrasenaHash).toBe("cifrada:Inicio2026");
    expect(cuenta.debeCambiarContrasena).toBe(true);
  });

  it("CA2 los familiares quedan asociados al titular y el tope diario se calcula", async () => {
    const e = escenario();
    const esposa = { ...hijo, nombres: "Inés", ci: "5554443", fechaNacimiento: "1989-01-20", parentesco: "CONYUGE" };

    const resultado = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ familiares: [hijo, esposa] }));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.valor.topeDiario).toBe(3);
    expect(resultado.valor.familiares.map((f) => [f.nombres, f.parentesco, f.titularId])).toEqual([
      ["Tomás", "HIJO", resultado.valor.persona.id],
      ["Inés", "CONYUGE", resultado.valor.persona.id],
    ]);
  });

  it("CA3 un CI ya registrado se rechaza e indica el dato duplicado", async () => {
    const e = escenario();
    const ciDeAna = personasIniciales().find((p) => p.id === ANA)!.ci;

    const resultado = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ datos: { ...solicitud().datos, ci: ciDeAna } }));

    expect(resultado).toEqual({ ok: false, mensaje: `Ya existe una persona registrada con el CI ${ciDeAna}.` });
    expect(await e.cuentas.buscarPorNombreUsuario("rchoque")).toBeNull();
  });

  it("CA3 el código de empleado y el nombre de usuario tampoco se repiten", async () => {
    const e = escenario();

    const porCodigo = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ codigoEmpleado: "ub-100" }));
    const porUsuario = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ nombreUsuario: "AROJAS" }));

    expect(porCodigo).toEqual({ ok: false, mensaje: "Ya existe un usuario con el código de empleado UB-100." });
    expect(porUsuario).toEqual({ ok: false, mensaje: "Ya existe un usuario con el nombre de usuario arojas." });
  });

  it("CA3 el mismo CI dos veces dentro del grupo familiar se rechaza", async () => {
    const e = escenario();

    const resultado = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ familiares: [hijo, { ...hijo, nombres: "Otro" }] }));

    expect(resultado).toEqual({ ok: false, mensaje: "Ya existe una persona registrada con el CI 9876543." });
  });

  it("CA4 el parentesco solo puede ser cónyuge, hijo/hija, padre o madre", async () => {
    const e = escenario();

    const resultado = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ familiares: [{ ...hijo, parentesco: "PRIMO" }] }));

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensaje).toContain("cónyuge, hijo/hija, padre o madre");
  });

  it("CA4 solo un cónyuge, un padre y una madre", async () => {
    const e = escenario();
    const conyuge = { ...hijo, parentesco: "CONYUGE" };

    const resultado = await e.casos.registrarUsuario.ejecutar(
      admin,
      solicitud({ familiares: [conyuge, { ...conyuge, ci: "1112223" }] }),
    );

    expect(resultado).toEqual({ ok: false, mensaje: "Familiar 2: ya hay un familiar registrado como cónyuge." });
  });

  it("CA5 el familiar queda sin credenciales de acceso", async () => {
    const e = escenario();

    const resultado = await e.casos.registrarUsuario.ejecutar(admin, solicitud({ familiares: [hijo] }));

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(await e.cuentas.obtener(resultado.valor.familiares[0].id)).toBeNull();
    expect(e.cuentas.cuentas.size).toBe(6);
  });

  it("CA6 un dato obligatorio faltante se indica y no se guarda nada", async () => {
    const e = escenario();
    const casos: [Partial<SolicitudRegistro>, string][] = [
      [{ datos: { ...solicitud().datos, nombres: "  " } }, "Falta el dato obligatorio: Nombres."],
      [{ datos: { ...solicitud().datos, telefono: "" } }, "Falta el dato obligatorio: Teléfono."],
      [{ codigoEmpleado: "" }, "Falta el dato obligatorio: Código de empleado."],
      [{ nombreUsuario: "" }, "Falta el dato obligatorio: Nombre de usuario."],
      [{ contrasenaInicial: "" }, "Falta el dato obligatorio: Contraseña inicial."],
      [{ familiares: [{ ...hijo, apellidos: "" }] }, "Familiar: falta el dato obligatorio: Apellidos."],
    ];

    for (const [cambio, mensaje] of casos) {
      expect(await e.casos.registrarUsuario.ejecutar(admin, solicitud(cambio))).toEqual({ ok: false, mensaje });
    }
    expect(e.cuentas.cuentas.size).toBe(5);
  });

  it("datos con formato inválido se rechazan", async () => {
    const e = escenario();
    const invalidos: Partial<SolicitudRegistro>[] = [
      { datos: { ...solicitud().datos, ci: "12AB" } },
      { datos: { ...solicitud().datos, fechaNacimiento: "2030-01-01" } },
      { datos: { ...solicitud().datos, telefono: "12" } },
      { nombreUsuario: "r choque" },
      { codigoEmpleado: "UB 300" },
      { contrasenaInicial: "corta1" },
      { contrasenaInicial: "sinnumeros" },
      { tipo: "ENCARGADO" },
      { tipo: "ADMINISTRADOR", familiares: [hijo] },
    ];

    for (const cambio of invalidos) {
      expect((await e.casos.registrarUsuario.ejecutar(admin, solicitud(cambio))).ok).toBe(false);
    }
  });

  it("normaliza espacios, mayúsculas del CI y del código, y minúsculas del usuario", async () => {
    const e = escenario();

    const resultado = await e.casos.registrarUsuario.ejecutar(
      admin,
      solicitud({
        datos: { ...solicitud().datos, nombres: "  Rosa   María ", ci: "7654321-1b", telefono: "712-345 67" },
        codigoEmpleado: " ub-300 ",
        nombreUsuario: " RChoque ",
      }),
    );

    expect(resultado.ok && [resultado.valor.persona.nombres, resultado.valor.persona.ci, resultado.valor.persona.telefono]).toEqual([
      "Rosa María",
      "7654321-1B",
      "71234567",
    ]);
    expect(resultado.ok && [resultado.valor.cuenta.codigoEmpleado, resultado.valor.cuenta.nombreUsuario]).toEqual(["UB-300", "rchoque"]);
  });

  it("R3 solo el administrador registra usuarios", async () => {
    const e = escenario();

    const resultado = await e.casos.registrarUsuario.ejecutar(comoUsuario(ANA), solicitud());

    expect(resultado).toEqual({ ok: false, mensaje: "Esta opción es solo para el usuario administrador." });
  });
});
