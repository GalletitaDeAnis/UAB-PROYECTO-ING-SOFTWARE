# Sistema de Reservas y Pensionamiento de Almuerzos

Restaurante de la Unión Boliviana. Proyecto final de Ingeniería de Software, Comp. Sist. A.

La rama que hay que abrir es **`desarrollo`**. Ahí está el trabajo del equipo. `main` es la rama central y solo recibe un corte cuando el equipo lo acepta.

## Para el docente

El restaurante sirve almuerzos de lunes a jueves solo a funcionarios. Hoy las reservas van por WhatsApp. El sistema reserva, pensiona y cancela, aplica 18 Bs (uso esporádico) o 15 Bs (pensión) y deja el reporte para descuento por planilla. No da de alta empleados, no cobra en línea, no publica el menú, no manda push y no se conecta solo con planilla.

### Dónde está cada criterio

| Criterio de la rúbrica | Dónde mirarlo | En este corte |
| --- | --- | --- |
| Backlog e historias (8) | [entregables/backlog.md](entregables/backlog.md) | Nueve historias INVEST, criterios y sprints. La tabla de Planning Poker está para que el equipo anote el acuerdo. |
| Casos de uso y diagrama de clases (8) | [entregables/casos-de-uso.md](entregables/casos-de-uso.md), [entregables/diagrama-de-clases.md](entregables/diagrama-de-clases.md) y las imágenes en [entregables/diagrams/](entregables/diagrams/) | Listos y alineados con el backlog. |
| Arquitectura y decisiones (8) | [entregables/arquitectura.md](entregables/arquitectura.md) y [entregables/diagrams/arquitectura.png](entregables/diagrams/arquitectura.png) | Capas, DIP, Repository y DI, con dónde no hacen falta. En la rúbrica pesa en el Sprint 2; se escribió antes para construir encima. |
| Producto funcional (12) | La aplicación, más abajo | Sprint 1: ingresar, reservar, cancelar y lista del día. |
| Testing y Definition of Done (10) | `npm test` y [entregables/definition-of-done.md](entregables/definition-of-done.md) | Pruebas de los criterios de HU01 a HU04, con reloj y repositorios en memoria. |
| Calidad y refactorización (6) | `src/` | El código del Sprint 1 está separado en capas. El registro formal de refactorización es del Sprint 3. |
| Entregas por sprint (8) | [entregables/sprint-1.md](entregables/sprint-1.md) | Corte del Sprint 1 en el repositorio. |
| Retros (5) | [entregables/plantilla-retro.md](entregables/plantilla-retro.md) | Plantilla. El acta se llena cuando el equipo se reúne. |
| Git e IA (12) | Historial de la rama `desarrollo` y [entregables/declaracion-uso-de-ia.md](entregables/declaracion-uso-de-ia.md) | La asistencia con Cursor está declarada. |
| Demo Day, defensa y coevaluación | — | Todavía no. Falta el flujo completo. |

### Cómo entrar y qué probar

Hace falta Node.js.

```bash
git clone https://github.com/GalletitaDeAnis/UAB-PROYECTO-ING-SOFTWARE.git
cd UAB-PROYECTO-ING-SOFTWARE
git checkout desarrollo
npm install
npm run preparar
npm test
npm run dev
```

Abrir http://localhost:3000. Si ese puerto está ocupado: `$env:PORT=3010; npm run dev`.

| Identificador | Persona | Qué demuestra |
| --- | --- | --- |
| UB-102 | Laura Quispe, inactiva | No ingresa (HU01). |
| UB-100 | Ana Rojas | Reserva a 18 Bs y cancela (HU02, HU03). |
| UB-101 | Carlos Mamani | Otro empleado, para ver dos nombres en la lista. |
| UB-200 | Elena Vargas, encargada | Lista y total del día (HU04). Un empleado no abre esa pantalla. |

Recorrido corto:

1. Entrar como UB-102: el sistema niega el acceso.
2. Entrar como UB-100 y reservar el día que ofrece la pantalla. Queda confirmado a 18 Bs.
3. Reservar el mismo día otra vez: no se duplica.
4. Cancelar: deja de estar confirmado.
5. Salir, entrar como UB-200 y abrir la lista de ese día.

Si ya pasaron las 9:00, hoy no se puede reservar: el límite es las 9:00 del día del almuerzo, hora de Bolivia. La pantalla ofrece el siguiente lunes a jueves. Para fijar el reloj sin esperar: `RELOJ_FIJO=2026-10-07T08:30 npm run dev`.

### Cómo está organizado el código

```text
entregables/          lo que se lee para calificar
src/dominio/          reglas (hora límite, lunes a jueves, 18 Bs). No importa Prisma.
src/aplicacion/       un caso de uso por historia del Sprint 1
src/infraestructura/  Prisma, reloj real y servidor Express
src/presentacion/     las pantallas
tests/                pruebas por criterio, sin base de datos
```

La pantalla no decide el precio ni si son las 9:00. Llama al caso de uso y muestra el mensaje.

### Qué no está en este corte

Pensionarse, registrar feriados en pantalla, avisar inasistencia, el reporte Excel/PDF y «mi consumo» son los sprints 2 y 3. El dominio ya rechaza una reserva en feriado o de alguien pensionado, para no guardar un almuerzo inválido, pero esas pantallas no existen todavía.

## Para el equipo

Cada integrante necesita una invitación de colaborador. El dueño del repositorio entra a Settings, Collaborators, Add people, y pone el usuario de GitHub (el de `github.com/usuario`, no el correo ni el nombre). El rol es Write. La otra persona acepta el correo de GitHub.

Después:

```bash
git clone https://github.com/GalletitaDeAnis/UAB-PROYECTO-ING-SOFTWARE.git
cd UAB-PROYECTO-ING-SOFTWARE
git checkout desarrollo
npm install
npm run preparar
npm run dev
```

El trabajo nuevo sale de `desarrollo` en una rama `feature/HU0X-nombre` y vuelve por pull request. El detalle está en [entregables/flujo-de-trabajo-git.md](entregables/flujo-de-trabajo-git.md).

## Producto

El restaurante no es obligatorio ni gratuito. Uso esporádico: 18 Bs, un almuerzo por día, de lunes a jueves, hasta las 9:00. Pensión: 15 Bs, se pide para el mes siguiente y el sistema confirma los días de servicio. El pensionado solo avisa las inasistencias y no puede bajar de 10. Quien no cancela a tiempo se descuenta igual. El feriado no se cobra. El pago es por planilla, con el archivo que exporta el encargado.

No entra: alta de empleados, pago en línea, menú del día, notificaciones push ni conexión directa con planilla.
