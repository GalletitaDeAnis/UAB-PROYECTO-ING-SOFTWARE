# Entregas por sprint y guion del Demo Day

La rúbrica pide tres entregas (sesiones 6, 10 y 13) y el Demo Day (sesiones 14 y 15). El backlog final tiene cuatro sprints; el cuarto termina antes de la sesión 13, así que la tercera entrega incluye los sprints 3 y 4. Cómo repartirlo lo decide el equipo en el Planning; esta es la propuesta que coincide con el código actual.

## Calendario

| Entrega | Fecha | Sprints | Qué se entrega | Dónde está |
| --- | --- | --- | --- | --- |
| Sprint 1 | Sesión 6 | 1 (HU01–HU03) | Historias con criterios y estimación; casos de uso y diagrama de clases; incremento con pruebas por criterio; acta de Retro 1 | [backlog.md](backlog.md), [casos-de-uso.md](casos-de-uso.md), [diagrama-de-clases.md](diagrama-de-clases.md), `tests/hu01…hu03`, [plantilla-retro.md](plantilla-retro.md) |
| Sprint 2 | Sesión 10 | 2 (HU04–HU06) | Backlog adaptado con la evidencia de la Retro 1; arquitectura con la decisión sobre Repository y DI; incremento con pruebas unitarias y mocks; acta de Retro 2 | [arquitectura.md](arquitectura.md), [base-de-datos.md](base-de-datos.md), `tests/fakes.ts`, `tests/hu04…hu06` |
| Sprint 3 | Sesión 13 | 3 y 4 (HU07–HU11) | Refactorización con regresión y cobertura; declaración de IA; versión final congelada con README | [registro-de-refactorizacion.md](registro-de-refactorizacion.md), `npm run test:cobertura`, [declaracion-uso-de-ia.md](declaracion-uso-de-ia.md), [README](../README.md) |
| Demo Day | Sesiones 14 y 15 | — | Demo en vivo, proceso, defensa individual, repositorio final, coevaluación | Guion de abajo; https://almuerzos-union-boliviana.onrender.com |

## Lo que solo puede aportar el equipo

Estos artefactos dependen de reuniones reales. No se completan en el repositorio sin que hayan pasado:

- [ ] Foto y acta del **Planning Poker** (votos de cada integrante por historia): plantilla en [acta-planning-poker.md](acta-planning-poker.md).
- [ ] **Actas de Retro 1 y Retro 2** con un hallazgo medible, un acuerdo y el cambio que produjo en el backlog ([plantilla-retro.md](plantilla-retro.md)).
- [ ] **Tablero** (Trello u otro) con las historias por sprint.
- [ ] **Revisión de otro integrante** del corte del backlog final en GitHub (Definition of Done, punto 8).
- [ ] Que cada integrante pueda **explicar su parte del código** (defensa individual) y la declaración de IA.

## Guion del Demo Day (unos 12 minutos)

Abrir la aplicación unos minutos antes: en el plan gratis de Render tarda unos 50 s en despertar. Contraseña de todos los usuarios de prueba: `Demo2026`.

| Min | Quién | Qué se muestra | Historia |
| --- | --- | --- | --- |
| 0–1 | — | El problema: reservas por WhatsApp, cuántos almuerzos preparar, cobro por planilla. | — |
| 1–3 | `evargas` (administradora) | Usuarios: ficha de Pedro con su grupo familiar y tope 5. Registrar un usuario nuevo con un hijo; mostrar que un CI repetido se rechaza. | HU01, HU09 |
| 3–4 | `evargas` | Menú semanal: publicar la semana siguiente dejando un día vacío → «Sin atención». Intentar publicarla otra vez → no se modifica. | HU03 |
| 4–5 | `nuevo` | Ingresa y el sistema lo obliga a cambiar la contraseña. | HU02 CA6 |
| 5–7 | `arojas` | Reservar para ella y su hijo; cancelar la del hijo. Mostrar el rechazo en un día sin menú. | HU04, HU05 |
| 7–9 | `pflores` (pensionado) | Avisar que su cónyuge no asistirá; ver que bajan los programados. Pensionar a un hijo para el mes siguiente. Mi consumo con el total y las inasistencias disponibles. | HU07, HU08, HU11 |
| 9–10 | `evargas` | Almuerzos del día (total, tipo, titular, modalidad). Reporte del mes y descarga en Excel y PDF. | HU06, HU10 |
| 10–12 | Equipo | Decisiones técnicas: capas y DIP (diagrama), pruebas por criterio (`npm test`), despliegue. Aprendizajes y qué cambió entre la v2 y el backlog final. | — |

Si algo falla en vivo, la misma demo se puede correr en local con `npm run dev` y `RELOJ_FIJO` para mostrar la regla de las 9:00 a cualquier hora.
