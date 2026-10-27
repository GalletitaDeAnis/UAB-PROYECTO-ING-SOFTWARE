# Registro de refactorización

Cada entrada dice qué olor de código había, qué se cambió y qué pruebas protegen el cambio. La red de seguridad es la suite por criterio de aceptación: si una refactorización cambia el comportamiento, alguna prueba `CAx` falla.

## Cómo se registra una refactorización

1. `npm test` en verde **antes** de tocar nada. Anotar el número de pruebas.
2. Cambiar la estructura sin cambiar el comportamiento, en un commit que diga «Refactorizar: …».
3. `npm test` en verde **después**, con el mismo número de pruebas o más (nunca borrar una prueba para que pase).
4. Agregar la fila a la tabla de abajo con el commit.

## Corte del backlog final (27 de octubre de 2026)

Al pasar del backlog v2 al final se revisó el código existente. Estos olores se corrigieron en ese corte; la suite final queda en **157 pruebas en verde** (`npm test`), con 98 % de líneas y 90 % de ramas cubiertas.

| # | Olor | Dónde estaba | Refactorización | Lo protegen |
| --- | --- | --- | --- | --- |
| 1 | **Código duplicado**: cada caso de uso del encargado repetía `if (!esEncargado(usuario)) return fallo(SOLO_ENCARGADO)`. El empleado no tenía control propio. | `verListaDelDia.ts`, `feriados.ts`, `reporteMensual.ts` (v2) | Una función `sinPermiso(usuario, tipo)` en `aplicacion/comun.ts`. Además del tipo, controla el cambio de contraseña pendiente (HU02 CA6) en un solo lugar. | `hu02` CA3 y CA6; casos «solo el administrador» de `hu01`, `hu03`, `hu06`, `hu09`, `hu10`; `hu04` R2 |
| 2 | **Obsesión por primitivos**: el código institucional (`codigoTitular: string`) era a la vez el id de la persona y el dato del empleado. | `modelo.ts`, `repositoriosPrisma.ts` (v2) | La identidad es un uuid (`Persona.id`, `titularId`); el código de empleado es un atributo de `Cuenta`. | `hu10` CA1 y CA5 (el reporte muestra el código correcto); `hu01` CA3 |
| 3 | **Código duplicado**: el `upsert` de un almuerzo estaba copiado en el repositorio de almuerzos y en el de pensiones. | `repositoriosPrisma.ts` (v2) | Una función `guardarReserva()` que usan reservas, pensiones y menús. | `integracion.postgres` (pensión y publicación) |
| 4 | **Código duplicado**: contar los almuerzos de pensión que siguen confirmados se hacía en dos lugares con filtros parecidos. | `avisarInasistencia.ts`, `verMiConsumo.ts` | Una función `programados(reservas)` exportada desde `avisarInasistencia.ts`. | `hu08` CA1, CA2; `hu11` CA2 |
| 5 | **Código duplicado**: validar familiares y CI repetidos hacía falta al registrar y al agregar. | nuevo en `registrarUsuario.ts` y `gestionarUsuarios.ts` | `validarFamiliares()` y `ciDuplicado()` compartidas. | `hu01` CA3, CA4, CA6; `hu09` CA1 |
| 6 | **Tipos paralelos**: cada operación sobre varias personas definía su propio resultado. | `pensionar.ts` (v2) | `ResultadoPorPersona` en `comun.ts`, que usan reservar y pensionar; `resumen()` en `web.ts` arma un solo mensaje. | `hu04` CA3, `hu07` CA5, `web` HU04 |
| 7 | **Archivo grande con dos responsabilidades**: todas las pantallas y su HTML común en un archivo. | `presentacion/paginas.ts` (v2) | `vistas.ts` (piezas comunes), `paginasEmpleado.ts` y `paginasAdministrador.ts`. | `web.test.ts` (13 casos) |
| 8 | **Prueba no determinista**: los CI de los datos de prueba salían de un contador global, distinto en cada llamada. | `tests/fakes.ts` | El CI se calcula a partir del nombre: mismas personas, mismos CI. | `hu01` CA3 falló por esto y pasó tras el cambio |
| 9 | **Estado compartido entre pruebas**: un reloj de prueba reutilizado se movía en una prueba y rompía otras cuatro. | `tests/hu07.pensionar.test.ts` | Una fábrica `enOctubre()` que devuelve un reloj nuevo por prueba. | Las 11 pruebas de `hu07` |

## Defectos encontrados por las pruebas

No son refactorizaciones, pero se encontraron con la misma red de seguridad:

| Defecto | Prueba que lo encontró | Arreglo |
| --- | --- | --- |
| Un titular sin consumo no tenía filas en el Excel, aunque HU10 CA5 pide que figure con 0 Bs. | `exportadores` «HU10 CA5» | El exportador escribe «Sin consumo en el mes» con 0 Bs. |

## Pendiente para el Sprint 3

Olores conocidos que quedan, para que el equipo los tome con el protocolo de arriba:

- `web.ts` tiene unas 500 líneas: se puede separar en rutas del empleado y del administrador, como ya se hizo con las páginas.
- Las pruebas de `web.test.ts` comparten un mismo escenario y dependen del orden en que corren (por ejemplo, la contraseña de un usuario cambia en una prueba anterior). Conviene un escenario por prueba.
