import { nombreCompleto, type Modalidad, type Parentesco, type TipoPersona, type Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type MenuRepositorio,
  type PersonaRepositorio,
  type ReservaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { esFechaValida } from "../dominio/tiempo.js";
import { sinPermiso } from "./comun.js";

export type FilaDelDia = {
  personaId: string;
  nombre: string;
  tipoPersona: TipoPersona;
  parentesco: Parentesco | null;
  titularId: string;
  nombreTitular: string;
  modalidad: Modalidad;
};

export type ListaDelDia = {
  fecha: string;
  /** HU06 CA3: sin menú publicado no hay atención y el total es cero. */
  sinAtencion: boolean;
  menu: string | null;
  total: number;
  filas: FilaDelDia[];
};

/** HU06: lo confirmado del día, venga de reserva o de pensión. Lo cancelado y lo avisado no aparece. */
export class VerListaDelDia {
  constructor(
    private readonly reservas: ReservaRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly menus: MenuRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, fecha: string): Promise<Resultado<ListaDelDia>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    if (!esFechaValida(fecha)) return fallo("La fecha no es válida.");

    const menu = await this.menus.obtenerDia(fecha);
    if (!menu) return ok({ fecha, sinAtencion: true, menu: null, total: 0, filas: [] });

    const confirmadas = await this.reservas.listarConfirmadas(fecha);
    const ids = new Set(confirmadas.flatMap((reserva) => [reserva.personaId, reserva.titularId]));
    const personas = new Map((await this.personas.obtenerVarias([...ids])).map((p) => [p.id, p]));

    const filas: FilaDelDia[] = confirmadas.map((reserva) => {
      const persona = personas.get(reserva.personaId);
      const titular = personas.get(reserva.titularId);
      return {
        personaId: reserva.personaId,
        nombre: persona ? nombreCompleto(persona) : reserva.personaId,
        tipoPersona: persona?.tipo ?? "FAMILIAR",
        parentesco: persona?.parentesco ?? null,
        titularId: reserva.titularId,
        nombreTitular: titular ? nombreCompleto(titular) : reserva.titularId,
        modalidad: reserva.modalidad,
      };
    });
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return ok({ fecha, sinAtencion: false, menu: menu.descripcion, total: filas.length, filas });
  }
}
