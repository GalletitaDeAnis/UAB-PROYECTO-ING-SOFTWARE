# Revisión de los documentos del equipo (backlog final)

Revisión de los documentos que el equipo preparó para el backlog final, hecha al conectarlos con el código. Para cada punto: qué se hizo en el repositorio y qué tiene que decidir o corregir el equipo en sus archivos de Word.

## Documentos revisados

- `practica_producto_B_backlog_final` (tres copias; se tomó la más reciente, con la sección 5.1 de historias que no cumplen INVEST).
- `Diagrama_Casos_de_Uso_corregidoultimo` y las dos figuras de casos de uso.
- Los dos diagramas de clases.
- `Arquitectura`.
- `Caratula_Union_Boliviana_UAB`.

## Lo que está bien y se mantuvo

- Las 11 historias cumplen INVEST, con criterios Dado / Cuando / Entonces y números verificables (9:00, 18 y 15 Bs, 384 Bs, mínimo 10, tope 5). Cada criterio tiene ahora su prueba (columna **Prueba** de [backlog.md](backlog.md)).
- La tabla de historias que no cumplían INVEST y su corrección (sección 5.1) es buena evidencia para el criterio de backlog.
- El segundo diagrama de casos de uso (el de PlantUML) es la base del diagrama entregado: actores, generalización de Usuario y casi todos los include/extend coinciden.
- El primer diagrama de clases es la base del diagrama entregado: Persona con Usuario y Familiar, Menú semanal y día, Reserva, Pensión.

## Para corregir o decidir en equipo

| # | Documento | Observación | Qué se hizo / qué falta |
| --- | --- | --- | --- |
| 1 | Backlog, plan de sprints | Cuatro sprints; la rúbrica tiene tres entregas y el Demo Day. | Propuesta en [entregas.md](entregas.md): la tercera entrega lleva los sprints 3 y 4. Decidirlo en el Planning y anotarlo. |
| 2 | Backlog, §4 Planning Poker | La tabla dice «puntos acordados». Si no hubo votación real, no es evidencia. | Hacer la votación y guardar la foto o el acta. |
| 3 | Backlog, R6 y HU03 | No dice si se puede publicar otro día que el domingo ni si una semana puede publicarse vacía. | Decisiones D1 y D2 en [backlog.md](backlog.md). Confirmar con el Product Owner. |
| 4 | Backlog, R11 | No dice cómo se cuenta el mínimo cuando solo se publicaron algunas semanas del mes. | Decisión D4. Confirmar. |
| 5 | Casos de uso, primera figura | Dice «Cancultar mi consumo»; «Avisar inasistencia» aparece a la vez como caso del empleado y como extensión de «Pensionar»; el administrador tiene línea a «Iniciar sesión» pero el empleado se dibuja aparte, sin generalización. | Se entrega el diagrama de [casos-de-uso.md](casos-de-uso.md). Si el equipo prefiere su figura, corregir esos tres puntos. |
| 6 | Casos de uso, segunda figura | «Validar día con menú publicado» y «Validar hora límite» están separados y con flechas cruzadas; falta el include de «Pensionar» hacia «Confirmar almuerzos de los pensionados» (HU07 CA2). | Corregido en el diagrama entregado. |
| 7 | Documento de casos de uso (Word) | Sigue describiendo la v2: actor «API del sistema empresarial», 12 historias, feriados, y a la vez dice que el ingreso es contra la base propia. | Reemplazado por [casos-de-uso.md](casos-de-uso.md), alineado con las 11 historias. Actualizar el Word o entregar el Markdown. |
| 8 | Diagramas de clases | `MenúDía 0..4` permite una semana vacía; `ReporteMensual` y `DetalleReporte` aparecen como guardados; el segundo tiene `Inasistencia` como clase. | Ver «Comparación con los diagramas del equipo» en [diagrama-de-clases.md](diagrama-de-clases.md). |
| 9 | Arquitectura (Word) | Sigue en la v2: API empresarial, feriados y numeración HU01–HU12. Propone JavaScript con EJS. | [arquitectura.md](arquitectura.md) usa el backlog final y explica la equivalencia con la propuesta (rutas, controladores, servicios, repositorios) y por qué TypeScript sin EJS. |
| 10 | Carátula | Dos versiones con los nombres escritos distinto («Paul Velarde» / «Paul Steffano Velarde chuquimia», «Xander Montes» / «Xander Boris Pinto Montes»). | Unificar los nombres completos en la carátula y en el backlog. |
| 11 | Todos | Faltan las actas de Retro 1 y 2, la evidencia del tablero y la revisión de otro integrante en GitHub. | Lista en [entregas.md](entregas.md). No se inventan. |

## Para la nota individual

La rúbrica pone 12 puntos individuales a Git e IA y 6 a la defensa, y baja el factor de contribución de quien no tenga aportes visibles. Por eso cada integrante tiene que poder explicar su parte del código, revisar el trabajo de otro en GitHub y declarar la IA que usó en [declaracion-uso-de-ia.md](declaracion-uso-de-ia.md).
