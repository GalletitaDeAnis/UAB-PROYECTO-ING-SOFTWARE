import { PrismaClient } from "@prisma/client";
import { CancelarReserva } from "../aplicacion/cancelarReserva.js";
import { Ingresar } from "../aplicacion/ingresar.js";
import { ReservarAlmuerzo } from "../aplicacion/reservarAlmuerzo.js";
import { VerListaDelDia } from "../aplicacion/verListaDelDia.js";
import { RelojDelSistema } from "./relojSistema.js";
import {
  AlmuerzosPrisma,
  AutorizacionesPrisma,
  DirectorioPrisma,
  FeriadosPrisma,
  PensionesPrisma,
} from "./repositoriosPrisma.js";

export function crearAplicacion(db = new PrismaClient()) {
  const reloj = new RelojDelSistema();
  const directorio = new DirectorioPrisma(db);
  const autorizaciones = new AutorizacionesPrisma(db);
  const almuerzos = new AlmuerzosPrisma(db);
  const feriados = new FeriadosPrisma(db);
  const pensiones = new PensionesPrisma(db);

  return {
    db,
    reloj,
    feriados,
    ingresar: new Ingresar(directorio, autorizaciones, almuerzos),
    reservar: new ReservarAlmuerzo(reloj, directorio, almuerzos, feriados, pensiones),
    cancelar: new CancelarReserva(reloj, almuerzos),
    verLista: new VerListaDelDia(autorizaciones, almuerzos, directorio),
  };
}

export type Aplicacion = ReturnType<typeof crearAplicacion>;
