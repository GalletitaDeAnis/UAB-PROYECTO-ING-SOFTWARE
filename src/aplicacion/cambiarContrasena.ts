import type { Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type CifradorDeContrasenas,
  type CuentaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";

export const LARGO_MINIMO_CONTRASENA = 8;

export function errorEnContrasena(contrasena: string): string | null {
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`;
  }
  if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
    return "La contraseña debe combinar letras y números.";
  }
  return null;
}

/** HU02 CA6 y HU09 CA5: con la contraseña inicial o temporal no se hace nada más hasta cambiarla. */
export class CambiarContrasena {
  constructor(
    private readonly cuentas: CuentaRepositorio,
    private readonly cifrador: CifradorDeContrasenas,
  ) {}

  async ejecutar(
    usuario: Usuario,
    actual: string,
    nueva: string,
    confirmacion: string,
  ): Promise<Resultado<Usuario>> {
    const cuenta = await this.cuentas.obtener(usuario.id);
    if (!cuenta || !(await this.cifrador.verificar(actual, cuenta.contrasenaHash))) {
      return fallo("La contraseña actual no es correcta.");
    }
    if (nueva !== confirmacion) return fallo("La nueva contraseña y su confirmación no coinciden.");
    if (nueva === actual) return fallo("La nueva contraseña tiene que ser distinta de la actual.");
    const error = errorEnContrasena(nueva);
    if (error) return fallo(error);

    await this.cuentas.actualizar({
      ...cuenta,
      contrasenaHash: await this.cifrador.cifrar(nueva),
      debeCambiarContrasena: false,
    });
    return ok({ ...usuario, debeCambiarContrasena: false });
  }
}
