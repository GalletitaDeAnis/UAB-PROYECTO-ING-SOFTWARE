import { crearCasosDeUso, type Dependencias } from "../src/aplicacion/casosDeUso.js";
import type {
  Cuenta,
  DatosPersonales,
  MenuDia,
  MenuSemanal,
  Parentesco,
  Pension,
  Persona,
  Reserva,
  TipoUsuario,
  Usuario,
} from "../src/dominio/modelo.js";
import type {
  CifradorDeContrasenas,
  CuentaRepositorio,
  ExportadorReporte,
  GeneradorDeTokens,
  MenuRepositorio,
  NuevaCuenta,
  NuevoFamiliar,
  PensionRepositorio,
  PersonaRepositorio,
  Reloj,
  ReservaRepositorio,
  SesionGuardada,
  SesionRepositorio,
  UsuarioRegistrado,
} from "../src/dominio/puertos.js";
import type { DescuentoTitular } from "../src/dominio/reporte.js";
import { anioMes, lunesAJuevesDe, momento, type Momento } from "../src/dominio/tiempo.js";

/** Reloj controlado por la prueba: la regla de las 9:00 y los 30 minutos no dependen de la hora real. */
export class RelojDePrueba implements Reloj {
  private ms = Date.UTC(2026, 9, 6, 12, 0);

  constructor(private momentoActual: Momento) {}

  ahora(): Momento {
    return this.momentoActual;
  }

  instante(): number {
    return this.ms;
  }

  fijar(fecha: string, hora: number, minuto: number): void {
    this.momentoActual = momento(fecha, hora, minuto);
  }

  avanzarMinutos(minutos: number): void {
    this.ms += minutos * 60_000;
  }
}

export function relojEn(fecha: string, hora: number, minuto: number): RelojDePrueba {
  return new RelojDePrueba(momento(fecha, hora, minuto));
}

const delMes = (fecha: string, anio: number, mes: number) => {
  const periodo = anioMes(fecha);
  return periodo.anio === anio && periodo.mes === mes;
};

export class ReservasEnMemoria implements ReservaRepositorio {
  readonly guardadas: Reserva[];

  constructor(iniciales: Reserva[] = []) {
    this.guardadas = iniciales.map((reserva) => ({ ...reserva }));
  }

  async obtener(personaId: string, fecha: string): Promise<Reserva | null> {
    const reserva = this.guardadas.find((r) => r.personaId === personaId && r.fecha === fecha);
    return reserva ? { ...reserva } : null;
  }

  async guardar(reserva: Reserva): Promise<void> {
    const indice = this.guardadas.findIndex((r) => r.personaId === reserva.personaId && r.fecha === reserva.fecha);
    if (indice >= 0) this.guardadas[indice] = { ...reserva };
    else this.guardadas.push({ ...reserva });
  }

  async listarDelTitular(titularId: string, anio: number, mes: number): Promise<Reserva[]> {
    return this.guardadas.filter((r) => r.titularId === titularId && delMes(r.fecha, anio, mes)).map((r) => ({ ...r }));
  }

  async listarDeLaPersona(personaId: string, anio: number, mes: number): Promise<Reserva[]> {
    return this.guardadas.filter((r) => r.personaId === personaId && delMes(r.fecha, anio, mes)).map((r) => ({ ...r }));
  }

  async listarConfirmadas(fecha: string): Promise<Reserva[]> {
    return this.guardadas.filter((r) => r.fecha === fecha && r.estado === "CONFIRMADA").map((r) => ({ ...r }));
  }

  async listarDelMes(anio: number, mes: number): Promise<Reserva[]> {
    return this.guardadas.filter((r) => delMes(r.fecha, anio, mes)).map((r) => ({ ...r }));
  }

  de(personaId: string): Reserva[] {
    return this.guardadas.filter((r) => r.personaId === personaId);
  }
}

export class PersonasEnMemoria implements PersonaRepositorio {
  readonly personas = new Map<string, Persona>();
  private siguiente = 1;

  constructor(
    iniciales: Persona[],
    private readonly reservas: ReservasEnMemoria,
  ) {
    for (const persona of iniciales) this.personas.set(persona.id, { ...persona });
  }

  nuevoId(prefijo: string): string {
    return `${prefijo}-${this.siguiente++}`;
  }

  async obtener(id: string): Promise<Persona | null> {
    const persona = this.personas.get(id);
    return persona ? { ...persona } : null;
  }

  async obtenerVarias(ids: string[]): Promise<Persona[]> {
    return ids.flatMap((id) => {
      const persona = this.personas.get(id);
      return persona ? [{ ...persona }] : [];
    });
  }

  async buscarPorCi(ci: string): Promise<Persona | null> {
    const persona = [...this.personas.values()].find((p) => p.ci === ci);
    return persona ? { ...persona } : null;
  }

  async familiares(titularId: string): Promise<Persona[]> {
    return [...this.personas.values()]
      .filter((p) => p.titularId === titularId && p.tipo === "FAMILIAR")
      .map((p) => ({ ...p }));
  }

  async familiaresActivos(titularId: string): Promise<Persona[]> {
    return (await this.familiares(titularId)).filter((p) => p.activo);
  }

  async agregarFamiliar(titularId: string, familiar: NuevoFamiliar): Promise<Persona> {
    const persona: Persona = { ...familiar, id: this.nuevoId("F"), tipo: "FAMILIAR", titularId, activo: true };
    this.personas.set(persona.id, persona);
    return { ...persona };
  }

  async actualizar(persona: Persona): Promise<void> {
    this.personas.set(persona.id, { ...persona });
  }

  async darDeBaja(personaIds: string[], anularDesde: string): Promise<void> {
    for (const id of personaIds) {
      const persona = this.personas.get(id);
      if (persona) persona.activo = false;
    }
    for (const reserva of this.reservas.guardadas) {
      if (personaIds.includes(reserva.personaId) && reserva.fecha >= anularDesde && reserva.estado === "CONFIRMADA") {
        reserva.estado = "CANCELADA";
      }
    }
  }
}

export class CuentasEnMemoria implements CuentaRepositorio {
  readonly cuentas = new Map<string, Cuenta>();

  constructor(
    iniciales: Cuenta[],
    private readonly personas: PersonasEnMemoria,
  ) {
    for (const cuenta of iniciales) this.cuentas.set(cuenta.personaId, { ...cuenta });
  }

  async obtener(personaId: string): Promise<Cuenta | null> {
    const cuenta = this.cuentas.get(personaId);
    return cuenta ? { ...cuenta } : null;
  }

  async buscarPorNombreUsuario(nombreUsuario: string): Promise<Cuenta | null> {
    const cuenta = [...this.cuentas.values()].find((c) => c.nombreUsuario === nombreUsuario);
    return cuenta ? { ...cuenta } : null;
  }

  async buscarPorCodigo(codigoEmpleado: string): Promise<Cuenta | null> {
    const cuenta = [...this.cuentas.values()].find((c) => c.codigoEmpleado === codigoEmpleado);
    return cuenta ? { ...cuenta } : null;
  }

  async listar(): Promise<Cuenta[]> {
    return [...this.cuentas.values()].map((c) => ({ ...c }));
  }

  async registrar(datos: DatosPersonales, nueva: NuevaCuenta, familiares: NuevoFamiliar[]): Promise<UsuarioRegistrado> {
    const id = this.personas.nuevoId("P");
    const persona: Persona = { ...datos, id, tipo: "EMPLEADO", parentesco: null, titularId: id, activo: true };
    this.personas.personas.set(id, persona);
    const cuenta: Cuenta = { ...nueva, personaId: id, debeCambiarContrasena: true };
    this.cuentas.set(id, cuenta);
    const registrados: Persona[] = [];
    for (const familiar of familiares) registrados.push(await this.personas.agregarFamiliar(id, familiar));
    return { persona: { ...persona }, cuenta: { ...cuenta }, familiares: registrados };
  }

  async actualizar(cuenta: Cuenta): Promise<void> {
    this.cuentas.set(cuenta.personaId, { ...cuenta });
  }
}

export class PensionesEnMemoria implements PensionRepositorio {
  readonly pensiones: Pension[];

  constructor(
    iniciales: Pension[],
    private readonly reservas: ReservasEnMemoria,
  ) {
    this.pensiones = iniciales.map((pension) => ({ ...pension }));
  }

  async obtener(personaId: string, anio: number, mes: number): Promise<Pension | null> {
    return this.pensiones.find((p) => p.personaId === personaId && p.anio === anio && p.mes === mes) ?? null;
  }

  async listarDelTitular(titularId: string, anio: number, mes: number): Promise<Pension[]> {
    return this.pensiones.filter((p) => p.titularId === titularId && p.anio === anio && p.mes === mes);
  }

  async listarDelMes(anio: number, mes: number): Promise<Pension[]> {
    return this.pensiones.filter((p) => p.anio === anio && p.mes === mes);
  }

  async registrar(pension: Pension, reservas: Reserva[]): Promise<void> {
    this.pensiones.push({ ...pension });
    for (const reserva of reservas) await this.reservas.guardar(reserva);
  }
}

export class MenusEnMemoria implements MenuRepositorio {
  readonly menus: MenuSemanal[];

  constructor(
    iniciales: MenuSemanal[],
    private readonly reservas: ReservasEnMemoria,
  ) {
    this.menus = iniciales.map((menu) => ({ ...menu, dias: menu.dias.map((dia) => ({ ...dia })) }));
  }

  async obtenerSemana(lunes: string): Promise<MenuSemanal | null> {
    return this.menus.find((menu) => menu.lunes === lunes) ?? null;
  }

  async obtenerDia(fecha: string): Promise<MenuDia | null> {
    return this.menus.flatMap((menu) => menu.dias).find((dia) => dia.fecha === fecha) ?? null;
  }

  async diasDelMes(anio: number, mes: number): Promise<MenuDia[]> {
    return this.menus
      .flatMap((menu) => menu.dias)
      .filter((dia) => delMes(dia.fecha, anio, mes))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  async publicar(menu: MenuSemanal, reservasDePension: Reserva[]): Promise<void> {
    this.menus.push(menu);
    for (const reserva of reservasDePension) await this.reservas.guardar(reserva);
  }
}

export class SesionesEnMemoria implements SesionRepositorio {
  readonly sesiones = new Map<string, SesionGuardada>();

  async guardar(sesion: SesionGuardada): Promise<void> {
    this.sesiones.set(sesion.tokenHash, { ...sesion });
  }

  async obtener(tokenHash: string): Promise<SesionGuardada | null> {
    const sesion = this.sesiones.get(tokenHash);
    return sesion ? { ...sesion } : null;
  }

  async tocar(tokenHash: string, instante: number): Promise<void> {
    const sesion = this.sesiones.get(tokenHash);
    if (sesion) sesion.ultimaActividad = instante;
  }

  async eliminar(tokenHash: string): Promise<void> {
    this.sesiones.delete(tokenHash);
  }

  async eliminarDeLaPersona(personaId: string): Promise<void> {
    for (const [hash, sesion] of this.sesiones) if (sesion.personaId === personaId) this.sesiones.delete(hash);
  }
}

export class TokensDePrueba implements GeneradorDeTokens {
  private siguiente = 1;

  nuevo(): string {
    return `token-${this.siguiente++}`;
  }

  hash(token: string): string {
    return `hash:${token}`;
  }
}

/** Cifrado visible, para que la prueba compruebe qué quedó guardado sin depender de scrypt. */
export class CifradorDePrueba implements CifradorDeContrasenas {
  async cifrar(contrasena: string): Promise<string> {
    return `cifrada:${contrasena}`;
  }

  async verificar(contrasena: string, hash: string): Promise<boolean> {
    return hash === `cifrada:${contrasena}`;
  }

  temporal(): string {
    return "Temporal99";
  }
}

/** Exportador que no escribe archivo: devuelve el JSON de lo que recibió, para comprobar los datos. */
export class ExportadorDePrueba implements ExportadorReporte {
  readonly extension: string;
  readonly tipoContenido = "application/json";
  recibido: DescuentoTitular[] | null = null;

  constructor(readonly formato: "EXCEL" | "PDF") {
    this.extension = formato === "EXCEL" ? "xlsx" : "pdf";
  }

  async generar(_anio: number, _mes: number, descuentos: DescuentoTitular[]): Promise<Uint8Array> {
    this.recibido = descuentos;
    return new TextEncoder().encode(JSON.stringify(descuentos));
  }
}

// --- Datos de prueba (los mismos que siembra la demo) ----------------------------------

export const CLAVE = "clave1234";

/** El CI sale del nombre, así cada llamada a personasIniciales() devuelve los mismos datos. */
function datos(nombres: string, apellidos: string): DatosPersonales {
  const ci = String(4000000 + [...`${nombres}${apellidos}`].reduce((suma, letra) => suma * 31 + letra.charCodeAt(0), 7) % 999999);
  return { nombres, apellidos, ci, fechaNacimiento: "1990-05-10", telefono: "70000000" };
}

function empleado(id: string, nombres: string, apellidos: string, activo = true): Persona {
  return { ...datos(nombres, apellidos), id, tipo: "EMPLEADO", parentesco: null, titularId: id, activo };
}

function familiar(id: string, nombres: string, apellidos: string, titularId: string, parentesco: Parentesco): Persona {
  return { ...datos(nombres, apellidos), id, tipo: "FAMILIAR", parentesco, titularId, activo: true };
}

function cuenta(personaId: string, nombreUsuario: string, codigoEmpleado: string, tipo: TipoUsuario = "EMPLEADO"): Cuenta {
  return { personaId, nombreUsuario, codigoEmpleado, tipo, contrasenaHash: `cifrada:${CLAVE}`, debeCambiarContrasena: false };
}

export const ELENA = "P-ELENA";
export const ANA = "P-ANA";
export const DIEGO = "F-DIEGO";
export const CARLOS = "P-CARLOS";
export const LAURA = "P-LAURA";
export const PEDRO = "P-PEDRO";
export const MARIA = "F-MARIA";
export const JUAN = "F-JUAN";
export const LUCIA = "F-LUCIA";
export const LUIS = "F-LUIS";

export function personasIniciales(): Persona[] {
  return [
    empleado(ELENA, "Elena", "Vargas"),
    empleado(ANA, "Ana", "Rojas"),
    familiar(DIEGO, "Diego", "Rojas", ANA, "HIJO"),
    empleado(CARLOS, "Carlos", "Mamani"),
    empleado(LAURA, "Laura", "Quispe", false),
    empleado(PEDRO, "Pedro", "Flores"),
    familiar(MARIA, "María", "Flores", PEDRO, "CONYUGE"),
    familiar(JUAN, "Juan", "Flores", PEDRO, "HIJO"),
    familiar(LUCIA, "Lucía", "Flores", PEDRO, "HIJA"),
    familiar(LUIS, "Luis", "Flores", PEDRO, "HIJO"),
  ];
}

export function cuentasIniciales(): Cuenta[] {
  return [
    cuenta(ELENA, "evargas", "UB-200", "ADMINISTRADOR"),
    cuenta(ANA, "arojas", "UB-100"),
    cuenta(CARLOS, "cmamani", "UB-101"),
    cuenta(LAURA, "lquispe", "UB-102"),
    cuenta(PEDRO, "pflores", "UB-103"),
  ];
}

export function comoUsuario(id: string, tipo: TipoUsuario = "EMPLEADO"): Usuario {
  return { id, nombreUsuario: id, tipo, debeCambiarContrasena: false };
}
export const admin: Usuario = comoUsuario(ELENA, "ADMINISTRADOR");

export function menu(lunes: string, fechas = lunesAJuevesDe(lunes)): MenuSemanal {
  return { lunes, publicadoEl: lunes, dias: fechas.map((fecha) => ({ fecha, descripcion: `Almuerzo del ${fecha}` })) };
}

/** Todos los lunes de octubre de 2026 con los cuatro días: 16 días con atención. */
export function menusDeOctubre(): MenuSemanal[] {
  return ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"].map((lunes) =>
    menu(lunes, lunesAJuevesDe(lunes).filter((fecha) => fecha.startsWith("2026-10"))),
  );
}

export function noPensionado(
  personaId: string,
  titularId: string,
  fecha: string,
  estado: Reserva["estado"] = "CONFIRMADA",
): Reserva {
  return { personaId, titularId, fecha, modalidad: "NO_PENSIONADO", precioBs: 18, estado };
}

export function pensionado(
  personaId: string,
  titularId: string,
  fecha: string,
  estado: Reserva["estado"] = "CONFIRMADA",
): Reserva {
  return { personaId, titularId, fecha, modalidad: "PENSIONADO", precioBs: 15, estado };
}

export function pension(personaId: string, titularId: string, anio = 2026, mes = 10): Pension {
  return { personaId, titularId, anio, mes, solicitadaEl: "2026-09-20" };
}

/** Todos los dobles juntos y los casos de uso armados con ellos, igual que la composición real. */
export function escenario(
  opciones: {
    reloj?: RelojDePrueba;
    personas?: Persona[];
    cuentas?: Cuenta[];
    reservas?: Reserva[];
    pensiones?: Pension[];
    menus?: MenuSemanal[];
  } = {},
) {
  const reloj = opciones.reloj ?? relojEn("2026-10-06", 8, 30);
  const reservas = new ReservasEnMemoria(opciones.reservas);
  const personas = new PersonasEnMemoria(opciones.personas ?? personasIniciales(), reservas);
  const excel = new ExportadorDePrueba("EXCEL");
  const pdf = new ExportadorDePrueba("PDF");
  const dependencias = {
    reloj,
    personas,
    cuentas: new CuentasEnMemoria(opciones.cuentas ?? cuentasIniciales(), personas),
    reservas,
    pensiones: new PensionesEnMemoria(opciones.pensiones ?? [], reservas),
    menus: new MenusEnMemoria(opciones.menus ?? [menu("2026-10-05"), menu("2026-10-12")], reservas),
    sesiones: new SesionesEnMemoria(),
    cifrador: new CifradorDePrueba(),
    tokens: new TokensDePrueba(),
    exportadores: [excel, pdf],
  } satisfies Dependencias;
  return { ...dependencias, excel, pdf, casos: crearCasosDeUso(dependencias) };
}
