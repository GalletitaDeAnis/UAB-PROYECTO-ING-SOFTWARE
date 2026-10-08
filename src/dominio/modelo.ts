export type Rol = "EMPLEADO" | "ENCARGADO";

export type OrigenAlmuerzo = "ESPORADICO" | "PENSION";

export type EstadoAlmuerzo = "CONFIRMADO" | "CANCELADO" | "INASISTENCIA_AVISADA";

export type Empleado = {
  codigoInstitucional: string;
  nombreCompleto: string;
  activo: boolean;
};

export type Almuerzo = {
  codigoEmpleado: string;
  fecha: string;
  origen: OrigenAlmuerzo;
  precioBs: number;
  estado: EstadoAlmuerzo;
};

export type Pension = {
  codigoEmpleado: string;
  anio: number;
  mes: number;
  fechaSolicitud: string;
};

export type Feriado = {
  fecha: string;
  descripcion: string;
};

export const PRECIO_ESPORADICO_BS = 18;
export const PRECIO_PENSION_BS = 15;

export function precioDe(origen: OrigenAlmuerzo): number {
  return origen === "PENSION" ? PRECIO_PENSION_BS : PRECIO_ESPORADICO_BS;
}

export function tipoParaLista(origen: OrigenAlmuerzo): "Pensionado" | "No pensionado" {
  return origen === "PENSION" ? "Pensionado" : "No pensionado";
}
