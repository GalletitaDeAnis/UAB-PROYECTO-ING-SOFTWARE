import { topeDiario, type Persona, type Usuario } from "../dominio/modelo.js";
import { fallo, ok, type PersonaRepositorio, type Resultado } from "../dominio/puertos.js";

export type MiFamilia = {
  titular: Persona;
  familiares: Persona[];
  topeDiario: number;
};

/** HU05: lee la copia que se actualizó al iniciar sesión. No hay forma de agregar a mano. */
export class VerMiFamilia {
  constructor(private readonly personas: PersonaRepositorio) {}

  async ejecutar(usuario: Usuario): Promise<Resultado<MiFamilia>> {
    const titular = await this.personas.obtener(usuario.codigoInstitucional);
    if (!titular) return fallo("No encontramos tus datos. Vuelve a iniciar sesión.");
    const familiares = await this.personas.familiaresVigentes(usuario.codigoInstitucional);
    familiares.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));
    return ok({ titular, familiares, topeDiario: topeDiario(familiares.length) });
  }
}
