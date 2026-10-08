import { createHmac, timingSafeEqual } from "node:crypto";

const NOMBRE = "sesion";

function secreto(): string {
  return process.env.SESSION_SECRET ?? "almuerzos-demo";
}

export function firmarCodigo(codigo: string): string {
  const mac = createHmac("sha256", secreto()).update(codigo).digest("hex");
  return `${codigo}.${mac}`;
}

export function leerCodigo(encabezado: string | undefined): string | null {
  if (!encabezado) return null;
  const trozo = encabezado
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${NOMBRE}=`));
  if (!trozo) return null;
  const valor = decodeURIComponent(trozo.slice(NOMBRE.length + 1));
  const punto = valor.lastIndexOf(".");
  if (punto <= 0) return null;
  const codigo = valor.slice(0, punto);
  const mac = valor.slice(punto + 1);
  const esperado = createHmac("sha256", secreto()).update(codigo).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return codigo;
}

export function cookieDe(codigo: string): string {
  return `${NOMBRE}=${encodeURIComponent(firmarCodigo(codigo))}; HttpOnly; Path=/; SameSite=Lax`;
}

export function cookieVacia(): string {
  return `${NOMBRE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
