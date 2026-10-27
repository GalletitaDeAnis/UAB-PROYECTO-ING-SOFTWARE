# Definition of Done

Una historia está hecha cuando cumple todo esto:

1. **Criterios probados.** Cada criterio de aceptación tiene al menos una prueba automática con el caso normal y el inválido o de borde que el criterio describe (8:59 y 9:00; 10 y 11 programados; 29 y 30 minutos). El nombre de la prueba empieza con el número del criterio (`CA2 …`) y figura en la columna **Prueba** de [backlog.md](backlog.md).
2. **Pruebas unitarias con dobles.** Las pruebas del caso de uso usan reloj, repositorios y cifrador en memoria ([tests/fakes.ts](../tests/fakes.ts)). No abren PostgreSQL ni la red.
3. **Regla en su capa.** La regla está en el dominio o en el caso de uso, no en la pantalla, el resolver ni el SQL. `tests/capas.test.ts` sigue en verde.
4. **Expuesta y documentada.** La historia se puede usar desde la pantalla y desde GraphQL, y está en [api-graphql.md](api-graphql.md).
5. **Regresión en verde.** `npm run typecheck` y `npm test` pasan. `npm run test:cobertura` queda sobre el umbral (80 % de líneas y funciones, 75 % de ramas).
6. **Base al día.** Si cambia tablas, hay migración en `prisma/migrations/` y la prueba de integración contra PostgreSQL la cubre.
7. **Demostrable.** Se recorre en la aplicación desplegada con los usuarios de prueba.
8. **Revisada.** Entra a `desarrollo` y otro integrante la revisó (pull request o revisión del commit).
9. **IA declarada.** Si se usó IA, está en [declaracion-uso-de-ia.md](declaracion-uso-de-ia.md) y quien la integra puede explicarla.

## Verificación por historia

Estado al 27 de octubre de 2026, con `npm test` (157 pruebas en verde) y `npm run test:cobertura` (98 % de líneas, 90 % de ramas, 100 % de funciones).

| Historia | 1 Criterios | 2 Dobles | 3 Capas | 4 Pantalla y API | 5 Regresión | 6 Base | 7 Demo | 8 Revisión | 9 IA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HU01 Registrar usuario | 6/6 | ✓ | ✓ | `/usuarios/nuevo` · `registrarUsuario` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU02 Iniciar sesión | 7/7 | ✓ | ✓ | `/` · `iniciarSesion` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU03 Publicar menú | 5/5 | ✓ | ✓ | `/menu` · `publicarMenu` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU04 Reservar | 7/7 | ✓ | ✓ | `/inicio` · `reservarAlmuerzo` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU05 Cancelar | 4/4 | ✓ | ✓ | `/inicio` · `cancelarReserva` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU06 Almuerzos del día | 3/3 | ✓ | ✓ | `/dia` · `listaDelDia` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU07 Pensionar | 7/7 | ✓ | ✓ | `/pension` · `pensionar` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU08 Avisar inasistencia | 6/6 | ✓ | ✓ | `/inicio` · `avisarInasistencia` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU09 Modificar o dar de baja | 6/6 | ✓ | ✓ | `/usuarios/:id` · mutaciones HU09 | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU10 Reporte mensual | 5/5 | ✓ | ✓ | `/reporte` · `reporteMensual` | ✓ | ✓ | ✓ | Pendiente | ✓ |
| HU11 Mi consumo | 4/4 | ✓ | ✓ | `/consumo` · `miConsumo` | ✓ | ✓ | ✓ | Pendiente | ✓ |

**Pendiente (punto 8):** que otro integrante revise el corte del backlog final y deje su comentario en GitHub. Hasta entonces ninguna historia está «hecha» del todo.

## Cómo se verifica

```bash
npm run typecheck        # sin errores de tipos
npm test                 # todas las pruebas
npm run test:cobertura   # reporte en cobertura/index.html; falla si baja del umbral
```

La prueba contra PostgreSQL (`tests/integracion.postgres.test.ts`) corre si se define `DATABASE_URL_PRUEBAS` con una base vacía y aparte.
