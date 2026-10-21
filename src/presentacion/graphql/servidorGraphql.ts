import { createSchema, createYoga } from "graphql-yoga";
import type { CasosDeUso } from "../../aplicacion/casosDeUso.js";
import { SIN_SESION } from "../../aplicacion/sesion.js";
import { tokenDe } from "../token.js";
import { esquema } from "./esquema.js";
import { resolvers, type Contexto } from "./resolvers.js";

export type OpcionesGraphql = {
  graphiql: boolean;
  /** Orígenes del frontend que pueden llamar con fetch desde el navegador. Vacío: solo el mismo origen. */
  origenesPermitidos: string[];
};

export function crearServidorGraphql(casos: CasosDeUso, opciones: OpcionesGraphql) {
  return createYoga({
    schema: createSchema<Contexto>({ typeDefs: esquema, resolvers }),
    graphqlEndpoint: "/graphql",
    graphiql: opciones.graphiql ? { title: "API · Reservas de almuerzo" } : false,
    // Los errores que no son de negocio (Prisma, red) salen como "Unexpected error." sin detalles internos.
    maskedErrors: true,
    cors: opciones.origenesPermitidos.length
      ? { origin: opciones.origenesPermitidos, credentials: true, allowedHeaders: ["authorization", "content-type"] }
      : false,
    context: async ({ request }): Promise<Contexto> => {
      const token = tokenDe(request.headers.get("authorization"), request.headers.get("cookie"));
      if (!token) return { casos, token: null, usuario: null, motivoSinSesion: SIN_SESION };
      const sesion = await casos.validarSesion.ejecutar(token);
      return sesion.ok
        ? { casos, token, usuario: sesion.valor, motivoSinSesion: "" }
        : { casos, token, usuario: null, motivoSinSesion: sesion.mensaje };
    },
  });
}
