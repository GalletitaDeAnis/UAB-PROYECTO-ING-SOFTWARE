import { afterEach, describe, expect, it } from "vitest";
import { leerConfiguracion } from "../src/infraestructura/configuracion.js";
import { CifradorScrypt } from "../src/infraestructura/contrasenas.js";
import { momentoEnLaPaz } from "../src/infraestructura/relojLaPaz.js";
import { RelojDelSistema } from "../src/infraestructura/relojSistema.js";
import { TokensAleatorios } from "../src/infraestructura/tokens.js";
import { cookieDeSesion, tokenDe } from "../src/presentacion/token.js";

describe("reloj", () => {
  afterEach(() => {
    delete process.env.RELOJ_FIJO;
  });

  it("12:59 UTC son las 8:59 en La Paz (UTC−4, sin horario de verano)", () => {
    expect(momentoEnLaPaz(new Date("2026-10-06T12:59:00Z"))).toEqual({ fecha: "2026-10-06", minutos: 8 * 60 + 59 });
    expect(momentoEnLaPaz(new Date("2026-07-06T13:00:00Z"))).toEqual({ fecha: "2026-07-06", minutos: 9 * 60 });
  });

  it("03:00 UTC todavía es el día anterior en La Paz", () => {
    expect(momentoEnLaPaz(new Date("2026-10-07T03:00:00Z")).fecha).toBe("2026-10-06");
  });

  it("RELOJ_FIJO mueve la regla de las 9:00 pero no el reloj de la sesión", () => {
    process.env.RELOJ_FIJO = "2026-10-07T08:30";
    const reloj = new RelojDelSistema();

    expect(reloj.ahora()).toEqual({ fecha: "2026-10-07", minutos: 510 });
    expect(Math.abs(reloj.instante() - Date.now())).toBeLessThan(1000);
    delete process.env.RELOJ_FIJO;
    expect(reloj.ahora().fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("tokens de sesión", () => {
  it("cada token es distinto, largo, y el hash no revela el token", () => {
    const tokens = new TokensAleatorios();
    const a = tokens.nuevo();
    const b = tokens.nuevo();

    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(tokens.hash(a)).toBe(tokens.hash(a));
    expect(tokens.hash(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(tokens.hash(a)).not.toContain(a);
  });

  it("el token se lee del encabezado Bearer o de la cookie", () => {
    expect(tokenDe("Bearer abc", null)).toBe("abc");
    expect(tokenDe(null, "otra=1; sesion=xyz")).toBe("xyz");
    expect(tokenDe("Basic abc", "otra=1")).toBeNull();
    expect(tokenDe(undefined, "sesion=")).toBeNull();
    expect(cookieDeSesion("t", true)).toContain("Secure");
    expect(cookieDeSesion("t", false)).not.toContain("Secure");
  });
});

describe("contraseñas", () => {
  it("scrypt: verifica la correcta, rechaza otra y dos hashes de la misma contraseña difieren", async () => {
    const cifrador = new CifradorScrypt();

    const a = await cifrador.cifrar("Demo2026");
    const b = await cifrador.cifrar("Demo2026");

    expect(a).toMatch(/^scrypt\$[^$]+\$[^$]+$/);
    expect(a).not.toContain("Demo2026");
    expect(a).not.toBe(b);
    expect(await cifrador.verificar("Demo2026", a)).toBe(true);
    expect(await cifrador.verificar("demo2026", a)).toBe(false);
    expect(await cifrador.verificar("Demo2026", "texto-plano")).toBe(false);
  });

  it("la temporal tiene 10 caracteres con letras y números, y cambia cada vez", () => {
    const cifrador = new CifradorScrypt();
    const temporales = Array.from({ length: 20 }, () => cifrador.temporal());

    for (const temporal of temporales) {
      expect(temporal).toHaveLength(10);
      expect(temporal).toMatch(/[A-Za-z]/);
      expect(temporal).toMatch(/\d/);
      expect(temporal).not.toMatch(/[0O1l]/);
    }
    expect(new Set(temporales).size).toBe(20);
  });
});

describe("configuración", () => {
  it("lee el puerto, los orígenes de CORS, GraphiQL y la demo", () => {
    const config = leerConfiguracion({
      DATABASE_URL: "postgresql://x",
      PORT: "3010",
      CORS_ORIGENES: "http://a.com, http://b.com,",
      SEMBRAR_DEMO: "true",
    });

    expect(config).toEqual({
      puerto: 3010,
      origenesPermitidos: ["http://a.com", "http://b.com"],
      graphiql: true,
      produccion: false,
      cuentasDemo: true,
    });
  });

  it("en producción GraphiQL se apaga salvo que se pida", () => {
    const base = { DATABASE_URL: "x", NODE_ENV: "production" };

    expect(leerConfiguracion(base)).toMatchObject({ graphiql: false, produccion: true, cuentasDemo: false, puerto: 3000 });
    expect(leerConfiguracion({ ...base, GRAPHIQL: "true" }).graphiql).toBe(true);
  });

  it("sin DATABASE_URL el arranque se corta con su nombre", () => {
    expect(() => leerConfiguracion({})).toThrow("DATABASE_URL");
  });
});
