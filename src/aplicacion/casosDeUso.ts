import type {
  AlmuerzoRepositorio,
  AutorizacionRepositorio,
  ExportadorReporte,
  FeriadoRepositorio,
  GeneradorDeTokens,
  PensionRepositorio,
  PersonaRepositorio,
  Reloj,
  SesionRepositorio,
  SistemaEmpresarial,
} from "../dominio/puertos.js";
import { AvisarInasistencia } from "./avisarInasistencia.js";
import { CancelarReserva } from "./cancelarReserva.js";
import { ListarFeriados, RegistrarFeriado, VerDiasDeServicio } from "./feriados.js";
import { IniciarSesion } from "./iniciarSesion.js";
import { Pensionar } from "./pensionar.js";
import { ExportarReporteMensual, GenerarReporteMensual } from "./reporteMensual.js";
import { ReservarAlmuerzo } from "./reservarAlmuerzo.js";
import { CerrarSesion, ValidarSesion } from "./sesion.js";
import { VerListaDelDia } from "./verListaDelDia.js";
import { VerMiConsumo, VerMisAlmuerzos } from "./verMiConsumo.js";
import { VerMiFamilia } from "./verMiFamilia.js";

/** Los puertos que la aplicación necesita. Producción y pruebas entregan implementaciones distintas. */
export type Dependencias = {
  reloj: Reloj;
  empresarial: SistemaEmpresarial;
  personas: PersonaRepositorio;
  autorizaciones: AutorizacionRepositorio;
  almuerzos: AlmuerzoRepositorio;
  feriados: FeriadoRepositorio;
  pensiones: PensionRepositorio;
  sesiones: SesionRepositorio;
  tokens: GeneradorDeTokens;
  exportadores: ExportadorReporte[];
};

/** Inyección por constructor: cada caso de uso recibe solo los puertos que usa. */
export function crearCasosDeUso(d: Dependencias) {
  const generarReporte = new GenerarReporteMensual(d.almuerzos, d.personas, d.feriados);
  return {
    reloj: d.reloj,
    iniciarSesion: new IniciarSesion(d.empresarial, d.personas, d.autorizaciones, d.sesiones, d.tokens, d.reloj),
    validarSesion: new ValidarSesion(d.sesiones, d.tokens, d.reloj),
    cerrarSesion: new CerrarSesion(d.sesiones, d.tokens),
    verMiFamilia: new VerMiFamilia(d.personas),
    reservar: new ReservarAlmuerzo(d.reloj, d.personas, d.almuerzos, d.feriados, d.pensiones),
    cancelar: new CancelarReserva(d.reloj, d.personas, d.almuerzos),
    verLista: new VerListaDelDia(d.almuerzos, d.personas, d.feriados),
    registrarFeriado: new RegistrarFeriado(d.feriados),
    listarFeriados: new ListarFeriados(d.feriados),
    verDiasDeServicio: new VerDiasDeServicio(d.feriados),
    pensionar: new Pensionar(d.reloj, d.personas, d.pensiones, d.feriados),
    avisarInasistencia: new AvisarInasistencia(d.reloj, d.personas, d.almuerzos, d.feriados),
    generarReporte,
    exportarReporte: new ExportarReporteMensual(generarReporte, d.exportadores),
    verMiConsumo: new VerMiConsumo(d.personas, d.almuerzos, d.pensiones, d.feriados),
    verMisAlmuerzos: new VerMisAlmuerzos(d.personas, d.almuerzos),
  };
}

export type CasosDeUso = ReturnType<typeof crearCasosDeUso>;
