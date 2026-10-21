import {
  cuentaParaCobro,
  MINIMO_ALMUERZOS_PENSION,
  type Almuerzo,
  type OrigenAlmuerzo,
  type Persona,
} from "./modelo.js";

/** Una fila del descuento: una persona, una modalidad. Se calcula, no se guarda. */
export type LineaDescuento = {
  personaId: string;
  nombreCompleto: string;
  tipo: Persona["tipo"];
  parentesco: string | null;
  modalidad: OrigenAlmuerzo;
  cantidad: number;
  precioUnitarioBs: number;
  subtotalBs: number;
};

export type DescuentoTitular = {
  codigoTitular: string;
  nombreTitular: string;
  lineas: LineaDescuento[];
  totalBs: number;
};

function personaDesconocida(id: string, codigoTitular: string): Persona {
  return { id, tipo: "FAMILIAR", nombreCompleto: id, parentesco: null, codigoTitular, vigente: false };
}

/**
 * R7, R7b, R8: agrupa por titular lo que se cobra. Lo confirmado se cobra aunque la persona
 * no haya ido; lo cancelado, lo avisado y los feriados no. Un titular sin consumo no aparece.
 */
export function calcularDescuentos(
  almuerzos: Almuerzo[],
  personas: Map<string, Persona>,
  esFeriado: (fecha: string) => boolean,
): DescuentoTitular[] {
  const porTitular = new Map<string, Map<string, LineaDescuento>>();

  for (const almuerzo of almuerzos) {
    if (!cuentaParaCobro(almuerzo, esFeriado)) continue;
    const persona =
      personas.get(almuerzo.personaId) ?? personaDesconocida(almuerzo.personaId, almuerzo.codigoTitular);
    const lineas = porTitular.get(almuerzo.codigoTitular) ?? new Map<string, LineaDescuento>();
    porTitular.set(almuerzo.codigoTitular, lineas);

    const clave = `${almuerzo.personaId}|${almuerzo.origen}|${almuerzo.precioBs}`;
    const linea = lineas.get(clave) ?? {
      personaId: persona.id,
      nombreCompleto: persona.nombreCompleto,
      tipo: persona.tipo,
      parentesco: persona.parentesco,
      modalidad: almuerzo.origen,
      cantidad: 0,
      precioUnitarioBs: almuerzo.precioBs,
      subtotalBs: 0,
    };
    linea.cantidad += 1;
    linea.subtotalBs += almuerzo.precioBs;
    lineas.set(clave, linea);
  }

  const resultado: DescuentoTitular[] = [];
  for (const [codigoTitular, lineas] of porTitular) {
    const ordenadas = [...lineas.values()].sort(ordenPersonas);
    resultado.push({
      codigoTitular,
      nombreTitular: personas.get(codigoTitular)?.nombreCompleto ?? codigoTitular,
      lineas: ordenadas,
      totalBs: ordenadas.reduce((suma, linea) => suma + linea.subtotalBs, 0),
    });
  }
  return resultado.sort((a, b) => a.nombreTitular.localeCompare(b.nombreTitular, "es"));
}

/** El titular primero y después sus familiares por nombre. */
function ordenPersonas(a: LineaDescuento, b: LineaDescuento): number {
  if (a.tipo !== b.tipo) return a.tipo === "EMPLEADO" ? -1 : 1;
  return a.nombreCompleto.localeCompare(b.nombreCompleto, "es");
}

/** R5, R6: cuántos avisos le quedan a un pensionado sin bajar del mínimo de 10. */
export function inasistenciasDisponibles(almuerzosQueCuentan: number): number {
  return Math.max(0, almuerzosQueCuentan - MINIMO_ALMUERZOS_PENSION);
}
