# Definition of Done

Una historia está hecha cuando se cumple todo esto:

1. Cada criterio de aceptación tiene al menos una prueba automática, con el caso normal y el inválido o de borde que el criterio describe (por ejemplo, 8:59 y 9:00). El nombre de la prueba empieza con el número del criterio (`CA2 …`).
2. Las pruebas del caso de uso usan reloj, API empresarial y repositorios en memoria ([tests/fakes.ts](../tests/fakes.ts)). No abren PostgreSQL ni la red.
3. La regla está en el dominio o en el caso de uso, no en el resolver GraphQL, la pantalla ni el SQL. `tests/capas.test.ts` sigue en verde.
4. La operación está en el esquema GraphQL y documentada en [api-graphql.md](api-graphql.md), con un ejemplo.
5. `npm run typecheck` y `npm test` pasan. `npm run test:cobertura` queda por encima del umbral (80 % de líneas).
6. Si la historia cambia tablas, la migración está en `prisma/migrations/` y pasa la prueba de integración contra PostgreSQL.
7. Se puede recorrer en el servidor levantado con los usuarios de prueba (GraphiQL o la pantalla).
8. El código está en una rama de la historia, entra por pull request y otro integrante lo revisó.
9. Si se usó IA, está declarado en [declaracion-uso-de-ia.md](declaracion-uso-de-ia.md).

## Estado

| Historia | 1–7 | 8 (PR revisado) |
| --- | --- | --- |
| HU01 a HU12 (backend y API) | Cumple | Pendiente: PR `feature/api-graphql-y-base-de-datos` → `desarrollo` |
| Pantallas del frontend | Las hace cada integrante | — |
