import type { Reserva, Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type PersonaRepositorio,
  type Reloj,
  type ReservaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio } from "../dominio/tiempo.js";
import { personaACargo, sinPermiso } from "./comun.js";

/** HU05: cancela solo la reserva de la persona elegida (CA2). Desde las 9:00 se cobra (CA3). */
export class CancelarReserva {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly reservas: ReservaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string, fecha: string): Promise<Resultado<Reserva>> {
    const denegado = sinPermiso(usuario, "EMPLEADO");
    if (denegado) return fallo(denegado);
    const persona = await personaACargo(this.personas, usuario, personaId);
    if (!persona.ok) return persona;

    const existente = await this.reservas.obtener(personaId, fecha);
    if (!existente || existente.estado !== "CONFIRMADA") {
      return fallo("No hay una reserva confirmada para esa persona ese día.");
    }
    if (existente.modalidad === "PENSIONADO") {
      return fallo("Es un almuerzo de pensión: en lugar de cancelar, avisa la inasistencia.");
    }
    if (!admiteCambio(this.reloj.ahora(), fecha)) {
      return fallo("Ya son las 9:00. La reserva no se puede cancelar y el almuerzo se cobrará.");
    }
    const cancelada: Reserva = { ...existente, estado: "CANCELADA" };
    await this.reservas.guardar(cancelada);
    return ok(cancelada);
  }
}
