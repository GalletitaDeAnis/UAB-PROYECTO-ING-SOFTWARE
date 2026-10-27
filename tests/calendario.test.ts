import { describe, expect, it } from "vitest";
import { errorEnDatos, inasistenciasDisponibles, minimoDelMes, normalizarDatos, topeDiario } from "../src/dominio/modelo.js";
import { esMesSiguiente, lunesAJuevesDe, lunesDe, momento, sugerirFechaReserva } from "../src/dominio/tiempo.js";

describe("calendario", () => {
  const conMenu = (fechas: string[]) => (fecha: string) => fechas.includes(fecha);

  it("antes de las 9:00 de un miércoles con menú sugiere ese mismo día", () => {
    expect(sugerirFechaReserva(momento("2026-10-07", 8, 30), conMenu(["2026-10-07", "2026-10-08"]))).toBe("2026-10-07");
  });

  it("después de las 9:00 sugiere el siguiente día con menú, saltando los que no tienen", () => {
    expect(sugerirFechaReserva(momento("2026-10-07", 21, 0), conMenu(["2026-10-07", "2026-10-13"]))).toBe("2026-10-13");
  });

  it("sin ningún día con menú devuelve hoy", () => {
    expect(sugerirFechaReserva(momento("2026-10-07", 8, 0), () => false)).toBe("2026-10-07");
  });

  it("el lunes de la semana, también desde el domingo, y sus cuatro días de atención", () => {
    expect(lunesDe("2026-10-07")).toBe("2026-10-05");
    expect(lunesDe("2026-10-05")).toBe("2026-10-05");
    expect(lunesDe("2026-10-11")).toBe("2026-10-05");
    expect(lunesAJuevesDe("2026-09-28")).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01"]);
  });

  it("el mes siguiente cruza de diciembre a enero", () => {
    expect(esMesSiguiente(momento("2026-12-31", 23, 0), 2027, 1)).toBe(true);
    expect(esMesSiguiente(momento("2026-12-31", 23, 0), 2026, 12)).toBe(false);
  });
});

describe("reglas numéricas", () => {
  it("R14 tope diario = 1 + familiares activos", () => {
    expect([topeDiario(0), topeDiario(4)]).toEqual([1, 5]);
  });

  it("R11 el mínimo es 10, o los días con atención si son menos", () => {
    expect([minimoDelMes(16), minimoDelMes(10), minimoDelMes(8), minimoDelMes(0)]).toEqual([10, 10, 8, 0]);
  });

  it("HU11 CA2 las inasistencias disponibles nunca son negativas", () => {
    expect([inasistenciasDisponibles(11, 10), inasistenciasDisponibles(9, 10)]).toEqual([1, 0]);
  });
});

describe("datos personales", () => {
  const validos = { nombres: "Ana", apellidos: "Rojas", ci: "4567890-1B", fechaNacimiento: "1990-01-01", telefono: "+59171234567" };

  it("acepta datos válidos y el CI con complemento", () => {
    expect(errorEnDatos(validos, "2026-10-06")).toBeNull();
  });

  it("rechaza CI, fecha futura o inválida y teléfono corto", () => {
    expect(errorEnDatos({ ...validos, ci: "12" }, "2026-10-06")).toContain("CI");
    expect(errorEnDatos({ ...validos, fechaNacimiento: "2026-10-07" }, "2026-10-06")).toContain("nacimiento");
    expect(errorEnDatos({ ...validos, fechaNacimiento: "1990-02-30" }, "2026-10-06")).toContain("nacimiento");
    expect(errorEnDatos({ ...validos, telefono: "123" }, "2026-10-06")).toContain("teléfono");
  });

  it("normaliza espacios, CI en mayúsculas y teléfono sin separadores", () => {
    expect(normalizarDatos({ ...validos, nombres: " Ana  María ", ci: " 4567890-1b ", telefono: "712 345-67" })).toEqual({
      ...validos,
      nombres: "Ana María",
      ci: "4567890-1B",
      telefono: "71234567",
    });
  });
});
