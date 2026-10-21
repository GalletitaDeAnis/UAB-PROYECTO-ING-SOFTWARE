import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearCasosDeUso } from "../src/aplicacion/casosDeUso.js";
import { personaDelEmpleado, personaDelFamiliar } from "../src/dominio/modelo.js";
import {
  AlmuerzosPrisma,
  AutorizacionesPrisma,
  FeriadosPrisma,
  PensionesPrisma,
  PersonasPrisma,
  SesionesPrisma,
} from "../src/infraestructura/repositoriosPrisma.js";
import { TokensAleatorios } from "../src/infraestructura/tokens.js";
import {
  cuentasIniciales,
  EmpresarialEnMemoria,
  ExportadorDePrueba,
  familiaPedro,
  pedro,
  relojEn,
} from "./fakes.js";

/**
 * Repositorios Prisma contra un PostgreSQL de verdad (local o Supabase).
 * Corre solo con DATABASE_URL_PRUEBAS: una base vacía y aparte, porque la prueba borra sus tablas.
 */
const url = process.env.DATABASE_URL_PRUEBAS;

describe.runIf(url)("PostgreSQL: repositorios, restricciones y RLS", () => {
  const db = new PrismaClient({ datasourceUrl: url });

  beforeAll(() => {
    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      stdio: "pipe",
    });
  }, 120_000);

  beforeAll(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "sesion", "almuerzo", "pension", "feriado", "autorizacion", "persona" RESTART IDENTITY CASCADE',
    );
    await db.autorizacion.create({ data: { codigoEmpleado: "UB-200", rol: "ENCARGADO" } });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  function casos(reloj = relojEn("2026-09-25", 10, 0)) {
    return crearCasosDeUso({
      reloj,
      empresarial: new EmpresarialEnMemoria(cuentasIniciales()),
      personas: new PersonasPrisma(db),
      autorizaciones: new AutorizacionesPrisma(db),
      almuerzos: new AlmuerzosPrisma(db),
      feriados: new FeriadosPrisma(db),
      pensiones: new PensionesPrisma(db),
      sesiones: new SesionesPrisma(db),
      tokens: new TokensAleatorios(),
      exportadores: [new ExportadorDePrueba("EXCEL")],
    });
  }

  it("el inicio de sesión copia empleado y familiares y guarda solo el hash del token", async () => {
    const resultado = await casos().iniciarSesion.ejecutar("pflores", "demo123");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(await db.persona.count({ where: { codigoTitular: "UB-103" } })).toBe(5);
    const sesion = await db.sesion.findFirstOrThrow({ where: { codigoEmpleado: "UB-103" } });
    expect(sesion.tokenHash).not.toBe(resultado.valor.token);
    expect((await casos().validarSesion.ejecutar(resultado.valor.token)).ok).toBe(true);
  });

  it("sincronizar deja no vigente a quien ya no viene de la API", async () => {
    const personas = new PersonasPrisma(db);
    await personas.sincronizar(
      personaDelEmpleado(pedro),
      familiaPedro.slice(0, 3).map((f) => personaDelFamiliar("UB-103", f)),
    );

    expect((await personas.familiaresVigentes("UB-103")).map((p) => p.id)).toEqual(["FAM-2003", "FAM-2002", "FAM-2001"]);
    expect(await personas.obtener("FAM-2004")).toMatchObject({ vigente: false });
    await personas.sincronizar(personaDelEmpleado(pedro), familiaPedro.map((f) => personaDelFamiliar("UB-103", f)));
  });

  it("pensión, feriado, reserva, aviso, lista, consumo y reporte sobre Postgres", async () => {
    const c = casos();
    const usuario = { codigoInstitucional: "UB-103", rol: "EMPLEADO" as const };
    const encargada = { codigoInstitucional: "UB-200", rol: "ENCARGADO" as const };

    expect((await c.registrarFeriado.ejecutar(encargada, "2026-10-08", "Feriado de prueba")).ok).toBe(true);
    const pension = await c.pensionar.ejecutar(usuario, ["UB-103", "FAM-2002"], 2026, 10);
    expect(pension.ok && pension.valor.map((r) => r.diasConfirmados)).toEqual([16, 16]);
    expect(await db.almuerzo.count({ where: { codigoTitular: "UB-103" } })).toBe(32);

    const enOctubre = casos(relojEn("2026-10-06", 8, 0));
    expect((await enOctubre.reservar.ejecutar(usuario, "FAM-2001", "2026-10-06")).ok).toBe(true);
    expect((await enOctubre.reservar.ejecutar(usuario, "FAM-2001", "2026-10-06")).ok).toBe(false);
    expect((await enOctubre.cancelar.ejecutar(usuario, "FAM-2001", "2026-10-06")).ok).toBe(true);
    expect((await enOctubre.reservar.ejecutar(usuario, "FAM-2003", "2026-10-07")).ok).toBe(true);
    const aviso = await enOctubre.avisarInasistencia.ejecutar(usuario, "FAM-2002", "2026-10-06");
    expect(aviso.ok && aviso.valor.almuerzosRestantes).toBe(15);

    const lista = await enOctubre.verLista.ejecutar(encargada, "2026-10-06");
    expect(lista.ok && lista.valor.filas.map((f) => f.nombre)).toEqual(["Pedro Flores"]);

    const consumo = await enOctubre.verMiConsumo.ejecutar(usuario, 2026, 10);
    expect(consumo.ok && consumo.valor.totalBs).toBe(16 * 15 + 15 * 15 + 18);

    const reporte = await enOctubre.generarReporte.ejecutar(encargada, 2026, 10);
    expect(reporte.ok && reporte.valor.titulares[0]).toMatchObject({ codigoTitular: "UB-103", totalBs: 483 });
    expect((await enOctubre.listarFeriados.ejecutar(2026, 10)).ok).toBe(true);
    const mias = await enOctubre.verMisAlmuerzos.ejecutar(usuario, 2026, 10);
    expect(mias.ok && mias.valor).toHaveLength(34);
  });

  it("la base rechaza un precio que no corresponde, un viernes o una pensión del mes 13", async () => {
    await expect(
      db.almuerzo.create({
        data: { personaId: "UB-103", fecha: new Date("2026-10-20T00:00:00Z"), codigoTitular: "UB-103", origen: "ESPORADICO", precioBs: 5, estado: "CONFIRMADO" },
      }),
    ).rejects.toThrow();
    await expect(
      db.almuerzo.create({
        data: { personaId: "UB-103", fecha: new Date("2026-10-09T00:00:00Z"), codigoTitular: "UB-103", origen: "ESPORADICO", precioBs: 18, estado: "CONFIRMADO" },
      }),
    ).rejects.toThrow();
    await expect(
      db.pension.create({
        data: { personaId: "UB-103", anio: 2026, mes: 13, codigoTitular: "UB-103", solicitadaEl: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("una pensión duplicada no deja almuerzos sueltos (transacción)", async () => {
    const pensiones = new PensionesPrisma(db);
    const antes = await db.almuerzo.count();

    await expect(
      pensiones.registrar(
        { personaId: "UB-103", codigoTitular: "UB-103", anio: 2026, mes: 10, solicitadaEl: "2026-09-25" },
        [{ personaId: "UB-103", codigoTitular: "UB-103", fecha: "2026-10-29", origen: "PENSION", precioBs: 15, estado: "CONFIRMADO" }],
      ),
    ).rejects.toThrow();
    expect(await db.almuerzo.count()).toBe(antes);
  });

  it("todas las tablas tienen RLS activo (la API de datos de Supabase no las expone)", async () => {
    const tablas = await db.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'`;

    expect(tablas.length).toBe(6);
    expect(tablas.every((t) => t.relrowsecurity)).toBe(true);
  });

  it("cerrar y vencer sesiones las borra", async () => {
    const sesiones = new SesionesPrisma(db);
    await sesiones.guardar({ tokenHash: "h-prueba", codigoInstitucional: "UB-103", rol: "EMPLEADO", ultimaActividad: 1_000 });
    await sesiones.tocar("h-prueba", 2_000);
    expect((await sesiones.obtener("h-prueba"))?.ultimaActividad).toBe(2_000);
    await sesiones.eliminar("h-prueba");
    expect(await sesiones.obtener("h-prueba")).toBeNull();
  });
});
