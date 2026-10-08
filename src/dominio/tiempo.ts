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

/** A las 9:00 en punto el cambio ya no se acepta. Un día futuro sigue abierto. */
export function admiteCambio(ahora: Momento, fechaServicio: string): boolean {
  if (ahora.fecha < fechaServicio) return true;
  if (ahora.fecha > fechaServicio) return false;
  return ahora.minutos < minutosDe(9, 0);
}

export function sugerirFechaReserva(
  ahora: Momento,
  esFeriado: (fecha: string) => boolean,
): string {
  let fecha = ahora.fecha;
  for (let i = 0; i < 21; i++) {
    if (esLunesAJueves(fecha) && !esFeriado(fecha) && admiteCambio(ahora, fecha)) {
      return fecha;
    }
    fecha = sumarDias(fecha, 1);
  }
  return ahora.fecha;
}
