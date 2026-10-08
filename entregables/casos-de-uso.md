# Casos de uso

Cada caso de uso de este documento es el objetivo de un actor y corresponde a una historia del [backlog](backlog.md). Los óvalos pequeños del diagrama no son historias: son comportamiento que siempre ocurre (`include`) o que solo ocurre si el actor elige un formato (`extend`).

![Diagrama de casos de uso](diagrams/casos-de-uso.png)

Fuente: [diagrams/casos-de-uso.puml](diagrams/casos-de-uso.puml). La figura que se entrega es el PNG: PlantUML cruza las flechas y el `extend` parece llegar a otro caso.

## Qué se corrigió del diagrama anterior

El diagrama que circuló en el grupo describe el mismo restaurante, pero no se puede entregar así junto con el backlog:

| En el diagrama anterior | Problema | Cómo quedó |
| --- | --- | --- |
| «Gestionar menú del día» y «Notificar a usuarios (push)» | El alcance dice que el menú y las notificaciones push no entran. | No están. |
| Flecha hacia «Sistema de RRHH (Planilla)» | El sistema no se conecta con planilla. El encargado descarga Excel o PDF y lo entrega. | No hay actor de planilla. El reporte termina en el encargado. |
| «Rechazar si no cumple reglas» como `extend` | Rechazar es un flujo alternativo, no un caso opcional. `extend` no significa «si sale mal». | El rechazo quedó escrito dentro de UC07. |
| «Excluir inasistencias» como `extend` de la lista del día | Quitar al que avisó no es opcional: la lista siempre lo hace. | Es el paso normal de UC04. El aviso en sí es UC07. |
| «Ver mis reservas y consumo del mes» en un solo óvalo | Mezcla el ingreso (HU01) con el consumo del mes (HU09). | UC01 muestra el nombre y sus almuerzos al entrar. UC09 es el consumo y el monto. |
| «Validar hora límite» solo en reservar y cancelar | El pensionado también tiene límite a las 9:00 para avisar. | El mismo `include` lo usan UC02, UC03 y UC07. |

## Actores

| Actor | Quién es | Qué busca |
| --- | --- | --- |
| Empleado | Rol general. Toda persona que come, pensionada o no, lo es. | Ingresar, ver su consumo y pedir la pensión del mes siguiente. |
| Empleado no pensionado | Especialización. En ese mes no tiene pensión activa. | Reservar y cancelar a 18 Bs. |
| Empleado pensionado | Especialización. En ese mes tiene pensión activa. | Avisar inasistencias. No reserva día por día. |
| Encargado del restaurante | Otro rol, aunque sea la misma persona física que también come. | Ver la lista del día, cargar feriados y exportar el reporte. |
| Base de empleados de la institución | Actor secundario. No inicia ningún caso. | Responde si el identificador existe y está activo. |

La generalización importa: reservar y cancelar salen solo del no pensionado. Avisar inasistencia sale solo del pensionado. Ingresar, ver el consumo y solicitar la pensión salen del empleado general, así que ambos las heredan. Una misma persona cambia de actor según el mes: en septiembre puede ser no pensionada y en octubre pensionada.

El encargado no hereda del empleado. Sus objetivos son los de la cocina y la planilla. Si además almuerza, usa el sistema una segunda vez con el actor empleado.

## Include y extend

`include` es una flecha del caso base al caso incluido, con línea discontinua. El incluido se ejecuta siempre.

`extend` es una flecha del caso que extiende hacia el caso base. Solo corre si se cumple una condición. Aquí la condición es que el encargado eligió ese formato.

No se usó `extend` para errores, rechazos ni reglas. Eso va en los flujos alternativos.

## Trazabilidad

| Caso | Historia | Actor principal |
| --- | --- | --- |
| UC01 Ingresar al sistema | HU01 | Empleado y encargado |
| UC02 Reservar almuerzo | HU02 | Empleado no pensionado |
| UC03 Cancelar reserva | HU03 | Empleado no pensionado |
| UC04 Ver almuerzos confirmados del día | HU04, y se amplía con HU06 y HU07 | Encargado |
| UC05 Registrar feriados del mes | HU05 | Encargado |
| UC06 Solicitar pensionamiento | HU06 | Empleado |
| UC07 Avisar inasistencia | HU07 | Empleado pensionado |
| UC08 Generar reporte mensual | HU08 | Encargado |
| UC09 Ver mi consumo del mes | HU09 | Empleado |

## Especificación

### UC01 Ingresar al sistema

- Historia: HU01.
- Actores: empleado o encargado. Actor secundario: base de empleados, a través del include.
- Precondición: ninguna.
- Disparador: la persona pide ingresar.
- Flujo principal:
  1. La persona indica su identificador institucional.
  2. Include «Validar empleado en base de datos».
  3. El sistema muestra su nombre y sus almuerzos.
  4. Si en este sistema tiene rol de encargado, también muestra la lista del día, los feriados y el reporte.
- Flujos alternativos:
  - 2a. El identificador no existe o el empleado está inactivo. El sistema no abre la sesión y no muestra datos de otra persona.
- Postcondición: hay una sesión de esa persona, o no hay sesión.
- Reglas: R1b.

### Include — Validar empleado en base de datos

Lo incluye UC01, siempre. El sistema pregunta a la base institucional si ese identificador existe y está activo. No crea empleados y no guarda la contraseña. En el proyecto, la base real se sustituye por datos de prueba detrás del mismo puerto (ver arquitectura).

### UC02 Reservar almuerzo

- Historia: HU02.
- Actor: empleado no pensionado.
- Precondición: UC01. No tiene pensión activa en el mes de la fecha elegida.
- Disparador: confirma una fecha.
- Flujo principal:
  1. Indica la fecha del almuerzo.
  2. Include «Verificar día de servicio».
  3. Include «Validar hora límite».
  4. El sistema comprueba que esa persona no tenga ya un almuerzo en esa fecha.
  5. Registra el almuerzo como esporádico, a 18 Bs, confirmado.
- Flujos alternativos:
  - 2a. La fecha es viernes, sábado, domingo, feriado o ya pasó. No registra nada.
  - 3a. Ya son las 9:00 o más del día del almuerzo. No registra nada.
  - 4a. Ya existe un almuerzo ese día. No duplica.
  - 5a. La persona es pensionada de ese mes. No crea una reserva esporádica encima.
- Postcondición: queda un almuerzo confirmado a 18 Bs, o el estado anterior no cambia.
- Reglas: R2, R2b, R7b.

### UC03 Cancelar reserva

- Historia: HU03.
- Actor: empleado no pensionado.
- Precondición: UC01 y existe una reserva esporádica confirmada en esa fecha.
- Disparador: pide cancelar esa reserva.
- Flujo principal:
  1. Elige la reserva.
  2. Include «Validar hora límite».
  3. El sistema marca ese almuerzo como cancelado.
- Flujo alternativo:
  - 2a. Ya son las 9:00 o más del día del almuerzo. Sigue confirmado y se cobrará.
- Postcondición: el día no entra al reporte, o sigue confirmado.
- Reglas: R2b, R7.

### Include — Validar hora límite

Lo incluyen UC02, UC03 y UC07, siempre. Compara el momento actual con las 9:00 del día en que se sirve ese almuerzo, en America/La_Paz. Si la fecha del almuerzo es futura, el límite de ese día todavía no llegó. A las 9:00 en punto ya no se acepta el cambio.

### Include — Verificar día de servicio

Lo incluye UC02, siempre. El día sirve solo si es lunes, martes, miércoles o jueves, no es feriado y no es una fecha pasada.

### UC04 Ver almuerzos confirmados del día

- Historia: HU04 en el Sprint 1. HU06 y HU07 amplían quién aparece.
- Actor: encargado.
- Precondición: UC01 con rol de encargado.
- Disparador: abre la lista de una fecha de servicio.
- Flujo principal:
  1. El sistema toma los almuerzos confirmados de esa fecha.
  2. Muestra nombre, tipo (pensionado o no pensionado) y el total.
  3. No muestra cancelados ni inasistencias avisadas.
- Postcondición: no cambia datos. Es una consulta.
- Reglas: R4, R7. No se confunde la lista con un pase de lista del comedor.

### UC05 Registrar feriados del mes

- Historia: HU05.
- Actor: encargado.
- Precondición: UC01 con rol de encargado.
- Disparador: indica una fecha y una descripción.
- Flujo principal:
  1. Indica el día de lunes a jueves.
  2. Include «Bloquear reservas y confirmaciones».
  3. El sistema guarda el feriado.
- Flujo alternativo:
  - 1a. La fecha es viernes, sábado o domingo. No se guarda.
- Postcondición: ese día no admite reserva ni confirmación de pensión, y no se cobra.
- Reglas: R7b.

### Include — Bloquear reservas y confirmaciones

Lo incluye UC05, siempre. A partir del registro, no se puede reservar ese día. Si un pensionado ya lo tenía confirmado, ese almuerzo deja de contar y deja de cobrarse.

### UC06 Solicitar pensionamiento

- Historia: HU06.
- Actor: empleado (todavía no pensionado de ese mes).
- Precondición: UC01. Los feriados conocidos del mes siguiente ya se pueden consultar (HU05).
- Disparador: pide la pensión del mes siguiente.
- Flujo principal:
  1. El sistema comprueba que está pidiendo el mes siguiente y que ese mes todavía no empezó.
  2. Calcula los días de servicio: lunes a jueves, sin feriados.
  3. Comprueba que esos días son al menos 10.
  4. Include «Registrar almuerzos del mes».
  5. La persona queda pensionada de ese mes.
- Flujos alternativos:
  - 1a. Pide el mes en curso, un mes ya empezado u otro mes que no sea el siguiente. No se crea la pensión.
  - 3a. Hay menos de 10 días de servicio. No se crea la pensión.
  - 5a. Ya tenía pensión de ese mes. No se duplica.
- Postcondición: existe una pensión y un almuerzo confirmado a 15 Bs por cada día de servicio, o no se creó nada.
- Reglas: R3, R4, R5, R7b.

### Include — Registrar almuerzos del mes

Lo incluye UC06, siempre. Crea un almuerzo de origen pensión, a 15 Bs, confirmado, en cada día de servicio del mes. No crea filas en feriados ni en viernes, sábado o domingo.

### UC07 Avisar inasistencia

- Historia: HU07.
- Actor: empleado pensionado.
- Precondición: UC01 y tiene un almuerzo de pensión confirmado en esa fecha.
- Disparador: avisa que no asistirá.
- Flujo principal:
  1. Elige el día.
  2. Include «Validar hora límite».
  3. Include «Validar mínimo de 10 almuerzos».
  4. El sistema marca ese almuerzo como inasistencia avisada.
  5. Deja de mostrarse en la lista del día y deja de sumar al descuento.
- Flujos alternativos:
  - 2a. Ya son las 9:00 o más de ese día. El almuerzo sigue confirmado y se cobra.
  - 3a. Si se avisara, quedarían menos de 10 confirmados en el mes. El sistema no deja avisar y explica que ese almuerzo se cobra aunque no asista.
- Postcondición: el día no se cobra, o sigue confirmado.
- Reglas: R5, R6, R7.

### Include — Validar mínimo de 10 almuerzos

Lo incluye UC07, siempre. Cuenta los almuerzos de pensión que siguen confirmados en el mes. Los feriados y los ya avisados no entran. El aviso solo procede si después del aviso la cuenta sigue en 10 o más.

### UC08 Generar reporte mensual

- Historia: HU08.
- Actor: encargado.
- Precondición: UC01 con rol de encargado. Hay un mes cerrado o el encargado pide el mes de todos modos para revisarlo.
- Disparador: pide el reporte de un mes.
- Flujo principal:
  1. Include «Calcular montos».
  2. El sistema muestra una línea por empleado con cantidad mayor que cero: nombre, tipo, cantidad, precio unitario y total.
  3. El encargado elige el formato. Extend «Exportar a Excel» o extend «Exportar a PDF».
- Postcondición: se produjo un archivo. Los almuerzos no cambian. Nada se envía solo a planilla.
- Reglas: R7, R7b, R8.

### Include — Calcular montos

Lo incluye UC08, siempre. Por cada empleado del mes suma los almuerzos que siguen confirmados. El esporádico va a 18 Bs y el de pensión a 15 Bs. No suma cancelados, inasistencias avisadas ni feriados. Quien queda en cero no tiene línea.

### Extend — Exportar a Excel / Exportar a PDF

Extienden UC08. Condición: el encargado eligió ese formato. El cálculo es el mismo; cambia el archivo. No son dos historias.

### UC09 Ver mi consumo del mes

- Historia: HU09.
- Actor: empleado.
- Precondición: UC01.
- Disparador: abre su consumo de un mes.
- Flujo principal:
  1. El sistema cuenta sus almuerzos confirmados del mes y el monto (15 Bs o 18 Bs según el origen).
  2. Si es pensionado, muestra además cuántas inasistencias puede avisar sin bajar de 10.
- Postcondición: no cambia datos.
- Reglas: R5, R8.

## Fuera del diagrama a propósito

No hay caso de uso para dar de alta empleados, pagar en línea, publicar el menú, enviar push ni depositar el archivo en el sistema de planilla. Si más adelante el cliente los pide, entran como historias nuevas. No se cuelgan de estos nueve casos.
