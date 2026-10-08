# Sistema de Reservas y Pensionamiento de Almuerzos

Restaurante de la Unión Boliviana. Proyecto final de Ingeniería de Software (Comp. Sist. A).

El restaurante sirve almuerzos de lunes a jueves. Hoy las reservas se coordinan por WhatsApp: no se sabe cuántos almuerzos preparar, las reglas de los pensionados se controlan a mano y el descuento de fin de mes se calcula aparte. Este sistema reserva, pensiona y cancela en un solo lugar, aplica precios y reglas, y deja el reporte listo para descuento por planilla.

## Qué entra y qué no

Entra: ingreso con la base de empleados que ya existe, reserva esporádica (18 Bs), pensión del mes (15 Bs), aviso de inasistencia, feriados, lista del día para la cocina y reporte mensual en Excel y PDF.

No entra: alta de empleados, pagos en línea, menú del día, notificaciones push ni conexión directa con el sistema de planilla. El encargado entrega el archivo.

## Entregables

Todo lo que se sube a Classroom está en [`entregables/`](entregables/).

| Qué | Dónde |
| --- | --- |
| Backlog | [entregables/backlog.md](entregables/backlog.md) |
| Casos de uso | [entregables/casos-de-uso.md](entregables/casos-de-uso.md) |
| Diagrama de clases | [entregables/diagrama-de-clases.md](entregables/diagrama-de-clases.md) |
| Arquitectura | [entregables/arquitectura.md](entregables/arquitectura.md) |
| Sprint 1, cómo demostrarlo | [entregables/sprint-1.md](entregables/sprint-1.md) |
| Definition of Done | [entregables/definition-of-done.md](entregables/definition-of-done.md) |

## Correr el incremento del Sprint 1

Hace falta Node.js. En la carpeta del proyecto:

```bash
npm install
npm run preparar
npm test
npm run dev
```

Abrir http://localhost:3000

Si ese puerto ya está ocupado, usa otro: `$env:PORT=3010; npm run dev` y abre http://localhost:3010.

| Identificador | Quién | Qué puede hacer ahora |
| --- | --- | --- |
| UB-100 | Ana Rojas | Reservar y cancelar |
| UB-101 | Carlos Mamani | Reservar y cancelar |
| UB-102 | Laura Quispe | No ingresa: está inactiva |
| UB-200 | Elena Vargas | Lo de una empleada, más la lista del día |

Si ya pasaron las 9:00, el día de hoy no se puede reservar. La pantalla ofrece el siguiente lunes a jueves. Para ensayar el límite sin esperar al reloj: `RELOJ_FIJO=2026-10-07T08:30 npm run dev`.

El Sprint 1 cubre ingresar, reservar, cancelar y la lista del día. Pensionarse, feriados, inasistencias, reporte y consumo quedan para los sprints 2 y 3. Las reglas ya están en el dominio cuando hacen falta para no aceptar una reserva inválida (feriado o pensionado).

## Ramas

`main` es la rama central. El equipo integra en `desarrollo`. Este incremento está en `feature/sprint-1-incremento`. El acuerdo está en [entregables/flujo-de-trabajo-git.md](entregables/flujo-de-trabajo-git.md).
