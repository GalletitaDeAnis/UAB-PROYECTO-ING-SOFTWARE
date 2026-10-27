/** Un instante ya convertido a la hora de Bolivia (America/La_Paz, UTC−4). */
export type Momento = {
  fecha: string;
  minutos: number;
};

export function minutosDe(hora: number, minuto: number): number {
  return hora * 60 + minuto;
}

export function momento(fecha: string, hora: number, minuto: number): Momento {
  return { fecha, minutos: minutosDe(hora, minuto) };
}

export function diaSemana(fecha: string): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function anioMes(fecha: string): { anio: number; mes: number } {
  const [anio, mes] = fecha.split("-").map(Number);
  return { anio, mes };
}

export function esLunesAJueves(fecha: string): boolean {
  const dia = diaSemana(fecha);
  return dia >= 1 && dia <= 4;
}

export const HORA_LIMITE = "09:00";

/** R9: a las 9:00 en punto el cambio ya no se acepta. Un día futuro sigue abierto. */
export function admiteCambio(ahora: Momento, fechaServicio: string): boolean {
  if (ahora.fecha < fechaServicio) return true;
  if (ahora.fecha > fechaServicio) return false;
  return ahora.minutos < minutosDe(9, 0);
}

/** Acepta solo fechas de calendario reales con forma AAAA-MM-DD. */
export function esFechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

export function mesSiguiente(fecha: string): { anio: number; mes: number } {
  const { anio, mes } = anioMes(fecha);
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/** R10 y HU07 CA4: la pensión se pide antes de que empiece el mes; el día 1 ya es tarde. */
export function esMesSiguiente(ahora: Momento, anio: number, mes: number): boolean {
  const siguiente = mesSiguiente(ahora.fecha);
  return siguiente.anio === anio && siguiente.mes === mes;
}

export function diasDelMes(anio: number, mes: number): string[] {
  const total = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
  return Array.from({ length: total }, (_, i) => `${prefijo}-${String(i + 1).padStart(2, "0")}`);
}

/** El lunes de la semana a la que pertenece la fecha. */
export function lunesDe(fecha: string): string {
  const dia = diaSemana(fecha);
  return sumarDias(fecha, dia === 0 ? -6 : 1 - dia);
}

/** R6: los cuatro días en que puede haber atención en la semana que empieza ese lunes. */
export function lunesAJuevesDe(lunes: string): string[] {
  return [0, 1, 2, 3].map((dias) => sumarDias(lunes, dias));
}

/** El próximo día con menú en que todavía se puede reservar, para precargar el formulario. */
export function sugerirFechaReserva(ahora: Momento, tieneMenu: (fecha: string) => boolean): string {
  let fecha = ahora.fecha;
  for (let i = 0; i < 21; i++) {
    if (tieneMenu(fecha) && admiteCambio(ahora, fecha)) return fecha;
    fecha = sumarDias(fecha, 1);
  }
  return ahora.fecha;
}
