import type { Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type CuentaRepositorio,
  type GeneradorDeTokens,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
  type SesionRepositorio,
} from "../dominio/puertos.js";
import { USUARIO_DE_BAJA } from "./iniciarSesion.js";

/** HU02 CA7. */
export const INACTIVIDAD_MAXIMA_MS = 30 * 60 * 1000;
export const SESION_EXPIRADA = "Tu sesión expiró por inactividad. Vuelve a ingresar.";
export const SIN_SESION = "Necesitas iniciar sesión.";

/**
 * Cada acción con sesión pasa por aquí: valida el token y renueva los 30 minutos.
 * El tipo y el estado se leen de la cuenta en cada pedido, así una baja (HU09 CA3) o un
 * cambio de tipo (CA4) rigen desde el pedido siguiente.
 */
export class ValidarSesion {
  constructor(
    private readonly sesiones: SesionRepositorio,
    private readonly cuentas: CuentaRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly tokens: GeneradorDeTokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(token: string | null | undefined): Promise<Resultado<Usuario>> {
    if (!token) return fallo(SIN_SESION);
    const tokenHash = this.tokens.hash(token);
    const sesion = await this.sesiones.obtener(tokenHash);
    if (!sesion) return fallo(SIN_SESION);

    const ahora = this.reloj.instante();
    if (ahora - sesion.ultimaActividad >= INACTIVIDAD_MAXIMA_MS) {
      await this.sesiones.eliminar(tokenHash);
      return fallo(SESION_EXPIRADA);
    }
    const cuenta = await this.cuentas.obtener(sesion.personaId);
    const persona = await this.personas.obtener(sesion.personaId);
    if (!cuenta || !persona?.activo) {
      await this.sesiones.eliminar(tokenHash);
      return fallo(USUARIO_DE_BAJA);
    }
    await this.sesiones.tocar(tokenHash, ahora);
    return ok({
      id: cuenta.personaId,
      nombreUsuario: cuenta.nombreUsuario,
      tipo: cuenta.tipo,
      debeCambiarContrasena: cuenta.debeCambiarContrasena,
    });
  }
}

export class CerrarSesion {
  constructor(
    private readonly sesiones: SesionRepositorio,
    private readonly tokens: GeneradorDeTokens,
  ) {}

  async ejecutar(token: string): Promise<void> {
    await this.sesiones.eliminar(this.tokens.hash(token));
  }
}
