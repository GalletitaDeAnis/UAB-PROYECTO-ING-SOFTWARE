import type { OrigenAlmuerzo, TipoPersona, Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type AlmuerzoRepositorio,
  type FeriadoRepositorio,
  type PersonaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { esFechaValida } from "../dominio/tiempo.js";
import { esEncargado, SOLO_ENCARGADO } from "./comun.js";

export type FilaDelDia = {
  personaId: string;
  nombre: string;
  tipoPersona: TipoPersona;
  parentesco: string | null;
  codigoTitular: string;
  nombreTitular: string;
  modalidad: OrigenAlmuerzo;
};

export type ListaDelDia = {
  fecha: string;
  esFeriado: boolean;
  total: number;
  filas: FilaDelDia[];
};

/** HU04: lo confirmado del día, venga de reserva o de pensión. Lo cancelado y lo avisado no aparece. */
export class VerListaDelDia {
  constructor(
    private readonly almuerzos: AlmuerzoRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly feriados: FeriadoRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, fecha: string): Promise<Resultado<ListaDelDia>> {
    if (!esEncargado(usuario)) return fallo(SOLO_ENCARGADO);
    if (!esFechaValida(fecha)) return fallo("La fecha no es válida.");

    if (await this.feriados.esFeriado(fecha)) {
      return ok({ fecha, esFeriado: true, total: 0, filas: [] });
    }

    const confirmados = await this.almuerzos.listarConfirmados(fecha);
    const ids = new Set<string>();
    for (const almuerzo of confirmados) {
      ids.add(almuerzo.personaId);
      ids.add(almuerzo.codigoTitular);
    }
    const personas = new Map((await this.personas.obtenerVarias([...ids])).map((p) => [p.id, p]));

    const filas: FilaDelDia[] = confirmados.map((almuerzo) => {
      const persona = personas.get(almuerzo.personaId);
      return {
        personaId: almuerzo.personaId,
        nombre: persona?.nombreCompleto ?? almuerzo.personaId,
        tipoPersona: persona?.tipo ?? "FAMILIAR",
        parentesco: persona?.parentesco ?? null,
        codigoTitular: almuerzo.codigoTitular,
        nombreTitular: personas.get(almuerzo.codigoTitular)?.nombreCompleto ?? almuerzo.codigoTitular,
        modalidad: almuerzo.origen,
      };
    });
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return ok({ fecha, esFeriado: false, total: filas.length, filas });
  }
}
