import type { Almuerzo, Persona, Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type FeriadoRepositorio,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { calcularDescuentos, inasistenciasDisponibles, type LineaDescuento } from "../dominio/reporte.js";
import { mesValido } from "./comun.js";

export type ConsumoPersona = {
  persona: Persona;
  pensionado: boolean;
  lineas: LineaDescuento[];
  cantidad: number;
  subtotalBs: number;
  /** Solo para pensionados: cuántos avisos más admite sin bajar de 10. */
  inasistenciasDisponibles: number | null;
};

export type MiConsumo = {
  anio: number;
  mes: number;
  personas: ConsumoPersona[];
  totalBs: number;
};

/** HU12: la misma cuenta del reporte (HU11), mirada desde un solo titular. */
export class VerMiConsumo {
  constructor(
    private readonly personas: PersonaRepositorio,
    private readonly almuerzos: AlmuerzoRepositorio,
    private readonly pensiones: PensionRepositorio,
    private readonly feriados: FeriadoRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, anio: number, mes: number): Promise<Resultado<MiConsumo>> {
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");
    const codigo = usuario.codigoInstitucional;

    const titular = await this.personas.obtener(codigo);
    const familiares = await this.personas.familiaresVigentes(codigo);
    const almuerzos = await this.almuerzos.listarDelTitular(codigo, anio, mes);
    const pensionados = new Set(
      (await this.pensiones.listarDelTitular(codigo, anio, mes)).map((pension) => pension.personaId),
    );
    const feriados = new Set((await this.feriados.listar(anio, mes)).map((feriado) => feriado.fecha));

    // Un familiar que dejó de figurar en la API pero ya consumió ese mes sigue en su cuenta.
    const conocidos = new Map<string, Persona>();
    for (const persona of [titular, ...familiares]) if (persona) conocidos.set(persona.id, persona);
    const faltantes = almuerzos.map((almuerzo) => almuerzo.personaId).filter((id) => !conocidos.has(id));
    for (const persona of await this.personas.obtenerVarias([...new Set(faltantes)])) {
      conocidos.set(persona.id, persona);
    }

    const lineas = calcularDescuentos(almuerzos, conocidos, (fecha) => feriados.has(fecha))[0]?.lineas ?? [];
    const personas = [...conocidos.values()].map((persona) =>
      consumoDe(persona, lineas, pensionados.has(persona.id)),
    );
    const totalBs = personas.reduce((suma, persona) => suma + persona.subtotalBs, 0);
    return ok({ anio, mes, personas, totalBs });
  }
}

function consumoDe(persona: Persona, todas: LineaDescuento[], pensionado: boolean): ConsumoPersona {
  const lineas = todas.filter((linea) => linea.personaId === persona.id);
  const cantidad = lineas.reduce((suma, linea) => suma + linea.cantidad, 0);
  const dePension = lineas
    .filter((linea) => linea.modalidad === "PENSION")
    .reduce((suma, linea) => suma + linea.cantidad, 0);
  return {
    persona,
    pensionado,
    lineas,
    cantidad,
    subtotalBs: lineas.reduce((suma, linea) => suma + linea.subtotalBs, 0),
    inasistenciasDisponibles: pensionado ? inasistenciasDisponibles(dePension) : null,
  };
}

export type AlmuerzoConPersona = Almuerzo & { nombrePersona: string };

/** «Mis reservas»: los almuerzos del titular y de su familia en un mes, para la pantalla. */
export class VerMisAlmuerzos {
  constructor(
    private readonly personas: PersonaRepositorio,
    private readonly almuerzos: AlmuerzoRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, anio: number, mes: number): Promise<Resultado<AlmuerzoConPersona[]>> {
    if (!mesValido(anio, mes)) return fallo("El mes no es válido.");
    const almuerzos = await this.almuerzos.listarDelTitular(usuario.codigoInstitucional, anio, mes);
    const ids = [...new Set(almuerzos.map((almuerzo) => almuerzo.personaId))];
    const nombres = new Map((await this.personas.obtenerVarias(ids)).map((p) => [p.id, p.nombreCompleto]));
    const lista = almuerzos
      .map((almuerzo) => ({ ...almuerzo, nombrePersona: nombres.get(almuerzo.personaId) ?? almuerzo.personaId }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombrePersona.localeCompare(b.nombrePersona, "es"));
    return ok(lista);
  }
}
