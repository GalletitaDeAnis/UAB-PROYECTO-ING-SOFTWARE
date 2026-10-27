import type { Persona, Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type CifradorDeContrasenas,
  type CuentaRepositorio,
  type GeneradorDeTokens,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
  type SesionRepositorio,
} from "../dominio/puertos.js";

export const CREDENCIALES_INCORRECTAS = "Usuario o contraseña incorrectos";
export const USUARIO_DE_BAJA = "Tu usuario fue dado de baja. No puedes ingresar.";

export type SesionIniciada = {
  token: string;
  usuario: Usuario;
  persona: Persona;
};

/** HU02: credenciales propias del sistema (R5). La contraseña se compara contra su hash. */
export class IniciarSesion {
  constructor(
    private readonly cuentas: CuentaRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly cifrador: CifradorDeContrasenas,
    private readonly tokens: GeneradorDeTokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(nombreUsuario: string, contrasena: string): Promise<Resultado<SesionIniciada>> {
    const nombre = nombreUsuario.trim().toLowerCase();
    if (!nombre || !contrasena) return fallo(CREDENCIALES_INCORRECTAS);

    const cuenta = await this.cuentas.buscarPorNombreUsuario(nombre);
    if (!cuenta || !(await this.cifrador.verificar(contrasena, cuenta.contrasenaHash))) {
      return fallo(CREDENCIALES_INCORRECTAS);
    }
    // CA5: solo se avisa la baja a quien ya demostró conocer la contraseña.
    const persona = await this.personas.obtener(cuenta.personaId);
    if (!persona || !persona.activo) return fallo(USUARIO_DE_BAJA);

    const token = this.tokens.nuevo();
    await this.sesiones.guardar({
      tokenHash: this.tokens.hash(token),
      personaId: persona.id,
      ultimaActividad: this.reloj.instante(),
    });
    return ok({
      token,
      persona,
      usuario: {
        id: persona.id,
        nombreUsuario: cuenta.nombreUsuario,
        tipo: cuenta.tipo,
        debeCambiarContrasena: cuenta.debeCambiarContrasena,
      },
    });
  }
}
