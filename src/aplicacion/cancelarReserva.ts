import type { Almuerzo, Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio } from "../dominio/tiempo.js";
import { personaACargo } from "./comun.js";

/** HU03 y HU06 CA5: cancela solo el almuerzo de la persona elegida. */
export class CancelarReserva {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly almuerzos: AlmuerzoRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string, fecha: string): Promise<Resultado<Almuerzo>> {
    const persona = await personaACargo(this.personas, usuario, personaId);
    if (!persona.ok) return persona;

    const existente = await this.almuerzos.obtener(personaId, fecha);
    if (!existente || existente.estado !== "CONFIRMADO" || existente.origen !== "ESPORADICO") {
      return fallo("No hay una reserva esporádica confirmada para esa persona ese día.");
    }
    if (!admiteCambio(this.reloj.ahora(), fecha)) {
      return fallo("Ya son las 9:00. No se puede cancelar y el almuerzo se cobra.");
    }
    const cancelado: Almuerzo = { ...existente, estado: "CANCELADO" };
    await this.almuerzos.guardar(cancelado);
    return ok(cancelado);
  }
}
