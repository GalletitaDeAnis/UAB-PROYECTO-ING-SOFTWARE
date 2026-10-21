/** Lee y valida el entorno una sola vez al arrancar. Un valor faltante corta el arranque con un mensaje claro. */
export type Configuracion = {
  puerto: number;
  empresarialUrl: string;
  empresarialApiKey: string;
  empresarialSimulado: boolean;
  origenesPermitidos: string[];
  graphiql: boolean;
  produccion: boolean;
};

function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Mira .env.example.`);
  return valor;
}

export function leerConfiguracion(entorno: NodeJS.ProcessEnv = process.env): Configuracion {
  requerida("DATABASE_URL", entorno.DATABASE_URL);
  const puerto = Number(entorno.PORT ?? 3000);
  const produccion = entorno.NODE_ENV === "production";
  const empresarialSimulado = entorno.EMPRESARIAL_SIMULADO === "true";
  const empresarialUrl = empresarialSimulado
    ? (entorno.EMPRESARIAL_API_URL ?? `http://localhost:${puerto}/simulador-empresarial`)
    : requerida("EMPRESARIAL_API_URL", entorno.EMPRESARIAL_API_URL);

  return {
    puerto,
    empresarialUrl: empresarialUrl.replace(/\/+$/, ""),
    empresarialApiKey: requerida("EMPRESARIAL_API_KEY", entorno.EMPRESARIAL_API_KEY),
    empresarialSimulado,
    origenesPermitidos: (entorno.CORS_ORIGENES ?? "")
      .split(",")
      .map((origen) => origen.trim())
      .filter(Boolean),
    graphiql: entorno.GRAPHIQL ? entorno.GRAPHIQL === "true" : !produccion,
    produccion,
  };
}
