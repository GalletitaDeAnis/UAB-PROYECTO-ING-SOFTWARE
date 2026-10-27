import {
  errorEnDatos,
  esParentesco,
  esTipoUsuario,
  normalizarDatos,
  PARENTESCOS,
  topeDiario,
  type DatosPersonales,
  type Parentesco,
  type Usuario,
} from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type CifradorDeContrasenas,
  type CuentaRepositorio,
  type NuevoFamiliar,
  type PersonaRepositorio,
  type Reloj,
  type Resultado,
  type UsuarioRegistrado,
} from "../dominio/puertos.js";
import { sinPermiso } from "./comun.js";
import { errorEnContrasena } from "./cambiarContrasena.js";

export type FamiliarIngresado = DatosPersonales & { parentesco: string };

export type SolicitudRegistro = {
  datos: DatosPersonales;
  codigoEmpleado: string;
  nombreUsuario: string;
  contrasenaInicial: string;
  tipo: string;
  familiares: FamiliarIngresado[];
};

/** R4: un cónyuge, un padre y una madre como máximo; hijos sin límite. */
const UNICOS: Parentesco[] = ["CONYUGE", "PADRE", "MADRE"];

/**
 * Comprueba parentesco (HU01 CA4), datos obligatorios (CA6) y que el grupo no repita CI
 * ni parentesco único. Devuelve los familiares listos para guardar o el primer error.
 */
export function validarFamiliares(
  ingresados: FamiliarIngresado[],
  hoy: string,
  yaRegistrados: Parentesco[] = [],
): Resultado<NuevoFamiliar[]> {
  const familiares: NuevoFamiliar[] = [];
  const parentescos = [...yaRegistrados];
  for (const [indice, ingresado] of ingresados.entries()) {
    const quien = ingresados.length > 1 ? `Familiar ${indice + 1}: ` : "Familiar: ";
    if (!esParentesco(ingresado.parentesco)) {
      return fallo(`${quien}el parentesco debe ser cónyuge, hijo/hija, padre o madre.`);
    }
    const datos = normalizarDatos(ingresado);
    const error = errorEnDatos(datos, hoy);
    if (error) return fallo(quien + error.charAt(0).toLowerCase() + error.slice(1));
    if (UNICOS.includes(ingresado.parentesco) && parentescos.includes(ingresado.parentesco)) {
      return fallo(`${quien}ya hay un familiar registrado como ${PARENTESCOS[ingresado.parentesco].toLowerCase()}.`);
    }
    parentescos.push(ingresado.parentesco);
    familiares.push({ ...datos, parentesco: ingresado.parentesco });
  }
  return ok(familiares);
}

/** R3: el CI no se repite entre personas, ni dentro del mismo registro (HU01 CA3). */
export async function ciDuplicado(personas: PersonaRepositorio, cis: string[]): Promise<string | null> {
  const vistos = new Set<string>();
  for (const ci of cis) {
    if (vistos.has(ci) || (await personas.buscarPorCi(ci))) return ci;
    vistos.add(ci);
  }
  return null;
}

export type RegistroHecho = UsuarioRegistrado & { topeDiario: number };

/** HU01: el administrador registra al usuario, su tipo y su grupo familiar en una sola operación. */
export class RegistrarUsuario {
  constructor(
    private readonly reloj: Reloj,
    private readonly personas: PersonaRepositorio,
    private readonly cuentas: CuentaRepositorio,
    private readonly cifrador: CifradorDeContrasenas,
  ) {}

  async ejecutar(usuario: Usuario, solicitud: SolicitudRegistro): Promise<Resultado<RegistroHecho>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    const hoy = this.reloj.ahora().fecha;

    const datos = normalizarDatos(solicitud.datos);
    const errorDatos = errorEnDatos(datos, hoy);
    if (errorDatos) return fallo(errorDatos);

    const codigoEmpleado = solicitud.codigoEmpleado.trim().toUpperCase();
    const nombreUsuario = solicitud.nombreUsuario.trim().toLowerCase();
    if (!codigoEmpleado) return fallo("Falta el dato obligatorio: Código de empleado.");
    if (!/^[A-Z0-9-]{2,20}$/.test(codigoEmpleado)) {
      return fallo("El código de empleado solo admite letras, números y guiones.");
    }
    if (!nombreUsuario) return fallo("Falta el dato obligatorio: Nombre de usuario.");
    if (!/^[a-z0-9._-]{3,30}$/.test(nombreUsuario)) {
      return fallo("El nombre de usuario debe tener de 3 a 30 letras, números, punto, guion o guion bajo.");
    }
    if (!solicitud.contrasenaInicial) return fallo("Falta el dato obligatorio: Contraseña inicial.");
    const errorContrasena = errorEnContrasena(solicitud.contrasenaInicial);
    if (errorContrasena) return fallo(errorContrasena);
    if (!esTipoUsuario(solicitud.tipo)) return fallo("Elige el tipo de usuario: administrador o empleado.");
    if (solicitud.tipo === "ADMINISTRADOR" && solicitud.familiares.length > 0) {
      return fallo("Solo un usuario empleado tiene grupo familiar.");
    }

    const familiares = validarFamiliares(solicitud.familiares, hoy);
    if (!familiares.ok) return familiares;

    const repetido = await ciDuplicado(this.personas, [datos.ci, ...familiares.valor.map((f) => f.ci)]);
    if (repetido) return fallo(`Ya existe una persona registrada con el CI ${repetido}.`);
    if (await this.cuentas.buscarPorCodigo(codigoEmpleado)) {
      return fallo(`Ya existe un usuario con el código de empleado ${codigoEmpleado}.`);
    }
    if (await this.cuentas.buscarPorNombreUsuario(nombreUsuario)) {
      return fallo(`Ya existe un usuario con el nombre de usuario ${nombreUsuario}.`);
    }

    const registrado = await this.cuentas.registrar(
      datos,
      {
        codigoEmpleado,
        nombreUsuario,
        contrasenaHash: await this.cifrador.cifrar(solicitud.contrasenaInicial),
        tipo: solicitud.tipo,
      },
      familiares.valor,
    );
    return ok({ ...registrado, topeDiario: topeDiario(registrado.familiares.length) });
  }
}
