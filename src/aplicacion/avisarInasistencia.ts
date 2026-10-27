import { cuentaParaCobro, minimoDelMes, nombreCompleto, type Reserva, type Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type MenuRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type ReservaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio, anioMes } from "../dominio/tiempo.js";
import { personaACargo, sinPermiso } from "./comun.js";

export type AvisoRegistrado = {
  reserva: Reserva;
  programadosRestantes: number;
  minimo: number;
};

/** Almuerzos de pensión que siguen confirmados para esa persona en el mes. */
export function programados(reservas: Reserva[]): number {
  return reservas.filter((reserva) => reserva.modalidad === "PENSIONADO" && cuentaParaCobro(reserva)).length;
}

/** HU08: libera un día de una sola persona pensionada, sin bajar de su mínimo (R11, R12). */
export class AvisarInasistencia {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly reservas: ReservaRepositorio,
    private readonly menus: MenuRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string, fecha: string): Promise<Resultado<AvisoRegistrado>> {
    const denegado = sinPermiso(usuario, "EMPLEADO");
    if (denegado) return fallo(denegado);
    const persona = await personaACargo(this.personas, usuario, personaId);
    if (!persona.ok) return persona;

    const reserva = await this.reservas.obtener(personaId, fecha);
    if (!reserva || reserva.modalidad !== "PENSIONADO" || reserva.estado !== "CONFIRMADA") {
      return fallo("Esa persona no tiene un almuerzo de pensión confirmado ese día.");
    }
    if (!admiteCambio(this.reloj.ahora(), fecha)) {
      return fallo("Ya son las 9:00. No se puede avisar y el almuerzo se cobrará.");
    }

    const { anio, mes } = anioMes(fecha);
    const minimo = minimoDelMes((await this.menus.diasDelMes(anio, mes)).length);
    const actuales = programados(await this.reservas.listarDeLaPersona(personaId, anio, mes));
    if (actuales - 1 < minimo) {
      return fallo(
        `${nombreCompleto(persona.valor)} tiene ${actuales} almuerzos programados en el mes y su mínimo es ${minimo}. Con otro aviso quedaría por debajo.`,
      );
    }

    const avisada: Reserva = { ...reserva, estado: "INASISTENCIA_AVISADA" };
    await this.reservas.guardar(avisada);
    return ok({ reserva: avisada, programadosRestantes: actuales - 1, minimo });
  }
}
