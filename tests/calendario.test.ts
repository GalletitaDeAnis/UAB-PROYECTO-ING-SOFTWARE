import { describe, expect, it } from "vitest";
import { momento, sugerirFechaReserva } from "../src/dominio/tiempo.js";

describe("fecha sugerida para reservar", () => {
  it("antes de las 9:00 de un miércoles sugiere ese mismo día", () => {
    expect(sugerirFechaReserva(momento("2026-10-07", 8, 30), () => false)).toBe("2026-10-07");
  });

  it("después de las 9:00 sugiere el jueves", () => {
    expect(sugerirFechaReserva(momento("2026-10-07", 21, 0), () => false)).toBe("2026-10-08");
  });

  it("un viernes sugiere el lunes, y se salta un feriado", () => {
    const sugerida = sugerirFechaReserva(momento("2026-10-09", 8, 0), (fecha) => fecha === "2026-10-12");
    expect(sugerida).toBe("2026-10-13");
  });
});
