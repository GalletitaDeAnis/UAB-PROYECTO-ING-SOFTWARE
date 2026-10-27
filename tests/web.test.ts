import type { AddressInfo } from "node:net";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearRutasWeb } from "../src/presentacion/web.js";
import { ANA, CARLOS, CLAVE, DIEGO, escenario, MARIA, menu, pension, PEDRO, pensionado, relojEn } from "./fakes.js";

/** Pantallas servidas por el backend y descarga del reporte, con dobles en memoria. */
describe("pantallas web", () => {
  const dias = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"];
  const e = escenario({
    reloj: relojEn("2026-10-06", 8, 0),
    menus: [menu("2026-10-05"), menu("2026-10-12"), menu("2026-10-19")],
    reservas: dias.map((fecha) => pensionado(MARIA, PEDRO, fecha)),
    pensiones: [pension(MARIA, PEDRO)],
  });
  let base = "";
  let cerrar: () => void = () => {};

  beforeAll(async () => {
    const app = express();
    app.use(crearRutasWeb(e.casos, { estilos: "body{}", cookieSegura: false, cuentasDemo: true }));
    await new Promise<void>((listo) => {
      const servidor = app.listen(0, () => {
        base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
        cerrar = () => servidor.close();
        listo();
      });
    });
  });

  afterAll(() => cerrar());

  const pedir = (ruta: string, init: RequestInit = {}) => fetch(`${base}${ruta}`, { redirect: "manual", ...init });
  const formulario = (datos: Record<string, string | string[]>, cookie?: string): RequestInit => {
    const cuerpo = new URLSearchParams();
    for (const [clave, valor] of Object.entries(datos)) for (const v of [valor].flat()) cuerpo.append(clave, v);
    return {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
      body: cuerpo.toString(),
    };
  };
  const destino = (r: Response) => decodeURIComponent(r.headers.get("location") ?? "");

  async function ingresar(usuario: string, contrasena = CLAVE): Promise<string> {
    const r = await pedir("/ingresar", formulario({ usuario, contrasena }));
    return (r.headers.get("set-cookie") ?? "").split(";")[0];
  }

  it("HU02 la pantalla de ingreso pide usuario y contraseña y muestra los usuarios de prueba", async () => {
    const html = await (await pedir("/")).text();

    expect(html).toContain('name="contrasena"');
    expect(html).toContain("pflores");
    expect(await (await pedir("/estilos.css")).text()).toBe("body{}");
  });

  it("HU02 CA4 credenciales incorrectas vuelven al ingreso con el mensaje", async () => {
    const r = await pedir("/ingresar", formulario({ usuario: "pflores", contrasena: "mala" }));

    expect(destino(r)).toBe("/?error=Usuario o contraseña incorrectos");
  });

  it("HU02 CA2 y CA3 cada tipo entra a su inicio y no ve las opciones del otro", async () => {
    const empleado = await pedir("/ingresar", formulario({ usuario: "arojas", contrasena: CLAVE }));
    const administrador = await pedir("/ingresar", formulario({ usuario: "evargas", contrasena: CLAVE }));
    const cookieAna = (empleado.headers.get("set-cookie") ?? "").split(";")[0];

    expect(empleado.headers.get("location")).toBe("/inicio");
    expect(empleado.headers.get("set-cookie")).toContain("HttpOnly");
    expect(administrador.headers.get("location")).toBe("/usuarios");
    const inicio = await (await pedir("/inicio", { headers: { cookie: cookieAna } })).text();
    expect(inicio).toContain("Reservar almuerzo");
    expect(inicio).not.toContain("Reporte mensual");
    expect((await pedir("/usuarios", { headers: { cookie: cookieAna } })).headers.get("location")).toBe("/inicio");
    expect((await pedir("/", { headers: { cookie: cookieAna } })).headers.get("location")).toBe("/inicio");
  });

  it("sin sesión, una pantalla protegida vuelve al ingreso", async () => {
    const r = await pedir("/inicio");

    expect(destino(r)).toBe("/?error=Necesitas iniciar sesión.");
  });

  it("HU02 CA6 con la contraseña pendiente todo lleva a cambiarla, y después se continúa", async () => {
    const cuenta = (await e.cuentas.obtener(CARLOS))!;
    await e.cuentas.actualizar({ ...cuenta, debeCambiarContrasena: true });
    const ingreso = await pedir("/ingresar", formulario({ usuario: "cmamani", contrasena: CLAVE }));
    const cookie = (ingreso.headers.get("set-cookie") ?? "").split(";")[0];

    expect(ingreso.headers.get("location")).toBe("/contrasena");
    expect((await pedir("/inicio", { headers: { cookie } })).headers.get("location")).toBe("/contrasena");
    expect(await (await pedir("/contrasena", { headers: { cookie } })).text()).toContain("primer ingreso");
    const malo = await pedir("/contrasena", formulario({ actual: CLAVE, nueva: "corta", confirmacion: "corta" }, cookie));
    expect(destino(malo)).toContain("/contrasena?error=");
    const bueno = await pedir("/contrasena", formulario({ actual: CLAVE, nueva: "Nueva2026", confirmacion: "Nueva2026" }, cookie));
    expect(destino(bueno)).toBe("/inicio?mensaje=Contraseña cambiada.");
    expect((await pedir("/inicio", { headers: { cookie } })).status).toBe(200);
  });

  it("HU04 reserva para varias personas y muestra las reservas del mes; HU05 cancela", async () => {
    const cookie = await ingresar("arojas");

    const r = await pedir("/reservar", formulario({ personaId: [ANA, DIEGO], fecha: "2026-10-07" }, cookie));
    expect(destino(r)).toBe("/inicio?mensaje=Reserva de Ana Rojas confirmada a 18 Bs. Reserva de Diego Rojas confirmada a 18 Bs.");

    const html = await (await pedir("/inicio", { headers: { cookie } })).text();
    expect(html).toContain("miércoles 7 de octubre");
    expect(html).toContain("Diego Rojas");
    expect(html).toContain('action="/cancelar"');

    const repetida = await pedir("/reservar", formulario({ personaId: ANA, fecha: "2026-10-07" }, cookie));
    expect(destino(repetida)).toBe("/inicio?error=Ana Rojas: Ana Rojas ya tiene una reserva para ese día.");

    const cancelada = await pedir("/cancelar", formulario({ personaId: DIEGO, fecha: "2026-10-07" }, cookie));
    expect(destino(cancelada)).toBe("/inicio?mensaje=La reserva quedó cancelada y no se cobra.");
    const otroMes = await (await pedir("/inicio?mes=2026-11", { headers: { cookie } })).text();
    expect(otroMes).toContain("No hay reservas en este mes.");
  });

  it("HU04 CA6 un día sin menú se rechaza con el mensaje", async () => {
    const cookie = await ingresar("arojas");

    const r = await pedir("/reservar", formulario({ personaId: ANA, fecha: "2026-10-09" }, cookie));

    expect(destino(r)).toBe("/inicio?error=El restaurante solo atiende de lunes a jueves.");
  });

  it("HU08 avisa la inasistencia de un pensionado; HU07 muestra la pensión; HU11 el consumo", async () => {
    const cookie = await ingresar("pflores");

    // 12 días con menú y mínimo 10: dos avisos se aceptan, el tercero no.
    for (const fecha of ["2026-10-12", "2026-10-13"]) {
      const aviso = await pedir("/avisar", formulario({ personaId: MARIA, fecha }, cookie));
      expect(destino(aviso)).toContain("Inasistencia avisada");
    }
    const tercero = await pedir("/avisar", formulario({ personaId: MARIA, fecha: "2026-10-14" }, cookie));
    expect(destino(tercero)).toContain("/inicio?error=María Flores tiene 10 almuerzos programados en el mes y su mínimo es 10.");

    const paginaPension = await (await pedir("/pension", { headers: { cookie } })).text();
    expect(paginaPension).toContain("Pensión de noviembre de 2026");
    expect(paginaPension).toContain("María Flores");

    const pensionado = await pedir("/pensionar", formulario({ personaId: [PEDRO], mes: "2026-11" }, cookie));
    expect(destino(pensionado)).toBe("/pension?mensaje=Pedro Flores queda pensionado a 15 Bs por almuerzo.");
    const vacio = await pedir("/pensionar", formulario({ mes: "2026-11" }, cookie));
    expect(destino(vacio)).toBe("/pension?error=Elige al menos una persona.");

    const consumo = await (await pedir("/consumo?mes=2026-10", { headers: { cookie } })).text();
    expect(consumo).toContain("Total a descontar por planilla");
    expect(consumo).toContain("150 Bs");
  });

  it("HU01 el administrador registra un usuario con su familiar; un error vuelve con lo escrito", async () => {
    const cookie = await ingresar("evargas");
    const datos = {
      nombres: "Rosa", apellidos: "Choque", ci: "7654321", fechaNacimiento: "1988-03-14", telefono: "71234567",
      codigoEmpleado: "UB-300", nombreUsuario: "rchoque", contrasenaInicial: "Inicio2026", tipo: "EMPLEADO",
      fam1_parentesco: "HIJO", fam1_nombres: "Tomás", fam1_apellidos: "Choque", fam1_ci: "9876543", fam1_fechaNacimiento: "2015-08-01", fam1_telefono: "71234567",
      fam2_parentesco: "HIJO", fam2_nombres: "", fam2_apellidos: "", fam2_ci: "", fam2_fechaNacimiento: "", fam2_telefono: "",
    };

    expect(await (await pedir("/usuarios/nuevo", { headers: { cookie } })).text()).toContain("Registrar usuario");
    const fallido = await pedir("/usuarios", formulario({ ...datos, ci: "" }, cookie));
    expect(fallido.status).toBe(400);
    const html = await fallido.text();
    expect(html).toContain("Falta el dato obligatorio: CI.");
    expect(html).toContain('value="rchoque"');

    const r = await pedir("/usuarios", formulario(datos, cookie));
    expect(destino(r)).toMatch(/^\/usuarios\/P-\d+\?mensaje=Usuario registrado con 1 familiar\(es\)\. Tope diario: 2\.$/);
    const ficha = await (await pedir(r.headers.get("location")!, { headers: { cookie } })).text();
    expect(ficha).toContain("Tomás Choque");
    expect(ficha).toContain("Debe cambiar la contraseña");
    expect(await (await pedir("/usuarios", { headers: { cookie } })).text()).toContain("rchoque");
  });

  it("HU09 agrega familiar, modifica datos, cambia tipo, restablece y da de baja", async () => {
    const cookie = await ingresar("evargas");
    const familiar = {
      parentesco: "MADRE", nombres: "Rosa", apellidos: "Rojas", ci: "3332221", fechaNacimiento: "1955-02-02", telefono: "72000000",
    };

    const agregado = await pedir(`/usuarios/${ANA}/familiares`, formulario(familiar, cookie));
    expect(destino(agregado)).toBe(`/usuarios/${ANA}?mensaje=Familiar agregado: el tope diario subió en uno.`);
    const datos = await pedir(`/personas/${DIEGO}/datos`, formulario({ ...familiar, parentesco: "HIJO", nombres: "Diego", ci: "3332229", volver: ANA }, cookie));
    expect(destino(datos)).toBe(`/usuarios/${ANA}?mensaje=Datos guardados.`);
    const tipo = await pedir(`/usuarios/${PEDRO}/tipo`, formulario({ tipo: "ADMINISTRADOR" }, cookie));
    expect(destino(tipo)).toBe(`/usuarios/${PEDRO}?mensaje=Tipo de usuario actualizado.`);
    await pedir(`/usuarios/${PEDRO}/tipo`, formulario({ tipo: "EMPLEADO" }, cookie));

    const restablecida = await pedir(`/usuarios/${ANA}/contrasena`, formulario({}, cookie));
    expect(destino(restablecida)).toBe(`/usuarios/${ANA}?temporal=Temporal99`);
    expect(await (await pedir(`/usuarios/${ANA}?temporal=Temporal99`, { headers: { cookie } })).text()).toContain("se muestra solo esta vez");

    const baja = await pedir(`/personas/${DIEGO}/baja`, formulario({ volver: ANA }, cookie));
    expect(destino(baja)).toContain(`/usuarios/${ANA}?mensaje=Baja registrada (Diego Rojas)`);
    const otra = await pedir(`/personas/${DIEGO}/baja`, formulario({ volver: ANA }, cookie));
    expect(destino(otra)).toBe(`/usuarios/${ANA}?error=Esa persona ya está dada de baja.`);
    expect(destino(await pedir("/usuarios/nadie", { headers: { cookie } }))).toBe("/usuarios?error=Ese usuario no existe.");
  });

  it("HU03 el administrador ve y publica el menú; publicado no se puede volver a publicar", async () => {
    const cookie = await ingresar("evargas");

    const vacio = await (await pedir("/menu?semana=2026-10-26", { headers: { cookie } })).text();
    expect(vacio).toContain("Publicar menú");
    const publicado = await pedir("/menu", formulario({ lunes: "2026-10-26", "menu_2026-10-26": "Sopa de maní", "menu_2026-10-27": "" }, cookie));
    expect(destino(publicado)).toBe("/menu?semana=2026-10-26&mensaje=Menú publicado con 1 día(s) de atención. Almuerzos de pensionados confirmados: 1.");
    const visto = await (await pedir("/menu?semana=2026-10-26", { headers: { cookie } })).text();
    expect(visto).toContain("Sopa de maní");
    expect(visto).toContain("Sin atención");

    const repetido = await pedir("/menu", formulario({ lunes: "2026-10-26", "menu_2026-10-27": "Otra" }, cookie));
    expect(repetido.status).toBe(400);
    expect(await repetido.text()).toContain("ya fue publicado");
    expect(await (await pedir("/menu", { headers: { cookie } })).text()).toContain("Semana del");
    expect(await (await pedir("/menu?semana=2026-09-28", { headers: { cookie } })).text()).toContain("terminó sin menú");
  });

  it("HU06 lista del día y HU10 reporte con descarga; un empleado no descarga", async () => {
    const admin = await ingresar("evargas");
    const empleado = await ingresar("pflores");

    const lista = await (await pedir("/dia?fecha=2026-10-07", { headers: { cookie: admin } })).text();
    expect(lista).toContain("María Flores");
    const sinAtencion = await (await pedir("/dia?fecha=2026-10-09", { headers: { cookie: admin } })).text();
    expect(sinAtencion).toContain("Sin atención");
    expect(destino(await pedir("/dia?fecha=mal", { headers: { cookie: admin } }))).toBe("/usuarios?error=La fecha no es válida.");

    const reporte = await (await pedir("/reporte?mes=2026-10", { headers: { cookie: admin } })).text();
    expect(reporte).toContain("Reporte para planilla");
    expect(reporte).toContain("Sin consumo en el mes");

    const excel = await pedir("/api/reportes/2026/10.xlsx", { headers: { cookie: admin } });
    expect(excel.status).toBe(200);
    expect(excel.headers.get("content-disposition")).toContain("descuento-almuerzos-2026-10.xlsx");
    expect((await pedir("/api/reportes/2026/10.pdf", { headers: { cookie: empleado } })).status).toBe(403);
    expect((await pedir("/api/reportes/2026/10.csv", { headers: { cookie: admin } })).status).toBe(404);
    expect((await pedir("/api/reportes/2026/13.pdf", { headers: { cookie: admin } })).status).toBe(400);
    expect((await pedir("/api/reportes/2026/10.pdf")).status).toBe(401);
  });

  it("salir cierra la sesión", async () => {
    const cookie = await ingresar("arojas");

    const r = await pedir("/salir", formulario({}, cookie));

    expect(r.headers.get("location")).toBe("/");
    expect(destino(await pedir("/inicio", { headers: { cookie } }))).toContain("/?error=");
  });
});
