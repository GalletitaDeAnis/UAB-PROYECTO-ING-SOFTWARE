# Sprint 1

> Este corte se entregó con el ingreso por identificador (backlog v1) y SQLite. Desde el backlog v2 el ingreso usa usuario y contraseña del sistema empresarial y la base es PostgreSQL: los pasos actuales están en el [README](../README.md).

Objetivo: un empleado reserva y cancela, y el encargado ve cuántas reservas esporádicas hay en el día.

## Qué se entrega

| Artefacto | Dónde |
| --- | --- |
| Historias, criterios y estimación | [backlog.md](backlog.md), historias HU01 a HU04 |
| Casos de uso | [casos-de-uso.md](casos-de-uso.md) y [diagrams/casos-de-uso.png](diagrams/casos-de-uso.png) |
| Diagrama de clases | [diagrama-de-clases.md](diagrama-de-clases.md) y [diagrams/clases.png](diagrams/clases.png) |
| Incremento funcional | Pantallas de ingreso, reserva, cancelación y lista del día |
| Pruebas por criterio | `tests/hu01.iniciarSesion.test.ts` a `tests/hu04.lista.test.ts` |
| Definition of Done | [definition-of-done.md](definition-of-done.md) |

La arquitectura por capas ya está escrita en [arquitectura.md](arquitectura.md). En la rúbrica ese documento pesa en el Sprint 2; se adelantó porque el incremento se construyó sobre esas decisiones.

## Cómo demostrarlo

```bash
npm install
npm run preparar
npm test
npm run dev
```

http://localhost:3000

1. Entrar como UB-102: no abre sesión.
2. Entrar como UB-100. Reservar el día que ofrece la pantalla. Aparece a 18 Bs, confirmado.
3. Intentar el mismo día otra vez: no se duplica.
4. Cancelar antes de las 9:00 de ese día: deja de estar confirmado.
5. Salir y entrar como UB-200. Abrir la lista de ese día: se ve el nombre y el total. Si Ana ya canceló, no suma.

## Qué falta para cerrar el sprint

El acta de la Retro 1. La plantilla está en [plantilla-retro.md](plantilla-retro.md). Se llena cuando el equipo se reúne; no se inventan hallazgos.
