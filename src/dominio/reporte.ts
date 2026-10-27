import {
  cuentaParaCobro,
  nombreCompleto,
  type Modalidad,
  type Parentesco,
  type Persona,
  type Reserva,
  type TipoPersona,
} from "./modelo.js";

/** Una fila del descuento: una persona, una modalidad. Se calcula, no se guarda. */
export type LineaDescuento = {
  personaId: string;
  nombreCompleto: string;
  tipo: TipoPersona;
  parentesco: Parentesco | null;
  modalidad: Modalidad;
  cantidad: number;
  precioUnitarioBs: number;
  subtotalBs: number;
};

export type DescuentoTitular = {
  titularId: string;
  nombreTitular: string;
  codigoEmpleado: string;
  lineas: LineaDescuento[];
  totalBs: number;
};

export type Titular = { persona: Persona; codigoEmpleado: string };

/**
 * R13, R16, R17: agrupa por titular lo que se cobra. Lo confirmado se cobra aunque la persona
 * no haya ido; lo cancelado y lo avisado no. Cada titular de la lista aparece aunque no haya
 * consumido (HU10 CA5); quien tenga consumo sin estar en la lista también aparece.
 */
export function calcularDescuentos(
  reservas: Reserva[],
  personas: Map<string, Persona>,
  titulares: Titular[],
): DescuentoTitular[] {
  const porTitular = new Map<string, Map<string, LineaDescuento>>();
  const codigos = new Map<string, string>();
  for (const titular of titulares) {
    porTitular.set(titular.persona.id, new Map());
    codigos.set(titular.persona.id, titular.codigoEmpleado);
  }

  for (const reserva of reservas) {
    if (!cuentaParaCobro(reserva)) continue;
    const persona = personas.get(reserva.personaId);
    const lineas = porTitular.get(reserva.titularId) ?? new Map<string, LineaDescuento>();
    porTitular.set(reserva.titularId, lineas);

    const clave = `${reserva.personaId}|${reserva.modalidad}|${reserva.precioBs}`;
    const linea = lineas.get(clave) ?? {
      personaId: reserva.personaId,
      nombreCompleto: persona ? nombreCompleto(persona) : reserva.personaId,
      tipo: persona?.tipo ?? "FAMILIAR",
      parentesco: persona?.parentesco ?? null,
      modalidad: reserva.modalidad,
      cantidad: 0,
      precioUnitarioBs: reserva.precioBs,
      subtotalBs: 0,
    };
    linea.cantidad += 1;
    linea.subtotalBs += reserva.precioBs;
    lineas.set(clave, linea);
  }

  const resultado: DescuentoTitular[] = [];
  for (const [titularId, lineas] of porTitular) {
    const ordenadas = [...lineas.values()].sort(ordenPersonas);
    const titular = personas.get(titularId);
    resultado.push({
      titularId,
      nombreTitular: titular ? nombreCompleto(titular) : titularId,
      codigoEmpleado: codigos.get(titularId) ?? "",
      lineas: ordenadas,
      totalBs: ordenadas.reduce((suma, linea) => suma + linea.subtotalBs, 0),
    });
  }
  return resultado.sort((a, b) => a.nombreTitular.localeCompare(b.nombreTitular, "es"));
}

/** El titular primero, después sus familiares por nombre; pensionado antes que no pensionado. */
function ordenPersonas(a: LineaDescuento, b: LineaDescuento): number {
  if (a.tipo !== b.tipo) return a.tipo === "EMPLEADO" ? -1 : 1;
  return a.nombreCompleto.localeCompare(b.nombreCompleto, "es") || b.modalidad.localeCompare(a.modalidad);
}
