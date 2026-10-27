import { nombreCompleto, precioDe, topeDiario, type Reserva, type Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type MenuRepositorio,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type ReservaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio, anioMes, esFechaValida, esLunesAJueves } from "../dominio/tiempo.js";
import { personaACargo, sinPermiso, type ResultadoPorPersona } from "./comun.js";

export const SIN_ATENCION = "Ese día no hay atención: no tiene menú publicado.";
export const HORARIO_CERRADO = "El horario de reservas cerró a las 9:00.";

/**
 * HU04: para sí o para uno o varios familiares, en un día con menú (R7) y antes de las 9:00 (R9).
 * Las reglas del día valen para todos; las de cada persona (CA3, CA4, CA7) se informan una por una.
 */
export class ReservarAlmuerzo {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly reservas: ReservaRepositorio,
    private readonly menus: MenuRepositorio,
    private readonly pensiones: PensionRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaIds: string[], fecha: string): Promise<Resultado<ResultadoPorPersona[]>> {
    const denegado = sinPermiso(usuario, "EMPLEADO");
    if (denegado) return fallo(denegado);
    if (!esFechaValida(fecha)) return fallo("La fecha no es válida.");
    if (personaIds.length === 0) return fallo("Elige al menos una persona.");

    const ahora = this.reloj.ahora();
    if (fecha < ahora.fecha) return fallo("No se puede reservar un día que ya pasó.");
    if (!esLunesAJueves(fecha)) return fallo("El restaurante solo atiende de lunes a jueves.");
    if (!(await this.menus.obtenerDia(fecha))) return fallo(SIN_ATENCION);
    if (!admiteCambio(ahora, fecha)) return fallo(HORARIO_CERRADO);

    const { anio, mes } = anioMes(fecha);
    const tope = topeDiario((await this.personas.familiaresActivos(usuario.id)).length);
    let delDia = (await this.reservas.listarDelTitular(usuario.id, anio, mes)).filter(
      (reserva) => reserva.fecha === fecha && reserva.estado === "CONFIRMADA",
    ).length;

    const resultados: ResultadoPorPersona[] = [];
    for (const personaId of new Set(personaIds)) {
      const persona = await personaACargo(this.personas, usuario, personaId);
      if (!persona.ok) {
        resultados.push({ personaId, nombre: personaId, ok: false, mensaje: persona.mensaje });
        continue;
      }
      const nombre = nombreCompleto(persona.valor);
      const rechazo = (mensaje: string) => resultados.push({ personaId, nombre, ok: false, mensaje });

      const existente = await this.reservas.obtener(personaId, fecha);
      if (existente?.estado === "CONFIRMADA") {
        rechazo(
          existente.modalidad === "PENSIONADO"
            ? `${nombre} es pensionado y ya tiene su almuerzo de ese día.`
            : `${nombre} ya tiene una reserva para ese día.`,
        );
        continue;
      }
      if (await this.pensiones.obtener(personaId, anio, mes)) {
        rechazo(`${nombre} es pensionado de ese mes: un almuerzo por persona por día.`);
        continue;
      }
      if (delDia >= tope) {
        rechazo(`Se alcanzó el tope diario de ${tope} almuerzos.`);
        continue;
      }

      const reserva: Reserva = {
        personaId,
        titularId: usuario.id,
        fecha,
        modalidad: "NO_PENSIONADO",
        precioBs: precioDe("NO_PENSIONADO"),
        estado: "CONFIRMADA",
      };
      await this.reservas.guardar(reserva);
      delDia += 1;
      resultados.push({ personaId, nombre, ok: true, mensaje: `Reserva de ${nombre} confirmada a ${reserva.precioBs} Bs.` });
    }
    return ok(resultados);
  }
}
