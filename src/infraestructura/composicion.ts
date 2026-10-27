import { PrismaClient } from "@prisma/client";
import { crearCasosDeUso } from "../aplicacion/casosDeUso.js";
import { CifradorScrypt } from "./contrasenas.js";
import { ExportadorExcel, ExportadorPdf } from "./exportadores.js";
import { RelojDelSistema } from "./relojSistema.js";
import {
  CuentasPrisma,
  MenusPrisma,
  PensionesPrisma,
  PersonasPrisma,
  ReservasPrisma,
  SesionesPrisma,
} from "./repositoriosPrisma.js";
import { TokensAleatorios } from "./tokens.js";

/** Raíz de composición: el único lugar que conoce las clases concretas. */
export function crearAplicacion(db = new PrismaClient()) {
  const casos = crearCasosDeUso({
    reloj: new RelojDelSistema(),
    personas: new PersonasPrisma(db),
    cuentas: new CuentasPrisma(db),
    reservas: new ReservasPrisma(db),
    pensiones: new PensionesPrisma(db),
    menus: new MenusPrisma(db),
    sesiones: new SesionesPrisma(db),
    cifrador: new CifradorScrypt(),
    tokens: new TokensAleatorios(),
    exportadores: [new ExportadorExcel(), new ExportadorPdf()],
  });
  return { db, casos };
}
