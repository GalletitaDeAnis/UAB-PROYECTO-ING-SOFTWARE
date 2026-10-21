import { cuentaParaCobro, MINIMO_ALMUERZOS_PENSION, type Almuerzo, type Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type FeriadoRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
} from "../dominio/puertos.js";
import { admiteCambio, anioMes } from "../dominio/tiempo.js";
import { personaACargo } from "./comun.js";

export type AvisoRegistrado = {
  almuerzo: Almuerzo;
  almuerzosRestantes: number;
};

/** HU10: libera un día de una sola persona pensionada, sin bajar de 10 en el mes (R5, R6). */
export class AvisarInasistencia {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly almuerzos: AlmuerzoRepositorio,
    private readonly feriados: FeriadoRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string, fecha: string): Promise<Resultado<AvisoRegistrado>> {
    const persona = await personaACargo(this.personas, usuario, personaId);
    if (!persona.ok) return persona;

    const almuerzo = await this.almuerzos.obtener(personaId, fecha);
    if (!almuerzo || almuerzo.origen !== "PENSION" || almuerzo.estado !== "CONFIRMADO") {
      return fallo("Esa persona no tiene un almuerzo de pensión confirmado ese día.");
    }
    if (!admiteCambio(this.reloj.ahora(), fecha)) {
      return fallo("Ya son las 9:00. No se puede avisar y ese almuerzo se cobra.");
    }

    const { anio, mes } = anioMes(fecha);
    const feriados = new Set((await this.feriados.listar(anio, mes)).map((feriado) => feriado.fecha));
    const queCuentan = (await this.almuerzos.listarDeLaPersona(personaId, anio, mes)).filter(
      (otro) => otro.origen === "PENSION" && cuentaParaCobro(otro, (dia) => feriados.has(dia)),
    ).length;
    if (queCuentan - 1 < MINIMO_ALMUERZOS_PENSION) {
      return fallo(
        `${persona.valor.nombreCompleto} tiene ${queCuentan} almuerzos en el mes. Con otro aviso bajaría del mínimo de ${MINIMO_ALMUERZOS_PENSION}.`,
      );
    }

    const avisado: Almuerzo = { ...almuerzo, estado: "INASISTENCIA_AVISADA" };
    await this.almuerzos.guardar(avisado);
    return ok({ almuerzo: avisado, almuerzosRestantes: queCuentan - 1 });
  }
}
