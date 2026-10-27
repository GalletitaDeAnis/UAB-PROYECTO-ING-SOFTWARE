import {
  inasistenciasDisponibles,
  minimoDelMes,
  nombreCompleto,
  topeDiario,
  type Persona,
  type Reserva,
  type Usuario,
} from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type CuentaRepositorio,
  type MenuRepositorio,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type ReservaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { calcularDescuentos, type LineaDescuento } from "../dominio/reporte.js";
import { diasDelMes, esLunesAJueves, lunesDe } from "../dominio/tiempo.js";
import { programados } from "./avisarInasistencia.js";
import { mesValido, sinPermiso } from "./comun.js";

export type ConsumoPersona = {
  persona: Persona;
  pensionado: boolean;
  lineas: LineaDescuento[];
  cantidad: number;
  subtotalBs: number;
  /** Solo para pensionados (HU11 CA2). */
  programados: number | null;
  minimo: number | null;
  inasistenciasDisponibles: number | null;
};

export type MiConsumo = {
  anio: number;
  mes: number;
  personas: ConsumoPersona[];
  totalBs: number;
  /** HU11 CA4: «Sin atención – no se cobra». */
  diasSinAtencion: string[];
};

/** HU11: la misma cuenta del reporte (HU10), mirada desde un solo titular. */
export class VerMiConsumo {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly reservas: ReservaRepositorio,
    private readonly pensiones: PensionRepositorio,
    private readonly menus: MenuRepositorio,
    private readonly cuentas: CuentaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, anio: number, mes: number): Promise<Resultado<MiConsumo>> {
    const denegado = sinPermiso(usuario, "EMPLEADO");
    if (denegado) return fallo(denegado);
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");

    const titular = await this.personas.obtener(usuario.id);
    const cuenta = await this.cuentas.obtener(usuario.id);
    if (!titular || !cuenta) return fallo("No encontramos tus datos. Vuelve a ingresar.");
    const reservas = await this.reservas.listarDelTitular(usuario.id, anio, mes);
    const pensionados = new Set((await this.pensiones.listarDelTitular(usuario.id, anio, mes)).map((p) => p.personaId));
    const conMenu = (await this.menus.diasDelMes(anio, mes)).map((dia) => dia.fecha);
    const minimo = minimoDelMes(conMenu.length);

    // Un familiar dado de baja que ya consumió ese mes sigue en la cuenta.
    const conocidos = new Map<string, Persona>([[titular.id, titular]]);
    for (const familiar of await this.personas.familiaresActivos(usuario.id)) conocidos.set(familiar.id, familiar);
    const faltantes = reservas.map((reserva) => reserva.personaId).filter((id) => !conocidos.has(id));
    for (const persona of await this.personas.obtenerVarias([...new Set(faltantes)])) conocidos.set(persona.id, persona);

    const lineas =
      calcularDescuentos(reservas, conocidos, [{ persona: titular, codigoEmpleado: cuenta.codigoEmpleado }])[0]?.lineas ?? [];
    const personas = [...conocidos.values()].map((persona) =>
      consumoDe(persona, lineas, reservas, pensionados.has(persona.id), minimo),
    );
    return ok({
      anio,
      mes,
      personas,
      totalBs: personas.reduce((suma, persona) => suma + persona.subtotalBs, 0),
      diasSinAtencion: diasSinAtencion(anio, mes, conMenu, this.reloj.ahora().fecha),
    });
  }
}

function consumoDe(
  persona: Persona,
  todas: LineaDescuento[],
  reservas: Reserva[],
  pensionado: boolean,
  minimo: number,
): ConsumoPersona {
  const lineas = todas.filter((linea) => linea.personaId === persona.id);
  const suyos = pensionado ? programados(reservas.filter((reserva) => reserva.personaId === persona.id)) : null;
  return {
    persona,
    pensionado,
    lineas,
    cantidad: lineas.reduce((suma, linea) => suma + linea.cantidad, 0),
    subtotalBs: lineas.reduce((suma, linea) => suma + linea.subtotalBs, 0),
    programados: suyos,
    minimo: pensionado ? minimo : null,
    inasistenciasDisponibles: suyos === null ? null : inasistenciasDisponibles(suyos, minimo),
  };
}

/**
 * Un lunes a jueves sin menú es «sin atención» si su semana ya se publicó sin ese día, o si
 * el día ya llegó y nadie publicó menú. Las semanas futuras sin publicar todavía no se sabe.
 */
export function diasSinAtencion(anio: number, mes: number, conMenu: string[], hoy: string): string[] {
  const publicadas = new Set(conMenu.map(lunesDe));
  return diasDelMes(anio, mes).filter(
    (fecha) => esLunesAJueves(fecha) && !conMenu.includes(fecha) && (fecha <= hoy || publicadas.has(lunesDe(fecha))),
  );
}

export type ReservaConPersona = Reserva & { nombrePersona: string };

/** «Mis reservas»: las del titular y su grupo familiar en un mes, para cancelar o avisar. */
export class VerMisReservas {
  constructor(
    private readonly personas: PersonaRepositorio,
    private readonly reservas: ReservaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, anio: number, mes: number): Promise<Resultado<ReservaConPersona[]>> {
    const denegado = sinPermiso(usuario, "EMPLEADO");
    if (denegado) return fallo(denegado);
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");
    const reservas = await this.reservas.listarDelTitular(usuario.id, anio, mes);
    const ids = [...new Set(reservas.map((reserva) => reserva.personaId))];
    const nombres = new Map((await this.personas.obtenerVarias(ids)).map((p) => [p.id, nombreCompleto(p)]));
    return ok(
      reservas
        .map((reserva) => ({ ...reserva, nombrePersona: nombres.get(reserva.personaId) ?? reserva.personaId }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombrePersona.localeCompare(b.nombrePersona, "es")),
    );
  }
}

export type MiFamilia = { titular: Persona; familiares: Persona[]; topeDiario: number };

/** HU04 CA7: a quién puede elegir el usuario empleado: él mismo y sus familiares activos. */
export class VerMiFamilia {
  constructor(private readonly personas: PersonaRepositorio) {}

  async ejecutar(usuario: Usuario): Promise<Resultado<MiFamilia>> {
    const titular = await this.personas.obtener(usuario.id);
    if (!titular) return fallo("No encontramos tus datos. Vuelve a ingresar.");
    const familiares = await this.personas.familiaresActivos(usuario.id);
    familiares.sort((a, b) => a.nombres.localeCompare(b.nombres, "es"));
    return ok({ titular, familiares, topeDiario: topeDiario(familiares.length) });
  }
}
