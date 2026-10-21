import type { PrismaClient } from "@prisma/client";
import type { Almuerzo, Feriado, Pension, Persona, Rol } from "../dominio/modelo.js";
import type {
  AlmuerzoRepositorio,
  AutorizacionRepositorio,
  FeriadoRepositorio,
  PensionRepositorio,
  PersonaRepositorio,
  SesionGuardada,
  SesionRepositorio,
} from "../dominio/puertos.js";

/** El dominio usa "AAAA-MM-DD". Postgres guarda DATE y Prisma lo entrega como medianoche UTC. */
export function aFecha(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

export function deFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function rangoDelMes(anio: number, mes: number) {
  return {
    gte: new Date(Date.UTC(anio, mes - 1, 1)),
    lt: new Date(Date.UTC(anio, mes, 1)),
  };
}

type FilaAlmuerzo = {
  personaId: string;
  codigoTitular: string;
  fecha: Date;
  origen: Almuerzo["origen"];
  precioBs: number;
  estado: Almuerzo["estado"];
};

function almuerzoDe(fila: FilaAlmuerzo): Almuerzo {
  return {
    personaId: fila.personaId,
    codigoTitular: fila.codigoTitular,
    fecha: deFecha(fila.fecha),
    origen: fila.origen,
    precioBs: fila.precioBs,
    estado: fila.estado,
  };
}

function personaDe(fila: Persona): Persona {
  return {
    id: fila.id,
    tipo: fila.tipo,
    nombreCompleto: fila.nombreCompleto,
    parentesco: fila.parentesco,
    codigoTitular: fila.codigoTitular,
    vigente: fila.vigente,
  };
}

function datosDeAlmuerzo(almuerzo: Almuerzo) {
  return {
    personaId: almuerzo.personaId,
    fecha: aFecha(almuerzo.fecha),
    codigoTitular: almuerzo.codigoTitular,
    origen: almuerzo.origen,
    precioBs: almuerzo.precioBs,
    estado: almuerzo.estado,
  };
}

export class PersonasPrisma implements PersonaRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(id: string): Promise<Persona | null> {
    const fila = await this.db.persona.findUnique({ where: { id } });
    return fila ? personaDe(fila) : null;
  }

  async obtenerVarias(ids: string[]): Promise<Persona[]> {
    if (ids.length === 0) return [];
    const filas = await this.db.persona.findMany({ where: { id: { in: ids } } });
    return filas.map(personaDe);
  }

  async sincronizar(empleado: Persona, familiares: Persona[]): Promise<void> {
    const vigentes = familiares.map((familiar) => familiar.id);
    await this.db.$transaction([
      this.db.persona.upsert({ where: { id: empleado.id }, update: empleado, create: empleado }),
      ...familiares.map((familiar) =>
        this.db.persona.upsert({ where: { id: familiar.id }, update: familiar, create: familiar }),
      ),
      // Quien ya no viene de la API queda no vigente, no se borra: su historial sigue en el reporte.
      this.db.persona.updateMany({
        where: { codigoTitular: empleado.id, tipo: "FAMILIAR", id: { notIn: vigentes } },
        data: { vigente: false },
      }),
    ]);
  }

  async familiaresVigentes(codigoTitular: string): Promise<Persona[]> {
    const filas = await this.db.persona.findMany({
      where: { codigoTitular, tipo: "FAMILIAR", vigente: true },
      orderBy: { nombreCompleto: "asc" },
    });
    return filas.map(personaDe);
  }
}

export class AutorizacionesPrisma implements AutorizacionRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtenerRol(codigoEmpleado: string): Promise<Rol | null> {
    const fila = await this.db.autorizacion.findUnique({ where: { codigoEmpleado } });
    return fila?.rol ?? null;
  }
}

export class AlmuerzosPrisma implements AlmuerzoRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(personaId: string, fecha: string): Promise<Almuerzo | null> {
    const fila = await this.db.almuerzo.findUnique({
      where: { personaId_fecha: { personaId, fecha: aFecha(fecha) } },
    });
    return fila ? almuerzoDe(fila) : null;
  }

  async guardar(almuerzo: Almuerzo): Promise<void> {
    const datos = datosDeAlmuerzo(almuerzo);
    await this.db.almuerzo.upsert({
      where: { personaId_fecha: { personaId: datos.personaId, fecha: datos.fecha } },
      update: datos,
      create: datos,
    });
  }

  async listarDelTitular(codigoTitular: string, anio: number, mes: number): Promise<Almuerzo[]> {
    const filas = await this.db.almuerzo.findMany({
      where: { codigoTitular, fecha: rangoDelMes(anio, mes) },
      orderBy: [{ fecha: "asc" }, { personaId: "asc" }],
    });
    return filas.map(almuerzoDe);
  }

  async listarDeLaPersona(personaId: string, anio: number, mes: number): Promise<Almuerzo[]> {
    const filas = await this.db.almuerzo.findMany({
      where: { personaId, fecha: rangoDelMes(anio, mes) },
      orderBy: { fecha: "asc" },
    });
    return filas.map(almuerzoDe);
  }

  async listarConfirmados(fecha: string): Promise<Almuerzo[]> {
    const filas = await this.db.almuerzo.findMany({
      where: { fecha: aFecha(fecha), estado: "CONFIRMADO" },
    });
    return filas.map(almuerzoDe);
  }

  async listarDelMes(anio: number, mes: number): Promise<Almuerzo[]> {
    const filas = await this.db.almuerzo.findMany({
      where: { fecha: rangoDelMes(anio, mes) },
      orderBy: [{ codigoTitular: "asc" }, { fecha: "asc" }],
    });
    return filas.map(almuerzoDe);
  }
}

export class FeriadosPrisma implements FeriadoRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async esFeriado(fecha: string): Promise<boolean> {
    const fila = await this.db.feriado.findUnique({ where: { fecha: aFecha(fecha) } });
    return fila !== null;
  }

  async listar(anio: number, mes: number): Promise<Feriado[]> {
    const filas = await this.db.feriado.findMany({
      where: { fecha: rangoDelMes(anio, mes) },
      orderBy: { fecha: "asc" },
    });
    return filas.map((fila) => ({ fecha: deFecha(fila.fecha), descripcion: fila.descripcion }));
  }

  async guardar(feriado: Feriado): Promise<void> {
    await this.db.feriado.create({
      data: { fecha: aFecha(feriado.fecha), descripcion: feriado.descripcion },
    });
  }
}

export class PensionesPrisma implements PensionRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(personaId: string, anio: number, mes: number): Promise<Pension | null> {
    const fila = await this.db.pension.findUnique({
      where: { personaId_anio_mes: { personaId, anio, mes } },
    });
    return fila ? { ...fila, solicitadaEl: deFecha(fila.solicitadaEl) } : null;
  }

  async listarDelTitular(codigoTitular: string, anio: number, mes: number): Promise<Pension[]> {
    const filas = await this.db.pension.findMany({ where: { codigoTitular, anio, mes } });
    return filas.map((fila) => ({ ...fila, solicitadaEl: deFecha(fila.solicitadaEl) }));
  }

  async registrar(pension: Pension, almuerzos: Almuerzo[]): Promise<void> {
    await this.db.$transaction([
      this.db.pension.create({
        data: { ...pension, solicitadaEl: aFecha(pension.solicitadaEl) },
      }),
      ...almuerzos.map((almuerzo) => {
        const datos = datosDeAlmuerzo(almuerzo);
        return this.db.almuerzo.upsert({
          where: { personaId_fecha: { personaId: datos.personaId, fecha: datos.fecha } },
          update: datos,
          create: datos,
        });
      }),
    ]);
  }
}

export class SesionesPrisma implements SesionRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async guardar(sesion: SesionGuardada): Promise<void> {
    await this.db.sesion.create({
      data: {
        tokenHash: sesion.tokenHash,
        codigoEmpleado: sesion.codigoInstitucional,
        rol: sesion.rol,
        ultimaActividad: new Date(sesion.ultimaActividad),
      },
    });
  }

  async obtener(tokenHash: string): Promise<SesionGuardada | null> {
    const fila = await this.db.sesion.findUnique({ where: { tokenHash } });
    if (!fila) return null;
    return {
      tokenHash: fila.tokenHash,
      codigoInstitucional: fila.codigoEmpleado,
      rol: fila.rol,
      ultimaActividad: fila.ultimaActividad.getTime(),
    };
  }

  async tocar(tokenHash: string, instante: number): Promise<void> {
    await this.db.sesion.updateMany({ where: { tokenHash }, data: { ultimaActividad: new Date(instante) } });
  }

  async eliminar(tokenHash: string): Promise<void> {
    await this.db.sesion.deleteMany({ where: { tokenHash } });
  }
}
