# Declaración de uso de IA

Fecha: 7 de octubre de 2026.  
Herramienta: Cursor, como asistencia de redacción y de diagramas UML.  
Material de partida: el documento del equipo «mejorado RUMBO AL CIELO» y la rúbrica del proyecto final.

## Qué hizo la asistencia

- Ordenó el backlog que el equipo ya tenía y corrigió historias que no se podían terminar en el sprint donde estaban.
- Redactó los casos de uso y los diagramas de casos de uso, clases y capas.
- Propuso las decisiones de capas, DIP, Repository e inyección de dependencias.
- Escribió el incremento del Sprint 1 en TypeScript: casos de uso HU01 a HU04, pruebas con repositorios en memoria, Prisma para SQLite y las pantallas de ingreso, reserva, cancelación y lista del día.

## Qué tiene que hacer el equipo

La rúbrica deja en Insuficiente el criterio de Git e IA si el texto o el código no se declaró, o si el integrante no puede explicarlo. Cada persona del equipo tiene que poder explicar, sin leer el chat:

- las nueve historias y por qué ese orden de sprints;
- por qué el pensionado no reserva día por día;
- la diferencia entre `include` y `extend` en el diagrama;
- por qué no hay una clase que guarde el reporte mensual;
- por qué el dominio no importa Prisma;
- qué hace `ReservarAlmuerzo` cuando son las 9:00, cuando el día es viernes y cuando la persona ya tiene reserva.

Si una regla, un actor o una estimación no les convence, se cambia en el pull request. Lo que quede en `main` es la versión del equipo, no un borrador sin revisar.

## Qué no generó la IA

No hay todavía pensión, feriados en pantalla, reporte, consumo del mes ni actas de retrospectiva. Esos artefactos se declaran de nuevo cuando existan.
