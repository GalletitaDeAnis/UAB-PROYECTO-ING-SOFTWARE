import { afterEach, describe, expect, it } from "vitest";
import { leerConfiguracion } from "../src/infraestructura/configuracion.js";
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

describe("configuración", () => {
  const base = { DATABASE_URL: "postgresql://x", EMPRESARIAL_API_KEY: "k" };

  it("con el simulador, la URL de la API apunta al mismo servidor", () => {
    const config = leerConfiguracion({ ...base, EMPRESARIAL_SIMULADO: "true", PORT: "3010" });

    expect(config.empresarialUrl).toBe("http://localhost:3010/simulador-empresarial");
    expect(config.graphiql).toBe(true);
  });

  it("sin simulador exige la URL real y quita la barra final; lee los orígenes de CORS", () => {
    const config = leerConfiguracion({
      ...base,
      EMPRESARIAL_API_URL: "https://api.ejemplo/v1/",
      CORS_ORIGENES: "http://a.com, http://b.com,",
      NODE_ENV: "production",
    });

    expect(config.empresarialUrl).toBe("https://api.ejemplo/v1");
    expect(config.origenesPermitidos).toEqual(["http://a.com", "http://b.com"]);
    expect(config.graphiql).toBe(false);
    expect(config.produccion).toBe(true);
    expect(leerConfiguracion({ ...base, EMPRESARIAL_API_URL: "u", GRAPHIQL: "true", NODE_ENV: "production" }).graphiql).toBe(true);
  });

  it("una variable obligatoria que falta corta el arranque con su nombre", () => {
    expect(() => leerConfiguracion({ EMPRESARIAL_API_KEY: "k" })).toThrow("DATABASE_URL");
    expect(() => leerConfiguracion({ DATABASE_URL: "x", EMPRESARIAL_API_URL: "u" })).toThrow("EMPRESARIAL_API_KEY");
    expect(() => leerConfiguracion(base)).toThrow("EMPRESARIAL_API_URL");
  });
});
