import type { Momento } from "../dominio/tiempo.js";

const ZONA = "America/La_Paz";

export function momentoEnLaPaz(instante: Date): Momento {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instante);
  const tomar = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "00";
  return {
    fecha: `${tomar("year")}-${tomar("month")}-${tomar("day")}`,
    minutos: Number(tomar("hour")) * 60 + Number(tomar("minute")),
  };
}
