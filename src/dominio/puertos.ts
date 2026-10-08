import type { Almuerzo, Empleado, Feriado, Pension, Rol } from "./modelo.js";
import type { Momento } from "./tiempo.js";

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; mensaje: string };

export function ok<T>(valor: T): Resultado<T> {
  return { ok: true, valor };
}

export function fallo<T>(mensaje: string): Resultado<T> {
  return { ok: false, mensaje };
}

export interface Reloj {
  ahora(): Momento;
}

export interface DirectorioEmpleados {
  buscar(codigo: string): Promise<Empleado | null>;
}

export interface AutorizacionRepositorio {
  obtenerRol(codigoEmpleado: string): Promise<Rol | null>;
}

export interface AlmuerzoRepositorio {
  obtener(codigoEmpleado: string, fecha: string): Promise<Almuerzo | null>;
  guardar(almuerzo: Almuerzo): Promise<void>;
  listarPorEmpleado(codigoEmpleado: string): Promise<Almuerzo[]>;
  listarConfirmados(fecha: string): Promise<Almuerzo[]>;
}

export interface FeriadoRepositorio {
  esFeriado(fecha: string): Promise<boolean>;
  listar(): Promise<Feriado[]>;
}

export interface PensionRepositorio {
  obtener(codigoEmpleado: string, anio: number, mes: number): Promise<Pension | null>;
}
