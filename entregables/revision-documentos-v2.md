# Revisión de los documentos v2 contra la rúbrica

Revisión del backlog v2, los casos de uso v2 y la propuesta de arquitectura (los tres en Word), hecha al conectarlos con el código. Para cada punto se indica qué se hizo en el repositorio y qué tiene que decidir el equipo.

## Lo que está bien y se mantuvo

- Las 12 historias cumplen INVEST y tienen criterios Dado / Cuando / Entonces con números verificables (8:59 / 9:00, 384 Bs, tope de 5, mínimo de 10). Cada criterio tiene ahora su prueba automática (columna «Prueba» de [backlog.md](backlog.md)).
- El control de cambios v1 → v2 y la tabla de historias descartadas son buena evidencia para el criterio de backlog («actualizado cada sprint»).
- La integración con la API como tareas técnicas dentro de HU01 y HU05, en vez de una historia de desarrollador, es correcta.
- La propuesta de arquitectura (Express, PostgreSQL, servicios con las reglas y repositorios sin SQL en los controladores) se respetó. Ver la tabla de equivalencias en [arquitectura.md](arquitectura.md).

## Para decidir en equipo

| # | Dónde | Observación | Qué se hizo / qué falta |
| --- | --- | --- | --- |
| 1 | Backlog, plan de sprints | Plan de **4 sprints**. La rúbrica tiene **3 entregas** (sesiones 6, 10 y 13) y el Demo Day. Si HU11 y HU12 quedan en un «Sprint 4», no entran en ninguna entrega calificada. | **Falta decidir.** Opción simple: Sprint 3 = HU09 a HU12 (21 pts, por encima de la velocidad de 10–13), dejando la refactorización del Sprint 3 corta. Otra: mover HU07 (2 pts) al Sprint 1 y HU09 al 2. El código de las 12 historias ya existe, así que el riesgo es de planificación, no técnico. Lo que se acuerde va al acta del Planning. |
| 2 | Backlog §5 | La tabla de Planning Poker dice «Pts acordados». Si la votación no se hizo en una reunión, la rúbrica (Git e IA, y Retros) castiga presentar evidencia que no ocurrió. | Hacer la votación real y guardar una foto o el acta. |
| 3 | Backlog, HU11 | En la tabla resumen de la sección 3 a HU11 le falta la columna Esfuerzo (las celdas están corridas). | Corregido en `backlog.md` (Esfuerzo: Alto). Corregir también el Word. |
| 4 | Casos de uso, figuras 1 y 2 | Numeración que no coincide con la tabla de trazabilidad, «Iniciar sesión» duplicado, `include` de dos puntas hacia el login, UC14 y UC25 inexistentes y asociaciones del encargado a casos del empleado. | Diagrama redibujado ([casos-de-uso.md](casos-de-uso.md), sección 7). Si el equipo prefiere su figura, hay que corregirla con esa lista. |
| 5 | Casos de uso, sección 3 | Dice «CU02–CU11 y CU13 → CU01 «include»». Iniciar sesión es precondición, no `include`. | Corregido en `casos-de-uso.md`. |
| 6 | Arquitectura | No dice hacia dónde apuntan las dependencias ni dónde **no** usar Repository o DI. Son los tres puntos del nivel Excelente de la rúbrica. | Agregado en `arquitectura.md` (decisiones 1 a 3), con la prueba `capas.test.ts` que lo verifica. |
| 7 | Arquitectura | Propone EJS. El grupo pidió además una API GraphQL. | GraphQL entra como adaptador de presentación (decisión 4). Las pantallas mínimas del servidor siguen funcionando para la demo; el frontend del equipo puede reemplazarlas. |
| 8 | Arquitectura, «Siguiente entregable lógico» | Pedía diseñar las tablas de PostgreSQL. | Hecho: [base-de-datos.md](base-de-datos.md). |
| 9 | Backlog S4 | El rol de encargado está abierto. | El código usa una lista configurada (`ENCARGADOS`). Si el PO decide que viene de la API, se cambia solo `IniciarSesion`. |
| 10 | Backlog S5 | Familiar que deja de figurar a mitad de mes. | El código lo deja «no vigente»: no se puede elegir, sus reservas ya hechas siguen y su historial no se borra. Confirmar con el PO. |
| 11 | Backlog HU08 | «Antes de que inicie el mes» admite pedir con dos meses de anticipación. El título dice «el mes siguiente». | Se implementó «solo el mes siguiente». Si el PO quiere más anticipación, se cambia una función (`esMesSiguiente`). |
| 12 | Todos | Faltan las actas de Retro 1 (Sprint 1) y la evidencia del tablero. | Usar [plantilla-retro.md](plantilla-retro.md). No se inventan hallazgos. |

## Para la nota individual

La rúbrica pone 12 puntos individuales a Git e IA y 6 a la defensa, y baja el **factor de contribución** de quien no tenga aportes visibles en el historial. Por eso:

- cada integrante trabaja en su rama (`feature/HU0X-…`) y abre su pull request;
- otro integrante revisa de verdad (comentarios en el PR, no solo «aprobar»);
- quien use IA la declara en [declaracion-uso-de-ia.md](declaracion-uso-de-ia.md) y tiene que poder explicar su código línea por línea.
