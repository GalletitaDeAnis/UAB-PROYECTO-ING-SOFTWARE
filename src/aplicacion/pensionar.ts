import {
  MINIMO_ALMUERZOS_PENSION,
  precioDe,
  topeDiario,
  type Almuerzo,
  type Pension,
  type Usuario,
} from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type FeriadoRepositorio,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
} from "../dominio/puertos.js";
import { diasDeServicio, esMesSiguiente } from "../dominio/tiempo.js";
import { mesValido, personaACargo } from "./comun.js";

export type PensionPorPersona = {
  personaId: string;
  ok: boolean;
  mensaje: string;
  diasConfirmados: number;
  totalBs: number;
};

/**
 * HU08 (pensionarse) y HU09 (pensionar a un familiar). Cada persona tiene su propia pensión:
 * si una se rechaza, las demás siguen (HU09 CA3, CA5).
 */
export class Pensionar {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly pensiones: PensionRepositorio,
    private readonly feriados: FeriadoRepositorio,
  ) {}

  async ejecutar(
    usuario: Usuario,
    personaIds: string[],
    anio: number,
    mes: number,
  ): Promise<Resultado<PensionPorPersona[]>> {
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");
    if (personaIds.length === 0) return fallo("Elige al menos una persona.");

    const ahora = this.reloj.ahora();
    if (!esMesSiguiente(ahora, anio, mes)) {
      return fallo("La pensión se solicita durante el mes anterior, para el mes siguiente.");
    }

    const feriados = new Set((await this.feriados.listar(anio, mes)).map((feriado) => feriado.fecha));
    const dias = diasDeServicio(anio, mes, (fecha) => feriados.has(fecha));
    if (dias.length < MINIMO_ALMUERZOS_PENSION) {
      return fallo(
        `Ese mes tiene ${dias.length} días de servicio. La pensión exige al menos ${MINIMO_ALMUERZOS_PENSION}.`,
      );
    }

    const tope = topeDiario((await this.personas.familiaresVigentes(usuario.codigoInstitucional)).length);
    let pensionados = (await this.pensiones.listarDelTitular(usuario.codigoInstitucional, anio, mes)).length;
    const resultados: PensionPorPersona[] = [];

    for (const personaId of new Set(personaIds)) {
      const rechazo = (mensaje: string) =>
        resultados.push({ personaId, ok: false, mensaje, diasConfirmados: 0, totalBs: 0 });

      const persona = await personaACargo(this.personas, usuario, personaId);
      if (!persona.ok) {
        rechazo(persona.mensaje);
        continue;
      }
      if (await this.pensiones.obtener(personaId, anio, mes)) {
        rechazo(`${persona.valor.nombreCompleto} ya es pensionado de ese mes.`);
        continue;
      }
      if (pensionados >= tope) {
        rechazo(`Ya tienes ${tope} personas pensionadas ese mes, que es tu tope.`);
        continue;
      }

      const pension: Pension = {
        personaId,
        codigoTitular: usuario.codigoInstitucional,
        anio,
        mes,
        solicitadaEl: ahora.fecha,
      };
      // R4: un almuerzo confirmado por día de servicio. Si la persona tenía una reserva
      // esporádica en ese mes, este almuerzo la reemplaza: sigue siendo uno por día (R2).
      const almuerzos: Almuerzo[] = dias.map((fecha) => ({
        personaId,
        codigoTitular: usuario.codigoInstitucional,
        fecha,
        origen: "PENSION",
        precioBs: precioDe("PENSION"),
        estado: "CONFIRMADO",
      }));
      await this.pensiones.registrar(pension, almuerzos);
      pensionados += 1;
      resultados.push({
        personaId,
        ok: true,
        mensaje: `${persona.valor.nombreCompleto} queda pensionado con ${dias.length} almuerzos a ${precioDe("PENSION")} Bs.`,
        diasConfirmados: dias.length,
        totalBs: dias.length * precioDe("PENSION"),
      });
    }
    return ok(resultados);
  }
}
