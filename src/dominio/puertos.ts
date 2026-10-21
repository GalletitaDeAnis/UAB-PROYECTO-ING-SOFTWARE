import type {
  Almuerzo,
  Empleado,
  Familiar,
  Feriado,
  Pension,
  Persona,
  Rol,
} from "./modelo.js";
import type { DescuentoTitular } from "./reporte.js";
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
  /** Fecha y minuto en America/La_Paz, para la regla de las 9:00. */
  ahora(): Momento;
  /** Milisegundos desde 1970, para medir la inactividad de la sesión. */
  instante(): number;
}

/** Respuesta de la API empresarial al validar usuario y contraseña. */
export type Autenticacion = { valida: true; codigoInstitucional: string } | { valida: false };

/** La API no respondió a tiempo o devolvió un error. HU01 CA4: no hay ingreso sin conexión. */
export class SistemaEmpresarialNoDisponible extends Error {
  constructor(causa?: string) {
    super(causa ? `Sistema empresarial no disponible: ${causa}` : "Sistema empresarial no disponible");
    this.name = "SistemaEmpresarialNoDisponible";
  }
}

/**
 * La API del sistema empresarial, solo lectura (R1b, R12).
 * Cada método lanza SistemaEmpresarialNoDisponible si la llamada falla o pasa de 5 segundos.
 */
export interface SistemaEmpresarial {
  autenticar(usuario: string, contrasena: string): Promise<Autenticacion>;
  obtenerEmpleado(codigo: string): Promise<Empleado | null>;
  obtenerFamiliares(codigo: string): Promise<Familiar[]>;
}

export interface AutorizacionRepositorio {
  obtenerRol(codigoEmpleado: string): Promise<Rol | null>;
}

/** Copia local de empleados y familiares, actualizada en cada inicio de sesión. */
export interface PersonaRepositorio {
  obtener(id: string): Promise<Persona | null>;
  obtenerVarias(ids: string[]): Promise<Persona[]>;
  /** Guarda al empleado y deja vigentes solo los familiares que llegaron de la API. */
  sincronizar(empleado: Persona, familiares: Persona[]): Promise<void>;
  familiaresVigentes(codigoTitular: string): Promise<Persona[]>;
}

export interface AlmuerzoRepositorio {
  obtener(personaId: string, fecha: string): Promise<Almuerzo | null>;
  guardar(almuerzo: Almuerzo): Promise<void>;
  listarDelTitular(codigoTitular: string, anio: number, mes: number): Promise<Almuerzo[]>;
  listarDeLaPersona(personaId: string, anio: number, mes: number): Promise<Almuerzo[]>;
  listarConfirmados(fecha: string): Promise<Almuerzo[]>;
  listarDelMes(anio: number, mes: number): Promise<Almuerzo[]>;
}

export interface FeriadoRepositorio {
  esFeriado(fecha: string): Promise<boolean>;
  listar(anio: number, mes: number): Promise<Feriado[]>;
  guardar(feriado: Feriado): Promise<void>;
}

export interface PensionRepositorio {
  obtener(personaId: string, anio: number, mes: number): Promise<Pension | null>;
  listarDelTitular(codigoTitular: string, anio: number, mes: number): Promise<Pension[]>;
  /** Guarda la pensión y sus almuerzos del mes juntos: o quedan los dos o ninguno. */
  registrar(pension: Pension, almuerzos: Almuerzo[]): Promise<void>;
}

export type SesionGuardada = {
  tokenHash: string;
  codigoInstitucional: string;
  rol: Rol;
  ultimaActividad: number;
};

export interface SesionRepositorio {
  guardar(sesion: SesionGuardada): Promise<void>;
  obtener(tokenHash: string): Promise<SesionGuardada | null>;
  tocar(tokenHash: string, instante: number): Promise<void>;
  eliminar(tokenHash: string): Promise<void>;
}

export type FormatoReporte = "EXCEL" | "PDF";

/** HU11 CA3, CU12: Excel y PDF son dos implementaciones del mismo puerto. El cálculo no sabe cuál llegó. */
export interface ExportadorReporte {
  readonly formato: FormatoReporte;
  readonly extension: string;
  readonly tipoContenido: string;
  generar(anio: number, mes: number, descuentos: DescuentoTitular[]): Promise<Uint8Array>;
}

/** Crea el token que recibe el cliente y el hash que se guarda. El token en claro no se guarda. */
export interface GeneradorDeTokens {
  nuevo(): string;
  hash(token: string): string;
}
