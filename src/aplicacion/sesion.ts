import type { Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type GeneradorDeTokens,
  type Reloj,
  type Resultado,
  type SesionRepositorio,
} from "../dominio/puertos.js";

/** HU01 CA5. */
export const INACTIVIDAD_MAXIMA_MS = 30 * 60 * 1000;
export const SESION_EXPIRADA = "Tu sesión expiró por inactividad. Vuelve a ingresar.";
export const SIN_SESION = "Necesitas iniciar sesión.";

/** Cada acción con sesión pasa por aquí: valida el token y renueva los 30 minutos. */
export class ValidarSesion {
  constructor(
    private readonly sesiones: SesionRepositorio,
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
    await this.sesiones.tocar(tokenHash, ahora);
    return ok({ codigoInstitucional: sesion.codigoInstitucional, rol: sesion.rol });
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
