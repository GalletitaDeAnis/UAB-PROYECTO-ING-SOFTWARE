# Flujo de trabajo en Git

La rúbrica de Git pide ramas por historia, commits pequeños y un pull request revisado por otro integrante. Este acuerdo deja una rama compartida para el equipo y reserva `main` para lo que ya se aceptó.

## Ramas

| Rama | Para qué | Quién escribe |
| --- | --- | --- |
| `main` | Rama central. Es la que se muestra en el Demo Day. | Nadie hace push directo. Entra solo al aceptar un pull request. |
| `desarrollo` | Integración del equipo. Aquí se junta lo que ya está revisado entre integrantes. | Se actualiza por pull request de una rama de historia. |
| `feature/HU0X-nombre` | Una historia o un documento concreto. | Quien toma esa historia. |

Ejemplos de rama de historia: `feature/HU02-reservar-almuerzo`, `feature/HU08-reporte-mensual`.

## Cómo subir un cambio

1. Partir de `desarrollo` actualizada.
2. Crear la rama de la historia.
3. Hacer commits pequeños. El mensaje dice por qué cambió, no solo qué archivo se tocó.
4. Abrir un pull request hacia `desarrollo`.
5. Otro integrante lo lee, lo prueba si hay código y deja la revisión en el PR.
6. Se integra a `desarrollo`.
7. Cuando el equipo da por bueno un corte (sprint o documento), se abre un pull request de `desarrollo` hacia `main` y recién ahí pasa a la rama central.

## Qué no hacer

- No commitear directo a `main`.
- No mezclar en un solo commit el backlog, el código del sprint y un arreglo suelto.
- No subir secretos (contraseñas, tokens, `.env`).

## Este corte

Los documentos de backlog, casos de uso, clases y arquitectura se revisan en el pull request hacia `main`. Si el equipo los acepta, se integran a la rama central. Si algo no cierra (una regla, un actor, una estimación), se corrige en la rama de trabajo antes de aceptarlo.
