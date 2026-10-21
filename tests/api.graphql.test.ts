import { describe, expect, it } from "vitest";
import { crearServidorGraphql } from "../src/presentacion/graphql/servidorGraphql.js";
import { escenario, relojEn } from "./fakes.js";

/** El contrato que consume el frontend, de punta a punta con dobles en memoria. */
function api(e = escenario()) {
  const yoga = crearServidorGraphql(e.casos, { graphiql: false, origenesPermitidos: [] });
  async function consultar(query: string, variables: Record<string, unknown> = {}, token?: string) {
    const respuesta = await yoga.fetch("http://prueba/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ query, variables }),
    });
    return (await respuesta.json()) as { data?: any; errors?: { message: string; extensions?: { code?: string } }[] };
  }
  async function ingresar(usuario: string) {
    const r = await consultar(
      `mutation ($u: String!, $c: String!) { iniciarSesion(usuario: $u, contrasena: $c) { ok mensaje token } }`,
      { u: usuario, c: "demo123" },
    );
    return r.data.iniciarSesion.token as string;
  }
  return { e, consultar, ingresar };
}

describe("API GraphQL", () => {
  it("iniciarSesion devuelve token, usuario y familia con tope", async () => {
    const { consultar } = api();

    const r = await consultar(`mutation {
      iniciarSesion(usuario: "pflores", contrasena: "demo123") {
        ok mensaje token minutosDeInactividad
        usuario { codigoInstitucional rol }
        familia { topeDiario familiares { nombreCompleto parentesco } }
      }
    }`);

    const sesion = r.data.iniciarSesion;
    expect(sesion.ok).toBe(true);
    expect(sesion.token).toBeTruthy();
    expect(sesion.minutosDeInactividad).toBe(30);
    expect(sesion.usuario).toEqual({ codigoInstitucional: "UB-103", rol: "EMPLEADO" });
    expect(sesion.familia.topeDiario).toBe(5);
  });

  it("credenciales incorrectas: ok=false con el mensaje de HU01", async () => {
    const { consultar } = api();

    const r = await consultar(`mutation { iniciarSesion(usuario: "pflores", contrasena: "x") { ok mensaje token } }`);

    expect(r.data.iniciarSesion).toEqual({ ok: false, mensaje: "Usuario o contraseña incorrectos", token: null });
  });

  it("sin token, las consultas protegidas responden UNAUTHENTICATED; `hoy` es pública", async () => {
    const { consultar } = api();

    const protegida = await consultar(`{ miFamilia { topeDiario } }`);
    const publica = await consultar(`{ hoy { fecha horaLimite fechaSugerida } }`);

    expect(protegida.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
    expect(publica.data.hoy).toEqual({ fecha: "2026-10-06", horaLimite: "09:00", fechaSugerida: "2026-10-06" });
  });

  it("la sesión vencida responde UNAUTHENTICATED con el mensaje de HU01 CA5", async () => {
    const { e, consultar, ingresar } = api();
    const token = await ingresar("arojas");
    e.reloj.avanzarMinutos(31);

    const r = await consultar(`{ yo { rol } }`, {}, token);

    expect(r.errors?.[0]).toMatchObject({
      message: "Tu sesión expiró por inactividad. Vuelve a ingresar.",
      extensions: { code: "UNAUTHENTICATED" },
    });
  });

  it("reservar sin personaId es para uno mismo; con personaId, para el familiar; y aparece en misAlmuerzos", async () => {
    const { consultar, ingresar } = api();
    const token = await ingresar("arojas");

    const propia = await consultar(`mutation { reservarAlmuerzo(fecha: "2026-10-06") { ok almuerzo { personaId precioBs modalidad } } }`, {}, token);
    const familiar = await consultar(
      `mutation { reservarAlmuerzo(fecha: "2026-10-06", personaId: "FAM-1001") { ok almuerzo { personaId } } }`,
      {},
      token,
    );
    const mias = await consultar(`{ misAlmuerzos(anio: 2026, mes: 10) { nombrePersona fecha estado } }`, {}, token);

    expect(propia.data.reservarAlmuerzo).toEqual({ ok: true, almuerzo: { personaId: "UB-100", precioBs: 18, modalidad: "ESPORADICO" } });
    expect(familiar.data.reservarAlmuerzo.ok).toBe(true);
    expect(mias.data.misAlmuerzos.map((a: { nombrePersona: string }) => a.nombrePersona)).toEqual(["Ana Rojas", "Diego Rojas"]);
  });

  it("una regla que no se cumple vuelve como ok=false con el mensaje, sin error GraphQL", async () => {
    const { consultar, ingresar } = api();
    const token = await ingresar("arojas");

    const r = await consultar(`mutation { reservarAlmuerzo(fecha: "2026-10-09") { ok mensaje almuerzo { fecha } } }`, {}, token);

    expect(r.errors).toBeUndefined();
    expect(r.data.reservarAlmuerzo).toEqual({ ok: false, mensaje: "El restaurante solo atiende de lunes a jueves.", almuerzo: null });
  });

  it("un empleado que pide la lista del día recibe FORBIDDEN", async () => {
    const { consultar, ingresar } = api();
    const token = await ingresar("arojas");

    const r = await consultar(`{ listaDelDia { total } }`, {}, token);

    expect(r.errors?.[0].extensions?.code).toBe("FORBIDDEN");
  });

  it("flujo del encargado: feriado, lista del día y reporte con enlaces de descarga", async () => {
    const { consultar, ingresar } = api();
    const ana = await ingresar("arojas");
    await consultar(`mutation { reservarAlmuerzo(fecha: "2026-10-06") { ok } }`, {}, ana);
    const elena = await ingresar("evargas");

    const feriado = await consultar(
      `mutation { registrarFeriado(fecha: "2026-10-08", descripcion: "Prueba") { ok feriado { fecha } } }`,
      {},
      elena,
    );
    const lista = await consultar(`{ listaDelDia(fecha: "2026-10-06") { total filas { nombre tipoPersona modalidad nombreTitular } } }`, {}, elena);
    const reporte = await consultar(`{ reporteMensual(anio: 2026, mes: 10) { totalBs urlExcel urlPdf titulares { nombreTitular totalBs } } }`, {}, elena);
    const dias = await consultar(`{ diasDeServicio(anio: 2026, mes: 10) feriados(anio: 2026, mes: 10) { fecha } }`, {}, elena);

    expect(feriado.data.registrarFeriado).toEqual({ ok: true, feriado: { fecha: "2026-10-08" } });
    expect(lista.data.listaDelDia).toEqual({
      total: 1,
      filas: [{ nombre: "Ana Rojas", tipoPersona: "EMPLEADO", modalidad: "ESPORADICO", nombreTitular: "Ana Rojas" }],
    });
    expect(reporte.data.reporteMensual).toEqual({
      totalBs: 18,
      urlExcel: "/api/reportes/2026/10.xlsx",
      urlPdf: "/api/reportes/2026/10.pdf",
      titulares: [{ nombreTitular: "Ana Rojas", totalBs: 18 }],
    });
    expect(dias.data.diasDeServicio).toHaveLength(16);
    expect(dias.data.feriados).toEqual([{ fecha: "2026-10-08" }]);
  });

  it("pensionar, avisar inasistencia y ver consumo por GraphQL", async () => {
    const e = escenario({ reloj: relojEn("2026-09-25", 10, 0) });
    const { consultar, ingresar } = api(e);
    const token = await ingresar("pflores");

    const pension = await consultar(
      `mutation { pensionar(anio: 2026, mes: 10, personaIds: ["UB-103", "FAM-2002", "UB-100"]) { ok mensaje resultados { personaId ok diasConfirmados } } }`,
      {},
      token,
    );
    e.reloj.fijar("2026-10-06", 8, 0);
    const aviso = await consultar(
      `mutation { avisarInasistencia(fecha: "2026-10-06", personaId: "FAM-2002") { ok almuerzosRestantes almuerzo { estado } } }`,
      {},
      token,
    );
    const consumo = await consultar(
      `{ miConsumo(anio: 2026, mes: 10) { totalBs personas { persona { id } pensionado cantidad inasistenciasDisponibles } } }`,
      {},
      token,
    );

    expect(pension.data.pensionar.ok).toBe(false);
    expect(pension.data.pensionar.resultados.map((r: { ok: boolean }) => r.ok)).toEqual([true, true, false]);
    expect(aviso.data.avisarInasistencia).toEqual({ ok: true, almuerzosRestantes: 16, almuerzo: { estado: "INASISTENCIA_AVISADA" } });
    const juan = consumo.data.miConsumo.personas.find((p: { persona: { id: string } }) => p.persona.id === "FAM-2002");
    expect(juan).toEqual({ persona: { id: "FAM-2002" }, pensionado: true, cantidad: 16, inasistenciasDisponibles: 6 });
    expect(consumo.data.miConsumo.totalBs).toBe((17 + 16) * 15);
  });

  it("cerrarSesion invalida el token", async () => {
    const { consultar, ingresar } = api();
    const token = await ingresar("arojas");

    await consultar(`mutation { cerrarSesion }`, {}, token);
    const r = await consultar(`{ yo { rol } }`, {}, token);

    expect(r.errors?.[0].extensions?.code).toBe("UNAUTHENTICATED");
  });

  it("un error inesperado no expone detalles internos", async () => {
    const e = escenario();
    e.personas.familiaresVigentes = async () => {
      throw new Error("connection refused at 10.0.0.5:5432");
    };
    const { consultar, ingresar } = api(e);
    const token = await ingresar("arojas");

    const r = await consultar(`{ miFamilia { topeDiario } }`, {}, token);

    expect(r.errors?.[0].message).toBe("Unexpected error.");
    expect(JSON.stringify(r)).not.toContain("10.0.0.5");
  });
});
