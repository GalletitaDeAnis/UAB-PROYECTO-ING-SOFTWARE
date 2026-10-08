import { describe, expect, it } from "vitest";
import { ReservarAlmuerzo } from "../src/aplicacion/reservarAlmuerzo.js";
import { momento } from "../src/dominio/tiempo.js";
import {
  AlmuerzosEnMemoria,
  ana,
  DirectorioEnMemoria,
  FeriadosEnMemoria,
  PensionesEnMemoria,
  relojFijo,
} from "./fakes.js";

function reservar(opciones: {
  fechaReloj: string;
  hora: number;
  minuto: number;
  almuerzos?: AlmuerzosEnMemoria;
  feriados?: FeriadosEnMemoria;
  pensiones?: PensionesEnMemoria;
}) {
  const almuerzos = opciones.almuerzos ?? new AlmuerzosEnMemoria();
  const caso = new ReservarAlmuerzo(
    relojFijo(momento(opciones.fechaReloj, opciones.hora, opciones.minuto)),
    new DirectorioEnMemoria([ana]),
    almuerzos,
    opciones.feriados ?? new FeriadosEnMemoria(),
    opciones.pensiones ?? new PensionesEnMemoria(),
  );
  return { caso, almuerzos };
}

describe("HU02 reservar almuerzo", () => {
  it("CA1 el martes a las 8:30 queda confirmado a 18 Bs", async () => {
    const { caso, almuerzos } = reservar({ fechaReloj: "2026-10-06", hora: 8, minuto: 30 });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-06");

    expect(resultado.ok).toBe(true);
    expect(almuerzos.guardados).toEqual([
      {
        codigoEmpleado: "UB-100",
        fecha: "2026-10-06",
        origen: "ESPORADICO",
        precioBs: 18,
        estado: "CONFIRMADO",
      },
    ]);
  });

  it("CA2 a las 9:00 del mismo día ya no se reserva", async () => {
    const { caso, almuerzos } = reservar({ fechaReloj: "2026-10-06", hora: 9, minuto: 0 });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-06");

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.mensaje).toContain("9:00");
    expect(almuerzos.guardados).toHaveLength(0);
  });

  it("CA3 viernes, sábado y domingo se rechazan", async () => {
    const { caso } = reservar({ fechaReloj: "2026-10-07", hora: 8, minuto: 0 });

    for (const fecha of ["2026-10-09", "2026-10-10", "2026-10-11"]) {
      const resultado = await caso.ejecutar(ana.codigoInstitucional, fecha);
      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.mensaje).toContain("lunes a jueves");
    }
  });

  it("CA4 no duplica una reserva del mismo día", async () => {
    const almuerzos = new AlmuerzosEnMemoria([
      {
        codigoEmpleado: ana.codigoInstitucional,
        fecha: "2026-10-08",
        origen: "ESPORADICO",
        precioBs: 18,
        estado: "CONFIRMADO",
      },
    ]);
    const { caso } = reservar({ fechaReloj: "2026-10-07", hora: 8, minuto: 0, almuerzos });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-08");

    expect(resultado.ok).toBe(false);
    expect(almuerzos.guardados).toHaveLength(1);
  });

  it("CA5 el lunes se puede reservar el jueves, porque el límite es el del jueves", async () => {
    const { caso, almuerzos } = reservar({ fechaReloj: "2026-10-05", hora: 18, minuto: 0 });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-08");

    expect(resultado.ok).toBe(true);
    expect(almuerzos.guardados[0]?.estado).toBe("CONFIRMADO");
  });

  it("CA6 una fecha ya pasada se rechaza", async () => {
    const { caso, almuerzos } = reservar({ fechaReloj: "2026-10-07", hora: 8, minuto: 0 });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-06");

    expect(resultado.ok).toBe(false);
    expect(almuerzos.guardados).toHaveLength(0);
  });

  it("CA7 un feriado no se reserva", async () => {
    const { caso, almuerzos } = reservar({
      fechaReloj: "2026-10-07",
      hora: 8,
      minuto: 0,
      feriados: new FeriadosEnMemoria([{ fecha: "2026-10-08", descripcion: "Feriado de prueba" }]),
    });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-08");

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.mensaje).toContain("feriado");
    expect(almuerzos.guardados).toHaveLength(0);
  });

  it("CA8 un pensionado de ese mes no agrega una reserva esporádica", async () => {
    const { caso, almuerzos } = reservar({
      fechaReloj: "2026-10-07",
      hora: 8,
      minuto: 0,
      pensiones: new PensionesEnMemoria([
        {
          codigoEmpleado: ana.codigoInstitucional,
          anio: 2026,
          mes: 10,
          fechaSolicitud: "2026-09-30",
        },
      ]),
    });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-08");

    expect(resultado.ok).toBe(false);
    expect(almuerzos.guardados).toHaveLength(0);
  });

  it("si canceló a tiempo, puede volver a reservar el mismo día antes de las 9:00", async () => {
    const almuerzos = new AlmuerzosEnMemoria([
      {
        codigoEmpleado: ana.codigoInstitucional,
        fecha: "2026-10-08",
        origen: "ESPORADICO",
        precioBs: 18,
        estado: "CANCELADO",
      },
    ]);
    const { caso } = reservar({ fechaReloj: "2026-10-07", hora: 8, minuto: 0, almuerzos });

    const resultado = await caso.ejecutar(ana.codigoInstitucional, "2026-10-08");

    expect(resultado.ok).toBe(true);
    expect(almuerzos.guardados).toHaveLength(1);
    expect(almuerzos.guardados[0]?.estado).toBe("CONFIRMADO");
  });
});
