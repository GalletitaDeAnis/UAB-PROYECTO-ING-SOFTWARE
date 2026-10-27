/** Lee y valida el entorno una sola vez al arrancar. Un valor faltante corta el arranque con un mensaje claro. */
export type Configuracion = {
  puerto: number;
  origenesPermitidos: string[];
  graphiql: boolean;
  produccion: boolean;
  /** SEMBRAR_DEMO=true: la base tiene los usuarios de prueba y el ingreso los muestra. */
  cuentasDemo: boolean;
};

function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}. Mira .env.example.`);
  return valor;
}

export function leerConfiguracion(entorno: NodeJS.ProcessEnv = process.env): Configuracion {
  requerida("DATABASE_URL", entorno.DATABASE_URL);
  const produccion = entorno.NODE_ENV === "production";
  return {
    puerto: Number(entorno.PORT ?? 3000),
    origenesPermitidos: (entorno.CORS_ORIGENES ?? "")
      .split(",")
      .map((origen) => origen.trim())
      .filter(Boolean),
    graphiql: entorno.GRAPHIQL ? entorno.GRAPHIQL === "true" : !produccion,
    produccion,
    cuentasDemo: entorno.SEMBRAR_DEMO === "true",
  };
}
