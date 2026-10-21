import { PrismaClient } from "@prisma/client";
import { crearCasosDeUso } from "../aplicacion/casosDeUso.js";
import type { Configuracion } from "./configuracion.js";
import { ExportadorExcel, ExportadorPdf } from "./exportadores.js";
import { RelojDelSistema } from "./relojSistema.js";
import {
  AlmuerzosPrisma,
  AutorizacionesPrisma,
  FeriadosPrisma,
  PensionesPrisma,
  PersonasPrisma,
  SesionesPrisma,
} from "./repositoriosPrisma.js";
import { SistemaEmpresarialHttp } from "./sistemaEmpresarialHttp.js";
import { TokensAleatorios } from "./tokens.js";

/** Raíz de composición: el único lugar que conoce las clases concretas. */
export function crearAplicacion(config: Configuracion, db = new PrismaClient()) {
  const casos = crearCasosDeUso({
    reloj: new RelojDelSistema(),
    empresarial: new SistemaEmpresarialHttp({ urlBase: config.empresarialUrl, apiKey: config.empresarialApiKey }),
    personas: new PersonasPrisma(db),
    autorizaciones: new AutorizacionesPrisma(db),
    almuerzos: new AlmuerzosPrisma(db),
    feriados: new FeriadosPrisma(db),
    pensiones: new PensionesPrisma(db),
    sesiones: new SesionesPrisma(db),
    tokens: new TokensAleatorios(),
    exportadores: [new ExportadorExcel(), new ExportadorPdf()],
  });
  return { db, casos };
}
