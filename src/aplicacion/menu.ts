import { precioDe, type MenuDia, type MenuSemanal, type Reserva, type Usuario } from "../dominio/modelo.js";
import {
  fallo,
  ok,
  type MenuRepositorio,
  type PensionRepositorio,
  type PersonaRepositorio,
  type Reloj,
  type ReservaRepositorio,
  type Resultado,
} from "../dominio/puertos.js";
import { anioMes, diaSemana, esFechaValida, lunesAJuevesDe, sumarDias } from "../dominio/tiempo.js";
import { sinPermiso } from "./comun.js";

export type MenuPublicado = {
  menu: MenuSemanal;
  /** HU07 CA2: almuerzos de pensionados que quedaron confirmados al publicar. */
  reservasDePension: number;
};

/**
 * HU03. Publicar es una sola acción y no tiene vuelta atrás (CA4): lo que no figura en el menú
 * no tiene atención (R7). Al publicar se confirman los almuerzos de los pensionados de esos días.
 */
export class PublicarMenu {
  constructor(
    private readonly reloj: Reloj,
    private readonly menus: MenuRepositorio,
    private readonly pensiones: PensionRepositorio,
    private readonly personas: PersonaRepositorio,
    private readonly reservas: ReservaRepositorio,
  ) {}

  async ejecutar(usuario: Usuario, lunes: string, dias: MenuDia[]): Promise<Resultado<MenuPublicado>> {
    const denegado = sinPermiso(usuario, "ADMINISTRADOR");
    if (denegado) return fallo(denegado);
    if (!esFechaValida(lunes) || diaSemana(lunes) !== 1) return fallo("La semana se indica con la fecha de su lunes.");

    const hoy = this.reloj.ahora().fecha;
    if (sumarDias(lunes, 3) < hoy) return fallo("Esa semana ya terminó. No se publica un menú para el pasado.");
    if (await this.menus.obtenerSemana(lunes)) {
      return fallo("El menú de esa semana ya fue publicado y no se puede modificar.");
    }

    const permitidos = lunesAJuevesDe(lunes);
    const limpios: MenuDia[] = [];
    for (const dia of dias) {
      const descripcion = dia.descripcion.trim().replace(/\s+/g, " ");
      if (!descripcion) continue;
      if (!permitidos.includes(dia.fecha)) {
        return fallo("El menú solo admite días de lunes a jueves de esa semana.");
      }
      if (dia.fecha < hoy) return fallo(`El ${dia.fecha} ya pasó. Publica solo días que todavía no llegaron.`);
      if (limpios.some((otro) => otro.fecha === dia.fecha)) return fallo(`El ${dia.fecha} figura dos veces.`);
      limpios.push({ fecha: dia.fecha, descripcion: descripcion.slice(0, 200) });
    }
    if (limpios.length === 0) return fallo("Escribe el menú de al menos un día.");
    limpios.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const menu: MenuSemanal = { lunes, publicadoEl: hoy, dias: limpios };
    const dePension = await this.reservasDePension(limpios);
    await this.menus.publicar(menu, dePension);
    return ok({ menu, reservasDePension: dePension.length });
  }

  /** R10: un almuerzo confirmado por pensionado activo en cada día publicado de su mes. */
  private async reservasDePension(dias: MenuDia[]): Promise<Reserva[]> {
    const reservas: Reserva[] = [];
    const meses = new Map<string, { anio: number; mes: number }>();
    for (const dia of dias) {
      const periodo = anioMes(dia.fecha);
      meses.set(`${periodo.anio}-${periodo.mes}`, periodo);
    }
    for (const { anio, mes } of meses.values()) {
      const pensiones = await this.pensiones.listarDelMes(anio, mes);
      const activos = new Set(
        (await this.personas.obtenerVarias(pensiones.map((p) => p.personaId))).filter((p) => p.activo).map((p) => p.id),
      );
      for (const pension of pensiones) {
        if (!activos.has(pension.personaId)) continue;
        for (const dia of dias) {
          const periodo = anioMes(dia.fecha);
          if (periodo.anio !== anio || periodo.mes !== mes) continue;
          if (await this.reservas.obtener(pension.personaId, dia.fecha)) continue;
          reservas.push({
            personaId: pension.personaId,
            titularId: pension.titularId,
            fecha: dia.fecha,
            modalidad: "PENSIONADO",
            precioBs: precioDe("PENSIONADO"),
            estado: "CONFIRMADA",
          });
        }
      }
    }
    return reservas;
  }
}

export type DiaDelMenu = { fecha: string; descripcion: string | null };

export type VistaMenuSemanal = {
  lunes: string;
  publicado: boolean;
  publicadoEl: string | null;
  /** Siempre los cuatro días; sin descripción en un menú publicado es «Sin atención» (HU03 CA2). */
  dias: DiaDelMenu[];
};

/** Lo que ve cualquier usuario: el menú de la semana, día por día. */
export class VerMenuSemanal {
  constructor(private readonly menus: MenuRepositorio) {}

  async ejecutar(lunes: string): Promise<Resultado<VistaMenuSemanal>> {
    if (!esFechaValida(lunes) || diaSemana(lunes) !== 1) return fallo("La semana se indica con la fecha de su lunes.");
    const menu = await this.menus.obtenerSemana(lunes);
    return ok({
      lunes,
      publicado: menu !== null,
      publicadoEl: menu?.publicadoEl ?? null,
      dias: lunesAJuevesDe(lunes).map((fecha) => ({
        fecha,
        descripcion: menu?.dias.find((dia) => dia.fecha === fecha)?.descripcion ?? null,
      })),
    });
  }
}
