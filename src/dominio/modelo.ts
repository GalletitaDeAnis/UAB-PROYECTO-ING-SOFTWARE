import { esFechaValida } from "./tiempo.js";

/** R2: cada usuario accede solo a las opciones de su tipo. */
export type TipoUsuario = "ADMINISTRADOR" | "EMPLEADO";

/** Quien consume: un usuario del sistema (empleado de la institución) o un familiar a su cargo. */
export type TipoPersona = "EMPLEADO" | "FAMILIAR";

/** R4: solo primer grado. */
export type Parentesco = "CONYUGE" | "HIJO" | "HIJA" | "PADRE" | "MADRE";

export type Modalidad = "NO_PENSIONADO" | "PENSIONADO";

export type EstadoReserva = "CONFIRMADA" | "CANCELADA" | "INASISTENCIA_AVISADA";

/** §1.2 del backlog: los mismos datos para el usuario y para cada familiar (R4). */
export type DatosPersonales = {
  nombres: string;
  apellidos: string;
  ci: string;
  fechaNacimiento: string;
  telefono: string;
};

/**
 * Una persona que puede consumir. El usuario es su propio titular; el familiar apunta al
 * usuario empleado que paga por él (R16). Una baja no borra la fila: el reporte la sigue usando.
 */
export type Persona = DatosPersonales & {
  id: string;
  tipo: TipoPersona;
  parentesco: Parentesco | null;
  titularId: string;
  activo: boolean;
};

/** Credenciales y permisos del usuario. Solo existe para personas de tipo EMPLEADO (R4). */
export type Cuenta = {
  personaId: string;
  codigoEmpleado: string;
  nombreUsuario: string;
  contrasenaHash: string;
  tipo: TipoUsuario;
  debeCambiarContrasena: boolean;
};

/** Quien hace la operación, ya autenticado. Lo arma la sesión, nunca la pantalla. */
export type Usuario = {
  id: string;
  nombreUsuario: string;
  tipo: TipoUsuario;
  debeCambiarContrasena: boolean;
};

/** R15: nominal, a nombre de quien consume; se descuenta al titular (R16). */
export type Reserva = {
  personaId: string;
  titularId: string;
  fecha: string;
  modalidad: Modalidad;
  precioBs: number;
  estado: EstadoReserva;
};

export type Pension = {
  personaId: string;
  titularId: string;
  anio: number;
  mes: number;
  solicitadaEl: string;
};

export type MenuDia = {
  fecha: string;
  descripcion: string;
};

/** R6: se publica una vez por semana y no se modifica. Los días que no figuran no tienen atención. */
export type MenuSemanal = {
  lunes: string;
  publicadoEl: string;
  dias: MenuDia[];
};

export const PRECIO_NO_PENSIONADO_BS = 18;
export const PRECIO_PENSIONADO_BS = 15;
export const MINIMO_ALMUERZOS_PENSION = 10;

export const PARENTESCOS: Record<Parentesco, string> = {
  CONYUGE: "Cónyuge",
  HIJO: "Hijo",
  HIJA: "Hija",
  PADRE: "Padre",
  MADRE: "Madre",
};

export function esParentesco(valor: string): valor is Parentesco {
  return Object.hasOwn(PARENTESCOS, valor);
}

export function esTipoUsuario(valor: string): valor is TipoUsuario {
  return valor === "ADMINISTRADOR" || valor === "EMPLEADO";
}

export function precioDe(modalidad: Modalidad): number {
  return modalidad === "PENSIONADO" ? PRECIO_PENSIONADO_BS : PRECIO_NO_PENSIONADO_BS;
}

export function nombreCompleto(persona: Pick<DatosPersonales, "nombres" | "apellidos">): string {
  return `${persona.nombres} ${persona.apellidos}`;
}

/** R14: el usuario empleado más cada familiar activo. */
export function topeDiario(familiaresActivos: number): number {
  return 1 + familiaresActivos;
}

/** R13: lo confirmado se cobra aunque la persona no haya ido. Cancelado o avisado no cuenta. */
export function cuentaParaCobro(reserva: Reserva): boolean {
  return reserva.estado === "CONFIRMADA";
}

/** R11: diez por persona, o todos los días con atención si el mes tiene menos de diez. */
export function minimoDelMes(diasConMenu: number): number {
  return Math.min(MINIMO_ALMUERZOS_PENSION, diasConMenu);
}

/** R12, HU11 CA2: cuántos avisos más admite un pensionado sin bajar de su mínimo. */
export function inasistenciasDisponibles(programados: number, minimo: number): number {
  return Math.max(0, programados - minimo);
}

const CAMPOS: [keyof DatosPersonales, string][] = [
  ["nombres", "Nombres"],
  ["apellidos", "Apellidos"],
  ["ci", "CI"],
  ["fechaNacimiento", "Fecha de nacimiento"],
  ["telefono", "Teléfono"],
];

/** Quita espacios sobrantes. El CI se guarda en mayúsculas para que «123-1a» y «123-1A» sean el mismo. */
export function normalizarDatos(datos: DatosPersonales): DatosPersonales {
  const limpio = (texto: string) => texto.trim().replace(/\s+/g, " ");
  return {
    nombres: limpio(datos.nombres),
    apellidos: limpio(datos.apellidos),
    ci: limpio(datos.ci).toUpperCase(),
    fechaNacimiento: datos.fechaNacimiento.trim(),
    telefono: datos.telefono.replace(/[\s-]/g, ""),
  };
}

/** HU01 CA6: el primer dato faltante o inválido, o null si todo está bien. */
export function errorEnDatos(datos: DatosPersonales, hoy: string): string | null {
  for (const [campo, etiqueta] of CAMPOS) {
    if (!datos[campo]) return `Falta el dato obligatorio: ${etiqueta}.`;
  }
  if (!/^\d{5,10}(-[0-9A-Z]{1,3})?$/.test(datos.ci)) {
    return "El CI no es válido. Usa solo números y, si tiene, el complemento (por ejemplo 4567890-1B).";
  }
  if (!esFechaValida(datos.fechaNacimiento) || datos.fechaNacimiento > hoy) {
    return "La fecha de nacimiento no es válida.";
  }
  if (!/^\+?\d{7,15}$/.test(datos.telefono)) return "El teléfono no es válido.";
  return null;
}
