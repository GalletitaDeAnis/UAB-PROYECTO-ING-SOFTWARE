export type Rol = "EMPLEADO" | "ENCARGADO";

export type OrigenAlmuerzo = "ESPORADICO" | "PENSION";

export type EstadoAlmuerzo = "CONFIRMADO" | "CANCELADO" | "INASISTENCIA_AVISADA";

/** Quien consume: el propio empleado o un familiar de primer grado a su cargo (R9, R11). */
export type TipoPersona = "EMPLEADO" | "FAMILIAR";

/** Lo que entrega el sistema empresarial sobre el empleado. Este sistema no lo da de alta (R1b). */
export type Empleado = {
  codigoInstitucional: string;
  nombreCompleto: string;
  activo: boolean;
};

/** Familiar de primer grado tal como lo entrega el sistema empresarial. El parentesco no se decide aquí (S2). */
export type Familiar = {
  id: string;
  nombreCompleto: string;
  parentesco: string;
};

/**
 * Copia local de cada persona que puede consumir. El empleado es su propio titular.
 * Se guarda para que una reserva nominal y el reporte sigan teniendo nombre
 * aunque el sistema empresarial cambie después.
 */
export type Persona = {
  id: string;
  tipo: TipoPersona;
  nombreCompleto: string;
  parentesco: string | null;
  codigoTitular: string;
  vigente: boolean;
};

/** Un almuerzo es nominal: va a nombre de quien lo consume y se descuenta al titular (R11, R8). */
export type Almuerzo = {
  personaId: string;
  codigoTitular: string;
  fecha: string;
  origen: OrigenAlmuerzo;
  precioBs: number;
  estado: EstadoAlmuerzo;
};

export type Pension = {
  personaId: string;
  codigoTitular: string;
  anio: number;
  mes: number;
  solicitadaEl: string;
};

export type Feriado = {
  fecha: string;
  descripcion: string;
};

/** Quien hace la operación, ya autenticado. Lo arma la sesión, no la pantalla. */
export type Usuario = {
  codigoInstitucional: string;
  rol: Rol;
};

export const PRECIO_ESPORADICO_BS = 18;
export const PRECIO_PENSION_BS = 15;
export const MINIMO_ALMUERZOS_PENSION = 10;

export function precioDe(origen: OrigenAlmuerzo): number {
  return origen === "PENSION" ? PRECIO_PENSION_BS : PRECIO_ESPORADICO_BS;
}

export function tipoParaLista(origen: OrigenAlmuerzo): "Pensionado" | "No pensionado" {
  return origen === "PENSION" ? "Pensionado" : "No pensionado";
}

/** R10: el titular más cada familiar de primer grado registrado. */
export function topeDiario(familiaresVigentes: number): number {
  return 1 + familiaresVigentes;
}

/** R7, R7b: se cobra lo confirmado, salvo que el día sea feriado. Cancelado o avisado no cuenta. */
export function cuentaParaCobro(almuerzo: Almuerzo, esFeriado: (fecha: string) => boolean): boolean {
  return almuerzo.estado === "CONFIRMADO" && !esFeriado(almuerzo.fecha);
}

export function personaDelEmpleado(empleado: Empleado): Persona {
  return {
    id: empleado.codigoInstitucional,
    tipo: "EMPLEADO",
    nombreCompleto: empleado.nombreCompleto,
    parentesco: null,
    codigoTitular: empleado.codigoInstitucional,
    vigente: empleado.activo,
  };
}

export function personaDelFamiliar(codigoTitular: string, familiar: Familiar): Persona {
  return {
    id: familiar.id,
    tipo: "FAMILIAR",
    nombreCompleto: familiar.nombreCompleto,
    parentesco: familiar.parentesco,
    codigoTitular,
    vigente: true,
  };
}
