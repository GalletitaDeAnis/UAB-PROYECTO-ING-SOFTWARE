import { precioDe, type Almuerzo } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type DirectorioEmpleados,
  type FeriadoRepositorio,
  type PensionRepositorio,
  type Reloj,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio, anioMes, esLunesAJueves } from "../dominio/tiempo.js";

export class ReservarAlmuerzo {
  constructor(
    private readonly reloj: Reloj,
    private readonly directorio: DirectorioEmpleados,
    private readonly almuerzos: AlmuerzoRepositorio,
    private readonly feriados: FeriadoRepositorio,
    private readonly pensiones: PensionRepositorio,
  ) {}

  async ejecutar(codigoEmpleado: string, fecha: string): Promise<Resultado<Almuerzo>> {
    const empleado = await this.directorio.buscar(codigoEmpleado);
    if (!empleado || !empleado.activo) {
      return fallo("No se pudo reservar. El empleado no está activo en la base de la institución.");
    }

    const ahora = this.reloj.ahora();
    if (fecha < ahora.fecha) {
      return fallo("No se puede reservar un día que ya pasó.");
    }
    if (!esLunesAJueves(fecha)) {
      return fallo("El restaurante solo atiende de lunes a jueves.");
    }
    if (await this.feriados.esFeriado(fecha)) {
      return fallo("Ese día es feriado. No se reserva ni se cobra.");
    }
    if (!admiteCambio(ahora, fecha)) {
      return fallo("El horario de reservas cerró a las 9:00.");
    }

    const { anio, mes } = anioMes(fecha);
    const pension = await this.pensiones.obtener(codigoEmpleado, anio, mes);
    if (pension) {
      return fallo("Ya eres pensionado de ese mes. No puedes agregar otra reserva el mismo día.");
    }

    const existente = await this.almuerzos.obtener(codigoEmpleado, fecha);
    if (existente && existente.estado !== "CANCELADO") {
      return fallo("Ya tienes un almuerzo para ese día.");
    }

    const almuerzo: Almuerzo = {
      codigoEmpleado,
      fecha,
      origen: "ESPORADICO",
      precioBs: precioDe("ESPORADICO"),
      estado: "CONFIRMADO",
    };
    await this.almuerzos.guardar(almuerzo);
    return ok(almuerzo);
  }
}
