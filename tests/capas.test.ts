import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function fuentes(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return fuentes(ruta);
    return nombre.endsWith(".ts") ? [readFileSync(ruta, "utf8")] : [];
  });
}

const importaciones = (textos: string[]) =>
  textos.flatMap((texto) => [...texto.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]));

describe("separación de capas (las dependencias apuntan hacia el dominio)", () => {
  it("el dominio no importa ninguna otra capa ni librería", () => {
    const usadas = importaciones(fuentes("src/dominio"));
    expect(usadas.every((ruta) => ruta.startsWith("./"))).toBe(true);
  });

  it("la aplicación solo conoce el dominio y a sí misma", () => {
    const usadas = importaciones(fuentes("src/aplicacion"));
    expect(usadas.every((ruta) => ruta.startsWith("./") || ruta.startsWith("../dominio/"))).toBe(true);
  });

  it("la presentación (GraphQL y pantallas) no abre la base ni la API empresarial", () => {
    const usadas = importaciones(fuentes("src/presentacion"));
    expect(usadas.some((ruta) => ruta.includes("prisma") || ruta.includes("infraestructura"))).toBe(false);
  });
});
