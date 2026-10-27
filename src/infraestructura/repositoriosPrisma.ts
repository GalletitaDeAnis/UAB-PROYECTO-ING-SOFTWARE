import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type {
  Cuenta,
  DatosPersonales,
  MenuDia,
  MenuSemanal,
  Pension,
  Persona,
  Reserva,
} from "../dominio/modelo.js";
import type {
  CuentaRepositorio,
  MenuRepositorio,
  NuevaCuenta,
  NuevoFamiliar,
  PensionRepositorio,
  PersonaRepositorio,
  ReservaRepositorio,
  SesionGuardada,
  SesionRepositorio,
  UsuarioRegistrado,
} from "../dominio/puertos.js";

/** El dominio usa "AAAA-MM-DD". Postgres guarda DATE y Prisma lo entrega como medianoche UTC. */
export function aFecha(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

export function deFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function rangoDelMes(anio: number, mes: number) {
  return { gte: new Date(Date.UTC(anio, mes - 1, 1)), lt: new Date(Date.UTC(anio, mes, 1)) };
}

type FilaPersona = Omit<Persona, "fechaNacimiento"> & { fechaNacimiento: Date };

function personaDe(fila: FilaPersona): Persona {
  return {
    id: fila.id,
    tipo: fila.tipo,
    nombres: fila.nombres,
    apellidos: fila.apellidos,
    ci: fila.ci,
    fechaNacimiento: deFecha(fila.fechaNacimiento),
    telefono: fila.telefono,
    parentesco: fila.parentesco,
    titularId: fila.titularId,
    activo: fila.activo,
  };
}

function datosDePersona(datos: DatosPersonales) {
  return { ...datos, fechaNacimiento: aFecha(datos.fechaNacimiento) };
}

type FilaReserva = Omit<Reserva, "fecha"> & { fecha: Date };

function reservaDe(fila: FilaReserva): Reserva {
  return {
    personaId: fila.personaId,
    titularId: fila.titularId,
    fecha: deFecha(fila.fecha),
    modalidad: fila.modalidad,
    precioBs: fila.precioBs,
    estado: fila.estado,
  };
}

function datosDeReserva(reserva: Reserva) {
  return { ...reserva, fecha: aFecha(reserva.fecha) };
}

function guardarReserva(db: PrismaClient, reserva: Reserva) {
  const datos = datosDeReserva(reserva);
  return db.reserva.upsert({
    where: { personaId_fecha: { personaId: datos.personaId, fecha: datos.fecha } },
    update: datos,
    create: datos,
  });
}

function cuentaDe(fila: Cuenta): Cuenta {
  return {
    personaId: fila.personaId,
    codigoEmpleado: fila.codigoEmpleado,
    nombreUsuario: fila.nombreUsuario,
    contrasenaHash: fila.contrasenaHash,
    tipo: fila.tipo,
    debeCambiarContrasena: fila.debeCambiarContrasena,
  };
}

export class PersonasPrisma implements PersonaRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(id: string): Promise<Persona | null> {
    if (!esUuid(id)) return null;
    const fila = await this.db.persona.findUnique({ where: { id } });
    return fila ? personaDe(fila) : null;
  }

  async obtenerVarias(ids: string[]): Promise<Persona[]> {
    const validos = ids.filter(esUuid);
    if (validos.length === 0) return [];
    const filas = await this.db.persona.findMany({ where: { id: { in: validos } } });
    return filas.map(personaDe);
  }

  async buscarPorCi(ci: string): Promise<Persona | null> {
    const fila = await this.db.persona.findUnique({ where: { ci } });
    return fila ? personaDe(fila) : null;
  }

  async familiares(titularId: string): Promise<Persona[]> {
    if (!esUuid(titularId)) return [];
    const filas = await this.db.persona.findMany({
      where: { titularId, tipo: "FAMILIAR" },
      orderBy: { nombres: "asc" },
    });
    return filas.map(personaDe);
  }

  async familiaresActivos(titularId: string): Promise<Persona[]> {
    return (await this.familiares(titularId)).filter((persona) => persona.activo);
  }

  async agregarFamiliar(titularId: string, familiar: NuevoFamiliar): Promise<Persona> {
    const fila = await this.db.persona.create({
      data: { ...datosDePersona(familiar), tipo: "FAMILIAR", titularId },
    });
    return personaDe(fila);
  }

  async actualizar(persona: Persona): Promise<void> {
    const { id, tipo: _tipo, titularId: _titular, ...cambios } = persona;
    await this.db.persona.update({ where: { id }, data: { ...cambios, fechaNacimiento: aFecha(persona.fechaNacimiento) } });
  }

  async darDeBaja(personaIds: string[], anularDesde: string): Promise<void> {
    await this.db.$transaction([
      this.db.persona.updateMany({ where: { id: { in: personaIds } }, data: { activo: false } }),
      this.db.reserva.updateMany({
        where: { personaId: { in: personaIds }, fecha: { gte: aFecha(anularDesde) }, estado: "CONFIRMADA" },
        data: { estado: "CANCELADA" },
      }),
    ]);
  }
}

/** Prisma rechaza un texto que no es UUID en una columna uuid; para el dominio eso es «no existe». */
function esUuid(texto: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(texto);
}

export class CuentasPrisma implements CuentaRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(personaId: string): Promise<Cuenta | null> {
    if (!esUuid(personaId)) return null;
    const fila = await this.db.cuenta.findUnique({ where: { personaId } });
    return fila ? cuentaDe(fila) : null;
  }

  async buscarPorNombreUsuario(nombreUsuario: string): Promise<Cuenta | null> {
    const fila = await this.db.cuenta.findUnique({ where: { nombreUsuario } });
    return fila ? cuentaDe(fila) : null;
  }

  async buscarPorCodigo(codigoEmpleado: string): Promise<Cuenta | null> {
    const fila = await this.db.cuenta.findUnique({ where: { codigoEmpleado } });
    return fila ? cuentaDe(fila) : null;
  }

  async listar(): Promise<Cuenta[]> {
    return (await this.db.cuenta.findMany()).map(cuentaDe);
  }

  /** La persona es su propio titular, por eso el id se genera aquí y no en la base. */
  async registrar(datos: DatosPersonales, cuenta: NuevaCuenta, familiares: NuevoFamiliar[]): Promise<UsuarioRegistrado> {
    const id = randomUUID();
    const ids = familiares.map(() => randomUUID());
    const [persona, creada, ...registrados] = await this.db.$transaction([
      this.db.persona.create({ data: { ...datosDePersona(datos), id, tipo: "EMPLEADO", titularId: id } }),
      this.db.cuenta.create({ data: { ...cuenta, personaId: id, debeCambiarContrasena: true } }),
      ...familiares.map((familiar, i) =>
        this.db.persona.create({ data: { ...datosDePersona(familiar), id: ids[i], tipo: "FAMILIAR", titularId: id } }),
      ),
    ]);
    return {
      persona: personaDe(persona as FilaPersona),
      cuenta: cuentaDe(creada as Cuenta),
      familiares: (registrados as FilaPersona[]).map(personaDe),
    };
  }

  async actualizar(cuenta: Cuenta): Promise<void> {
    const { personaId, ...cambios } = cuenta;
    await this.db.cuenta.update({ where: { personaId }, data: cambios });
  }
}

export class ReservasPrisma implements ReservaRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(personaId: string, fecha: string): Promise<Reserva | null> {
    if (!esUuid(personaId)) return null;
    const fila = await this.db.reserva.findUnique({ where: { personaId_fecha: { personaId, fecha: aFecha(fecha) } } });
    return fila ? reservaDe(fila) : null;
  }

  async guardar(reserva: Reserva): Promise<void> {
    await guardarReserva(this.db, reserva);
  }

  async listarDelTitular(titularId: string, anio: number, mes: number): Promise<Reserva[]> {
    const filas = await this.db.reserva.findMany({
      where: { titularId, fecha: rangoDelMes(anio, mes) },
      orderBy: [{ fecha: "asc" }, { personaId: "asc" }],
    });
    return filas.map(reservaDe);
  }

  async listarDeLaPersona(personaId: string, anio: number, mes: number): Promise<Reserva[]> {
    const filas = await this.db.reserva.findMany({
      where: { personaId, fecha: rangoDelMes(anio, mes) },
      orderBy: { fecha: "asc" },
    });
    return filas.map(reservaDe);
  }

  async listarConfirmadas(fecha: string): Promise<Reserva[]> {
    const filas = await this.db.reserva.findMany({ where: { fecha: aFecha(fecha), estado: "CONFIRMADA" } });
    return filas.map(reservaDe);
  }

  async listarDelMes(anio: number, mes: number): Promise<Reserva[]> {
    const filas = await this.db.reserva.findMany({
      where: { fecha: rangoDelMes(anio, mes) },
      orderBy: [{ titularId: "asc" }, { fecha: "asc" }],
    });
    return filas.map(reservaDe);
  }
}

export class PensionesPrisma implements PensionRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtener(personaId: string, anio: number, mes: number): Promise<Pension | null> {
    if (!esUuid(personaId)) return null;
    const fila = await this.db.pension.findUnique({ where: { personaId_anio_mes: { personaId, anio, mes } } });
    return fila ? { ...fila, solicitadaEl: deFecha(fila.solicitadaEl) } : null;
  }

  async listarDelTitular(titularId: string, anio: number, mes: number): Promise<Pension[]> {
    const filas = await this.db.pension.findMany({ where: { titularId, anio, mes } });
    return filas.map((fila) => ({ ...fila, solicitadaEl: deFecha(fila.solicitadaEl) }));
  }

  async listarDelMes(anio: number, mes: number): Promise<Pension[]> {
    const filas = await this.db.pension.findMany({ where: { anio, mes } });
    return filas.map((fila) => ({ ...fila, solicitadaEl: deFecha(fila.solicitadaEl) }));
  }

  async registrar(pension: Pension, reservas: Reserva[]): Promise<void> {
    await this.db.$transaction([
      this.db.pension.create({ data: { ...pension, solicitadaEl: aFecha(pension.solicitadaEl) } }),
      ...reservas.map((reserva) => guardarReserva(this.db, reserva)),
    ]);
  }
}

export class MenusPrisma implements MenuRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async obtenerSemana(lunes: string): Promise<MenuSemanal | null> {
    const fila = await this.db.menuSemanal.findUnique({
      where: { lunes: aFecha(lunes) },
      include: { dias: { orderBy: { fecha: "asc" } } },
    });
    if (!fila) return null;
    return {
      lunes: deFecha(fila.lunes),
      publicadoEl: deFecha(fila.publicadoEl),
      dias: fila.dias.map((dia) => ({ fecha: deFecha(dia.fecha), descripcion: dia.descripcion })),
    };
  }

  async obtenerDia(fecha: string): Promise<MenuDia | null> {
    const fila = await this.db.menuDia.findUnique({ where: { fecha: aFecha(fecha) } });
    return fila ? { fecha: deFecha(fila.fecha), descripcion: fila.descripcion } : null;
  }

  async diasDelMes(anio: number, mes: number): Promise<MenuDia[]> {
    const filas = await this.db.menuDia.findMany({ where: { fecha: rangoDelMes(anio, mes) }, orderBy: { fecha: "asc" } });
    return filas.map((fila) => ({ fecha: deFecha(fila.fecha), descripcion: fila.descripcion }));
  }

  async publicar(menu: MenuSemanal, reservasDePension: Reserva[]): Promise<void> {
    await this.db.$transaction([
      this.db.menuSemanal.create({
        data: {
          lunes: aFecha(menu.lunes),
          publicadoEl: aFecha(menu.publicadoEl),
          dias: { create: menu.dias.map((dia) => ({ fecha: aFecha(dia.fecha), descripcion: dia.descripcion })) },
        },
      }),
      ...reservasDePension.map((reserva) => guardarReserva(this.db, reserva)),
    ]);
  }
}

export class SesionesPrisma implements SesionRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async guardar(sesion: SesionGuardada): Promise<void> {
    await this.db.sesion.create({
      data: { tokenHash: sesion.tokenHash, personaId: sesion.personaId, ultimaActividad: new Date(sesion.ultimaActividad) },
    });
  }

  async obtener(tokenHash: string): Promise<SesionGuardada | null> {
    const fila = await this.db.sesion.findUnique({ where: { tokenHash } });
    if (!fila) return null;
    return { tokenHash: fila.tokenHash, personaId: fila.personaId, ultimaActividad: fila.ultimaActividad.getTime() };
  }

  async tocar(tokenHash: string, instante: number): Promise<void> {
    await this.db.sesion.updateMany({ where: { tokenHash }, data: { ultimaActividad: new Date(instante) } });
  }

  async eliminar(tokenHash: string): Promise<void> {
    await this.db.sesion.deleteMany({ where: { tokenHash } });
  }

  async eliminarDeLaPersona(personaId: string): Promise<void> {
    await this.db.sesion.deleteMany({ where: { personaId } });
  }
}
