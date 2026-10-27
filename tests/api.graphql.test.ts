import { describe, expect, it } from "vitest";
import { crearServidorGraphql } from "../src/presentacion/graphql/servidorGraphql.js";
import { ANA, CLAVE, DIEGO, escenario, MARIA, PEDRO, relojEn } from "./fakes.js";

type Respuesta = { data?: any; errors?: { message: string; extensions?: { code?: string } }[] };

/** El contrato que consume un frontend aparte, de punta a punta con dobles en memoria. */
function api(e = escenario()) {
  const yoga = crearServidorGraphql(e.casos, { graphiql: false, origenesPermitidos: [] });
  async function consultar(query: string, variables: Record<string, unknown> = {}, token?: string): Promise<Respuesta> {
    const respuesta = await yoga.fetch("http://prueba/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query, variables }),
    });
    return (await respuesta.json()) as Respuesta;
  }
  async function ingresar(usuario: string, contrasena = CLAVE): Promise<string> {
    const r = await consultar(
      `mutation ($u: String!, $c: String!) { iniciarSesion(usuario: $u, contrasena: $c) { ok mensaje token } }`,
      { u: usuario, c: contrasena },
    );
    return r.data.iniciarSesion.token as string;
  }
  return { e, consultar, ingresar };
}

describe("API GraphQL", () => {
  it("HU02 iniciarSesion devuelve token, usuario y persona", async () => {
    const { consultar } = api();

    const r = await consultar(`mutation {
      iniciarSesion(usuario: "pflores", contrasena: "${CLAVE}") {
        ok mensaje token minutosDeInactividad
        usuario { id tipo debeCambiarContrasena }
        persona { nombreCompleto }
      }
    }`);

    const sesion = r.data.iniciarSesion;
    expect(sesion).toMatchObject({ ok: true, minutosDeInactividad: 30, persona: { nombreCompleto: "Pedro Flores" } });
    expect(sesion.usuario).toEqual({ id: PEDRO, tipo: "EMPLEADO", debeCambiarContrasena: false });
    expect(sesion.token).toBeTruthy();
  });

  it("HU02 CA4 credenciales incorrectas: ok=false con el mensaje", async () => {
    const { consultar } = api();

    const r = await consultar(`mutation { iniciarSesion(usuario: "pflores", contrasena: "x") { ok mensaje token } }`);

    expect(r.data.iniciarSesion).toEqual({ ok: false, mensaje: "Usuario o contraseña incorrectos", token: null });
  });

  it("sin token responde UNAUTHENTICATED; `hoy` es pública", async () => {
    const { consultar } = api(escenario({ reloj: relojEn("2026-10-07", 8, 0) }));

    const protegida = await consultar(`{ miFamilia { topeDiario } }`);
    const publica = await consultar(`{ hoy { fecha horaLimite lunes } }`);

    expect(protegida.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    expect(publica.data.hoy).toEqual({ fecha: "2026-10-07", horaLimite: "09:00", lunes: "2026-10-05" });
  });

  it("HU02 CA6 con la contraseña pendiente las consultas responden PASSWORD_CHANGE_REQUIRED hasta cambiarla", async () => {
    const e = escenario();
    const cuenta = (await e.cuentas.obtener(ANA))!;
    await e.cuentas.actualizar({ ...cuenta, debeCambiarContrasena: true });
    const { consultar, ingresar } = api(e);
    const token = await ingresar("arojas");

    const bloqueada = await consultar(`{ misReservas(anio: 2026, mes: 10) { fecha } }`, {}, token);
    const cambio = await consultar(
      `mutation { cambiarContrasena(actual: "${CLAVE}", nueva: "Nueva2026", confirmacion: "Nueva2026") { ok usuario { debeCambiarContrasena } } }`,
      {},
      token,
    );
    const libre = await consultar(`{ misReservas(anio: 2026, mes: 10) { fecha } }`, {}, token);

    expect(bloqueada.errors?.[0].extensions?.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(cambio.data.cambiarContrasena).toEqual({ ok: true, usuario: { debeCambiarContrasena: false } });
    expect(libre.data.misReservas).toEqual([]);
  });

  it("HU03 + HU04 + HU05 el administrador publica y el empleado reserva y cancela", async () => {
    const { consultar, ingresar } = api(escenario({ reloj: relojEn("2026-10-18", 18, 0), menus: [] }));
    const admin = await ingresar("evargas");
    const ana = await ingresar("arojas");

    const menu = await consultar(
      `mutation { publicarMenu(lunes: "2026-10-19", dias: [{ fecha: "2026-10-19", descripcion: "Silpancho" }]) { ok reservasDePension menu { dias { fecha descripcion } } } }`,
      {},
      admin,
    );
    const visto = await consultar(`{ menuSemanal(lunes: "2026-10-19") { publicado dias { fecha descripcion } } }`, {}, ana);
    const reserva = await consultar(
      `mutation ($p: [ID!]) { reservarAlmuerzo(fecha: "2026-10-19", personaIds: $p) { ok resultados { nombre ok mensaje } } }`,
      { p: [ANA, DIEGO] },
      ana,
    );
    const cancelada = await consultar(
      `mutation { cancelarReserva(fecha: "2026-10-19", personaId: "${DIEGO}") { ok reserva { estado } } }`,
      {},
      ana,
    );
    const sinMenu = await consultar(`mutation { reservarAlmuerzo(fecha: "2026-10-20") { ok mensaje resultados { ok } } }`, {}, ana);

    expect(menu.data.publicarMenu).toEqual({ ok: true, reservasDePension: 0, menu: { dias: [{ fecha: "2026-10-19", descripcion: "Silpancho" }] } });
    expect(visto.data.menuSemanal.dias[1]).toEqual({ fecha: "2026-10-20", descripcion: null });
    expect(reserva.data.reservarAlmuerzo.ok).toBe(true);
    expect(reserva.data.reservarAlmuerzo.resultados.map((r: { nombre: string }) => r.nombre)).toEqual(["Ana Rojas", "Diego Rojas"]);
    expect(cancelada.data.cancelarReserva).toEqual({ ok: true, reserva: { estado: "CANCELADA" } });
    expect(sinMenu.data.reservarAlmuerzo).toEqual({ ok: false, mensaje: "Ese día no hay atención: no tiene menú publicado.", resultados: [] });
  });

  it("HU04 sin personaIds reserva para quien inició sesión; un rechazo parcial da ok=false con detalle", async () => {
    const { consultar, ingresar } = api();
    const pedro = await ingresar("pflores");

    const propia = await consultar(`mutation { reservarAlmuerzo(fecha: "2026-10-06") { ok resultados { personaId } } }`, {}, pedro);
    const repetida = await consultar(
      `mutation ($p: [ID!]) { reservarAlmuerzo(fecha: "2026-10-06", personaIds: $p) { ok mensaje resultados { ok } } }`,
      { p: [PEDRO, MARIA] },
      pedro,
    );

    expect(propia.data.reservarAlmuerzo).toEqual({ ok: true, resultados: [{ personaId: PEDRO }] });
    expect(repetida.data.reservarAlmuerzo.ok).toBe(false);
    expect(repetida.data.reservarAlmuerzo.resultados).toEqual([{ ok: false }, { ok: true }]);
  });

  it("R2 un empleado que pide la lista del día recibe FORBIDDEN; el administrador la ve", async () => {
    const { consultar, ingresar } = api();
    const ana = await ingresar("arojas");
    const admin = await ingresar("evargas");

    const prohibida = await consultar(`{ listaDelDia(fecha: "2026-10-06") { total } }`, {}, ana);
    const lista = await consultar(`{ listaDelDia { fecha total sinAtencion menu } }`, {}, admin);
    const invalida = await consultar(`{ listaDelDia(fecha: "ayer") { total } }`, {}, admin);

    expect(prohibida.errors?.[0].extensions?.code).toBe("FORBIDDEN");
    expect(lista.data.listaDelDia).toEqual({ fecha: "2026-10-06", total: 0, sinAtencion: false, menu: "Almuerzo del 2026-10-06" });
    expect(invalida.errors?.[0].extensions?.code).toBe("BAD_USER_INPUT");
  });

  it("HU07 + HU08 pensionar y avisar; HU11 consumo", async () => {
    const { consultar, ingresar } = api(escenario({ reloj: relojEn("2026-10-20", 8, 0) }));
    const pedro = await ingresar("pflores");

    const pension = await consultar(
      `mutation ($p: [ID!]!) { pensionar(anio: 2026, mes: 11, personaIds: $p) { ok resultados { nombre ok } } }`,
      { p: [MARIA] },
      pedro,
    );
    const aviso = await consultar(`mutation { avisarInasistencia(fecha: "2026-10-20", personaId: "${MARIA}") { ok mensaje } }`, {}, pedro);
    const consumo = await consultar(`{ miConsumo(anio: 2026, mes: 10) { totalBs diasSinAtencion personas { persona { nombres } } } }`, {}, pedro);
    const familia = await consultar(`{ miFamilia { topeDiario familiares { nombres parentesco } } }`, {}, pedro);

    expect(pension.data.pensionar).toEqual({ ok: true, resultados: [{ nombre: "María Flores", ok: true }] });
    expect(aviso.data.avisarInasistencia.ok).toBe(false);
    expect(consumo.data.miConsumo.totalBs).toBe(0);
    expect(familia.data.miFamilia.topeDiario).toBe(5);
  });

  it("HU01 + HU09 el administrador registra, consulta, cambia tipo, restablece y da de baja", async () => {
    const { consultar, ingresar } = api();
    const admin = await ingresar("evargas");

    const registro = await consultar(
      `mutation ($r: RegistroInput!) { registrarUsuario(registro: $r) { ok mensaje ficha { topeDiario persona { id nombreCompleto } familiares { parentesco } } } }`,
      {
        r: {
          datos: { nombres: "Rosa", apellidos: "Choque", ci: "7654321", fechaNacimiento: "1988-03-14", telefono: "71234567" },
          codigoEmpleado: "UB-300",
          nombreUsuario: "rchoque",
          contrasenaInicial: "Inicio2026",
          tipo: "EMPLEADO",
          familiares: [{ nombres: "Tomás", apellidos: "Choque", ci: "9876543", fechaNacimiento: "2015-08-01", telefono: "71234567", parentesco: "HIJO" }],
        },
      },
      admin,
    );
    const id = registro.data.registrarUsuario.ficha.persona.id;
    const agregado = await consultar(
      `mutation ($f: FamiliarInput!) { agregarFamiliar(titularId: "${id}", familiar: $f) { ok persona { nombreCompleto } } }`,
      { f: { nombres: "Inés", apellidos: "Choque", ci: "5554443", fechaNacimiento: "1960-01-20", telefono: "71234567", parentesco: "MADRE" } },
      admin,
    );
    const datos = await consultar(
      `mutation ($d: DatosPersonalesInput!) { modificarDatos(personaId: "${id}", datos: $d) { ok persona { telefono } } }`,
      { d: { nombres: "Rosa", apellidos: "Choque", ci: "7654321", fechaNacimiento: "1988-03-14", telefono: "79999999" } },
      admin,
    );
    const tipo = await consultar(`mutation { cambiarTipoUsuario(personaId: "${id}", tipo: ADMINISTRADOR) { ok ficha { cuenta { tipo } } } }`, {}, admin);
    const tipoMalo = await consultar(`mutation { cambiarTipoUsuario(personaId: "nadie", tipo: EMPLEADO) { ok mensaje } }`, {}, admin);
    const temporal = await consultar(`mutation { restablecerContrasena(personaId: "${id}") { ok temporal } }`, {}, admin);
    const baja = await consultar(`mutation { darDeBaja(personaId: "${id}") { ok personas { nombres activo } } }`, {}, admin);
    const usuarios = await consultar(`{ usuarios { cuenta { nombreUsuario } persona { activo } } }`, {}, admin);
    const uno = await consultar(`{ usuario(id: "${id}") { topeDiario familiares { nombres activo } } }`, {}, admin);

    expect(registro.data.registrarUsuario).toMatchObject({ ok: true, ficha: { topeDiario: 2, familiares: [{ parentesco: "HIJO" }] } });
    expect(agregado.data.agregarFamiliar).toEqual({ ok: true, persona: { nombreCompleto: "Inés Choque" } });
    expect(datos.data.modificarDatos).toEqual({ ok: true, persona: { telefono: "79999999" } });
    expect(tipo.data.cambiarTipoUsuario).toEqual({ ok: true, ficha: { cuenta: { tipo: "ADMINISTRADOR" } } });
    expect(tipoMalo.data.cambiarTipoUsuario.ok).toBe(false);
    expect(temporal.data.restablecerContrasena).toEqual({ ok: true, temporal: "Temporal99" });
    expect(baja.data.darDeBaja.ok).toBe(true);
    expect(usuarios.data.usuarios).toHaveLength(6);
    expect(uno.data.usuario.familiares.every((f: { activo: boolean }) => !f.activo)).toBe(true);
  });

  it("HU10 el reporte trae los titulares y las URL de Excel y PDF; un empleado recibe FORBIDDEN", async () => {
    const { consultar, ingresar } = api();
    const admin = await ingresar("evargas");
    const ana = await ingresar("arojas");

    const reporte = await consultar(`{ reporteMensual(anio: 2026, mes: 10) { totalBs urlExcel urlPdf titulares { codigoEmpleado totalBs } } }`, {}, admin);
    const prohibido = await consultar(`{ reporteMensual(anio: 2026, mes: 10) { totalBs } }`, {}, ana);
    const usuarios = await consultar(`{ usuarios { topeDiario } }`, {}, ana);

    expect(reporte.data.reporteMensual).toMatchObject({ totalBs: 0, urlExcel: "/api/reportes/2026/10.xlsx", urlPdf: "/api/reportes/2026/10.pdf" });
    expect(reporte.data.reporteMensual.titulares.map((t: { codigoEmpleado: string }) => t.codigoEmpleado)).toEqual(["UB-100", "UB-101", "UB-103"]);
    expect(prohibido.errors?.[0].extensions?.code).toBe("FORBIDDEN");
    expect(usuarios.errors?.[0].extensions?.code).toBe("FORBIDDEN");
  });

  it("cerrarSesion invalida el token y `yo` responde quién está", async () => {
    const { consultar, ingresar } = api();
    const token = await ingresar("arojas");

    const yo = await consultar(`{ yo { nombreUsuario tipo } }`, {}, token);
    await consultar(`mutation { cerrarSesion }`, {}, token);
    const despues = await consultar(`{ yo { tipo } }`, {}, token);

    expect(yo.data.yo).toEqual({ nombreUsuario: "arojas", tipo: "EMPLEADO" });
    expect(despues.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
  });
});
