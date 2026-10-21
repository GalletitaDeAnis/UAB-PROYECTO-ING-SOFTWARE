import { momentoEnLaPaz } from "./relojLaPaz.js";
import type { Reloj } from "../dominio/puertos.js";
import type { Momento } from "../dominio/tiempo.js";

export class RelojDelSistema implements Reloj {
  ahora(): Momento {
    const fijo = process.env.RELOJ_FIJO;
    if (fijo) return momentoFijo(fijo);
    return momentoEnLaPaz(new Date());
  }

  /** La inactividad de la sesión se mide con la hora real, aunque RELOJ_FIJO mueva la regla de las 9:00. */
  instante(): number {
    return Date.now();
  }
}

function momentoFijo(texto: string): Momento {
  const [fecha, hora = "00:00"] = texto.split("T");
  const [horas, minutos] = hora.split(":");
  return { fecha, minutos: Number(horas) * 60 + Number(minutos) };
}
