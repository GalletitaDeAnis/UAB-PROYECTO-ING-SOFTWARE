export const COOKIE_SESION = "sesion";

/**
 * El token llega como `Authorization: Bearer <token>` (frontend que consume GraphQL)
 * o en la cookie HttpOnly `sesion` (pantallas servidas por este mismo servidor).
 */
export function tokenDe(autorizacion: string | null | undefined, cookies: string | null | undefined): string | null {
  if (autorizacion?.startsWith("Bearer ")) {
    const token = autorizacion.slice("Bearer ".length).trim();
    if (token) return token;
  }
  if (!cookies) return null;
  const trozo = cookies
    .split(";")
    .map((parte) => parte.trim())
    .find((parte) => parte.startsWith(`${COOKIE_SESION}=`));
  if (!trozo) return null;
  const valor = decodeURIComponent(trozo.slice(COOKIE_SESION.length + 1));
  return valor || null;
}

export function cookieDeSesion(token: string, segura: boolean): string {
  return `${COOKIE_SESION}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax${segura ? "; Secure" : ""}`;
}

export function cookieVacia(): string {
  return `${COOKIE_SESION}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
