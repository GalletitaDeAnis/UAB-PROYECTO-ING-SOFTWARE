import type {
  Cuenta,
  DatosPersonales,
  MenuDia,
  MenuSemanal,
  Parentesco,
  Pension,
  Persona,
  Reserva,
  TipoUsuario,
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

export type NuevoFamiliar = DatosPersonales & { parentesco: Parentesco };

export type NuevaCuenta = {
  codigoEmpleado: string;
  nombreUsuario: string;
  contrasenaHash: string;
  tipo: TipoUsuario;
};

/** Personas que consumen: usuarios y familiares. Nada se borra; la baja deja `activo = false`. */
export interface PersonaRepositorio {
  obtener(id: string): Promise<Persona | null>;
  obtenerVarias(ids: string[]): Promise<Persona[]>;
  buscarPorCi(ci: string): Promise<Persona | null>;
  /** Activos e inactivos, para la gestión del administrador. */
  familiares(titularId: string): Promise<Persona[]>;
  familiaresActivos(titularId: string): Promise<Persona[]>;
  agregarFamiliar(titularId: string, familiar: NuevoFamiliar): Promise<Persona>;
  actualizar(persona: Persona): Promise<void>;
  /**
   * HU09 CA2 y CA3: deja inactivas a esas personas y anula, en la misma transacción,
   * sus reservas confirmadas desde `anularDesde` (incluida). Lo anterior se conserva.
   */
  darDeBaja(personaIds: string[], anularDesde: string): Promise<void>;
}

export type UsuarioRegistrado = { persona: Persona; cuenta: Cuenta; familiares: Persona[] };

/** Cuentas de acceso. Registrar crea la persona, la cuenta y los familiares juntos: o todo o nada. */
export interface CuentaRepositorio {
  obtener(personaId: string): Promise<Cuenta | null>;
  buscarPorNombreUsuario(nombreUsuario: string): Promise<Cuenta | null>;
  buscarPorCodigo(codigoEmpleado: string): Promise<Cuenta | null>;
  listar(): Promise<Cuenta[]>;
  registrar(datos: DatosPersonales, cuenta: NuevaCuenta, familiares: NuevoFamiliar[]): Promise<UsuarioRegistrado>;
  actualizar(cuenta: Cuenta): Promise<void>;
}

export interface ReservaRepositorio {
  obtener(personaId: string, fecha: string): Promise<Reserva | null>;
  guardar(reserva: Reserva): Promise<void>;
  listarDelTitular(titularId: string, anio: number, mes: number): Promise<Reserva[]>;
  listarDeLaPersona(personaId: string, anio: number, mes: number): Promise<Reserva[]>;
  listarConfirmadas(fecha: string): Promise<Reserva[]>;
  listarDelMes(anio: number, mes: number): Promise<Reserva[]>;
}

export interface PensionRepositorio {
  obtener(personaId: string, anio: number, mes: number): Promise<Pension | null>;
  listarDelTitular(titularId: string, anio: number, mes: number): Promise<Pension[]>;
  listarDelMes(anio: number, mes: number): Promise<Pension[]>;
  /** Guarda la pensión y sus reservas de los días con menú ya publicado: o quedan las dos o ninguna. */
  registrar(pension: Pension, reservas: Reserva[]): Promise<void>;
}

export interface MenuRepositorio {
  obtenerSemana(lunes: string): Promise<MenuSemanal | null>;
  obtenerDia(fecha: string): Promise<MenuDia | null>;
  diasDelMes(anio: number, mes: number): Promise<MenuDia[]>;
  /** HU07 CA2: el menú y las reservas de los pensionados se guardan en la misma transacción. */
  publicar(menu: MenuSemanal, reservasDePension: Reserva[]): Promise<void>;
}

export type SesionGuardada = {
  tokenHash: string;
  personaId: string;
  ultimaActividad: number;
};

export interface SesionRepositorio {
  guardar(sesion: SesionGuardada): Promise<void>;
  obtener(tokenHash: string): Promise<SesionGuardada | null>;
  tocar(tokenHash: string, instante: number): Promise<void>;
  eliminar(tokenHash: string): Promise<void>;
  eliminarDeLaPersona(personaId: string): Promise<void>;
}

export type FormatoReporte = "EXCEL" | "PDF";

/** HU10 CA3: Excel y PDF son dos implementaciones del mismo puerto. El cálculo no sabe cuál llegó. */
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

/** La contraseña se guarda solo como hash con sal. La temporal se muestra una vez al administrador. */
export interface CifradorDeContrasenas {
  cifrar(contrasena: string): Promise<string>;
  verificar(contrasena: string, hash: string): Promise<boolean>;
  temporal(): string;
}
