import type { PrismaClient } from "@prisma/client";
import type { Almuerzo, Empleado, EstadoAlmuerzo, Feriado, OrigenAlmuerzo, Pension, Rol } from "../dominio/modelo.js";
import type {
  AlmuerzoRepositorio,
  AutorizacionRepositorio,
  DirectorioEmpleados,
  FeriadoRepositorio,
  PensionRepositorio,
} from "../dominio/puertos.js";

function comoOrigen(valor: string): OrigenAlmuerzo {
  if (valor === "ESPORADICO" || valor === "PENSION") return valor;
  throw new Error(`Origen de almuerzo no reconocido: ${valor}`);
}

function comoEstado(valor: string): EstadoAlmuerzo {
  if (valor === "CONFIRMADO" || valor === "CANCELADO" || valor === "INASISTENCIA_AVISADA") return valor;
  throw new Error(`Estado de almuerzo no reconocido: ${valor}`);
}

function comoRol(valor: string): Rol {
  if (valor === "EMPLEADO" || valor === "ENCARGADO") return valor;
  throw new Error(`Rol no reconocido: ${valor}`);
}

export class DirectorioPrisma implements DirectorioEmpleados {
  constructor(private readonly db: PrismaClient) {}

  async buscar(codigo: string): Promise<Empleado | null> {
    const fila = await this.db.empleado.findUnique({ where: { codigoInstitucional: codigo } });
    if (!fila) return null;
    return {
      codigoInstitucional: fila.codigoInstitucional,
      nombreCompleto: fila.nombreCompleto,
      activo: fila.activo,
    };
  }
}

export class AutorizacionesPrisma implements AutorizacionRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtenerRol(codigoEmpleado: string): Promise<Rol | null> {
    const fila = await this.db.autorizacion.findUnique({ where: { codigoEmpleado } });
    return fila ? comoRol(fila.rol) : null;
  }
}

export class AlmuerzosPrisma implements AlmuerzoRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(codigoEmpleado: string, fecha: string): Promise<Almuerzo | null> {
    const fila = await this.db.almuerzo.findUnique({
      where: { codigoEmpleado_fecha: { codigoEmpleado, fecha } },
    });
    return fila ? this.mapear(fila) : null;
  }

  async guardar(almuerzo: Almuerzo): Promise<void> {
    await this.db.almuerzo.upsert({
      where: {
        codigoEmpleado_fecha: {
          codigoEmpleado: almuerzo.codigoEmpleado,
          fecha: almuerzo.fecha,
        },
      },
      update: {
        origen: almuerzo.origen,
        precioBs: almuerzo.precioBs,
        estado: almuerzo.estado,
      },
      create: almuerzo,
    });
  }

  async listarPorEmpleado(codigoEmpleado: string): Promise<Almuerzo[]> {
    const filas = await this.db.almuerzo.findMany({
      where: { codigoEmpleado },
      orderBy: { fecha: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async listarConfirmados(fecha: string): Promise<Almuerzo[]> {
    const filas = await this.db.almuerzo.findMany({
      where: { fecha, estado: "CONFIRMADO" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  private mapear(fila: {
    codigoEmpleado: string;
    fecha: string;
    origen: string;
    precioBs: number;
    estado: string;
  }): Almuerzo {
    return {
      codigoEmpleado: fila.codigoEmpleado,
      fecha: fila.fecha,
      origen: comoOrigen(fila.origen),
      precioBs: fila.precioBs,
      estado: comoEstado(fila.estado),
    };
  }
}

export class FeriadosPrisma implements FeriadoRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async esFeriado(fecha: string): Promise<boolean> {
    const fila = await this.db.feriado.findUnique({ where: { fecha } });
    return fila !== null;
  }

  async listar(): Promise<Feriado[]> {
    return this.db.feriado.findMany({ orderBy: { fecha: "asc" } });
  }
}

export class PensionesPrisma implements PensionRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(codigoEmpleado: string, anio: number, mes: number): Promise<Pension | null> {
    return this.db.pension.findUnique({
      where: { codigoEmpleado_anio_mes: { codigoEmpleado, anio, mes } },
    });
  }
}
