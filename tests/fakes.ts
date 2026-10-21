import { crearCasosDeUso, type Dependencias } from "../src/aplicacion/casosDeUso.js";
import {
  personaDelEmpleado,
  personaDelFamiliar,
  type Almuerzo,
  type Empleado,
  type Familiar,
  type Feriado,
  type Pension,
  type Persona,
  type Rol,
  type Usuario,
} from "../src/dominio/modelo.js";
import {
  SistemaEmpresarialNoDisponible,
  type AlmuerzoRepositorio,
  type Autenticacion,
  type AutorizacionRepositorio,
  type ExportadorReporte,
  type FeriadoRepositorio,
  type GeneradorDeTokens,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type SesionGuardada,
  type SesionRepositorio,
  type SistemaEmpresarial,
} from "../src/dominio/puertos.js";
import type { DescuentoTitular } from "../src/dominio/reporte.js";
import { anioMes, momento, type Momento } from "../src/dominio/tiempo.js";

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

type Cuenta = { usuario: string; contrasena: string; empleado: Empleado; familiares: Familiar[] };

/** Doble del sistema empresarial. `caido` simula la API sin respuesta en 5 s (HU01 CA4). */
export class EmpresarialEnMemoria implements SistemaEmpresarial {
  caido = false;
  readonly llamadas: string[] = [];

  constructor(readonly cuentas: Cuenta[]) {}

  private revisar(llamada: string): void {
    this.llamadas.push(llamada);
    if (this.caido) throw new SistemaEmpresarialNoDisponible("sin respuesta en 5000 ms");
  }

  async autenticar(usuario: string, contrasena: string): Promise<Autenticacion> {
    this.revisar(`autenticar:${usuario}`);
    const cuenta = this.cuentas.find((c) => c.usuario === usuario && c.contrasena === contrasena);
    return cuenta ? { valida: true, codigoInstitucional: cuenta.empleado.codigoInstitucional } : { valida: false };
  }

  async obtenerEmpleado(codigo: string): Promise<Empleado | null> {
    this.revisar(`empleado:${codigo}`);
    return this.cuentas.find((c) => c.empleado.codigoInstitucional === codigo)?.empleado ?? null;
  }

  async obtenerFamiliares(codigo: string): Promise<Familiar[]> {
    this.revisar(`familiares:${codigo}`);
    return this.cuentas.find((c) => c.empleado.codigoInstitucional === codigo)?.familiares ?? [];
  }
}

export class PersonasEnMemoria implements PersonaRepositorio {
  readonly personas = new Map<string, Persona>();

  constructor(iniciales: Persona[] = []) {
    for (const persona of iniciales) this.personas.set(persona.id, { ...persona });
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

  async sincronizar(empleado: Persona, familiares: Persona[]): Promise<void> {
    this.personas.set(empleado.id, { ...empleado });
    const vigentes = new Set(familiares.map((familiar) => familiar.id));
    for (const persona of this.personas.values()) {
      if (persona.codigoTitular === empleado.id && persona.tipo === "FAMILIAR" && !vigentes.has(persona.id)) {
        persona.vigente = false;
      }
    }
    for (const familiar of familiares) this.personas.set(familiar.id, { ...familiar });
  }

  async familiaresVigentes(codigoTitular: string): Promise<Persona[]> {
    return [...this.personas.values()]
      .filter((p) => p.codigoTitular === codigoTitular && p.tipo === "FAMILIAR" && p.vigente)
      .map((p) => ({ ...p }));
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

  private delMes(almuerzo: Almuerzo, anio: number, mes: number): boolean {
    const periodo = anioMes(almuerzo.fecha);
    return periodo.anio === anio && periodo.mes === mes;
  }

  async obtener(personaId: string, fecha: string): Promise<Almuerzo | null> {
    const almuerzo = this.guardados.find((a) => a.personaId === personaId && a.fecha === fecha);
    return almuerzo ? { ...almuerzo } : null;
  }

  async guardar(almuerzo: Almuerzo): Promise<void> {
    const indice = this.guardados.findIndex((a) => a.personaId === almuerzo.personaId && a.fecha === almuerzo.fecha);
    if (indice >= 0) this.guardados[indice] = { ...almuerzo };
    else this.guardados.push({ ...almuerzo });
  }

  async listarDelTitular(codigoTitular: string, anio: number, mes: number): Promise<Almuerzo[]> {
    return this.guardados
      .filter((a) => a.codigoTitular === codigoTitular && this.delMes(a, anio, mes))
      .map((a) => ({ ...a }));
  }

  async listarDeLaPersona(personaId: string, anio: number, mes: number): Promise<Almuerzo[]> {
    return this.guardados.filter((a) => a.personaId === personaId && this.delMes(a, anio, mes)).map((a) => ({ ...a }));
  }

  async listarConfirmados(fecha: string): Promise<Almuerzo[]> {
    return this.guardados.filter((a) => a.fecha === fecha && a.estado === "CONFIRMADO").map((a) => ({ ...a }));
  }

  async listarDelMes(anio: number, mes: number): Promise<Almuerzo[]> {
    return this.guardados.filter((a) => this.delMes(a, anio, mes)).map((a) => ({ ...a }));
  }

  de(personaId: string): Almuerzo[] {
    return this.guardados.filter((a) => a.personaId === personaId);
  }
}

export class FeriadosEnMemoria implements FeriadoRepositorio {
  readonly feriados: Feriado[];

  constructor(iniciales: Feriado[] = []) {
    this.feriados = iniciales.map((feriado) => ({ ...feriado }));
  }

  async esFeriado(fecha: string): Promise<boolean> {
    return this.feriados.some((feriado) => feriado.fecha === fecha);
  }

  async listar(anio: number, mes: number): Promise<Feriado[]> {
    return this.feriados
      .filter((feriado) => {
        const periodo = anioMes(feriado.fecha);
        return periodo.anio === anio && periodo.mes === mes;
      })
      .map((feriado) => ({ ...feriado }));
  }

  async guardar(feriado: Feriado): Promise<void> {
    this.feriados.push({ ...feriado });
  }
}

export class PensionesEnMemoria implements PensionRepositorio {
  readonly pensiones: Pension[];

  constructor(
    iniciales: Pension[] = [],
    private readonly almuerzos?: AlmuerzosEnMemoria,
  ) {
    this.pensiones = iniciales.map((pension) => ({ ...pension }));
  }

  async obtener(personaId: string, anio: number, mes: number): Promise<Pension | null> {
    return this.pensiones.find((p) => p.personaId === personaId && p.anio === anio && p.mes === mes) ?? null;
  }

  async listarDelTitular(codigoTitular: string, anio: number, mes: number): Promise<Pension[]> {
    return this.pensiones.filter((p) => p.codigoTitular === codigoTitular && p.anio === anio && p.mes === mes);
  }

  async registrar(pension: Pension, almuerzos: Almuerzo[]): Promise<void> {
    this.pensiones.push({ ...pension });
    for (const almuerzo of almuerzos) await this.almuerzos?.guardar(almuerzo);
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

/** Exportador que no escribe disco: devuelve el JSON de lo que recibió, para comprobar los datos. */
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

// --- Personas de prueba (mismas que el simulador) ------------------------------

export const ana: Empleado = { codigoInstitucional: "UB-100", nombreCompleto: "Ana Rojas", activo: true };
export const diego: Familiar = { id: "FAM-1001", nombreCompleto: "Diego Rojas", parentesco: "Hijo" };
export const carlos: Empleado = { codigoInstitucional: "UB-101", nombreCompleto: "Carlos Mamani", activo: true };
export const laura: Empleado = { codigoInstitucional: "UB-102", nombreCompleto: "Laura Quispe", activo: false };
export const pedro: Empleado = { codigoInstitucional: "UB-103", nombreCompleto: "Pedro Flores", activo: true };
export const familiaPedro: Familiar[] = [
  { id: "FAM-2001", nombreCompleto: "María Flores", parentesco: "Cónyuge" },
  { id: "FAM-2002", nombreCompleto: "Juan Flores", parentesco: "Hijo" },
  { id: "FAM-2003", nombreCompleto: "Ana Flores", parentesco: "Hija" },
  { id: "FAM-2004", nombreCompleto: "Luis Flores", parentesco: "Hijo" },
];
export const elena: Empleado = { codigoInstitucional: "UB-200", nombreCompleto: "Elena Vargas", activo: true };

export const comoUsuario = (empleado: Empleado, rol: Rol = "EMPLEADO"): Usuario => ({
  codigoInstitucional: empleado.codigoInstitucional,
  rol,
});
export const encargada: Usuario = comoUsuario(elena, "ENCARGADO");

/** La copia local que dejaría un inicio de sesión de cada empleado de prueba. */
export function personasIniciales(): Persona[] {
  return [
    personaDelEmpleado(ana),
    personaDelFamiliar(ana.codigoInstitucional, diego),
    personaDelEmpleado(carlos),
    personaDelEmpleado(pedro),
    ...familiaPedro.map((familiar) => personaDelFamiliar(pedro.codigoInstitucional, familiar)),
    personaDelEmpleado(elena),
  ];
}

export function cuentasIniciales(): Cuenta[] {
  return [
    { usuario: "arojas", contrasena: "demo123", empleado: ana, familiares: [diego] },
    { usuario: "cmamani", contrasena: "demo123", empleado: carlos, familiares: [] },
    { usuario: "lquispe", contrasena: "demo123", empleado: laura, familiares: [] },
    { usuario: "pflores", contrasena: "demo123", empleado: pedro, familiares: familiaPedro },
    { usuario: "evargas", contrasena: "demo123", empleado: elena, familiares: [] },
  ];
}

export function esporadico(personaId: string, codigoTitular: string, fecha: string, estado: Almuerzo["estado"] = "CONFIRMADO"): Almuerzo {
  return { personaId, codigoTitular, fecha, origen: "ESPORADICO", precioBs: 18, estado };
}

export function dePension(personaId: string, codigoTitular: string, fecha: string, estado: Almuerzo["estado"] = "CONFIRMADO"): Almuerzo {
  return { personaId, codigoTitular, fecha, origen: "PENSION", precioBs: 15, estado };
}

/** Todos los dobles juntos y los casos de uso armados con ellos, igual que la composición real. */
export function escenario(opciones: {
  reloj?: RelojDePrueba;
  personas?: Persona[];
  almuerzos?: Almuerzo[];
  feriados?: Feriado[];
  pensiones?: Pension[];
} = {}) {
  const reloj = opciones.reloj ?? relojEn("2026-10-06", 8, 30);
  const almuerzos = new AlmuerzosEnMemoria(opciones.almuerzos);
  const excel = new ExportadorDePrueba("EXCEL");
  const pdf = new ExportadorDePrueba("PDF");
  const dependencias: Dependencias = {
    reloj,
    empresarial: new EmpresarialEnMemoria(cuentasIniciales()),
    personas: new PersonasEnMemoria(opciones.personas ?? personasIniciales()),
    autorizaciones: new AutorizacionesEnMemoria({ "UB-200": "ENCARGADO" }),
    almuerzos,
    feriados: new FeriadosEnMemoria(opciones.feriados),
    pensiones: new PensionesEnMemoria(opciones.pensiones, almuerzos),
    sesiones: new SesionesEnMemoria(),
    tokens: new TokensDePrueba(),
    exportadores: [excel, pdf],
  };
  return {
    ...dependencias,
    reloj,
    almuerzos,
    empresarial: dependencias.empresarial as EmpresarialEnMemoria,
    personas: dependencias.personas as PersonasEnMemoria,
    feriados: dependencias.feriados as FeriadosEnMemoria,
    pensiones: dependencias.pensiones as PensionesEnMemoria,
    sesiones: dependencias.sesiones as SesionesEnMemoria,
    excel,
    pdf,
    casos: crearCasosDeUso(dependencias),
  };
}
