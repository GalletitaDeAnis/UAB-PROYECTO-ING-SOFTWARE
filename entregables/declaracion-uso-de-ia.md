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

## Segunda parte: base de datos y API (backlog v2)

Fecha: 21 de octubre de 2026.  
Herramienta: Claude Code (modelo Claude Opus 5.5), usada por el integrante a cargo de API y base de datos.  
Material de partida: los documentos v2 del equipo (backlog, casos de uso y arquitectura) y la rúbrica.

### Qué hizo la asistencia

- Pasó el dominio y los casos de uso a la v2: personas (empleado y familiares), reserva y pensión nominales, tope diario, mínimo de 10 por persona, inasistencias, reporte por titular y consumo (HU01 a HU12).
- Diseñó el esquema de PostgreSQL, la migración con restricciones `CHECK` y RLS para Supabase, y los repositorios Prisma.
- Escribió el cliente HTTP de la API empresarial (timeout de 5 s) y un simulador de esa API con usuarios de prueba.
- Escribió la API GraphQL, la sesión con token y la descarga del reporte en Excel y PDF.
- Escribió las pruebas por criterio, de integración (GraphQL, HTTP y PostgreSQL) y la configuración de cobertura.
- Pasó a Markdown el backlog y los casos de uso del equipo, redibujó los diagramas y escribió la revisión de los documentos.

### Cómo se verificó

- `npm run typecheck` sin errores y `npm test` en verde, con cobertura sobre el 80 %.
- La migración se aplicó con `prisma migrate deploy` sobre un PostgreSQL y se comprobaron las restricciones y el RLS con un rol `anon` igual al de Supabase.
- La API se recorrió por HTTP con los usuarios del simulador.

### Qué falta del integrante

Leer y poder explicar sin el chat: `src/dominio/`, `src/aplicacion/pensionar.ts`, `avisarInasistencia.ts`, `prisma/schema.prisma`, la migración, `resolvers.ts` y `sistemaEmpresarialHttp.ts`. En particular: por qué Supabase no se consume directo, qué hace el RLS, por qué la sesión es un token en la base y no un JWT, y qué se cambia cuando llegue la API real de TI.

## Tercera parte: backlog final y despliegue

Fecha: 27 de octubre de 2026.  
Herramienta: Claude Code (modelo Claude Opus 5.5), usada por el integrante a cargo de API y base de datos.  
Material de partida: el backlog final, los diagramas y la arquitectura del equipo, y la rúbrica.

### Qué hizo la asistencia

- Pasó el dominio, los casos de uso y la base al backlog final: registro de usuarios y familiares por el administrador (HU01), credenciales propias con scrypt y cambio en el primer ingreso (HU02), menú semanal (HU03), gestión y bajas (HU09). Quitó la API empresarial, su simulador y los feriados de la v2.
- Escribió la migración que reemplaza las tablas v2, los repositorios Prisma con transacciones y los datos de demo.
- Escribió las pantallas del administrador y del empleado y amplió la API GraphQL.
- Escribió las pruebas por criterio de las 11 historias, de pantallas, de GraphQL y de infraestructura.
- Preparó el despliegue en Render y redibujó los diagramas de casos de uso, clases y capas a partir de los del equipo.
- Redactó en Markdown el backlog final con la columna de pruebas, los casos de uso, la arquitectura, la base de datos, la API, la Definition of Done, el registro de refactorización, las entregas y la revisión de los documentos.

### Cómo se verificó

- `npm run typecheck` sin errores, `npm test` con 157 pruebas en verde y `npm run test:cobertura` con 98 % de líneas y 90 % de ramas.
- Las pruebas encontraron dos errores en los propios datos de prueba y un defecto en el exportador (registrados en [registro-de-refactorizacion.md](registro-de-refactorizacion.md)); se corrigieron antes de integrar.
- La aplicación se recorrió desplegada con los usuarios de prueba.

### Qué falta del integrante

Leer y poder explicar sin el chat: `src/aplicacion/comun.ts` (`sinPermiso`), `menu.ts` (por qué publicar confirma a los pensionados), `avisarInasistencia.ts` (cómo se calcula el mínimo con menús parciales), `gestionarUsuarios.ts` (qué anula una baja y por qué no se borra nada), `contrasenas.ts` (qué es la sal), la migración `20261027000000_backlog_final` y `web.ts` (cómo se obliga a cambiar la contraseña). Las decisiones D1 a D10 del backlog las tiene que confirmar el equipo con el Product Owner.

Los archivos de la segunda parte que ya no existen (`sistemaEmpresarialHttp.ts`, el simulador) se reemplazaron en este corte.
