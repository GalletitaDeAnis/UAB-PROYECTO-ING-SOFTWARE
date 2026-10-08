import type { Almuerzo } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type Reloj,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio } from "../dominio/tiempo.js";

export class CancelarReserva {
  constructor(
    private readonly reloj: Reloj,
    private readonly almuerzos: AlmuerzoRepositorio,
  ) {}

  async ejecutar(codigoEmpleado: string, fecha: string): Promise<Resultado<Almuerzo>> {
    const existente = await this.almuerzos.obtener(codigoEmpleado, fecha);
    if (!existente || existente.estado !== "CONFIRMADO" || existente.origen !== "ESPORADICO") {
      return fallo("No hay una reserva esporádica confirmada para ese día.");
    }
    if (!admiteCambio(this.reloj.ahora(), fecha)) {
      return fallo("Ya son las 9:00. No se puede cancelar y el almuerzo se cobra.");
    }
    const cancelado: Almuerzo = { ...existente, estado: "CANCELADO" };
    await this.almuerzos.guardar(cancelado);
    return ok(cancelado);
  }
}
