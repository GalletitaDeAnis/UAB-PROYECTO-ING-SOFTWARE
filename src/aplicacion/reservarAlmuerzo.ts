import { precioDe, topeDiario, type Almuerzo, type Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type FeriadoRepositorio,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio, anioMes, esFechaValida, esLunesAJueves } from "../dominio/tiempo.js";
import { personaACargo } from "./comun.js";

/** HU02 (para sí) y HU06 (para un familiar): la misma regla, cambia solo la persona elegida. */
export class ReservarAlmuerzo {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly almuerzos: AlmuerzoRepositorio,
    private readonly feriados: FeriadoRepositorio,
    private readonly pensiones: PensionRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string, fecha: string): Promise<Resultado<Almuerzo>> {
    if (!esFechaValida(fecha)) return fallo("La fecha no es válida.");
    const persona = await personaACargo(this.personas, usuario, personaId);
    if (!persona.ok) return persona;

    const ahora = this.reloj.ahora();
    if (fecha < ahora.fecha) return fallo("No se puede reservar un día que ya pasó.");
    if (!esLunesAJueves(fecha)) return fallo("El restaurante solo atiende de lunes a jueves.");
    if (await this.feriados.esFeriado(fecha)) return fallo("Ese día es feriado. No se reserva ni se cobra.");
    if (!admiteCambio(ahora, fecha)) return fallo("El horario de reservas cerró a las 9:00.");

    const { anio, mes } = anioMes(fecha);
    if (await this.pensiones.obtener(personaId, anio, mes)) {
      return fallo(
        `${persona.valor.nombreCompleto} es pensionado de ese mes. Ya tiene su almuerzo: no se agrega otro el mismo día.`,
      );
    }

    const existente = await this.almuerzos.obtener(personaId, fecha);
    if (existente && existente.estado === "CONFIRMADO") {
      return fallo(`${persona.valor.nombreCompleto} ya tiene un almuerzo para ese día.`);
    }

    const tope = topeDiario((await this.personas.familiaresVigentes(usuario.codigoInstitucional)).length);
    const delDia = (await this.almuerzos.listarDelTitular(usuario.codigoInstitucional, anio, mes)).filter(
      (almuerzo) => almuerzo.fecha === fecha && almuerzo.estado === "CONFIRMADO",
    );
    if (delDia.length >= tope) {
      return fallo(`Alcanzaste el tope de ${tope} almuerzos para ese día.`);
    }

    const almuerzo: Almuerzo = {
      personaId,
      codigoTitular: usuario.codigoInstitucional,
      fecha,
      origen: "ESPORADICO",
      precioBs: precioDe("ESPORADICO"),
      estado: "CONFIRMADO",
    };
    await this.almuerzos.guardar(almuerzo);
    return ok(almuerzo);
  }
}
