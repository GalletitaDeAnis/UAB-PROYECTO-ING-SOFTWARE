import type { Almuerzo, Empleado, Rol } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AutorizacionRepositorio,
  type DirectorioEmpleados,
  type AlmuerzoRepositorio,
  type Resultado,
} from "../dominio/puertos.js";

export type Sesion = {
  empleado: Empleado;
  rol: Rol;
  almuerzos: Almuerzo[];
};

export class Ingresar {
  constructor(
    private readonly directorio: DirectorioEmpleados,
    private readonly autorizaciones: AutorizacionRepositorio,
    private readonly almuerzos: AlmuerzoRepositorio,
  ) {}

  async ejecutar(codigo: string): Promise<Resultado<Sesion>> {
    const empleado = await this.directorio.buscar(codigo.trim());
    if (!empleado || !empleado.activo) {
      return fallo("No se pudo ingresar. Ese identificador no está activo en la base de empleados.");
    }
    const rol = (await this.autorizaciones.obtenerRol(empleado.codigoInstitucional)) ?? "EMPLEADO";
    const almuerzos = await this.almuerzos.listarPorEmpleado(empleado.codigoInstitucional);
    return ok({ empleado, rol, almuerzos });
  }
}
