import type { Almuerzo, Empleado, Feriado, Pension, Rol } from "../src/dominio/modelo.js";
import type {
  AlmuerzoRepositorio,
  AutorizacionRepositorio,
  DirectorioEmpleados,
  FeriadoRepositorio,
  PensionRepositorio,
  Reloj,
} from "../src/dominio/puertos.js";
import type { Momento } from "../src/dominio/tiempo.js";

export function relojFijo(momento: Momento): Reloj {
  return { ahora: () => momento };
}

export class DirectorioEnMemoria implements DirectorioEmpleados {
  constructor(private readonly empleados: Empleado[]) {}

  async buscar(codigo: string): Promise<Empleado | null> {
    return this.empleados.find((empleado) => empleado.codigoInstitucional === codigo) ?? null;
  }
}

export class AutorizacionesEnMemoria implements AutorizacionRepositorio {
  constructor(private readonly roles: Record<string, Rol> = {}) {}

  async obtenerRol(codigoEmpleado: string): Promise<Rol | null> {
    return this.roles[codigoEmpleado] ?? null;
  }
}

export class AlmuerzosEnMemoria implements AlmuerzoRepositorio {
  readonly guardados: Almuerzo[] = [];

  constructor(iniciales: Almuerzo[] = []) {
    this.guardados.push(...iniciales.map((almuerzo) => ({ ...almuerzo })));
  }

  async obtener(codigoEmpleado: string, fecha: string): Promise<Almuerzo | null> {
    return (
      this.guardados.find(
        (almuerzo) => almuerzo.codigoEmpleado === codigoEmpleado && almuerzo.fecha === fecha,
      ) ?? null
    );
  }

  async guardar(almuerzo: Almuerzo): Promise<void> {
    const indice = this.guardados.findIndex(
      (actual) =>
        actual.codigoEmpleado === almuerzo.codigoEmpleado && actual.fecha === almuerzo.fecha,
    );
    if (indice >= 0) this.guardados[indice] = { ...almuerzo };
    else this.guardados.push({ ...almuerzo });
  }

  async listarPorEmpleado(codigoEmpleado: string): Promise<Almuerzo[]> {
    return this.guardados
      .filter((almuerzo) => almuerzo.codigoEmpleado === codigoEmpleado)
      .map((almuerzo) => ({ ...almuerzo }));
  }

  async listarConfirmados(fecha: string): Promise<Almuerzo[]> {
    return this.guardados
      .filter((almuerzo) => almuerzo.fecha === fecha && almuerzo.estado === "CONFIRMADO")
      .map((almuerzo) => ({ ...almuerzo }));
  }
}

export class FeriadosEnMemoria implements FeriadoRepositorio {
  constructor(private readonly feriados: Feriado[] = []) {}

  async esFeriado(fecha: string): Promise<boolean> {
    return this.feriados.some((feriado) => feriado.fecha === fecha);
  }

  async listar(): Promise<Feriado[]> {
    return this.feriados.map((feriado) => ({ ...feriado }));
  }
}

export class PensionesEnMemoria implements PensionRepositorio {
  constructor(private readonly pensiones: Pension[] = []) {}

  async obtener(codigoEmpleado: string, anio: number, mes: number): Promise<Pension | null> {
    return (
      this.pensiones.find(
        (pension) =>
          pension.codigoEmpleado === codigoEmpleado && pension.anio === anio && pension.mes === mes,
      ) ?? null
    );
  }
}

export const ana: Empleado = {
  codigoInstitucional: "UB-100",
  nombreCompleto: "Ana Rojas",
  activo: true,
};

export const inactiva: Empleado = {
  codigoInstitucional: "UB-102",
  nombreCompleto: "Persona Inactiva",
  activo: false,
};

export const elena: Empleado = {
  codigoInstitucional: "UB-200",
  nombreCompleto: "Elena Vargas",
  activo: true,
};
