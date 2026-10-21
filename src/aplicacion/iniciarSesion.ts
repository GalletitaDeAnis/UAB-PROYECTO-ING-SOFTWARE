import {
  personaDelEmpleado,
  personaDelFamiliar,
  type Persona,
  type Usuario,
} from "../dominio/modelo.js";
import {
  fallo,
  ok,
  SistemaEmpresarialNoDisponible,
  type AutorizacionRepositorio,
  type GeneradorDeTokens,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
  type SesionRepositorio,
  type SistemaEmpresarial,
} from "../dominio/puertos.js";

export const CREDENCIALES_INCORRECTAS = "Usuario o contraseña incorrectos";
export const USUARIO_INACTIVO = "Tu usuario no está activo en el sistema empresarial. No puedes ingresar.";
export const API_NO_DISPONIBLE = "No se pudo validar tu usuario, intenta más tarde";

export type SesionIniciada = {
  token: string;
  usuario: Usuario;
  empleado: Persona;
  familiares: Persona[];
};

/** HU01: la contraseña va a la API y no se guarda. Aquí solo queda la sesión propia. */
export class IniciarSesion {
  constructor(
    private readonly empresarial: SistemaEmpresarial,
    private readonly personas: PersonaRepositorio,
    private readonly autorizaciones: AutorizacionRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly tokens: GeneradorDeTokens,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(usuario: string, contrasena: string): Promise<Resultado<SesionIniciada>> {
    if (!usuario.trim() || !contrasena) return fallo(CREDENCIALES_INCORRECTAS);

    try {
      const autenticacion = await this.empresarial.autenticar(usuario.trim(), contrasena);
      if (!autenticacion.valida) return fallo(CREDENCIALES_INCORRECTAS);

      const empleado = await this.empresarial.obtenerEmpleado(autenticacion.codigoInstitucional);
      if (!empleado || !empleado.activo) return fallo(USUARIO_INACTIVO);

      const familiares = await this.empresarial.obtenerFamiliares(empleado.codigoInstitucional);
      const titular = personaDelEmpleado(empleado);
      const aCargo = familiares.map((familiar) => personaDelFamiliar(titular.id, familiar));
      await this.personas.sincronizar(titular, aCargo);

      const rol = (await this.autorizaciones.obtenerRol(titular.id)) ?? "EMPLEADO";
      const token = this.tokens.nuevo();
      await this.sesiones.guardar({
        tokenHash: this.tokens.hash(token),
        codigoInstitucional: titular.id,
        rol,
        ultimaActividad: this.reloj.instante(),
      });

      return ok({
        token,
        usuario: { codigoInstitucional: titular.id, rol },
        empleado: titular,
        familiares: aCargo,
      });
    } catch (error) {
      if (error instanceof SistemaEmpresarialNoDisponible) return fallo(API_NO_DISPONIBLE);
      throw error;
    }
  }
}
