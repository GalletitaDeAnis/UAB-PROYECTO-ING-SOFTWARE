import type { Persona, TipoUsuario, Usuario } from "../dominio/modelo.js";
import { fallo, ok, type PersonaRepositorio, type Resultado } from "../dominio/puertos.js";

export const SOLO_ADMINISTRADOR = "Esta opción es solo para el usuario administrador.";
export const SOLO_EMPLEADO = "Esta opción es solo para el usuario empleado.";
export const CAMBIO_PENDIENTE = "Antes de continuar tienes que cambiar tu contraseña.";

/**
 * R2 y HU02 CA6: cada caso de uso protegido empieza aquí. Devuelve el motivo del rechazo o null.
 * La pantalla esconde las opciones del otro tipo, pero la regla se cumple aquí, no allá.
 */
export function sinPermiso(usuario: Usuario, tipo: TipoUsuario): string | null {
  if (usuario.debeCambiarContrasena) return CAMBIO_PENDIENTE;
  if (usuario.tipo !== tipo) return tipo === "ADMINISTRADOR" ? SOLO_ADMINISTRADOR : SOLO_EMPLEADO;
  return null;
}

/** R15: el usuario empleado solo actúa por sí mismo o por un familiar activo a su cargo. */
export async function personaACargo(
  personas: PersonaRepositorio,
  usuario: Usuario,
  personaId: string,
): Promise<Resultado<Persona>> {
  const persona = await personas.obtener(personaId);
  if (!persona || persona.titularId !== usuario.id) {
    return fallo("Esa persona no está registrada en tu grupo familiar.");
  }
  if (!persona.activo) return fallo("Esa persona fue dada de baja y ya no puede usar el servicio.");
  return ok(persona);
}

export function mesValido(anio: number, mes: number): boolean {
  return Number.isInteger(anio) && Number.isInteger(mes) && anio >= 2000 && mes >= 1 && mes <= 12;
}

/** Para las operaciones que actúan sobre varias personas a la vez: el resultado de cada una. */
export type ResultadoPorPersona = {
  personaId: string;
  nombre: string;
  ok: boolean;
  mensaje: string;
};
