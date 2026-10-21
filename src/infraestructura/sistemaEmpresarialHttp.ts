import type { Empleado, Familiar } from "../dominio/modelo.js";
import {
  SistemaEmpresarialNoDisponible,
  type Autenticacion,
  type SistemaEmpresarial,
} from "../dominio/puertos.js";

export type ConfiguracionEmpresarial = {
  /** EMPRESARIAL_API_URL, sin barra final. */
  urlBase: string;
  /** EMPRESARIAL_API_KEY: credencial del restaurante ante la API, nunca en el código. */
  apiKey: string;
  /** Backlog §2.4: 5 segundos por llamada. */
  tiempoMaximoMs?: number;
};

type RespuestaLogin = { valido?: boolean; codigoEmpleado?: string };
type RespuestaEmpleado = { codigo: string; nombre: string; activo: boolean };
type RespuestaFamiliar = { id: string; nombre: string; parentesco: string };

/**
 * Adaptador HTTP de la API del sistema empresarial (solo lectura).
 * Las rutas son las referenciales del backlog §2.3. Si TI entrega otras, se cambia este archivo
 * y ningún caso de uso.
 */
export class SistemaEmpresarialHttp implements SistemaEmpresarial {
  private readonly tiempoMaximoMs: number;

  constructor(private readonly config: ConfiguracionEmpresarial) {
    this.tiempoMaximoMs = config.tiempoMaximoMs ?? 5000;
  }

  async autenticar(usuario: string, contrasena: string): Promise<Autenticacion> {
    const respuesta = await this.llamar("POST", "/auth/login", { usuario, contrasena });
    if (respuesta.status === 401 || respuesta.status === 403) return { valida: false };
    const cuerpo = (await this.leer(respuesta, "/auth/login")) as RespuestaLogin;
    if (!cuerpo.valido || !cuerpo.codigoEmpleado) return { valida: false };
    return { valida: true, codigoInstitucional: cuerpo.codigoEmpleado };
  }

  async obtenerEmpleado(codigo: string): Promise<Empleado | null> {
    const ruta = `/empleados/${encodeURIComponent(codigo)}`;
    const respuesta = await this.llamar("GET", ruta);
    if (respuesta.status === 404) return null;
    const cuerpo = (await this.leer(respuesta, ruta)) as RespuestaEmpleado;
    return { codigoInstitucional: cuerpo.codigo, nombreCompleto: cuerpo.nombre, activo: cuerpo.activo === true };
  }

  async obtenerFamiliares(codigo: string): Promise<Familiar[]> {
    const ruta = `/empleados/${encodeURIComponent(codigo)}/familiares`;
    const respuesta = await this.llamar("GET", ruta);
    if (respuesta.status === 404) return [];
    const cuerpo = (await this.leer(respuesta, ruta)) as RespuestaFamiliar[];
    return cuerpo.map((familiar) => ({
      id: familiar.id,
      nombreCompleto: familiar.nombre,
      parentesco: familiar.parentesco,
    }));
  }

  private async llamar(metodo: "GET" | "POST", ruta: string, cuerpo?: unknown): Promise<Response> {
    try {
      return await fetch(`${this.config.urlBase}${ruta}`, {
        method: metodo,
        headers: {
          accept: "application/json",
          "x-api-key": this.config.apiKey,
          ...(cuerpo ? { "content-type": "application/json" } : {}),
        },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        signal: AbortSignal.timeout(this.tiempoMaximoMs),
      });
    } catch (error) {
      const motivo =
        error instanceof Error && error.name === "TimeoutError"
          ? `sin respuesta en ${this.tiempoMaximoMs} ms`
          : "no se pudo conectar";
      registrarError(metodo, ruta, motivo);
      throw new SistemaEmpresarialNoDisponible(motivo);
    }
  }

  private async leer(respuesta: Response, ruta: string): Promise<unknown> {
    if (!respuesta.ok) {
      registrarError("respuesta", ruta, `HTTP ${respuesta.status}`);
      throw new SistemaEmpresarialNoDisponible(`HTTP ${respuesta.status}`);
    }
    try {
      return await respuesta.json();
    } catch {
      registrarError("respuesta", ruta, "JSON inválido");
      throw new SistemaEmpresarialNoDisponible("respuesta inválida");
    }
  }
}

/** Backlog §2.4: cada error queda en el log, sin contraseñas ni cuerpos de respuesta. */
function registrarError(metodo: string, ruta: string, motivo: string): void {
  console.error(`[sistema-empresarial] ${new Date().toISOString()} ${metodo} ${ruta}: ${motivo}`);
}
