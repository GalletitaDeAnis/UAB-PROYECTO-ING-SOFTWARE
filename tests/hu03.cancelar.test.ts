import { describe, expect, it } from "vitest";
import { CancelarReserva } from "../src/aplicacion/cancelarReserva.js";
import type { Almuerzo } from "../src/dominio/modelo.js";
import { momento } from "../src/dominio/tiempo.js";
import { AlmuerzosEnMemoria, ana, relojFijo } from "./fakes.js";

function reserva(fecha: string, estado: Almuerzo["estado"] = "CONFIRMADO"): Almuerzo {
  return {
    codigoEmpleado: ana.codigoInstitucional,
    fecha,
    origen: "ESPORADICO",
    precioBs: 18,
    estado,
  };
}

describe("HU03 cancelar reserva", () => {
  it("CA1 a las 8:59 la reserva deja de estar confirmada", async () => {
    const almuerzos = new AlmuerzosEnMemoria([reserva("2026-10-07")]);
    const caso = new CancelarReserva(relojFijo(momento("2026-10-07", 8, 59)), almuerzos);

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-07");

    expect(resultado.ok).toBe(true);
    expect(almuerzos.guardados[0]?.estado).toBe("CANCELADO");
    expect(await almuerzos.listarConfirmados("2026-10-07")).toHaveLength(0);
  });

  it("CA2 a las 9:00 no se cancela y sigue confirmada para el cobro", async () => {
    const almuerzos = new AlmuerzosEnMemoria([reserva("2026-10-07")]);
    const caso = new CancelarReserva(relojFijo(momento("2026-10-07", 9, 0)), almuerzos);

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-07");

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.mensaje).toContain("se cobra");
    expect(almuerzos.guardados[0]?.estado).toBe("CONFIRMADO");
    expect(almuerzos.guardados[0]?.precioBs).toBe(18);
  });

  it("CA4 el miércoles se puede cancelar el jueves", async () => {
    const almuerzos = new AlmuerzosEnMemoria([reserva("2026-10-08")]);
    const caso = new CancelarReserva(relojFijo(momento("2026-10-07", 21, 0)), almuerzos);

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-08");

    expect(resultado.ok).toBe(true);
    expect(almuerzos.guardados[0]?.estado).toBe("CANCELADO");
  });
});
