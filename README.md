# Sistema de Reservas y Pensionamiento de Almuerzos

Restaurante de la Unión Boliviana. Proyecto final de Ingeniería de Software (Comp. Sist. A).

El restaurante sirve almuerzos de lunes a jueves. Hoy las reservas se coordinan por WhatsApp: no se sabe cuántos almuerzos preparar, las reglas de los pensionados se controlan a mano y el descuento de fin de mes se calcula aparte. Este sistema reserva, pensiona y cancela en un solo lugar, aplica precios y reglas, y deja el reporte listo para descuento por planilla.

## Qué entra y qué no

Entra: ingreso con la base de empleados que ya existe, reserva esporádica (18 Bs), pensión del mes (15 Bs), aviso de inasistencia, feriados, lista del día para la cocina y reporte mensual en Excel y PDF.

No entra: alta de empleados, pagos en línea, menú del día, notificaciones push ni conexión directa con el sistema de planilla. El encargado entrega el archivo.

## Evidencia para la rúbrica

| Entrega | Dónde está |
| --- | --- |
| Backlog, historias INVEST, criterios y estimación | [docs/backlog.md](docs/backlog.md) |
| Casos de uso y diagrama | [docs/casos-de-uso.md](docs/casos-de-uso.md) |
| Diagrama de clases | [docs/diagrama-de-clases.md](docs/diagrama-de-clases.md) |
| Capas, DIP, Repository y DI | [docs/arquitectura.md](docs/arquitectura.md) |
| Cómo se integra el trabajo del equipo | [docs/flujo-de-trabajo-git.md](docs/flujo-de-trabajo-git.md) |
| Uso de IA | [docs/declaracion-uso-de-ia.md](docs/declaracion-uso-de-ia.md) |

Los diagramas fuente están en [`diagrams/`](diagrams/) (PlantUML). Las imágenes PNG y SVG salen de esos archivos.

## Rama de trabajo

`main` es la rama central y solo recibe trabajo ya revisado. El equipo integra en `desarrollo`. El detalle está en [docs/flujo-de-trabajo-git.md](docs/flujo-de-trabajo-git.md).

## Todavía no está en este corte

Para cerrar el Sprint 1, además de estos documentos, hacen falta el primer incremento funcional (HU01–HU04) con pruebas por criterio y el acta de la Retro 1. El producto se construye en el siguiente corte, sobre las decisiones de [docs/arquitectura.md](docs/arquitectura.md).
