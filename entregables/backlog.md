# Product backlog (versión 2)

Sistema de reservas del restaurante · Unión Boliviana. Versión 2 (refinamiento).

> Fuente: documento del equipo «practica_producto_B_backlog_v2». Este archivo lo transcribe para que el backlog, los diagramas y el código estén en el mismo repositorio. Si el equipo cambia el Word, se cambia aquí en el mismo pull request. Las observaciones pendientes están en [revision-documentos-v2.md](revision-documentos-v2.md).

## Qué cambió en esta versión

- Los familiares de primer grado registrados en el sistema empresarial pueden consumir un almuerzo por persona. No ingresan al sistema: el empleado reserva por ellos o los pensiona.
- La reserva y la pensión son nominales: cada almuerzo se registra a nombre de quien lo consume, para controlar el mínimo de 10 de cada pensionado.
- Se agregan el login y la integración con la API del sistema empresarial, que no figuraban como historia en ningún sprint.
- Se corrigen inconsistencias de la versión 1 (sección 7).

## 1. Contexto y visión del producto

| Pregunta | Respuesta |
| --- | --- |
| Problema | Las reservas del restaurante se coordinan por WhatsApp. Es difícil saber cuántos almuerzos preparar, controlar las reglas de los pensionados y calcular a fin de mes cuánto descontar a cada empleado. Ahora, además, los empleados necesitan reservar para sus familiares. |
| Usuarios | Empleado no pensionado (uso esporádico). Empleado pensionado. Familiar de primer grado (beneficiario): consume, pero no ingresa al sistema; el empleado titular reserva o lo pensiona. Encargado del restaurante. |
| Propuesta de valor | Reservar, pensionarse y cancelar (para uno mismo y para cada familiar registrado) en un solo lugar, ingresando con el mismo usuario del sistema empresarial, con las reglas y precios aplicados por persona y un reporte mensual por empleado titular listo para descuento por planilla. |
| Integración (sí entra) | Consumo de la API del sistema empresarial (solo lectura) para validar el inicio de sesión, obtener los datos del empleado y obtener sus familiares de primer grado. |
| Alcance inicial (no entra) | Registro o alta de empleados o familiares (se leen de la API), modificar datos del sistema empresarial, acceso propio para familiares, pagos en línea, menú del día, notificaciones push y envío automático a RRHH (el reporte se entrega en Excel y PDF). |

### Reglas del negocio

| # | Estado v2 | Regla |
| --- | --- | --- |
| R1 | Modificada | El restaurante sirve solo almuerzos, de lunes a jueves, para funcionarios de la Unión Boliviana y sus familiares de primer grado registrados en el sistema empresarial. Su uso no es obligatorio ni gratuito. |
| R1b | Modificada | Empleados y familiares ya están registrados en el sistema empresarial de la institución; el sistema del restaurante los consulta mediante su API (solo lectura) y no los registra. |
| R2 | Modificada | Almuerzo no pensionado (uso esporádico): 18 Bs. Lo reserva el empleado desde el sistema, para sí o para un familiar: un solo almuerzo por persona por día. |
| R2b | Sin cambio | Hora límite: toda reserva, cancelación o aviso de inasistencia (de cualquier persona) se hace hasta las 9:00 am del día en que se sirve el almuerzo. |
| R3 | Modificada | Almuerzo pensionado: 15 Bs. La pensión se solicita por persona y antes de que inicie el mes. |
| R4 | Modificada | Al pensionar a una persona, el sistema registra automáticamente a su nombre el almuerzo de todos los días del mes (lunes a jueves, sin feriados). No se reserva día por día: solo se avisan los días que esa persona no asistirá. |
| R5 | Modificada | Cada pensionado (empleado o familiar) debe consumir mínimo 10 almuerzos en el mes. El mínimo se controla por persona, no por familia. |
| R6 | Modificada | El empleado avisa (hasta las 9:00 am) cuando un pensionado a su cargo (él o un familiar) no asistirá; ese día no se le cuenta a esa persona. No puede avisar si esa persona queda por debajo de 10. |
| R7 | Modificada | Si una persona con almuerzo confirmado no asiste y no se canceló a tiempo, se descuenta igual por planilla al empleado titular. |
| R7b | Sin cambio | Los feriados no cuentan: no se confirman, no se cobran y no suman al mínimo. |
| R8 | Modificada | No se paga en el momento: a fin de mes el encargado genera un reporte en Excel y PDF agrupado por empleado titular, con el detalle de cada persona a su cargo; todo se descuenta por planilla al titular. |
| R9 | Nueva | Los familiares no tienen acceso al sistema. Solo el empleado titular puede reservar, pensionar, cancelar o avisar inasistencias en su nombre. |
| R10 | Nueva | Tope diario = 1 (el empleado) + número de familiares de primer grado registrados. Ej.: cónyuge y 3 hijos → máximo 5 almuerzos por día o 5 pensionados. |
| R11 | Nueva | Toda reserva y pensión es nominal: se registra a nombre de la persona que consumirá el almuerzo (no se aceptan «5 almuerzos» genéricos). Así se controla el mínimo de cada pensionado. |
| R12 | Nueva | Para ingresar, el empleado usa su usuario y contraseña del sistema empresarial; el sistema los valida mediante la API. Solo empleados activos pueden ingresar. |

### Supuestos y preguntas abiertas (validar con el Product Owner)

| # | Supuesto / pregunta | Cómo lo resuelve hoy el código |
| --- | --- | --- |
| S1 | Los familiares pagan el mismo precio que el empleado (15 Bs pensionado / 18 Bs esporádico). | Mismo precio. |
| S2 | «Primer grado» es lo que el sistema empresarial marque como tal (p. ej. cónyuge, hijos, padres). El sistema del restaurante no decide el parentesco: lo lee de la API. | Se guarda el parentesco tal como llega. |
| S3 | Un familiar puede pensionarse aunque el empleado no lo esté, y viceversa (la pensión es independiente por persona). | Independiente (HU09 CA3). |
| S4 | El rol de encargado se identifica por un dato que entrega la API (cargo o rol) o por una lista configurada en el sistema del restaurante. | Lista configurada: tabla `autorizacion`, variable `ENCARGADOS`. Cambiar a la API es tocar solo el caso de uso de login. |
| S5 | Si un familiar deja de figurar en el sistema empresarial a mitad de mes, ¿se cancelan sus reservas futuras? | No se cancelan solas: el familiar queda no vigente, ya no se puede elegir y su historial sigue en el reporte. Pendiente de decisión del PO. |

## 2. Login e integración con la API del sistema empresarial

La integración no es una historia aparte (sería una tarea técnica sin valor visible, ver sección 6): se reparte como tareas técnicas dentro de HU01 (login) y HU05 (familiares).

### 2.1 Datos que se consumen

| Dato que entrega la API | Para qué lo usamos | Cuándo se consulta | Historia |
| --- | --- | --- | --- |
| Autenticación (usuario + contraseña) | Validar el inicio de sesión sin crear cuentas nuevas | Al iniciar sesión | HU01 |
| Datos del empleado: código, nombre, CI, estado (activo/inactivo), cargo o rol | Identificar al titular de reservas y descuentos; saber si es encargado | Al iniciar sesión | HU01 |
| Familiares de primer grado: id, nombre, parentesco | Mostrar a quiénes se puede reservar o pensionar y calcular el tope diario | Al iniciar sesión; se revalida al reservar o pensionar | HU05, HU06, HU09 |

### 2.2 Flujo de inicio de sesión

1. El empleado escribe su usuario y contraseña del sistema empresarial en la pantalla de ingreso del restaurante.
2. El backend del restaurante envía las credenciales a la API por HTTPS. La contraseña nunca se guarda en el sistema del restaurante.
3. La API responde si las credenciales son válidas y devuelve el código del empleado (o un token).
4. El backend consulta los datos del empleado y verifica que esté activo. Si no lo está, se niega el ingreso.
5. El backend consulta los familiares de primer grado y guarda una copia local (id, nombre, parentesco) para registrar reservas nominales y mantener el historial del reporte aunque luego cambie el sistema empresarial.
6. Se crea una sesión propia del restaurante (token con expiración por 30 minutos de inactividad) y se muestra la pantalla principal según el rol (empleado o encargado).
7. Si la API no responde en 5 segundos o devuelve error, se muestra «No se pudo validar tu usuario, intenta más tarde» y no se permite el ingreso (no hay ingreso sin conexión).

### 2.3 Servicios esperados de la API

Nombres referenciales: deben confirmarse con el área de TI de la institución según la documentación real de la API.

| Método | Servicio (referencial) | Qué devuelve / qué usamos |
| --- | --- | --- |
| POST | `/auth/login` | Recibe usuario y contraseña; responde válido/inválido y un token o el código del empleado |
| GET | `/empleados/{codigo}` | Nombre, CI, estado activo, cargo/rol |
| GET | `/empleados/{codigo}/familiares` | Lista de familiares de primer grado: id, nombre, parentesco |

Mientras no exista la API real, el repositorio trae un simulador con estas mismas rutas (`simulador-empresarial/`). El adaptador que la consume está en `src/infraestructura/sistemaEmpresarialHttp.ts`.

### 2.4 Reglas técnicas de la integración

- Uso solo de lectura: el sistema del restaurante no escribe en el sistema empresarial.
- La URL y las credenciales de acceso a la API se guardan en variables de entorno, no en el código.
- Tiempo máximo de espera (timeout) de 5 segundos por llamada y registro (log) de cada error de la API.
- Se guardan solo los datos mínimos necesarios (protección de datos personales de empleados y familiares).
- La copia local de familiares se actualiza en cada inicio de sesión.

## 3. Product Backlog priorizado

Ordenado por valor, riesgo y esfuerzo, respetando las dependencias. El número de historia coincide con su orden de prioridad. Estimación en puntos de historia con Planning Poker (escala 1, 2, 3, 5, 8, 13). Total: 46 puntos.

| ID | Historia | Criterios de aceptación (resumen) | Valor | Esfuerzo | Pts | Depende de | Sprint | Cambio v2 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HU01 | Iniciar sesión con usuario del sistema empresarial | Credenciales válidas y activo → ingresa / incorrectas o inactivo → no / API caída → mensaje / sesión expira a los 30 min / encargado ve sus opciones | Alto | Medio | 5 | — | S1 | Reescrita |
| HU02 | Reservar mi almuerzo (uso esporádico) | Antes de las 9:00 → 18 Bs / después no / solo L–J / uno por persona por día | Alto | Bajo | 3 | HU01 | S1 | Sin cambio |
| HU03 | Cancelar mi reserva (uso esporádico) | Antes de las 9:00 → no se cobra / después no puede / reservó y no fue → se descuenta | Alto | Bajo | 2 | HU02 | S1 | Sin cambio |
| HU04 | Ver almuerzos confirmados del día | Total y lista con nombre / tipo (empleado/familiar) y titular / cancelados no aparecen | Alto | Bajo | 2 | HU02 | S1 | Modificada |
| HU05 | Ver mis familiares habilitados | Lista desde la API con parentesco / tope diario / no se agregan a mano | Alto | Bajo | 3 | HU01 | S2 | Nueva |
| HU06 | Reservar almuerzo para un familiar | Nominal a 18 Bs al titular / uno por persona por día / tope y hora límite / cancela sin afectar otras | Alto | Medio | 3 | HU02, HU05 | S2 | Nueva |
| HU07 | Registrar feriados del mes | No se reserva ni confirma / no se cobra | Medio | Bajo | 2 | HU01 | S2 | Sin cambio |
| HU08 | Pensionarme (reserva automática del mes) | L–J del mes a 15 Bs / feriados no / tardía o duplicada se rechaza / sin almuerzo extra | Alto | Medio | 5 | HU01, HU07 | S2 | Fusionada |
| HU09 | Pensionar a un familiar | Nominal a 15 Bs / independiente del titular / tope y fecha límite / no duplica | Alto | Medio | 5 | HU05, HU08 | S3 | Nueva |
| HU10 | Avisar inasistencia de un pensionado | Por persona antes de las 9:00 / mínimo de 10 por persona / no avisó y no fue → se descuenta | Alto | Medio | 5 | HU08 | S3 | Modificada |
| HU11 | Generar reporte mensual por titular | Agrupa por titular con detalle por persona / 15 y 18 Bs / faltas sin aviso; sin feriados / Excel y PDF | Alto | Alto | 8 | HU02, HU06, HU08, HU09, HU10 | S4 | Modificada |
| HU12 | Ver mi consumo del mes (y de mi familia) | Detalle y monto por persona / total a descontar / inasistencias que aún puede avisar | Medio | Bajo | 3 | HU02, HU08 | S4 | Modificada |

### Plan de sprints

Velocidad planificada: entre 10 y 13 puntos por sprint. El backlog se revisa en cada Sprint Review y se refina antes de cada Sprint Planning.

| Sprint | Objetivo (Sprint Goal) | Historias | Puntos |
| --- | --- | --- | --- |
| 1 | Un empleado ingresa con su usuario del sistema empresarial, reserva y cancela su almuerzo, y el encargado sabe cuántos almuerzos preparar cada día. | HU01–HU04 | 12 |
| 2 | El empleado puede reservar para sus familiares registrados y pensionarse para el mes siguiente, sin que se cobren feriados. | HU05–HU08 | 13 |
| 3 | Cada familiar puede ser pensionado de forma individual y el empleado avisa inasistencias por persona, respetando el mínimo de 10 de cada uno. | HU09–HU10 | 10 |
| 4 | El encargado obtiene el reporte mensual por titular para descuento por planilla y cada empleado ve el consumo de su familia. | HU11–HU12 | 11 |

> **Pendiente del equipo:** la rúbrica tiene tres entregas de sprint (sesiones 6, 10 y 13) y el Demo Day. Este plan tiene cuatro sprints. Hay que decidir en el Planning cómo quedan HU11 y HU12 dentro del Sprint 3. Ver [revision-documentos-v2.md](revision-documentos-v2.md).

### Justificación del orden

- El login (HU01) va primero: sin validar al empleado contra la API no se sabe quién reserva ni a quién descontar. Además es el mayor riesgo técnico del proyecto (depende de un sistema externo que no controlamos), por eso se ataca en el primer sprint.
- El Sprint 1 sigue siendo pequeño y mostrable: ingresar, reservar, cancelar y ver el total del día ya resuelve el problema principal del WhatsApp.
- Los familiares van después del flujo individual (Sprint 2): reutilizan las reglas de reserva de HU02 y solo agregan elegir a la persona. HU05 va antes que HU06 porque sin la lista que entrega la API no hay a quién reservar.
- La pensión de familiares (HU09) va después de la pensión propia (HU08): es la misma lógica aplicada por persona; así HU08 se valida primero con un caso simple.
- El reporte (HU11) va al final: necesita datos de reservas, pensiones e inasistencias de todas las personas. Se re-estimó de 5 a 8 puntos porque ahora agrupa por titular con detalle por persona.

## 4. Historias de usuario detalladas

Formato: Como «usuario», quiero «acción», para «beneficio». Criterios en formato Dado / Cuando / Entonces. La columna «Prueba» indica dónde está la prueba automática de cada criterio.

### HU01 – Iniciar sesión con usuario del sistema empresarial (Reescrita)

Como empleado de la Unión Boliviana, quiero iniciar sesión con el mismo usuario y contraseña del sistema empresarial, para no crear otra cuenta y que mis reservas y descuentos queden a mi nombre.

Valor: Alto · Esfuerzo: Medio · 5 pts · Depende de: —

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que el empleado está activo en el sistema empresarial y escribe su usuario y contraseña correctos, cuando presiona «Ingresar», entonces accede al sistema y ve su nombre y sus reservas. | `tests/hu01.iniciarSesion.test.ts` |
| CA2. Dado que la contraseña es incorrecta, cuando intenta ingresar, entonces ve el mensaje «Usuario o contraseña incorrectos» y no accede. | ídem |
| CA3. Dado que la persona no existe o figura como inactiva en el sistema empresarial, cuando intenta ingresar, entonces el sistema no le permite el acceso. | ídem |
| CA4. Dado que la API del sistema empresarial no responde en 5 segundos, cuando el empleado intenta ingresar, entonces ve «No se pudo validar tu usuario, intenta más tarde» y no accede. | ídem y `tests/integracion.empresarial.test.ts` |
| CA5. Dado que el empleado inició sesión y no usa el sistema durante 30 minutos, cuando intenta realizar una acción, entonces el sistema le pide volver a ingresar. | ídem y `tests/api.graphql.test.ts` |
| CA6. Dado que el usuario tiene rol de encargado, cuando ingresa, entonces ve además las opciones del encargado (lista del día, feriados, reporte); un empleado sin ese rol no las ve. | ídem |

Nota: el sistema nunca guarda la contraseña: la envía a la API y solo conserva su propia sesión. Si el empleado no reserva ni se pensiona, no se le registra ningún almuerzo ni descuento (el uso es opcional).

Tareas técnicas (consumo de la API): configurar el cliente de la API (URL y credenciales en variables de entorno, timeout de 5 s); servicio de backend de inicio de sesión que delega la validación en la API; generar la sesión propia con expiración por inactividad; pantalla de ingreso y mensajes de error; registro (log) de errores de la API; pruebas con usuarios de prueba entregados por TI de la institución.

### HU02 – Reservar mi almuerzo (uso esporádico) (Sin cambio)

Como empleado no pensionado, quiero reservar un almuerzo para el día que voy a comer, para asegurar mi comida sin tener que coordinar por WhatsApp con el encargado.

Valor: Alto · Esfuerzo: Bajo · 3 pts · Depende de: HU01

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que es martes, son las 8:30 am y el empleado no tiene reserva para hoy, cuando confirma la reserva, entonces la reserva queda registrada a su nombre a 18 Bs y aparece en «mis reservas». | `tests/hu02.reservar.test.ts` |
| CA2. Dado que son las 9:01 am del día del almuerzo, cuando el empleado intenta reservar para hoy, entonces el sistema indica que el horario de reservas cerró a las 9:00 y no registra la reserva. | ídem (bordes 8:59 y 9:00) |
| CA3. Dado que el día elegido es viernes, sábado o domingo, cuando el empleado intenta reservar, entonces el sistema indica que el restaurante solo atiende de lunes a jueves. | ídem |
| CA4. Dado que el empleado ya tiene una reserva a su nombre para ese día, cuando intenta reservar de nuevo para sí mismo, entonces el sistema no duplica la reserva. | ídem |

### HU03 – Cancelar mi reserva (uso esporádico) (Sin cambio)

Como empleado no pensionado, quiero cancelar una reserva que ya no voy a usar, para que no se me descuente por planilla un almuerzo que no voy a consumir.

Valor: Alto · Esfuerzo: Bajo · 2 pts · Depende de: HU02

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que el empleado tiene una reserva para hoy y son las 8:59 am, cuando la cancela, entonces la reserva se elimina y no se considera en el reporte mensual. | `tests/hu03.cancelar.test.ts` |
| CA2. Dado que son las 9:00 am o más tarde, cuando el empleado intenta cancelar la reserva de hoy, entonces el sistema no permite cancelar y le indica que el almuerzo se le cobrará. | ídem |
| CA3. Dado que el empleado reservó, no canceló y no asistió, cuando se genera el reporte mensual, entonces ese almuerzo se incluye y se descuenta por planilla a 18 Bs. | ídem |

### HU04 – Ver almuerzos confirmados del día (Modificada)

Como encargado del restaurante, quiero ver la lista y el total de almuerzos confirmados para hoy, con el nombre de cada persona, para preparar la cantidad justa de comida sin desperdiciar.

Valor: Alto · Esfuerzo: Bajo · 2 pts · Depende de: HU02

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que hoy hay 8 reservas confirmadas, cuando el encargado abre la lista del día después de las 9:00 am, entonces ve el total (8) y una fila por persona con: nombre, tipo (empleado / familiar), empleado titular y modalidad (pensionado / no pensionado). | `tests/hu04.lista.test.ts` |
| CA2. Dado que una reserva fue cancelada antes de las 9:00 am, cuando el encargado abre la lista del día, entonces esa persona no aparece ni se cuenta en el total. | ídem |
| CA3. Dado que hoy no hay ninguna reserva, cuando el encargado abre la lista, entonces ve el total 0 y el mensaje «No hay almuerzos confirmados para hoy». | ídem |

Nota: la lista lee las reservas confirmadas del día sin importar su origen. Cuando se incorporen familiares (HU06) y pensiones (HU08, HU09), aparecerán automáticamente; esas historias incluyen un criterio que lo verifica.

### HU05 – Ver mis familiares habilitados (Nueva)

Como empleado, quiero ver la lista de mis familiares de primer grado registrados en el sistema empresarial, para saber por quiénes puedo reservar o pensionar.

Valor: Alto · Esfuerzo: Bajo · 3 pts · Depende de: HU01

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que en el sistema empresarial el empleado tiene registrada a su esposa y a 3 hijos, cuando abre «Mi familia», entonces ve 4 familiares con nombre y parentesco, y el mensaje «Puedes reservar hasta 5 almuerzos por día». | `tests/hu05.familia.test.ts` |
| CA2. Dado que un sobrino del empleado no está registrado como familiar de primer grado, cuando el empleado abre «Mi familia», entonces el sobrino no aparece y no existe opción para agregar personas a mano. | ídem |
| CA3. Dado que RRHH registró un nuevo hijo en el sistema empresarial, cuando el empleado vuelve a iniciar sesión, entonces el nuevo hijo aparece en la lista. | ídem |
| CA4. Dado que el empleado no tiene familiares registrados, cuando abre «Mi familia», entonces ve «No tienes familiares registrados» y su tope diario es 1. | ídem |

Tareas técnicas (consumo de la API): consumir el servicio de familiares de la API; guardar la copia local (id, nombre, parentesco) y actualizarla en cada inicio de sesión; pantalla «Mi familia» con el tope diario.

### HU06 – Reservar almuerzo para un familiar (Nueva)

Como empleado, quiero reservar un almuerzo a nombre de un familiar registrado, para que pueda comer en el restaurante aunque él no tenga acceso al sistema.

Valor: Alto · Esfuerzo: Medio · 3 pts · Depende de: HU02, HU05

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que es martes a las 8:30 am y el hijo Juan está en la lista de familiares, cuando el empleado reserva para Juan, entonces la reserva queda a nombre de Juan, a 18 Bs, con el empleado como titular del descuento, y Juan aparece en la lista del día del encargado como «familiar». | `tests/hu06.reservarFamiliar.test.ts` |
| CA2. Dado que Juan ya tiene una reserva para hoy, cuando el empleado intenta reservar otra para Juan, entonces el sistema no la duplica (un almuerzo por persona por día). | ídem |
| CA3. Dado que el empleado tiene esposa y 3 hijos y ya hay 5 reservas para hoy (él y sus 4 familiares), cuando intenta reservar otra, entonces el sistema indica que alcanzó el tope de 5 almuerzos. | ídem |
| CA4. Dado que son las 9:01 am, cuando el empleado intenta reservar o cancelar para un familiar para hoy, entonces el sistema no lo permite. | ídem |
| CA5. Dado que el empleado y Juan tienen reserva para hoy y son las 8:45 am, cuando cancela solo la reserva de Juan, entonces la de Juan se elimina y la del empleado sigue vigente. | ídem |

Nota: no existe un campo de nombre libre: solo se puede elegir a una persona de la lista de HU05. Así el tope de R10 se cumple por diseño.

### HU07 – Registrar feriados del mes (Sin cambio)

Como encargado del restaurante, quiero registrar los feriados que caen de lunes a jueves, para que esos días no se confirmen ni se cobren almuerzos a nadie.

Valor: Medio · Esfuerzo: Bajo · 2 pts · Depende de: HU01

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que el jueves 6 de agosto es feriado, cuando el encargado lo registra como feriado, entonces ese día no se puede reservar y no se confirma para ningún pensionado (empleado o familiar). | `tests/hu07.feriados.test.ts` |
| CA2. Dado que un pensionado tenía confirmado un día que luego se registra como feriado, cuando se genera el reporte mensual, entonces ese día no se le cuenta ni se le cobra. | ídem |

Nota: valor medio, pero es prerrequisito de la pensión (HU08 y HU09): sin feriados registrados, el sistema confirmaría y cobraría días sin servicio.

### HU08 – Pensionarme (reserva automática de todo el mes) (Fusionada)

Como empleado, quiero pensionarme para el mes siguiente y que el sistema me registre automáticamente el almuerzo de todos los días de lunes a jueves del mes, para no tener que reservar cada día y pagar 15 Bs en lugar de 18 Bs.

Valor: Alto · Esfuerzo: Medio · 5 pts · Depende de: HU01, HU07

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que es 25 de septiembre, cuando el empleado solicita la pensión para octubre, entonces queda como pensionado de octubre y el sistema le registra a su nombre el almuerzo de todos los días de lunes a jueves del mes, a 15 Bs cada uno. | `tests/hu08.pensionarme.test.ts` |
| CA2. Dado que el empleado es pensionado en octubre, cuando llega cualquier día de lunes a jueves de octubre, entonces su almuerzo ya aparece reservado y figura en la lista del encargado como «pensionado», sin que él haga nada. | ídem |
| CA3. Dado que octubre tiene un feriado registrado en jueves, cuando se confirman los días del pensionado, entonces el día feriado no se confirma ni se cobra. | ídem |
| CA4. Dado que ya es 1 de octubre, cuando el empleado solicita la pensión para octubre, entonces el sistema la rechaza porque debe solicitarse antes de que inicie el mes. | ídem |
| CA5. Dado que el empleado ya es pensionado de octubre, cuando intenta pensionarse otra vez para octubre, entonces el sistema no duplica la pensión. | ídem |
| CA6. Dado que el empleado pensionado tiene confirmado el almuerzo de hoy, cuando intenta hacer una reserva esporádica adicional para sí mismo, entonces el sistema no lo permite (un almuerzo por persona por día). | `tests/hu02.reservar.test.ts` |

Nota: une la HU02 «Registro mensual de pensionados» y la HU07 «Pensionarse» de la versión 1, que describían la misma funcionalidad.

Interpretación implementada: «para el mes siguiente» se toma literal. Durante septiembre solo se pide octubre; el 1 de octubre ya es tarde y noviembre todavía no se puede pedir. Además, si los feriados dejan un mes con menos de 10 días de servicio, la pensión se rechaza, porque el mínimo de R5 no se podría cumplir (nota de CU08).

### HU09 – Pensionar a un familiar (Nueva)

Como empleado, quiero pensionar a uno o varios de mis familiares para el mes siguiente, para que cada uno tenga su almuerzo diario a 15 Bs sin reservar día por día.

Valor: Alto · Esfuerzo: Medio · 5 pts · Depende de: HU05, HU08

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que es 25 de septiembre y el empleado tiene esposa y 3 hijos, cuando pensiona a su esposa y a 2 hijos para octubre, entonces se crean 3 pensiones nominales, cada una con sus almuerzos de lunes a jueves (sin feriados) a 15 Bs, descontados al empleado titular. | `tests/hu09.pensionarFamiliar.test.ts` |
| CA2. Dado que la hija Ana está pensionada en octubre, cuando el encargado abre la lista de un día de octubre, entonces Ana aparece como «familiar – pensionado» junto con el nombre del titular. | ídem |
| CA3. Dado que el empleado no está pensionado, cuando pensiona a su hijo, entonces el sistema lo permite (la pensión es independiente por persona). | ídem |
| CA4. Dado que ya es 1 de octubre, cuando el empleado intenta pensionar a un familiar para octubre, entonces el sistema lo rechaza. | ídem |
| CA5. Dado que el hijo Juan ya está pensionado en octubre, cuando el empleado intenta pensionarlo otra vez, entonces el sistema no duplica la pensión. | ídem |
| CA6. Dado que el empleado y sus 4 familiares ya están pensionados en octubre, cuando abre la opción de pensionar, entonces no hay más personas disponibles (tope de 5). | ídem |

### HU10 – Avisar inasistencia de un pensionado (por persona) (Modificada)

Como empleado, quiero avisar que una persona pensionada a mi cargo (yo o un familiar) no asistirá a un almuerzo confirmado, para que ese día no se le cuente ni se me descuente.

Valor: Alto · Esfuerzo: Medio · 5 pts · Depende de: HU08

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que el hijo Juan es pensionado con 16 almuerzos confirmados en el mes y son las 8:00 am, cuando el empleado avisa que Juan no asistirá hoy, entonces se libera el día de Juan (le quedan 15), no se cobra, y los almuerzos de las demás personas no cambian. | `tests/hu10.avisarInasistencia.test.ts` |
| CA2. Dado que a Juan le quedan exactamente 10 almuerzos y al empleado titular 14, cuando el empleado intenta avisar otra inasistencia de Juan, entonces el sistema no lo permite aunque el titular tenga margen (el mínimo de 10 es por persona). | ídem |
| CA3. Dado que son las 9:00 am o más tarde, cuando el empleado intenta avisar la inasistencia de cualquier pensionado para hoy, entonces el sistema no lo permite e indica que ese almuerzo se cobrará. | ídem |
| CA4. Dado que un pensionado no avisó y no asistió, cuando se genera el reporte mensual, entonces ese almuerzo se cuenta y se descuenta a 15 Bs al empleado titular. | ídem |

Nota: para familiares aplica una vez terminada HU09; los criterios se prueban primero con la pensión propia (HU08).

### HU11 – Generar reporte mensual por titular para descuento por planilla (Modificada)

Como encargado del restaurante, quiero generar al final del mes un reporte por empleado titular con el detalle de cada persona a su cargo, para enviarlo a planilla y que el total se descuente al empleado.

Valor: Alto · Esfuerzo: Alto · 8 pts · Depende de: HU02, HU06, HU08, HU09, HU10

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que en octubre el empleado Pedro fue pensionado con 12 almuerzos, su esposa pensionada con 10 y su hijo tuvo 3 reservas esporádicas, cuando el encargado genera el reporte de octubre, entonces Pedro aparece con 3 líneas de detalle (12 × 15 = 180 Bs; 10 × 15 = 150 Bs; 3 × 18 = 54 Bs) y un total a descontar de 384 Bs. | `tests/hu11.reporte.test.ts` |
| CA2. Dado que un pensionado faltó sin avisar, cuando se genera el reporte, entonces ese almuerzo aparece incluido en el monto de esa persona. | ídem |
| CA3. Dado que el reporte está generado, cuando el encargado elige exportarlo en Excel o en PDF, entonces obtiene el archivo con: empleado titular, persona, parentesco, modalidad, cantidad de almuerzos, precio unitario, subtotal por persona y total por titular. | ídem y `tests/exportadores.test.ts` |
| CA4. Dado que hubo un feriado en el mes, cuando se genera el reporte, entonces el feriado no aparece como almuerzo en ninguna persona. | ídem |
| CA5. Dado que un empleado no tuvo consumo propio ni de familiares en el mes, cuando se genera el reporte, entonces ese empleado no aparece. | ídem |

### HU12 – Ver mi consumo del mes (y el de mi familia) (Modificada)

Como empleado, quiero ver cuántos almuerzos llevamos en el mes yo y cada familiar a mi cargo, y el monto acumulado, para saber cuánto se me descontará de planilla.

Valor: Medio · Esfuerzo: Bajo · 3 pts · Depende de: HU02, HU08

| Criterio | Prueba |
| --- | --- |
| CA1. Dado que el empleado no pensionado tiene 4 reservas propias consumidas en el mes, cuando abre «Mi consumo», entonces ve 4 almuerzos y 72 Bs acumulados. | `tests/hu12.consumo.test.ts` |
| CA2. Dado que el empleado es pensionado con 11 almuerzos restantes, cuando abre «Mi consumo», entonces ve cuántos almuerzos le quedan y cuántas inasistencias más puede avisar (1). | ídem |
| CA3. Dado que el hijo del empleado es pensionado con 12 almuerzos y el empleado tuvo 2 reservas esporádicas, cuando abre «Mi consumo», entonces ve el detalle por persona, el total acumulado (12 × 15 + 2 × 18 = 216 Bs) y que su hijo aún puede avisar 2 inasistencias. | ídem |

## 5. Estimación con Planning Poker

Se toma HU02 (Reservar mi almuerzo) = 3 puntos como historia de referencia y las demás se estiman por comparación. Cada integrante vota en simultáneo con la escala 1, 2, 3, 5, 8, 13; si los votos difieren en más de un valor, quienes votaron el valor más alto y el más bajo explican su razón y se vuelve a votar hasta llegar a consenso.

| Historia | Comparación con la referencia | Pts acordados | Cambio vs v1 |
| --- | --- | --- | --- |
| HU02 | Historia de referencia | 3 | — |
| HU01 | Más que HU02: depende de un sistema externo, manejo de errores y sesión | 5 | 3 → 5 |
| HU03 | Menor que HU02: misma regla de hora, sin crear datos | 2 | — |
| HU04 | Menor que HU02: solo consulta y muestra | 2 | — |
| HU05 | Similar a HU02: un servicio de la API y una pantalla | 3 | Nueva |
| HU06 | Similar a HU02: reutiliza sus reglas y agrega elegir persona y tope | 3 | Nueva |
| HU07 | Menor que HU02: registro simple | 2 | — |
| HU08 | Mayor que HU02: genera todas las reservas del mes y aplica feriados | 5 | — |
| HU09 | Igual a HU08 aplicado por persona, con tope | 5 | Nueva |
| HU10 | Igual a HU08: conteo del mínimo por persona y hora límite | 5 | — |
| HU11 | Mayor que HU08: cálculo por persona, agrupación por titular y 2 formatos | 8 | 5 → 8 |
| HU12 | Similar a HU02: consulta con detalle por persona | 3 | 2 → 3 |

## 6. Revisión INVEST

✔ = cumple. ✔* = la historia tiene una dependencia declarada (columna «Depende de»); se puede desarrollar y probar por sí sola una vez terminada esa dependencia, y por eso se planificó en un sprint igual o posterior.

| Historia | I | N | V | E | S | T |
| --- | --- | --- | --- | --- | --- | --- |
| HU01 Iniciar sesión | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU02 Reservar mi almuerzo | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU03 Cancelar mi reserva | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU04 Ver almuerzos del día | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU05 Ver mis familiares | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU06 Reservar para un familiar | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU07 Registrar feriados | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU08 Pensionarme | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU09 Pensionar a un familiar | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU10 Avisar inasistencia | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU11 Reporte mensual | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |
| HU12 Ver mi consumo | ✔* | ✔ | ✔ | ✔ | ✔ | ✔ |

### Historias descartadas o reescritas (lo que no cumple INVEST)

| Historia mal planteada | Rompe | Cómo se corrigió |
| --- | --- | --- |
| «Como desarrollador, quiero consumir la API del sistema empresarial.» | V | Es una tarea técnica sin valor visible para el usuario: se incluyó como tareas dentro de HU01 (login) y HU05 (familiares). |
| «Como empleado, quiero gestionar las reservas y pensiones de toda mi familia.» | S, E | Demasiado grande para un sprint: se partió por función en HU05, HU06, HU09 y HU10 (ver, reservar, pensionar, avisar). |
| «Como empleado, quiero reservar 5 almuerzos para mi familia.» | T | No se puede verificar el mínimo de cada pensionado si la reserva no tiene nombre: se reemplazó por la reserva nominal de HU06. |
| «Como familiar, quiero ingresar al sistema para reservar mi almuerzo.» | V | Contradice R9 (los familiares no tienen acceso): se descartó; el titular reserva por ellos. |
| «Login» partido en «pantalla de login» y «servicio de autenticación». | V | Partir por capa técnica no entrega valor: HU01 se implementa completa, de punta a punta. |
| «Como encargado, quiero que el sistema calcule el cobro de forma justa.» | T | Se reemplazó por HU11, con montos verificables (15 Bs / 18 Bs por persona y total por titular). |

## 7. Control de cambios del backlog (v1 → v2)

Motivo del cambio: nuevos requisitos del Product Owner (familiares de primer grado, reserva nominal y login con la API del sistema empresarial).

| Versión 1 | Versión 2 | Qué cambió |
| --- | --- | --- |
| HU01 Ingresar con mis datos de empleado | HU01 Iniciar sesión con usuario del sistema empresarial | Reescrita: login real contra la API, con criterios de error, caída de la API, expiración y rol. 3 → 5 pts. |
| HU02 Registro mensual de pensionados | HU08 Pensionarme | Fusionada: describía lo mismo que la HU07 de la v1 (rompía la I de INVEST). |
| HU03 Reservar almuerzo | HU02 Reservar mi almuerzo | Sin cambio de fondo; la reserva queda a nombre de la persona. |
| HU04 Cancelar reserva | HU03 Cancelar mi reserva | Sin cambio; se corrigió la dependencia (antes apuntaba a HU02). |
| HU05 Ver almuerzos del día | HU04 Ver almuerzos del día | La lista muestra tipo (empleado/familiar) y titular. |
| HU06 Registrar feriados | HU07 Registrar feriados | Sin cambio; aplica a pensionados empleados y familiares. |
| HU07 Pensionarse | HU08 Pensionarme | Fusionada con la HU02 de la v1. |
| HU08 Avisar inasistencia | HU10 Avisar inasistencia (por persona) | El mínimo de 10 se controla por persona. |
| HU09 Reporte mensual | HU11 Reporte por titular | Agrupa por titular con detalle por persona. 5 → 8 pts. |
| HU10 Ver mi consumo | HU12 Ver mi consumo (y de mi familia) | Detalle por persona. 2 → 3 pts. |
| — | HU05 Ver mis familiares habilitados | Nueva: lista de familiares desde la API. |
| — | HU06 Reservar almuerzo para un familiar | Nueva: reserva nominal con tope. |
| — | HU09 Pensionar a un familiar | Nueva: pensión individual por familiar. |

### Inconsistencias de la versión 1 corregidas

- La HU02 de la v1 se titulaba «Reservar almuerzo» pero describía el registro de pensionados, igual que la HU07. Se fusionaron en la nueva HU08.
- Varias dependencias apuntaban a historias equivocadas (por ejemplo, «Cancelar reserva» dependía de HU02 y «Avisar inasistencia» de HU06). Se revisaron todas.
- Los rangos y las sumas del plan de sprints no coincidían con la tabla del backlog. Ahora el ID coincide con el orden de prioridad y cada sprint suma lo que indica.
- El login no tenía criterios para la integración con la API ni para sus errores. Ahora es una historia completa (HU01) con sus tareas técnicas.
- El ✔* de la revisión INVEST no estaba explicado. Ahora se aclara su significado.
