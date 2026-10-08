import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function fuentes(carpeta: string): string[] {
  return readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith(".ts"))
    .map((nombre) => readFileSync(join(carpeta, nombre), "utf8"));
}

describe("separación de capas", () => {
  it("el dominio y la aplicación no importan Prisma ni Express", () => {
    const textos = [...fuentes("src/dominio"), ...fuentes("src/aplicacion")].join("\n");
    expect(textos).not.toContain("@prisma/client");
    expect(textos).not.toContain("prisma");
    expect(textos).not.toContain("express");
  });
});
