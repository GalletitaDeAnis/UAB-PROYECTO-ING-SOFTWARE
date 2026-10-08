# Product backlog

Sistema de Reservas y Pensionamiento de Almuerzos (restaurante de la Unión Boliviana).

Este backlog parte del documento del equipo y lo deja listo para la evidencia de la rúbrica: historias INVEST, criterios verificables, estimación en puntos y un orden que se puede defender. La escala es la de Planning Poker (1, 2, 3, 5, 8, 13). La historia de referencia es HU04: una consulta de la lista del día, estimada en 2 puntos. El resto se comparó contra esa historia.

Los puntos de esta tabla son la **propuesta para el Planning**. El equipo los confirma o los mueve en la ceremonia y anota el acuerdo al final de este archivo. Hasta ese momento no se presentan como una votación ya hecha.

## Visión

| | |
| --- | --- |
| Problema | Las reservas se coordinan por WhatsApp. Cuesta saber cuántos almuerzos preparar, aplicar las reglas de los pensionados y calcular el descuento de fin de mes. |
| Usuarios | Empleado no pensionado (uso esporádico), empleado pensionado y encargado del restaurante. |
| Valor | Reservar, pensionarse y cancelar en un solo lugar, con reglas y precios automáticos, y un reporte listo para planilla. |
| Fuera de alcance | Alta de empleados, pagos en línea, menú del día, notificaciones push e integración directa con RRHH. El reporte se entrega en Excel y PDF. |

## Reglas de negocio

| Id | Regla |
| --- | --- |
| R1 | Solo almuerzos, de lunes a jueves, solo para funcionarios de la Unión Boliviana. El uso no es obligatorio ni gratuito. |
| R1b | Los empleados ya existen en la base de la institución. Este sistema no los registra. Cada uno decide si reserva o no. |
| R2 | Uso esporádico: 18 Bs. Lo reserva el propio empleado. Un solo almuerzo por persona y por día. |
| R2b | Toda reserva, cancelación o aviso de inasistencia se hace hasta las 9:00 del día en que se sirve el almuerzo. La hora es de Bolivia (America/La_Paz, UTC−4, sin horario de verano). |
| R3 | Pensión: 15 Bs. Se solicita durante el mes anterior, para el mes siguiente. |
| R4 | Al pensionarse, el sistema confirma solo los días de servicio del mes (lunes a jueves, sin feriados). El pensionado no reserva día por día: solo avisa los días que no asistirá. |
| R5 | El pensionado debe tener al menos 10 almuerzos que cuenten en el mes. |
| R6 | Si avisa antes de las 9:00, ese día no se cobra. No puede avisar si con eso bajaría de 10. |
| R7 | Si el almuerzo quedó confirmado y la persona no asistió sin cancelar o avisar a tiempo, se descuenta igual. El sistema no lleva un control de quién pasó por el comedor: cobra lo confirmado. |
| R7b | El feriado no se confirma, no se cobra y no suma al mínimo de 10. |
| R8 | No se paga en el momento. A fin de mes el encargado exporta Excel o PDF y planilla descuenta. |

Interpretación para que los criterios se puedan probar: «antes de que inicie el mes» más el texto de la historia («pensionarme para el mes siguiente») queda así: durante septiembre solo se puede pedir la pensión de octubre; el 1 de octubre ya no. Si el cliente quiere permitir varios meses por adelantado, se cambia este criterio y no el resto del modelo.

## Tablero

| Por hacer | Sprint 1 | Sprint 2 | Sprint 3 |
| --- | --- | --- | --- |
| — | HU01 Ingresar | HU05 Feriados | HU08 Reporte |
| | HU02 Reservar | HU06 Pensionarse | HU09 Mi consumo |
| | HU03 Cancelar | HU07 Avisar inasistencia | |
| | HU04 Lista del día | | |

Cuando una historia pasa a Done, se mueve en este tablero en el mismo pull request que cierra sus criterios. El backlog se vuelve a abrir en cada retrospectiva: si una regla no se entendió en el demo, el cambio queda escrito aquí, no solo en el acta.

## Plan de sprints

| Sprint | Objetivo | Historias | Puntos |
| --- | --- | --- | --- |
| 1 | Un empleado reserva y cancela, y el encargado ve cuántas reservas esporádicas hay en el día. | HU01–HU04 | 10 |
| 2 | Un empleado se pensiona, sus días de servicio quedan confirmados y puede avisar inasistencias sin bajar de 10. La lista del día pasa a incluir pensionados. | HU05–HU07 | 12 |
| 3 | El encargado exporta el descuento del mes y cada empleado ve su consumo. El sprint queda más corto a propósito: en el Sprint 3 el peso de la rúbrica está en la refactorización, la cobertura y el cierre, no en historias nuevas. | HU08–HU09 | 7 |

Capacidad prevista del equipo: entre 10 y 12 puntos por sprint. El Sprint 2 queda en el techo. Si en la planificación real el equipo estima menos capacidad, se mueve HU05 al Sprint 1 (no depende de reservar) o se baja de alcance un criterio, y se anota en la retro.

### Por qué este orden

HU01 vale medio, pero va primero: sin saber qué empleado es, no se puede reservar ni descontar. La dependencia pesa más que el valor.

El Sprint 1 ya se puede mostrar. Reservar, cancelar y ver el total del día atacan el problema del WhatsApp sin esperar a la pensión.

La pensión espera al Sprint 2 porque necesita el ingreso (HU01) y los feriados (HU05). Se partió en dos historias, pensionarse y avisar, para que cada una se pueda terminar y demostrar sola.

El reporte va al final porque necesita reservas, feriados, pensiones e inasistencias. Ponerlo antes obligaría a calcular con datos que todavía no existen.

## Historias

### HU01 – Ingresar con mis datos de empleado

Como empleado de la Unión Boliviana, quiero ingresar con mis datos de la base de la institución, para que mis reservas y mi descuento queden a mi nombre.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Medio | Bajo | 3 | — | 1 |

Por qué 3 y no 2: es un ingreso con tres resultados (entra, no existe, entra y no reserva nada), contra un directorio que este sistema no administra. Es más que la consulta de HU04 y menos que generar el mes de la pensión.

Criterios de aceptación:

1. Dado que el funcionario existe y está activo en la base de empleados, cuando ingresa con su identificador institucional, entonces entra y ve su nombre y sus almuerzos.
2. Dado que la persona no existe en esa base, o existe y está inactiva, cuando intenta ingresar, entonces el sistema no le da acceso.
3. Dado que ingresó y no reserva ni se pensiona, cuando termina el mes, entonces no tiene ningún almuerzo ni ninguna línea de descuento.
4. Dado que este sistema no guarda contraseñas, cuando verifica el identificador, entonces la consulta la resuelve la base institucional (en el proyecto, un adaptador con datos de prueba).

Notas: los empleados no se registran aquí (R1b). El encargado usa el mismo ingreso. Si además tiene rol de encargado en este sistema, ve las acciones de feriados, lista del día y reporte. Ese rol no viene en la base institucional.

### HU02 – Reservar almuerzo (uso esporádico)

Como empleado no pensionado, quiero reservar el almuerzo de un día en que voy a comer, para no coordinarlo por WhatsApp.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Alto | Bajo | 3 | HU01 | 1 |

Por qué 3: una sola transacción, con varias reglas (hora, día de servicio, feriado, duplicado, pensionado).

Criterios de aceptación:

1. Dado que es martes, son las 8:30 y el empleado no tiene almuerzo para hoy, cuando confirma, entonces queda un almuerzo de origen esporádico a 18 Bs y lo ve en sus reservas.
2. Dado que son las 9:00 o más tarde del día del almuerzo, cuando intenta reservar para ese día, entonces el sistema avisa que el horario cerró a las 9:00 y no registra nada.
3. Dado que el día elegido es viernes, sábado o domingo, cuando intenta reservar, entonces el sistema avisa que solo se atiende de lunes a jueves.
4. Dado que ya tiene un almuerzo para esa fecha, cuando intenta reservar de nuevo, entonces no se duplica.
5. Dado que hoy es lunes y elige el jueves de esta semana, cuando confirma, entonces la reserva queda hecha: el límite de las 9:00 es el del jueves, no el de hoy.
6. Dado que la fecha ya pasó, cuando intenta reservar, entonces el sistema no lo permite.
7. Dado que ese jueves está registrado como feriado, cuando intenta reservar, entonces el sistema no lo permite y no cobra ese día.
8. Dado que el empleado ya es pensionado de ese mes, cuando intenta una reserva esporádica para un día de ese mes, entonces el sistema no lo permite: ese día ya está confirmado por la pensión y solo corresponde un almuerzo por persona y por día.

### HU03 – Cancelar reserva (uso esporádico)

Como empleado no pensionado, quiero cancelar una reserva que no voy a usar, para que no me descuenten ese almuerzo.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Alto | Bajo | 2 | HU02 | 1 |

Por qué 2: recorre el mismo límite de hora que reservar, con menos ramas. Se parece a HU04 en tamaño.

Criterios de aceptación:

1. Dado que tiene reserva para hoy y son las 8:59, cuando cancela, entonces ese día deja de estar confirmado y no entra en el reporte.
2. Dado que son las 9:00 o más tarde del día del almuerzo, cuando intenta cancelar el de hoy, entonces el sistema no cancela y le indica que se le cobrará.
3. Dado que reservó, no canceló a tiempo y no asistió, cuando se genera el reporte, entonces ese almuerzo se descuenta a 18 Bs.
4. Dado que la reserva es para un jueves futuro, cuando cancela el miércoles, entonces la cancelación se acepta, porque el límite es las 9:00 del jueves.

### HU04 – Ver almuerzos confirmados del día

Como encargado del restaurante, quiero ver la lista y el total de almuerzos confirmados para hoy, para preparar la cantidad justa.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Alto | Bajo | 2 | HU02 | 1 |

Por qué 2: es la historia de referencia. Una consulta, un total y un nombre por fila. En el Sprint 1 la lista muestra reservas esporádicas. Los pensionados entran en los criterios de HU06 y HU07, porque antes de eso no existen.

Criterios de aceptación:

1. Dado que hoy hay 5 reservas esporádicas confirmadas y ya pasaron las 9:00, cuando el encargado abre la lista, entonces ve 5 almuerzos, con nombre y tipo «no pensionado».
2. Dado que un empleado canceló antes de las 9:00, cuando el encargado abre la lista, entonces esa persona no suma al total.
3. Dado que un empleado reservó y no canceló, cuando el encargado abre la lista, entonces aparece, aunque todavía no se sepa si va a asistir. El sistema no registra la asistencia física.

### HU05 – Registrar feriados del mes

Como encargado, quiero registrar los feriados que caen de lunes a jueves, para que ese día nadie tenga almuerzo confirmado ni cobrado.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Medio | Bajo | 2 | HU01 | 2 |

Por qué 2: el registro es simple. Vale medio para el usuario, pero sin este dato HU06 confirmaría días sin servicio. Por eso va antes que la pensión y no al final.

Criterios de aceptación:

1. Dado que el jueves 6 de agosto de 2026 es feriado, cuando el encargado registra esa fecha, entonces ese día no se puede reservar y no se confirma para ningún pensionado.
2. Dado que un pensionado tenía ese día confirmado y después se registra el feriado, cuando se genera el reporte, entonces ese día no se cuenta ni se cobra.
3. Dado que la fecha cae viernes, sábado o domingo, cuando el encargado intenta registrarla como feriado del restaurante, entonces el sistema la rechaza: esos días ya no hay servicio.

### HU06 – Pensionarse

Como empleado, quiero pensionarme para el mes siguiente y que el sistema me confirme el almuerzo de todos los días de servicio de ese mes, para no reservar cada día y pagar 15 Bs en lugar de 18 Bs.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Alto | Medio | 5 | HU01, HU05 | 2 |

Por qué 5: crea muchas filas, cruza el calendario con los feriados y tiene rechazos (tarde, mes sin 10 días de servicio, pensión duplicada). Es claramente más grande que HU04 y no llega a partirse de nuevo sin perder el beneficio.

Criterios de aceptación:

1. Dado que es 30 de septiembre de 2026, cuando el empleado solicita la pensión de octubre, entonces queda pensionado de octubre y el sistema le confirma cada lunes, martes, miércoles y jueves de ese mes que no sea feriado, a 15 Bs.
2. Dado que es pensionado en octubre, cuando llega un día de servicio de octubre, entonces su almuerzo ya está confirmado sin que él reserve.
3. Dado que octubre tiene un jueves feriado, cuando se arman los días del pensionado, entonces ese jueves no se confirma ni se cobra.
4. Dado que ya es 1 de octubre, cuando solicita la pensión de octubre, entonces el sistema la rechaza.
5. Dado que durante septiembre intenta pensionarse para noviembre, cuando confirma, entonces el sistema la rechaza: solo el mes siguiente.
6. Dado que ya tiene pensión activa para octubre, cuando la solicita otra vez, entonces no se duplica.
7. Dado que los feriados dejan el mes con menos de 10 días de servicio, cuando solicita la pensión, entonces el sistema la rechaza, porque el mínimo de R5 no se puede cumplir.
8. Dado que el empleado quedó pensionado y no avisó inasistencia, cuando el encargado abre la lista de ese día, entonces el pensionado aparece en el total aunque no haya reservado ese día.
9. Dado que ya es pensionado de hoy, cuando intenta una reserva esporádica para hoy, entonces el sistema no crea un segundo almuerzo.

Octubre de 2026 tiene 17 días de lunes a jueves. Con un feriado en jueves quedan 16, por encima de 10. El criterio 7 cubre el mes en que los feriados dejen menos de 10 días de servicio.

### HU07 – Avisar inasistencia (pensionado)

Como empleado pensionado, quiero avisar que no asistiré a un almuerzo confirmado, para que ese día no se me cuente ni se me descuente.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Alto | Medio | 5 | HU06 | 2 |

Por qué 5: la regla de las 9:00 se cruza con el mínimo de 10, que es un cálculo de todo el mes, no de un solo día. Por eso no se estimó como HU03.

Criterios de aceptación:

1. Dado que tiene 16 almuerzos confirmados en el mes y son las 8:00, cuando avisa que hoy no asiste, entonces ese día deja de estar confirmado, le quedan 15 y no se cobra.
2. Dado que le quedan exactamente 10 almuerzos confirmados en el mes, cuando intenta avisar otra inasistencia, entonces el sistema no lo permite e indica que ese almuerzo se cobra aunque no asista.
3. Dado que son las 9:00 o más tarde, cuando intenta avisar la inasistencia de hoy, entonces el sistema no lo permite e indica que el almuerzo de hoy se cobra.
4. Dado que no avisó y no asistió, cuando se genera el reporte, entonces ese almuerzo se descuenta a 15 Bs.
5. Dado que avisó a tiempo, cuando el encargado abre la lista de ese día, entonces el pensionado no aparece en el total.
6. Dado que el aviso es para un día de servicio futuro y todavía no son las 9:00 de ese día, cuando avisa, entonces se acepta si con eso no baja de 10.

El mínimo se evalúa sobre los almuerzos que siguen confirmados. Los feriados no entran en la cuenta. Los días ya avisados tampoco.

### HU08 – Generar reporte mensual para descuento por planilla

Como encargado, quiero un reporte del mes con los almuerzos que se descuentan y el monto de cada empleado, para enviarlo a planilla.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Alto | Medio | 5 | HU02, HU05, HU06, HU07 | 3 |

Por qué 5: junta las reglas de cobro y dos formatos de salida. No se partió en «hacer Excel» y «hacer PDF» porque el valor es el reporte, no el archivo.

Criterios de aceptación:

1. Dado que en octubre un pensionado tiene 12 almuerzos confirmados y un no pensionado tiene 3, cuando el encargado genera el reporte de octubre, entonces muestra 12 × 15 = 180 Bs y 3 × 18 = 54 Bs.
2. Dado que un pensionado faltó sin avisar, cuando se genera el reporte, entonces ese almuerzo sigue dentro de su monto.
3. Dado que el encargado elige Excel o PDF, cuando exporta, entonces el archivo trae nombre, tipo (pensionado o no pensionado), cantidad, precio unitario y total a descontar.
4. Dado que hubo un feriado, cuando se genera el reporte, entonces ese día no aparece como almuerzo de nadie.
5. Dado que un empleado no tiene almuerzos confirmados en el mes, cuando se genera el reporte, entonces no aparece con una línea de descuento.
6. Dado que un pensionado avisó una inasistencia a tiempo, cuando se genera el reporte, entonces ese día no suma a su cantidad ni a su monto.

El sistema no envía el archivo a RRHH. El encargado lo descarga y lo entrega.

### HU09 – Ver mi consumo del mes

Como empleado, quiero ver cuántos almuerzos se me van a descontar en el mes y el monto acumulado, para saber qué va a pasar con mi planilla.

| Valor | Esfuerzo | Puntos | Depende de | Sprint |
| --- | --- | --- | --- | --- |
| Medio | Bajo | 2 | HU02, HU06, HU07 | 3 |

Por qué 2: lee los mismos almuerzos que ya existen y muestra una cuenta. El criterio del pensionado necesita el mínimo de HU07, por eso la dependencia se amplió.

Criterios de aceptación:

1. Dado que un no pensionado tiene 4 almuerzos confirmados en el mes, cuando abre «mi consumo», entonces ve 4 almuerzos y 72 Bs.
2. Dado que un pensionado tiene 11 almuerzos confirmados, cuando abre «mi consumo», entonces ve 11 almuerzos, 165 Bs y que puede avisar 1 inasistencia más (después de esa le quedarían 10).
3. Dado que un día fue cancelado o avisado a tiempo, cuando abre «mi consumo», entonces ese día no suma al monto.

## Revisión INVEST

I independiente, N negociable, V valiosa, E estimable, S pequeña, T comprobable.

| Historia | I | N | V | E | S | T |
| --- | --- | --- | --- | --- | --- | --- |
| HU01 Ingresar | Sí | Sí | Sí | Sí | Sí | Sí |
| HU02 Reservar | Sí, tras HU01 | Sí | Sí | Sí | Sí | Sí |
| HU03 Cancelar | Sí, tras HU02 | Sí | Sí | Sí | Sí | Sí |
| HU04 Lista del día | Sí, tras HU02 | Sí | Sí | Sí | Sí | Sí |
| HU05 Feriados | Sí, tras HU01 | Sí | Sí | Sí | Sí | Sí |
| HU06 Pensionarse | Sí, tras HU01 y HU05 | Sí | Sí | Sí | Sí | Sí |
| HU07 Avisar inasistencia | Sí, tras HU06 | Sí | Sí | Sí | Sí | Sí |
| HU08 Reporte | Sí, tras los datos que calcula | Sí | Sí | Sí | Sí | Sí |
| HU09 Mi consumo | Sí, tras HU02, HU06 y HU07 | Sí | Sí | Sí | Sí | Sí |

La independencia no pide que una historia se construya en el vacío. Pide que, una vez hechas sus dependencias, se pueda terminar y probar sin arrastrar otra historia a medias. Por eso HU02 no incluye la pensión, y la pensión no incluye el reporte.

### Historias que se reescribieron porque no cumplían INVEST

| Planteo | Qué rompía | Cómo quedó |
| --- | --- | --- |
| «Gestionar todo: reservas, pensión y pagos.» | Pequeña y estimable | Se partió en HU02, HU03, HU06 y HU07. |
| «Crear la tabla Pensionados.» | Valiosa para el usuario | Es una tarea técnica dentro de HU06, no una historia. |
| «Calcular el cobro de forma justa.» | Comprobable | Quedó en HU08, con 15 Bs y 18 Bs. |
| «Reservar con este calendario y estos colores.» | Negociable | HU02 exige reservar un día de servicio, no una pantalla concreta. |
| Partir «solicitar pensión» en backend y frontend. | Valiosa | Se partió por función: HU06 pensionarse y HU07 avisar. |
| HU04 con 20 pensionados en el Sprint 1. | Pequeña e independiente | En el Sprint 1 la lista es de reservas esporádicas. El pensionado en la lista es criterio de HU06 y HU07. |

## Ajustes respecto al documento anterior

El documento «mejorado RUMBO AL CIELO» ya tenía visión, reglas, nueve historias, criterios Dado/Cuando/Entonces y la revisión INVEST. Se mantuvo ese contenido. Estos son los cambios para que el backlog se pueda construir en tres sprints sin criterios imposibles:

- HU04 ya no exige pensionados en el Sprint 1. Esa comprobación pasó a HU06 (criterio 8) y HU07 (criterio 5).
- HU02 deja explícito que se puede reservar un día futuro, que no se reserva un día pasado y que el feriado bloquea la reserva. La hora límite es siempre la de las 9:00 del día del almuerzo.
- HU06 solo permite la pensión del mes siguiente, y la rechaza si el mes queda con menos de 10 días de servicio.
- HU09 depende también de HU07, porque el cupo de inasistencias sale del mínimo de 10.
- HU08 no muestra en el reporte a quien no tiene nada que descontar, y no envía nada solo a planilla.
- La estimación queda marcada como propuesta de Planning, no como votación que el equipo todavía no hizo.

## Acuerdo de Planning Poker

Completar en la ceremonia. Hasta entonces, los puntos de arriba son la propuesta.

| Historia | Puntos propuestos | Puntos acordados | Quién estuvo | Fecha |
| --- | --- | --- | --- | --- |
| HU01 | 3 | | | |
| HU02 | 3 | | | |
| HU03 | 2 | | | |
| HU04 | 2 | | | |
| HU05 | 2 | | | |
| HU06 | 5 | | | |
| HU07 | 5 | | | |
| HU08 | 5 | | | |
| HU09 | 2 | | | |

Si una carta se dispara (por ejemplo un 8 contra un 2), se anota el motivo y se reestima. No se promedia en silencio.
