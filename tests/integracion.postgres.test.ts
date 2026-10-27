import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearCasosDeUso } from "../src/aplicacion/casosDeUso.js";
import type { Usuario } from "../src/dominio/modelo.js";
import { CifradorScrypt } from "../src/infraestructura/contrasenas.js";
import {
  CuentasPrisma,
  MenusPrisma,
  PensionesPrisma,
  PersonasPrisma,
  ReservasPrisma,
  SesionesPrisma,
} from "../src/infraestructura/repositoriosPrisma.js";
import { TokensAleatorios } from "../src/infraestructura/tokens.js";
import { ExportadorDePrueba, relojEn, type RelojDePrueba } from "./fakes.js";

/**
 * Repositorios Prisma contra un PostgreSQL de verdad (local o Supabase).
 * Corre solo con DATABASE_URL_PRUEBAS: una base vacía y aparte, porque la prueba borra sus tablas.
 */
const url = process.env.DATABASE_URL_PRUEBAS;

describe.runIf(url)("PostgreSQL: repositorios, transacciones y restricciones", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const reloj = relojEn("2026-10-18", 18, 0);

  beforeAll(() => {
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "pipe" });
  }, 120_000);

  beforeAll(async () => {
    await db.$executeRawUnsafe(
      'TRUNCATE "sesion", "reserva", "pension", "menu_dia", "menu_semanal", "cuenta", "persona" CASCADE',
    );
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  function casos(r: RelojDePrueba = reloj) {
    return crearCasosDeUso({
      reloj: r,
      personas: new PersonasPrisma(db),
      cuentas: new CuentasPrisma(db),
      reservas: new ReservasPrisma(db),
      pensiones: new PensionesPrisma(db),
      menus: new MenusPrisma(db),
      sesiones: new SesionesPrisma(db),
      cifrador: new CifradorScrypt(),
      tokens: new TokensAleatorios(),
      exportadores: [new ExportadorDePrueba("EXCEL")],
    });
  }

  const datos = (nombres: string, ci: string) => ({
    nombres,
    apellidos: "Prueba",
    ci,
    fechaNacimiento: "1990-01-01",
    telefono: "70000000",
  });

  let admin: Usuario;
  let empleado: Usuario;
  let familiarId = "";

  it("HU01 registra persona, cuenta y familiar en una transacción; el CI no se repite", async () => {
    const c = casos();
    const raiz = await new CuentasPrisma(db).registrar(
      datos("Raíz", "1000001"),
      { codigoEmpleado: "ADM-1", nombreUsuario: "raiz", contrasenaHash: await new CifradorScrypt().cifrar("Raiz2026"), tipo: "ADMINISTRADOR" },
      [],
    );
    admin = { id: raiz.persona.id, nombreUsuario: "raiz", tipo: "ADMINISTRADOR", debeCambiarContrasena: false };

    const registro = await c.registrarUsuario.ejecutar(admin, {
      datos: datos("Pedro", "2000001"),
      codigoEmpleado: "UB-1",
      nombreUsuario: "pedro",
      contrasenaInicial: "Inicio2026",
      tipo: "EMPLEADO",
      familiares: [{ ...datos("María", "2000002"), parentesco: "CONYUGE" }],
    });

    expect(registro.ok).toBe(true);
    if (!registro.ok) return;
    familiarId = registro.valor.familiares[0].id;
    empleado = { id: registro.valor.persona.id, nombreUsuario: "pedro", tipo: "EMPLEADO", debeCambiarContrasena: false };
    expect(registro.valor.persona.titularId).toBe(registro.valor.persona.id);
    expect((await c.registrarUsuario.ejecutar(admin, { ...registro.valor, datos: datos("Otro", "2000002"), codigoEmpleado: "UB-2", nombreUsuario: "otro", contrasenaInicial: "Inicio2026", tipo: "EMPLEADO", familiares: [] })).ok).toBe(false);
    await expect(db.persona.create({ data: { ...datos("Dup", "2000001"), fechaNacimiento: new Date(), tipo: "FAMILIAR", titularId: empleado.id, parentesco: "HIJO" } })).rejects.toThrow();
  });

  it("HU02 la contraseña queda como scrypt y el ingreso la verifica", async () => {
    const c = casos();
    const cuenta = await db.cuenta.findUniqueOrThrow({ where: { nombreUsuario: "pedro" } });

    expect(cuenta.contrasenaHash).toMatch(/^scrypt\$/);
    const sesion = await c.iniciarSesion.ejecutar("pedro", "Inicio2026");
    expect(sesion.ok && sesion.valor.usuario.debeCambiarContrasena).toBe(true);
    if (!sesion.ok) return;
    expect((await c.validarSesion.ejecutar(sesion.valor.token)).ok).toBe(true);
  });

  it("HU07 + HU03 la pensión y la publicación del menú crean las reservas en la misma transacción", async () => {
    const octubre = casos(relojEn("2026-10-20", 10, 0));
    const pension = await octubre.pensionar.ejecutar(empleado, [familiarId], 2026, 11);
    expect(pension.ok && pension.valor[0].ok).toBe(true);

    const noviembre = casos(relojEn("2026-11-01", 18, 0));
    const publicado = await noviembre.publicarMenu.ejecutar(admin, "2026-11-02", [
      { fecha: "2026-11-02", descripcion: "Sopa" },
      { fecha: "2026-11-04", descripcion: "Silpancho" },
    ]);

    expect(publicado.ok && publicado.valor.reservasDePension).toBe(2);
    const reservas = await db.reserva.findMany({ where: { personaId: familiarId }, orderBy: { fecha: "asc" } });
    expect(reservas.map((r) => [r.fecha.toISOString().slice(0, 10), r.modalidad, r.precioBs])).toEqual([
      ["2026-11-02", "PENSIONADO", 15],
      ["2026-11-04", "PENSIONADO", 15],
    ]);
    expect((await noviembre.publicarMenu.ejecutar(admin, "2026-11-02", [{ fecha: "2026-11-03", descripcion: "x" }])).ok).toBe(false);
  });

  it("HU04 reserva no pensionada; HU06 la lista del día la muestra junto al pensionado", async () => {
    const c = casos(relojEn("2026-11-02", 8, 0));

    const reserva = await c.reservar.ejecutar(empleado, [empleado.id], "2026-11-02");
    const lista = await c.verLista.ejecutar(admin, "2026-11-02");

    expect(reserva.ok && reserva.valor[0].ok).toBe(true);
    expect(lista.ok && lista.valor.filas.map((f) => [f.nombre, f.modalidad])).toEqual([
      ["María Prueba", "PENSIONADO"],
      ["Pedro Prueba", "NO_PENSIONADO"],
    ]);
  });

  it("la base rechaza reservas sin día de menú y precios incoherentes, aunque se inserten a mano", async () => {
    const base = { personaId: empleado.id, titularId: empleado.id, modalidad: "NO_PENSIONADO" as const, estado: "CONFIRMADA" as const };

    await expect(db.reserva.create({ data: { ...base, fecha: new Date("2026-11-03T00:00:00Z"), precioBs: 18 } })).rejects.toThrow();
    await expect(db.reserva.create({ data: { ...base, fecha: new Date("2026-11-04T00:00:00Z"), precioBs: 15 } })).rejects.toThrow();
  });

  it("HU09 la baja anula reservas futuras en la misma transacción y HU10 conserva lo consumido", async () => {
    const c = casos(relojEn("2026-11-03", 10, 0));

    const baja = await c.darDeBaja.ejecutar(admin, familiarId);
    const reservas = await db.reserva.findMany({ where: { personaId: familiarId }, orderBy: { fecha: "asc" } });
    const reporte = await c.generarReporte.ejecutar(admin, 2026, 11);

    expect(baja.ok).toBe(true);
    expect(reservas.map((r) => r.estado)).toEqual(["CONFIRMADA", "CANCELADA"]);
    const pedro = reporte.ok ? reporte.valor.titulares.find((t) => t.titularId === empleado.id) : undefined;
    expect(pedro?.totalBs).toBe(18 + 15);
  });

  it("RLS está activo en todas las tablas: la API de datos de Supabase no lee nada", async () => {
    const tablas = await db.$queryRaw<{ relname: string; relrowsecurity: boolean }[]>`
      SELECT relname, relrowsecurity FROM pg_class
      WHERE relname IN ('persona','cuenta','menu_semanal','menu_dia','reserva','pension','sesion')`;

    expect(tablas).toHaveLength(7);
    expect(tablas.every((t) => t.relrowsecurity)).toBe(true);
  });
});
