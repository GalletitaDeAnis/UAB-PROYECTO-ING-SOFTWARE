import type { Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type CuentaRepositorio,
  type ExportadorReporte,
  type FormatoReporte,
  type PersonaRepositorio,
  type ReservaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { calcularDescuentos, type DescuentoTitular, type Titular } from "../dominio/reporte.js";
import { mesValido, sinPermiso } from "./comun.js";

export type ReporteMensual = {
  anio: number;
  mes: number;
  titulares: DescuentoTitular[];
  totalBs: number;
};

/**
 * HU10: el reporte se arma cada vez desde las reservas; no hay tabla de reporte.
 * Entran todos los usuarios empleados activos (CA5) y, además, cualquier titular con consumo
 * en el mes aunque después lo hayan dado de baja.
 */
export class GenerarReporteMensual {
  constructor(
    private readonly reservas: ReservaRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly cuentas: CuentaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, anio: number, mes: number): Promise<Resultado<ReporteMensual>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");

    const reservas = await this.reservas.listarDelMes(anio, mes);
    const cuentas = await this.cuentas.listar();
    const ids = new Set([
      ...cuentas.map((cuenta) => cuenta.personaId),
      ...reservas.flatMap((reserva) => [reserva.personaId, reserva.titularId]),
    ]);
    const personas = new Map((await this.personas.obtenerVarias([...ids])).map((p) => [p.id, p]));

    const conConsumo = new Set(reservas.filter((r) => r.estado === "CONFIRMADA").map((r) => r.titularId));
    const titulares: Titular[] = cuentas.flatMap((cuenta) => {
      const persona = personas.get(cuenta.personaId);
      if (!persona) return [];
      const incluir = (cuenta.tipo === "EMPLEADO" && persona.activo) || conConsumo.has(persona.id);
      return incluir ? [{ persona, codigoEmpleado: cuenta.codigoEmpleado }] : [];
    });

    const descuentos = calcularDescuentos(reservas, personas, titulares);
    const totalBs = descuentos.reduce((suma, titular) => suma + titular.totalBs, 0);
    return ok({ anio, mes, titulares: descuentos, totalBs });
  }
}

export type ArchivoExportado = {
  nombreArchivo: string;
  tipoContenido: string;
  contenido: Uint8Array;
};

/** HU10 CA3: se exporta lo mismo que se ve en pantalla, en Excel o en PDF. */
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
