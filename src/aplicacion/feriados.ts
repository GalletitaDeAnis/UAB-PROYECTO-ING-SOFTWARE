import type { Feriado, Usuario } from "../dominio/modelo.js";
import { fallo, ok, type FeriadoRepositorio, type Resultado } from "../dominio/puertos.js";
import { diasDeServicio, esFechaValida, esLunesAJueves } from "../dominio/tiempo.js";
import { esEncargado, mesValido, SOLO_ENCARGADO } from "./comun.js";

/**
 * HU07. Registrar el feriado basta: la lista del día, la pensión, el reporte y el consumo
 * preguntan por el feriado al calcular, así que un feriado cargado tarde tampoco se cobra (CA2).
 */
export class RegistrarFeriado {
  constructor(private readonly feriados: FeriadoRepositorio) {}

  async ejecutar(usuario: Usuario, fecha: string, descripcion: string): Promise<Resultado<Feriado>> {
    if (!esEncargado(usuario)) return fallo(SOLO_ENCARGADO);
    if (!esFechaValida(fecha)) return fallo("La fecha no es válida.");
    if (!esLunesAJueves(fecha)) {
      return fallo("Ese día no hay servicio ordinario (solo lunes a jueves). No hace falta registrarlo.");
    }
    const texto = descripcion.trim();
    if (!texto) return fallo("Escribe el motivo del feriado.");
    if (await this.feriados.esFeriado(fecha)) return fallo("Ese día ya está registrado como feriado.");

    const feriado: Feriado = { fecha, descripcion: texto.slice(0, 120) };
    await this.feriados.guardar(feriado);
    return ok(feriado);
  }
}

export class ListarFeriados {
  constructor(private readonly feriados: FeriadoRepositorio) {}

  async ejecutar(anio: number, mes: number): Promise<Resultado<Feriado[]>> {
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");
    return ok(await this.feriados.listar(anio, mes));
  }
}

/** Para que la pantalla de pensión muestre los días y el importe antes de confirmar (CU08 paso 3). */
export class VerDiasDeServicio {
  constructor(private readonly feriados: FeriadoRepositorio) {}

  async ejecutar(anio: number, mes: number): Promise<Resultado<string[]>> {
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");
    const feriados = new Set((await this.feriados.listar(anio, mes)).map((feriado) => feriado.fecha));
    return ok(diasDeServicio(anio, mes, (fecha) => feriados.has(fecha)));
  }
}
