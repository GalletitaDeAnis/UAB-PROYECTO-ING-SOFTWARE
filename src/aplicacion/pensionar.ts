import {
  nombreCompleto,
  precioDe,
  topeDiario,
  type Pension,
  type Reserva,
  type Usuario,
} from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type MenuRepositorio,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
} from "../dominio/puertos.js";
import { esMesSiguiente } from "../dominio/tiempo.js";
import { mesValido, personaACargo, sinPermiso, type ResultadoPorPersona } from "./comun.js";

export type PensionPorPersona = ResultadoPorPersona & {
  /** Días del mes con menú ya publicado; los demás se confirman al publicarse (HU07 CA2). */
  diasConfirmados: number;
};

/**
 * HU07: cada persona tiene su propia pensión. Si una se rechaza, las demás siguen (CA5, CA6).
 * El mínimo de 10 no se controla aquí: depende de los menús que se publiquen (R11).
 */
export class Pensionar {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly pensiones: PensionRepositorio,
    private readonly menus: MenuRepositorio,
  ) {}

  async ejecutar(
    usuario: Usuario,
    personaIds: string[],
    anio: number,
    mes: number,
  ): Promise<Resultado<PensionPorPersona[]>> {
    const denegado = sinPermiso(usuario, "EMPLEADO");
    if (denegado) return fallo(denegado);
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");
    if (personaIds.length === 0) return fallo("Elige al menos una persona.");

    const ahora = this.reloj.ahora();
    if (!esMesSiguiente(ahora, anio, mes)) {
      return fallo("La pensión se solicita antes de que empiece el mes, solo para el mes siguiente.");
    }

    const dias = (await this.menus.diasDelMes(anio, mes)).map((dia) => dia.fecha);
    const tope = topeDiario((await this.personas.familiaresActivos(usuario.id)).length);
    let pensionados = (await this.pensiones.listarDelTitular(usuario.id, anio, mes)).length;
    const resultados: PensionPorPersona[] = [];

    for (const personaId of new Set(personaIds)) {
      const persona = await personaACargo(this.personas, usuario, personaId);
      if (!persona.ok) {
        resultados.push({ personaId, nombre: personaId, ok: false, mensaje: persona.mensaje, diasConfirmados: 0 });
        continue;
      }
      const nombre = nombreCompleto(persona.valor);
      const rechazo = (mensaje: string) =>
        resultados.push({ personaId, nombre, ok: false, mensaje, diasConfirmados: 0 });

      if (await this.pensiones.obtener(personaId, anio, mes)) {
        rechazo(`${nombre} ya tiene pensión para ese mes.`);
        continue;
      }
      if (pensionados >= tope) {
        rechazo(`Ya hay ${tope} personas pensionadas ese mes, que es el tope diario.`);
        continue;
      }

      const pension: Pension = { personaId, titularId: usuario.id, anio, mes, solicitadaEl: ahora.fecha };
      // Si el menú de la primera semana ya salió y la persona había reservado, la pensión reemplaza
      // esa reserva: sigue siendo un almuerzo por persona por día.
      const reservas: Reserva[] = dias.map((fecha) => ({
        personaId,
        titularId: usuario.id,
        fecha,
        modalidad: "PENSIONADO",
        precioBs: precioDe("PENSIONADO"),
        estado: "CONFIRMADA",
      }));
      await this.pensiones.registrar(pension, reservas);
      pensionados += 1;
      resultados.push({
        personaId,
        nombre,
        ok: true,
        mensaje: `${nombre} queda pensionado a ${precioDe("PENSIONADO")} Bs por almuerzo.`,
        diasConfirmados: dias.length,
      });
    }
    return ok(resultados);
  }
}
