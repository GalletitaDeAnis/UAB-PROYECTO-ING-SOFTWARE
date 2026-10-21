import type { Persona, Usuario } from "../dominio/modelo.js";
import { fallo, ok, type PersonaRepositorio, type Resultado } from "../dominio/puertos.js";

export const SOLO_ENCARGADO = "Esta opción es solo para el encargado del restaurante.";

export function esEncargado(usuario: Usuario): boolean {
  return usuario.rol === "ENCARGADO";
}

/**
 * R9, R11: el titular solo actúa por sí mismo o por un familiar vigente que la API le asignó.
 * No existe un nombre libre: si la persona no está en la copia local, no se puede elegir.
 */
export async function personaACargo(
  personas: PersonaRepositorio,
  usuario: Usuario,
  personaId: string,
): Promise<Resultado<Persona>> {
  const persona = await personas.obtener(personaId);
  if (!persona || persona.codigoTitular !== usuario.codigoInstitucional) {
    return fallo("Esa persona no está registrada a tu cargo en el sistema empresarial.");
  }
  if (!persona.vigente) {
    return fallo("Esa persona ya no figura como familiar habilitado en el sistema empresarial.");
  }
  return ok(persona);
}

export function mesValido(anio: number, mes: number): boolean {
  return Number.isInteger(anio) && Number.isInteger(mes) && anio >= 2000 && mes >= 1 && mes <= 12;
}
