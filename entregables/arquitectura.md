# Arquitectura y decisiones de diseño

El sistema es un solo producto, con cuatro capas. No hace falta partirlo en servicios separados: hay un restaurante, una institución y menos de treinta puntos de historia. Un monolito con las dependencias en orden se puede explicar en la defensa y se puede probar con dobles de prueba. Microservicios, colas o un API de planilla no aportan a las nueve historias y sí mezclarían el trabajo de los sprints.

![Capas y dirección de las dependencias](diagrams/arquitectura.png)

Fuente editable: [diagrams/arquitectura.puml](diagrams/arquitectura.puml).

## Capas

| Capa | Responsabilidad | Qué no hace |
| --- | --- | --- |
| Presentación | Pantallas del empleado y del encargado. Muestra datos y envía la acción. | No decide si son las 9:00, no calcula 15 × 12 y no abre la base. |
| Aplicación | Un servicio por caso de uso: ordena los pasos y abre la transacción. | No contiene las reglas. Si en `ReservarAlmuerzo` aparece `hora >= 9`, la regla se filtró a la capa equivocada. |
| Dominio | Entidades, invariantes y reglas R1–R8. También los puertos (interfaces) que el dominio necesita del mundo exterior. | No importa framework web, SQL, Excel ni la hora del sistema operativo. |
| Infraestructura | Implementa los puertos: tablas, directorio de empleados, reloj, Excel y PDF. El arranque cablea las clases concretas. | No decide el mínimo de 10 ni el precio. |

La flecha del diagrama es «esta capa conoce a esta otra». La presentación conoce la aplicación. La aplicación conoce el dominio. La infraestructura conoce los puertos del dominio para implementarlos. El dominio no tiene ninguna flecha hacia afuera.

## Decisión 1 — Las dependencias apuntan hacia el dominio (DIP)

El principio de inversión de dependencias pide que el código que tiene la política no dependa del código que tiene el detalle. Aquí la política son las reglas del almuerzo. El detalle es SQLite, el archivo Excel o el reloj de Windows.

Por eso las interfaces viven junto al dominio y a la aplicación. Un ejemplo, el puerto del reloj:

- El dominio define «necesito la hora actual en America/La_Paz».
- La infraestructura tiene la clase que lee el reloj real.
- Las pruebas tienen otra clase que devuelve el 7 de octubre de 2026 a las 8:59.

`ReservarAlmuerzo` recibe ese puerto. No importa cuál de las dos clases llegó. Eso es la inversión: el caso de uso no depende de la infraestructura; la infraestructura depende del caso de uso.

Lo mismo para guardar almuerzos, leer empleados y escribir el archivo del reporte.

Dónde no se invierte nada, porque no hay un detalle que cambiar:

- La tarifa de 18 Bs y 15 Bs es una regla, no un servicio. Es una función del dominio. Inventar una interfaz `ITarifa` con una sola implementación no aporta y obliga a mockear la regla en las pruebas. La rúbrica pide mocks útiles, no un mock por clase.
- El mínimo de 10 es la misma situación: una regla pura. Se prueba llamándola, no reemplazándola.
- Armar un `Almuerzo` nuevo lo hace el dominio con un constructor. Una entidad no se inyecta.

## Decisión 2 — Repository solo en los agregados que se guardan

Un repositorio es la colección en memoria de un agregado: lo busca y lo guarda, y esconde la tabla. Hay uno por cada cosa que este sistema persiste y vuelve a buscar sola.

| Puerto | Lo usa | Por qué es un repositorio |
| --- | --- | --- |
| Almuerzos | HU02, HU03, HU04, HU06, HU07, HU08, HU09 | El almuerzo se busca por persona y fecha, y por la lista del día. |
| Pensiones | HU06, HU07, HU02 | Hace falta saber si esa persona ya tiene pensión en ese mes. |
| Feriados | HU05, HU02, HU06 | El calendario de servicio pregunta por una fecha. |
| Autorizaciones | HU01 | El rol de encargado no viene en la base de la institución. |

Operaciones previstas, para no dejar el puerto en el aire:

- Almuerzos: obtener por empleado y fecha; guardar; listar por fecha; listar por empleado y mes.
- Pensiones: obtener por empleado, año y mes; guardar.
- Feriados: guardar; saber si una fecha es feriada; listar un mes.
- Autorizaciones: obtener por empleado; guardar.

Dónde no hay repositorio:

| Cosa | Por qué no |
| --- | --- |
| LineaDescuento y el reporte | Se calculan al vuelo desde los almuerzos. Si se guardaran, un feriado cargado tarde dejaría un reporte viejo contradiciendo la base. |
| Tarifa 15 / 18 | Es regla fija de R2 y R3, no una fila que el usuario administra. El día que el precio cambie por configuración, ahí sí aparecería un puerto. Hoy sería una tabla de más. |
| Hora límite y mínimo de 10 | No se leen de la base. |
| Empleado como alta | No es nuestro agregado. No existe `guardarEmpleado`. Leer personas es otro puerto, el del directorio, porque la fuente es de la institución y no una tabla nuestra. |

El directorio de empleados es un adaptador, no el repositorio de `Empleado`. El puerto es `buscar(codigo)` y devuelve la persona o nada. La primera implementación es una tabla de prueba, porque el equipo no tiene la base real de la Unión Boliviana. Cuando esa base exista, se cambia el adaptador y no los casos de uso. Eso evita el alta de empleados dentro del producto, que está fuera de alcance.

## Decisión 3 — Inyección de dependencias donde hay más de una implementación

La inyección usada aquí es por constructor: el caso de uso recibe sus puertos al crearse y no los busca con un `new` de la clase concreta ni con un singleton global.

El único lugar que conoce las clases concretas es la composición, en la infraestructura, al arrancar el programa. En las pruebas, ese lugar es el propio test: pasa repositorios en memoria, un reloj fijo y, si hace falta, un exportador que no escribe disco.

| Se inyecta | Motivo |
| --- | --- |
| Repositorios | En producción hablan con SQLite. En la prueba son memoria. |
| Directorio de empleados | En producción será la base institucional. Ahora es el simulador. |
| Reloj | Las pruebas de las 8:59 y de las 9:00 no pueden depender de la hora en que corre el test. |
| Exportador de reporte | Excel y PDF son dos implementaciones del mismo puerto. El cálculo no sabe cuál se eligió. |

Dónde no se inyecta:

- Las reglas de hora, calendario y mínimo de 10. Tienen una sola forma correcta. Inyectarlas permitiría que un test reemplace la regla y termine probando el reemplazo.
- Las entidades. Se construyen dentro del caso de uso.
- Las pantallas no reciben repositorios. Reciben los servicios de aplicación. Si una pantalla abre SQLite, la separación de capas ya no existe.

## Decisión 4 — Reloj y zona horaria

Todas las comparaciones con las 9:00 usan el puerto del reloj en `America/La_Paz` (UTC−4, sin horario de verano). Guardar la hora del servidor sin zona mezclaría un despliegue en otro país con la regla del restaurante. El criterio «8:59 acepta, 9:00 rechaza» se prueba fijando ese reloj, no durmiendo el test hasta las nueve.

## Decisión 5 — Dos exportadores, un cálculo

`GenerarReporte` arma la lista de `LineaDescuento` en el dominio. Después llama al puerto de exportación. `ExportadorExcel` y `ExportadorPdf` implementan ese puerto. La condición del `extend` del caso de uso (el encargado eligió el formato) se resuelve en la aplicación al elegir la implementación. No hay un `if` de formato dentro del cálculo de los 15 Bs y los 18 Bs.

No se inyectan los dos a la vez dentro del cálculo. La composición entrega el que corresponde a la elección.

## Decisión 6 — Qué no se hace, y por qué

| Alternativa | Por qué no |
| --- | --- |
| Lógica de negocio en la pantalla o en el SQL | La rúbrica lo marca como insuficiente: la regla quedaría mezclada con la interfaz o con los datos, y no se podría probar sin la base. |
| Un repositorio por cada clase, incluidas las enumeraciones y la línea de descuento | El patrón dejaría de señalar qué se persiste. |
| Microservicios (uno de reservas, uno de pensión, uno de reporte) | Partirían historias que ya son pequeñas y obligarían a integrar red antes de tener un incremento demostrable. |
| Conexión directa con planilla | Está fuera de alcance. El puerto de exportación produce el archivo; una persona lo entrega. |
| Tabla de empleados propia con alta y baja | Contradice R1b. El puerto de directorio lee; no administra el personal. |

## Del caso de uso a las capas

Ejemplo con reservar, que es el que más reglas junta en el Sprint 1:

1. La pantalla envía identificador del empleado y fecha. No envía el precio. El precio lo pone el dominio.
2. `ReservarAlmuerzo` pide la hora al reloj, la persona al directorio, la pensión del mes y el almuerzo de esa fecha.
3. El dominio responde si el día es de servicio, si la hora sigue abierta, si no es pensionado y si no hay otro almuerzo.
4. Si todo pasa, se guarda un `Almuerzo` esporádico a 18 Bs confirmado.
5. Si algo no pasa, no se escribe. El mensaje lo arma la aplicación a partir del resultado, y la pantalla solo lo muestra.

Pensionarse recorre el mismo camino: la aplicación pide los feriados del mes, el dominio calcula los días de servicio y rechaza si son menos de 10, y los repositorios guardan la pensión y los almuerzos. La pantalla no recorre el calendario.

## Estructura del código

El incremento del Sprint 1 ya está separado así. El dominio no importa Prisma ni Express.

```text
src/presentacion
src/aplicacion
src/dominio
src/infraestructura
tests
```

Una prueba de HU02 no levanta el servidor web ni abre un archivo Excel. Arma `ReservarAlmuerzo` con repositorios en memoria y un reloj en 8:30, ejecuta, y mira el almuerzo guardado. Otra prueba pone el reloj en las 9:00 y comprueba que no se guardó nada. Esos dos casos salen directo de los criterios 1 y 2 de HU02.

## Stack

La rúbrica evalúa la práctica, no la herramienta. El equipo usa Node.js con TypeScript y Prisma, que es el entorno con el que se puede explicar el proyecto en la defensa. Las cuatro capas no cambian si más adelante se cambia de lenguaje.

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Lenguaje | TypeScript sobre Node.js | El dominio y los casos de uso se leen junto al diagrama de clases. |
| Interfaz | Express, páginas HTML del propio sistema | La pantalla llama casos de uso. No hay un framework que esconda la composición. |
| Persistencia | Prisma con SQLite | Un archivo `prisma/dev.db`. El Demo Day no necesita un servidor de base aparte. Prisma es el detalle: el dominio no lo importa. |
| Pruebas | Vitest, con reloj y repositorios en memoria | Los criterios de HU01 a HU04 no abren la base ni el servidor. |
| Excel y PDF | Quedan para HU08 | Dos implementaciones del puerto de exportación. Todavía no se escriben: el Sprint 1 no genera el reporte. |

## Qué tiene que poder explicar cada integrante

- Por qué la pantalla no calcula el monto.
- Por qué `LineaDescuento` no es una tabla.
- Por qué hay repositorio de almuerzos y no hay repositorio de tarifas.
- Por qué el reloj es un puerto.
- Por qué Excel y PDF no están dentro de la regla de los 15 Bs y los 18 Bs.
