import type {
  CifradorDeContrasenas,
  CuentaRepositorio,
  ExportadorReporte,
  GeneradorDeTokens,
  MenuRepositorio,
  PensionRepositorio,
  PersonaRepositorio,
  Reloj,
  ReservaRepositorio,
  SesionRepositorio,
} from "../dominio/puertos.js";
import { AvisarInasistencia } from "./avisarInasistencia.js";
import { CambiarContrasena } from "./cambiarContrasena.js";
import { CancelarReserva } from "./cancelarReserva.js";
import {
  AgregarFamiliar,
  CambiarTipoUsuario,
  DarDeBaja,
  ListarUsuarios,
  ModificarDatos,
  RestablecerContrasena,
  VerUsuario,
} from "./gestionarUsuarios.js";
import { IniciarSesion } from "./iniciarSesion.js";
import { PublicarMenu, VerMenuSemanal } from "./menu.js";
import { Pensionar } from "./pensionar.js";
import { RegistrarUsuario } from "./registrarUsuario.js";
import { ExportarReporteMensual, GenerarReporteMensual } from "./reporteMensual.js";
import { ReservarAlmuerzo } from "./reservarAlmuerzo.js";
import { CerrarSesion, ValidarSesion } from "./sesion.js";
import { VerListaDelDia } from "./verListaDelDia.js";
import { VerMiConsumo, VerMiFamilia, VerMisReservas } from "./verMiConsumo.js";

/** Los puertos que la aplicación necesita. Producción y pruebas entregan implementaciones distintas. */
export type Dependencias = {
  reloj: Reloj;
  personas: PersonaRepositorio;
  cuentas: CuentaRepositorio;
  reservas: ReservaRepositorio;
  pensiones: PensionRepositorio;
  menus: MenuRepositorio;
  sesiones: SesionRepositorio;
  cifrador: CifradorDeContrasenas;
  tokens: GeneradorDeTokens;
  exportadores: ExportadorReporte[];
};

/** Inyección por constructor: cada caso de uso recibe solo los puertos que usa. */
export function crearCasosDeUso(d: Dependencias) {
  const generarReporte = new GenerarReporteMensual(d.reservas, d.personas, d.cuentas);
  return {
    reloj: d.reloj,
    // HU01 y HU09
    registrarUsuario: new RegistrarUsuario(d.reloj, d.personas, d.cuentas, d.cifrador),
    listarUsuarios: new ListarUsuarios(d.cuentas, d.personas),
    verUsuario: new VerUsuario(d.cuentas, d.personas),
    agregarFamiliar: new AgregarFamiliar(d.reloj, d.cuentas, d.personas),
    modificarDatos: new ModificarDatos(d.reloj, d.personas),
    cambiarTipoUsuario: new CambiarTipoUsuario(d.cuentas, d.personas),
    darDeBaja: new DarDeBaja(d.reloj, d.cuentas, d.personas, d.sesiones),
    restablecerContrasena: new RestablecerContrasena(d.cuentas, d.sesiones, d.cifrador),
    // HU02
    iniciarSesion: new IniciarSesion(d.cuentas, d.personas, d.sesiones, d.cifrador, d.tokens, d.reloj),
    validarSesion: new ValidarSesion(d.sesiones, d.cuentas, d.personas, d.tokens, d.reloj),
    cerrarSesion: new CerrarSesion(d.sesiones, d.tokens),
    cambiarContrasena: new CambiarContrasena(d.cuentas, d.cifrador),
    // HU03
    publicarMenu: new PublicarMenu(d.reloj, d.menus, d.pensiones, d.personas, d.reservas),
    verMenuSemanal: new VerMenuSemanal(d.menus),
    // HU04 a HU08
    verMiFamilia: new VerMiFamilia(d.personas),
    reservar: new ReservarAlmuerzo(d.reloj, d.personas, d.reservas, d.menus, d.pensiones),
    cancelar: new CancelarReserva(d.reloj, d.personas, d.reservas),
    verLista: new VerListaDelDia(d.reservas, d.personas, d.menus),
    pensionar: new Pensionar(d.reloj, d.personas, d.pensiones, d.menus),
    avisarInasistencia: new AvisarInasistencia(d.reloj, d.personas, d.reservas, d.menus),
    // HU10 y HU11
    generarReporte,
    exportarReporte: new ExportarReporteMensual(generarReporte, d.exportadores),
    verMiConsumo: new VerMiConsumo(d.reloj, d.personas, d.reservas, d.pensiones, d.menus, d.cuentas),
    verMisReservas: new VerMisReservas(d.personas, d.reservas),
  };
}

export type CasosDeUso = ReturnType<typeof crearCasosDeUso>;
