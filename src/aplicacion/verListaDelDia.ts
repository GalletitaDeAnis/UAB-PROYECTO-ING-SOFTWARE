import { tipoParaLista, type Rol } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type AutorizacionRepositorio,
  type DirectorioEmpleados,
  type Resultado,
} from "../dominio/puertos.js";

export type FilaDelDia = {
  nombre: string;
  codigo: string;
  tipo: "Pensionado" | "No pensionado";
};

export class VerListaDelDia {
  constructor(
    private readonly autorizaciones: AutorizacionRepositorio,
    private readonly almuerzos: AlmuerzoRepositorio,
    private readonly directorio: DirectorioEmpleados,
  ) {}

  async ejecutar(codigoQuienPide: string, fecha: string): Promise<Resultado<FilaDelDia[]>> {
    const rol: Rol | null = await this.autorizaciones.obtenerRol(codigoQuienPide);
    if (rol !== "ENCARGADO") {
      return fallo("Solo el encargado ve la lista del día.");
    }
    const confirmados = await this.almuerzos.listarConfirmados(fecha);
    const filas: FilaDelDia[] = [];
    for (const almuerzo of confirmados) {
      const empleado = await this.directorio.buscar(almuerzo.codigoEmpleado);
      filas.push({
        codigo: almuerzo.codigoEmpleado,
        nombre: empleado?.nombreCompleto ?? almuerzo.codigoEmpleado,
        tipo: tipoParaLista(almuerzo.origen),
      });
    }
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return ok(filas);
  }
}
