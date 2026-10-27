import {
  errorEnDatos,
  esParentesco,
  esTipoUsuario,
  normalizarDatos,
  topeDiario,
  type Cuenta,
  type DatosPersonales,
  type Persona,
  type TipoUsuario,
  type Usuario,
} from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type CifradorDeContrasenas,
  type CuentaRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
  type SesionRepositorio,
} from "../dominio/puertos.js";
import { admiteCambio, sumarDias } from "../dominio/tiempo.js";
import { sinPermiso } from "./comun.js";
import { ciDuplicado, validarFamiliares, type FamiliarIngresado } from "./registrarUsuario.js";

export const ULTIMO_ADMINISTRADOR = "Debe quedar al menos un usuario administrador activo.";

export type FichaUsuario = {
  persona: Persona;
  cuenta: Cuenta;
  /** Activos e inactivos: el administrador ve también a los dados de baja. */
  familiares: Persona[];
  topeDiario: number;
};

async function ficha(personas: PersonaRepositorio, cuenta: Cuenta): Promise<FichaUsuario | null> {
  const persona = await personas.obtener(cuenta.personaId);
  if (!persona) return null;
  const familiares = await personas.familiares(persona.id);
  familiares.sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombres.localeCompare(b.nombres, "es"));
  return { persona, cuenta, familiares, topeDiario: topeDiario(familiares.filter((f) => f.activo).length) };
}

/** R3: cuántos administradores quedarían activos si este dejara de serlo. */
async function otrosAdministradoresActivos(
  cuentas: CuentaRepositorio,
  personas: PersonaRepositorio,
  personaId: string,
): Promise<number> {
  const administradores = (await cuentas.listar()).filter((c) => c.tipo === "ADMINISTRADOR" && c.personaId !== personaId);
  const activos = await personas.obtenerVarias(administradores.map((c) => c.personaId));
  return activos.filter((persona) => persona.activo).length;
}

/** HU09: la lista de usuarios con su grupo familiar, para elegir a quién modificar. */
export class ListarUsuarios {
  constructor(
    private readonly cuentas: CuentaRepositorio,
    private readonly personas: PersonaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario): Promise<Resultado<FichaUsuario[]>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    const fichas: FichaUsuario[] = [];
    for (const cuenta of await this.cuentas.listar()) {
      const una = await ficha(this.personas, cuenta);
      if (una) fichas.push(una);
    }
    fichas.sort(
      (a, b) =>
        Number(b.persona.activo) - Number(a.persona.activo) ||
        a.persona.apellidos.localeCompare(b.persona.apellidos, "es") ||
        a.persona.nombres.localeCompare(b.persona.nombres, "es"),
    );
    return ok(fichas);
  }
}

export class VerUsuario {
  constructor(
    private readonly cuentas: CuentaRepositorio,
    private readonly personas: PersonaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string): Promise<Resultado<FichaUsuario>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    const cuenta = await this.cuentas.obtener(personaId);
    const una = cuenta ? await ficha(this.personas, cuenta) : null;
    return una ? ok(una) : fallo("Ese usuario no existe.");
  }
}

/** HU09 CA1: el familiar nuevo queda disponible y el tope diario sube en uno. */
export class AgregarFamiliar {
  constructor(
    private readonly reloj: Reloj,
    private readonly cuentas: CuentaRepositorio,
    private readonly personas: PersonaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, titularId: string, familiar: FamiliarIngresado): Promise<Resultado<Persona>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    const cuenta = await this.cuentas.obtener(titularId);
    const titular = await this.personas.obtener(titularId);
    if (!cuenta || !titular) return fallo("Ese usuario no existe.");
    if (cuenta.tipo !== "EMPLEADO") return fallo("Solo un usuario empleado tiene grupo familiar.");
    if (!titular.activo) return fallo("Ese usuario fue dado de baja.");

    const actuales = (await this.personas.familiaresActivos(titularId)).flatMap((f) => (f.parentesco ? [f.parentesco] : []));
    const validado = validarFamiliares([familiar], this.reloj.ahora().fecha, actuales);
    if (!validado.ok) return validado;
    const [nuevo] = validado.valor;
    if (await ciDuplicado(this.personas, [nuevo.ci])) return fallo(`Ya existe una persona registrada con el CI ${nuevo.ci}.`);
    return ok(await this.personas.agregarFamiliar(titularId, nuevo));
  }
}

/** HU09: corrige los datos personales de un usuario o de un familiar. El CI sigue sin repetirse. */
export class ModificarDatos {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
  ) {}

  async ejecutar(
    usuario: Usuario,
    personaId: string,
    ingresados: DatosPersonales,
    parentesco?: string,
  ): Promise<Resultado<Persona>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    const persona = await this.personas.obtener(personaId);
    if (!persona) return fallo("Esa persona no existe.");

    const datos = normalizarDatos(ingresados);
    const error = errorEnDatos(datos, this.reloj.ahora().fecha);
    if (error) return fallo(error);
    const mismoCi = await this.personas.buscarPorCi(datos.ci);
    if (mismoCi && mismoCi.id !== personaId) return fallo(`Ya existe una persona registrada con el CI ${datos.ci}.`);

    let nuevoParentesco = persona.parentesco;
    if (persona.tipo === "FAMILIAR" && parentesco !== undefined) {
      if (!esParentesco(parentesco)) return fallo("El parentesco debe ser cónyuge, hijo/hija, padre o madre.");
      nuevoParentesco = parentesco;
    }
    const modificada: Persona = { ...persona, ...datos, parentesco: nuevoParentesco };
    await this.personas.actualizar(modificada);
    return ok(modificada);
  }
}

/** HU09 CA4 y CA6: el nuevo tipo rige desde el pedido siguiente; el último administrador no cambia. */
export class CambiarTipoUsuario {
  constructor(
    private readonly cuentas: CuentaRepositorio,
    private readonly personas: PersonaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string, tipo: string): Promise<Resultado<Cuenta>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    if (!esTipoUsuario(tipo)) return fallo("Elige el tipo de usuario: administrador o empleado.");
    const cuenta = await this.cuentas.obtener(personaId);
    if (!cuenta) return fallo("Ese usuario no existe.");
    if (cuenta.tipo === tipo) return ok(cuenta);
    if (cuenta.tipo === "ADMINISTRADOR" && (await otrosAdministradoresActivos(this.cuentas, this.personas, personaId)) === 0) {
      return fallo(ULTIMO_ADMINISTRADOR);
    }
    const modificada: Cuenta = { ...cuenta, tipo: tipo as TipoUsuario };
    await this.cuentas.actualizar(modificada);
    return ok(modificada);
  }
}

export type BajaHecha = { personas: Persona[]; reservasAnuladasDesde: string };

/**
 * HU09 CA2 y CA3. La baja de un usuario arrastra a su grupo familiar y cierra sus sesiones.
 * Se anulan sin cobro las reservas que todavía se podían cancelar; lo consumido se conserva.
 */
export class DarDeBaja {
  constructor(
    private readonly reloj: Reloj,
    private readonly cuentas: CuentaRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly sesiones: SesionRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string): Promise<Resultado<BajaHecha>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    const persona = await this.personas.obtener(personaId);
    if (!persona) return fallo("Esa persona no existe.");
    if (!persona.activo) return fallo("Esa persona ya está dada de baja.");

    const cuenta = await this.cuentas.obtener(personaId);
    if (cuenta?.tipo === "ADMINISTRADOR" && (await otrosAdministradoresActivos(this.cuentas, this.personas, personaId)) === 0) {
      return fallo(ULTIMO_ADMINISTRADOR);
    }

    const afectadas = persona.tipo === "EMPLEADO" ? [persona, ...(await this.personas.familiaresActivos(persona.id))] : [persona];
    const ahora = this.reloj.ahora();
    const anularDesde = admiteCambio(ahora, ahora.fecha) ? ahora.fecha : sumarDias(ahora.fecha, 1);
    await this.personas.darDeBaja(
      afectadas.map((p) => p.id),
      anularDesde,
    );
    if (cuenta) await this.sesiones.eliminarDeLaPersona(personaId);
    return ok({ personas: afectadas.map((p) => ({ ...p, activo: false })), reservasAnuladasDesde: anularDesde });
  }
}

/** HU09 CA5: la temporal se muestra una sola vez al administrador y se cambia en el siguiente ingreso. */
export class RestablecerContrasena {
  constructor(
    private readonly cuentas: CuentaRepositorio,
    private readonly sesiones: SesionRepositorio,
    private readonly cifrador: CifradorDeContrasenas,
  ) {}

  async ejecutar(usuario: Usuario, personaId: string): Promise<Resultado<{ temporal: string }>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    const cuenta = await this.cuentas.obtener(personaId);
    if (!cuenta) return fallo("Ese usuario no existe.");

    const temporal = this.cifrador.temporal();
    await this.cuentas.actualizar({
      ...cuenta,
      contrasenaHash: await this.cifrador.cifrar(temporal),
      debeCambiarContrasena: true,
    });
    await this.sesiones.eliminarDeLaPersona(personaId);
    return ok({ temporal });
  }
}
