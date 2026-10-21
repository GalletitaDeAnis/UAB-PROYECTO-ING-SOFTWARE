import type { Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type ExportadorReporte,
  type FeriadoRepositorio,
  type FormatoReporte,
  type PersonaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { calcularDescuentos, type DescuentoTitular } from "../dominio/reporte.js";
import { esEncargado, mesValido, SOLO_ENCARGADO } from "./comun.js";

export type ReporteMensual = {
  anio: number;
  mes: number;
  titulares: DescuentoTitular[];
  totalBs: number;
};

/** HU11 / CU11: el reporte se arma cada vez desde los almuerzos. No hay tabla de reporte. */
export class GenerarReporteMensual {
  constructor(
    private readonly almuerzos: AlmuerzoRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly feriados: FeriadoRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, anio: number, mes: number): Promise<Resultado<ReporteMensual>> {
    if (!esEncargado(usuario)) return fallo(SOLO_ENCARGADO);
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");

    const almuerzos = await this.almuerzos.listarDelMes(anio, mes);
    const feriados = new Set((await this.feriados.listar(anio, mes)).map((feriado) => feriado.fecha));
    const ids = new Set(almuerzos.flatMap((almuerzo) => [almuerzo.personaId, almuerzo.codigoTitular]));
    const personas = new Map((await this.personas.obtenerVarias([...ids])).map((p) => [p.id, p]));

    const titulares = calcularDescuentos(almuerzos, personas, (fecha) => feriados.has(fecha));
    const totalBs = titulares.reduce((suma, titular) => suma + titular.totalBs, 0);
    return ok({ anio, mes, titulares, totalBs });
  }
}

export type ArchivoExportado = {
  nombreArchivo: string;
  tipoContenido: string;
  contenido: Uint8Array;
};

/** CU12 «extend» de CU11: se exporta solo si el encargado lo pide, con los mismos datos de pantalla. */
export class ExportarReporteMensual {
  constructor(
    private readonly generar: GenerarReporteMensual,
    private readonly exportadores: ExportadorReporte[],
  ) {}

  async ejecutar(
    usuario: Usuario,
    anio: number,
    mes: number,
    formato: FormatoReporte,
  ): Promise<Resultado<ArchivoExportado>> {
    const exportador = this.exportadores.find((candidato) => candidato.formato === formato);
    if (!exportador) return fallo("Ese formato no está disponible. Elige Excel o PDF.");

    const reporte = await this.generar.ejecutar(usuario, anio, mes);
    if (!reporte.ok) return reporte;

    const contenido = await exportador.generar(anio, mes, reporte.valor.titulares);
    const periodo = `${anio}-${String(mes).padStart(2, "0")}`;
    return ok({
      nombreArchivo: `descuento-almuerzos-${periodo}.${exportador.extension}`,
      tipoContenido: exportador.tipoContenido,
      contenido,
    });
  }
}
