# Product backlog (versión final)

Sistema de reservas y pensionamiento de almuerzos · Restaurante de la Unión Boliviana.
Fuente: documento del equipo «practica_producto_B_backlog_final». Este archivo agrega la columna **Prueba** (qué prueba automática verifica cada criterio) y las decisiones que el código tuvo que tomar donde el texto no alcanzaba.

## Qué cambió respecto de la versión 2

| Versión 2 | Versión final | Motivo |
| --- | --- | --- |
| El ingreso usaba el usuario de la API del sistema empresarial; la API entregaba empleados y familiares. | **HU01**: el administrador registra usuarios y familiares en la base propia. **HU02**: usuario y contraseña propios, cambio obligatorio en el primer ingreso. | TI no entregó la API. El Product Owner decidió registrar en el sistema (R3, R5). |
| HU07 Registrar feriados del mes. | **HU03** Publicar el menú semanal. Un día sin menú no tiene atención (R6, R7). | El menú cubre el caso del feriado y además informa qué se sirve. |
| HU05 Ver mis familiares habilitados (copia de la API). | Los familiares los gestiona el administrador (HU01, **HU09**). | Ya no hay fuente externa. |
| HU08 Pensionarme + HU09 Pensionar a un familiar. | **HU07** Pensionar (para sí o para uno o varios familiares). | Misma regla y misma pantalla: eran una sola historia partida (rompía la I de INVEST). |
| HU02 Reservar mi almuerzo + HU06 Reservar para un familiar. | **HU04** Reservar almuerzo. | Mismo motivo. |
| — | **HU09** Modificar o dar de baja usuarios y familiares. | Nueva: con registro propio hace falta mantenerlo. |

El control de cambios de v1 → v2 está en el historial de Git (`git log -- entregables/backlog.md`).

## 1. Contexto y visión

| Aspecto | Descripción |
| --- | --- |
| Problema | Las reservas se coordinan por WhatsApp. Es difícil saber cuántos almuerzos preparar, qué días hay atención, controlar las reglas de los pensionados y calcular a fin de mes cuánto descontar a cada empleado por lo suyo y lo de sus familiares. |
| Usuarios | **Usuario administrador** (encargado del restaurante): gestiona usuarios y familiares, publica el menú, ve los almuerzos del día y genera el reporte. **Usuario empleado**: reserva, cancela, se pensiona y avisa inasistencias para sí y sus familiares, y consulta su consumo. |
| Beneficiarios (no usuarios) | Familiares de primer grado. Consumen, pero no ingresan: el usuario empleado actúa a su nombre. |
| Propuesta de valor | Usuarios, menú, reservas y pensiones por persona en un solo lugar, con precios y reglas automáticos y un reporte listo para planilla. |
| Fuera del alcance | Acceso de familiares, autorregistro, pagos en línea, notificaciones y envío automático a planilla (el reporte se entrega en Excel y PDF). |

### Reglas del negocio

| # | Regla | Dónde está en el código |
| --- | --- | --- |
| R1 | Solo almuerzos, de lunes a jueves, para empleados y familiares de primer grado registrados. No es obligatorio ni gratuito. | `tiempo.ts` `esLunesAJueves` |
| R2 | Dos tipos de usuario: administrador y empleado. Cada uno accede solo a sus opciones. | `comun.ts` `sinPermiso` |
| R3 | Solo el administrador registra, modifica y da de baja. El primero se crea al instalar; siempre queda al menos uno activo. | `registrarUsuario.ts`, `gestionarUsuarios.ts`, `prisma/seed.ts` |
| R4 | Familiares de primer grado (cónyuge, hijo/hija, padre, madre) con los mismos datos personales. No ingresan. Un CI no se repite. | `modelo.ts` `PARENTESCOS`, `errorEnDatos`; `ci` único en la base |
| R5 | Se ingresa con usuario y contraseña asignados; se cambia en el primer ingreso. Solo usuarios activos. | `iniciarSesion.ts`, `cambiarContrasena.ts` |
| R6 | Cada domingo se publica el menú de lunes a jueves. Publicado no se modifica. Solo los días con menú tienen atención. | `menu.ts` `PublicarMenu` |
| R7 | Un día sin menú no admite reservas, no confirma pensionados, no se cobra y no es falta. | `reservarAlmuerzo.ts`; llave foránea `reserva.fecha → menu_dia` |
| R8 | No pensionado: 18 Bs, un almuerzo por persona por día. | `modelo.ts` `precioDe`; `CHECK reserva_precio_valido` |
| R9 | Reservar, cancelar y avisar, hasta las 9:00 del día. | `tiempo.ts` `admiteCambio` |
| R10 | Pensionado: 15 Bs, por persona, antes de que inicie el mes. Se confirma solo en cada día con menú. | `pensionar.ts`, `menu.ts` |
| R11 | Mínimo 10 almuerzos por pensionado en el mes, sobre días con menú; si hay menos de 10 días, el mínimo es ese total. | `modelo.ts` `minimoDelMes` |
| R12 | Se avisa la inasistencia de un pensionado; no se cobra. No si queda por debajo de su mínimo. | `avisarInasistencia.ts` |
| R13 | Confirmado y no cancelado a tiempo se descuenta aunque no asista. | `modelo.ts` `cuentaParaCobro` |
| R14 | Tope diario = 1 + familiares activos (también para pensionados). | `modelo.ts` `topeDiario` |
| R15 | Toda reserva y pensión es nominal. | `comun.ts` `personaACargo` |
| R16 | Los familiares pagan lo mismo; todo se descuenta al titular. | `Reserva.titularId` |
| R17 | Reporte mensual en Excel y PDF con todos los usuarios empleados, también los sin consumo, y el detalle por persona. | `reporteMensual.ts`, `exportadores.ts` |

### Decisiones tomadas al implementar (validar con el Product Owner)

El backlog no las fija; el código eligió lo más simple que cumple los criterios. Cada una se cambia en un solo lugar.

| # | Pregunta | Decisión | Dónde cambiarla |
| --- | --- | --- | --- |
| D1 | ¿Se puede publicar el menú otro día que no sea domingo? | Sí, mientras la semana no haya terminado y sin incluir días ya pasados. El domingo es la costumbre, no un bloqueo. | `PublicarMenu` |
| D2 | ¿Se publica una semana sin ningún día? | No: al menos un día. Una semana sin atención simplemente no se publica. | `PublicarMenu` |
| D3 | ¿«Antes de que inicie el mes» admite pedir con dos meses de anticipación? | No: solo el mes siguiente, hasta el último día del mes anterior. | `tiempo.ts` `esMesSiguiente` |
| D4 | ¿Cómo se cuenta el mínimo si solo se publicaron algunas semanas? | Sobre los días con menú publicados hasta ese momento: mínimo = min(10, días con menú). A comienzos de mes hay menos avisos disponibles; crecen al publicar. | `minimoDelMes` |
| D5 | Contraseña | Al menos 8 caracteres, con letras y números. Se guarda con scrypt y sal. | `cambiarContrasena.ts` |
| D6 | ¿Puede haber dos cónyuges, dos padres o dos madres? | No. Hijos sin límite. | `registrarUsuario.ts` `UNICOS` |
| D7 | ¿El administrador tiene grupo familiar? | No: no reserva (R2). Si un empleado pasa a administrador, sus familiares quedan registrados. | `RegistrarUsuario`, `AgregarFamiliar` |
| D8 | ¿Qué reservas anula una baja? | Las que todavía se podían cancelar: desde hoy si es antes de las 9:00, si no desde mañana. | `DarDeBaja` |
| D9 | ¿Un titular dado de baja con consumo en el mes sale en el reporte? | Sí: su consumo anterior se descuenta igual (HU09 CA2). | `GenerarReporteMensual` |
| D10 | ¿Puede un pensionado reservar como no pensionado un día en que avisó inasistencia? | No: un almuerzo por persona por día en su mes de pensión. | `ReservarAlmuerzo` |

## 2. Product backlog priorizado

Ordenado por valor, esfuerzo y dependencias; el número coincide con el orden. Planning Poker con la escala 1, 2, 3, 5, 8, 13. Total: **48 puntos**.

| ID | Historia | Valor | Esfuerzo | Pts | Depende de | Sprint |
| --- | --- | --- | --- | --- | --- | --- |
| HU01 | Registrar usuario y su grupo familiar | Alto | Medio | 5 | — | S1 |
| HU02 | Iniciar sesión | Alto | Bajo | 3 | HU01 | S1 |
| HU03 | Publicar el menú semanal | Alto | Bajo | 3 | HU02 | S1 |
| HU04 | Reservar almuerzo | Alto | Medio | 5 | HU01, HU03 | S2 |
| HU05 | Cancelar reserva | Alto | Bajo | 3 | HU04 | S2 |
| HU06 | Ver almuerzos confirmados del día | Alto | Bajo | 2 | HU04 | S2 |
| HU07 | Pensionar | Alto | Alto | 8 | HU01, HU03 | S3 |
| HU08 | Avisar inasistencia de un pensionado | Alto | Medio | 5 | HU07 | S3 |
| HU09 | Modificar o dar de baja usuarios y familiares | Medio | Bajo | 3 | HU01 | S4 |
| HU10 | Generar reporte mensual | Alto | Alto | 8 | HU04, HU05, HU07, HU08 | S4 |
| HU11 | Consultar mi consumo del mes | Medio | Bajo | 3 | HU04, HU07 | S4 |

### Plan de sprints

| Sprint | Objetivo (Sprint Goal) | Historias | Puntos |
| --- | --- | --- | --- |
| 1 | El administrador registra usuarios con su grupo familiar y publica el menú; cada usuario ingresa y ve las opciones de su tipo. | HU01–HU03 | 11 |
| 2 | El empleado reserva y cancela para sí y su familia; el administrador sabe cuántos almuerzos preparar. | HU04–HU06 | 10 |
| 3 | El empleado pensiona a cada persona y avisa inasistencias respetando el mínimo. | HU07–HU08 | 13 |
| 4 | El administrador mantiene los usuarios y obtiene el reporte; el empleado consulta su consumo. | HU09–HU11 | 14 |

La rúbrica tiene tres entregas (sesiones 6, 10 y 13) y el Demo Day. Cómo se reparten los cuatro sprints en esas fechas está en [entregas.md](entregas.md).

### Justificación del orden

- **HU01 primero**: sin usuarios no hay ingreso, reserva ni a quién descontar.
- **HU02 y HU03 completan el Sprint 1**: el ingreso habilita las opciones por tipo y sin menú no hay días para reservar.
- **Sprint 2 resuelve el problema principal**: reservar, cancelar y conocer el total del día reemplaza a WhatsApp.
- **La pensión (Sprint 3) depende del menú**: los almuerzos se confirman sobre los días publicados.
- **HU09 se posterga**: al inicio basta registrar; mantener hace falta con el sistema en uso.
- **El reporte va al final**: necesita reservas, pensiones e inasistencias.

## 3. Historias de usuario y criterios de aceptación

Formato Como / Quiero / Para que; criterios Dado que / Cuando / Entonces. La columna **Prueba** nombra el archivo de `tests/` y el caso que empieza con el número del criterio.

### HU01 – Registrar usuario y su grupo familiar · 5 pts

**Como** usuario administrador **quiero** registrar a un empleado como usuario, asignarle su tipo y registrar a sus familiares de primer grado **para que** pueda ingresar y reservar para sí y sus familiares.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | el administrador ingresa datos personales, código, usuario, contraseña inicial y tipo | guarda | se crea el usuario activo con ese tipo | `hu01` CA1 |
| CA2 | registra a un usuario empleado | agrega familiares con datos y parentesco | quedan como su grupo familiar y se calcula el tope diario | `hu01` CA2 |
| CA3 | ya existe el mismo CI, código o nombre de usuario | intenta guardar | se rechaza e indica el dato duplicado | `hu01` CA3 (×3) |
| CA4 | registra un familiar | elige el parentesco | solo cónyuge, hijo/hija, padre o madre | `hu01` CA4 (×2) |
| CA5 | registra un familiar | guarda | queda sin credenciales de acceso | `hu01` CA5 |
| CA6 | falta un dato obligatorio | intenta guardar | se indica el dato y no se guarda | `hu01` CA6; formatos inválidos |

### HU02 – Iniciar sesión · 3 pts (referencia del Planning Poker)

**Como** usuario del sistema **quiero** ingresar con mi usuario y contraseña **para que** acceda a las opciones de mi tipo y mis operaciones queden a mi nombre.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | está activo y las credenciales son correctas | «Ingresar» | entra y ve las opciones de su tipo | `hu02` CA1; `web` CA2 y CA3 |
| CA2 | es administrador | ingresa | ve usuarios, menú, almuerzos del día y reporte | `hu02` CA2; `web` |
| CA3 | es empleado | ingresa | ve reserva, pensión, inasistencias y consumo, no las del administrador | `hu02` CA3; `web`; `api.graphql` FORBIDDEN |
| CA4 | la contraseña es incorrecta | «Ingresar» | «Usuario o contraseña incorrectos» y no entra | `hu02` CA4; `web` CA4 |
| CA5 | fue dado de baja | intenta ingresar | no entra | `hu02` CA5; `hu09` CA3 |
| CA6 | ingresa por primera vez con la contraseña inicial | entra | debe cambiarla antes de continuar | `hu02` CA6 (×2); `web` CA6; `api.graphql` CA6 |
| CA7 | pasa 30 minutos sin actividad | intenta operar | se pide ingresar de nuevo | `hu02` CA7 (29 y 30 min) |

### HU03 – Publicar el menú semanal · 3 pts

**Como** usuario administrador **quiero** publicar cada domingo el menú de cada día con atención **para que** los empleados conozcan días y menú, y los días sin menú no se reserven ni se cobren.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | es domingo | registra el menú de lunes a jueves y publica | los empleados ven cada día y pueden reservar | `hu03` CA1 |
| CA2 | un día no tendrá atención | publica sin ese día | se muestra «Sin atención», no admite reservas, no se cobra ni es falta | `hu03` CA2 (×2) |
| CA3 | registra el menú | intenta incluir viernes a domingo | solo lunes a jueves | `hu03` CA3 |
| CA4 | el menú ya fue publicado | intenta modificarlo | no se permite | `hu03` CA4; `web` HU03 |
| CA5 | un día no figura en el menú | un empleado intenta reservar | se indica que no hay atención | `hu03` CA5 |

### HU04 – Reservar almuerzo · 5 pts

**Como** usuario empleado **quiero** reservar para mí o para uno o varios familiares en un día con menú **para que** cada persona tenga su almuerzo sin coordinar por WhatsApp.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | día con menú, antes de las 9:00, sin reserva | confirma para sí | queda a su nombre a 18 Bs | `hu04` CA1 |
| CA2 | día con menú, antes de las 9:00 | elige uno o varios familiares | una reserva por familiar a 18 Bs, con él como titular | `hu04` CA2; `web` HU04 |
| CA3 | la persona ya tiene reserva | intenta reservar otra vez | no se duplica | `hu04` CA3 (×2) |
| CA4 | todos los del grupo ya reservaron | intenta otra | se alcanzó el tope diario | `hu04` CA4 (×3) |
| CA5 | son las 9:00 o más | intenta reservar ese día | horario cerrado, no se registra | `hu04` CA5 (8:59 y 9:00) |
| CA6 | el día no tiene menú | intenta reservar | no hay atención | `hu04` CA6; `web` CA6 |
| CA7 | inicia una reserva | elige la persona | solo él y sus familiares activos | `hu04` CA7 |

### HU05 – Cancelar reserva · 3 pts

**Como** usuario empleado **quiero** cancelar la reserva propia o de un familiar **para que** no se descuente un almuerzo que no se consumirá.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | reserva propia, antes de las 9:00 | cancela | se anula y no entra al reporte | `hu05` CA1 |
| CA2 | reservas propia y del familiar, antes de las 9:00 | cancela la del familiar | solo esa se anula | `hu05` CA2 |
| CA3 | son las 9:00 o más | intenta cancelar | no se permite e informa que se cobrará | `hu05` CA3 (×2) |
| CA4 | tenía reserva, no canceló ni asistió | se genera el reporte | se descuentan 18 Bs al titular | `hu05` CA4 |

### HU06 – Ver almuerzos confirmados del día · 2 pts

**Como** usuario administrador **quiero** ver la lista y el total de almuerzos confirmados del día **para que** prepare la cantidad justa.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | día con menú y reservas | consulta después de las 9:00 | total y, por persona, nombre, tipo, titular y modalidad | `hu06` CA1; `web` HU06 |
| CA2 | una reserva se canceló antes de las 9:00 | consulta | no aparece ni cuenta | `hu06` CA2 |
| CA3 | el día no tiene menú | consulta | «Sin atención» y total cero | `hu06` CA3; `web` HU06 |

### HU07 – Pensionar · 8 pts

**Como** usuario empleado **quiero** pensionarme o pensionar a uno o varios familiares para el mes siguiente **para que** el almuerzo de cada pensionado se confirme solo a 15 Bs en cada día con menú.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | el mes siguiente no inició | elige personas y confirma | una pensión por persona a 15 Bs, con él como titular | `hu07` CA1 |
| CA2 | una persona está pensionada | el administrador publica el menú | se confirma su almuerzo en cada día con menú y aparece como pensionada | `hu07` CA2 (×2); `hu03` HU07 CA2 |
| CA3 | está pensionada | un día no tiene menú | no se confirma, no se cobra ni es falta | `hu07` CA3 |
| CA4 | el mes ya inició | intenta pensionar para ese mes | se rechaza | `hu07` CA4 (×2) |
| CA5 | ya tiene pensión ese mes | intenta otra vez | no se duplica | `hu07` CA5 |
| CA6 | él no está pensionado | pensiona solo a un familiar | se registra de forma independiente | `hu07` CA6 |
| CA7 | tiene almuerzo confirmado como pensionado | intenta una reserva adicional | no se permite | `hu04` HU07 CA7; `hu07` CA7 |

### HU08 – Avisar inasistencia de un pensionado · 5 pts

**Como** usuario empleado **quiero** avisar que un pensionado a mi cargo no asistirá **para que** ese almuerzo no se cuente ni se descuente.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | tiene más programados que su mínimo, antes de las 9:00 | avisa | se libera ese almuerzo sin tocar a los demás | `hu08` CA1; `web` HU08 |
| CA2 | al familiar le quedan exactamente 10 y al titular más | intenta otro aviso del familiar | no se permite: el mínimo es por persona | `hu08` CA2 (10 y 11) |
| CA3 | son las 9:00 o más | intenta avisar | no se permite e informa que se cobrará | `hu08` CA3 |
| CA4 | no avisó y no asistió | se genera el reporte | se descuentan 15 Bs | `hu08` CA4; `hu10` CA2 |
| CA5 | un día no tuvo menú | se calculan los programados | no es inasistencia ni gasta avisos | `hu08` CA5 |
| CA6 | el mes tiene menos de 10 días con menú | se controla el mínimo | el mínimo es el total de días con menú | `hu08` CA6; `calendario` R11 |

### HU09 – Modificar o dar de baja usuarios y familiares · 3 pts

**Como** usuario administrador **quiero** modificar datos y tipo, dar de baja y restablecer contraseñas **para que** solo las personas vigentes usen el servicio con los permisos correctos.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | existe un usuario empleado | agrega un familiar | queda disponible y el tope sube en uno | `hu09` CA1 (×2) |
| CA2 | un familiar tiene reservas futuras | lo da de baja | se anulan sin cobro, deja de mostrarse y se conserva su consumo anterior | `hu09` CA2 (×2); `hu10` HU09 CA2 |
| CA3 | dio de baja a un usuario | ese usuario intenta ingresar | no entra y su grupo familiar queda inactivo | `hu09` CA3 |
| CA4 | cambió un empleado a administrador | ese usuario vuelve | ve las opciones de administrador | `hu09` CA4 |
| CA5 | un usuario olvidó su contraseña | el administrador la restablece | contraseña temporal y cambio en el siguiente ingreso | `hu09` CA5; `web` HU09 |
| CA6 | hay un solo administrador activo | se intenta dar de baja o cambiar su tipo | no se permite | `hu09` CA6 (×3) |

### HU10 – Generar reporte mensual · 8 pts

**Como** usuario administrador **quiero** generar al final del mes un reporte de todos los usuarios empleados con el detalle de cada persona **para que** se envíe a planilla.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | 12 pensionados propios, 10 de un familiar y 3 no pensionados de otro | genera el reporte | 12 × 15 = 180, 10 × 15 = 150, 3 × 18 = 54; total 384 Bs | `hu10` CA1 |
| CA2 | un pensionado no avisó ni asistió | se genera | el almuerzo está incluido | `hu10` CA2 |
| CA3 | el reporte está generado | exporta a Excel o PDF | titular, persona, parentesco, modalidad, cantidad, precio, subtotal y total por titular | `hu10` CA3; `exportadores` |
| CA4 | hubo días sin menú | se genera | no aparecen como almuerzo ni como falta | `hu10` CA4 |
| CA5 | un empleado no consumió | se genera | figura con 0 Bs | `hu10` CA5; `exportadores` CA5 |

### HU11 – Consultar mi consumo del mes · 3 pts

**Como** usuario empleado **quiero** consultar los almuerzos y el monto del mes, propios y de cada familiar, **para que** conozca lo que se me descontará.

| CA | Dado que | Cuando | Entonces | Prueba |
| --- | --- | --- | --- | --- |
| CA1 | 4 almuerzos no pensionados | consulta | 4 almuerzos y 72 Bs | `hu11` CA1 |
| CA2 | un pensionado a su cargo tiene 11 programados | consulta | puede avisar una inasistencia más | `hu11` CA2 |
| CA3 | consumo propio y de familiares | consulta | detalle por persona y total | `hu11` CA3 (×2) |
| CA4 | hubo días sin menú | consulta | «Sin atención – no se cobra» | `hu11` CA4 (×2) |

## 4. Estimación con Planning Poker

Referencia: HU02 Iniciar sesión = 3 puntos. Cada integrante vota a la vez (1, 2, 3, 5, 8, 13); si los votos difieren en más de un valor, el más alto y el más bajo explican y se vuelve a votar.

| Historia | Comparación con la referencia | Pts |
| --- | --- | --- |
| HU02 | Referencia | 3 |
| HU01 | Mayor: registro de usuario y familiares con varias validaciones | 5 |
| HU03 | Similar: formulario por día y reglas de publicación | 3 |
| HU04 | Mayor: varias personas, tope, hora límite y menú | 5 |
| HU05 | Similar: cancelación por persona con hora límite | 3 |
| HU06 | Menor: solo consulta | 2 |
| HU07 | Mayor que HU04: pensión por persona y confirmación con el menú | 8 |
| HU08 | Similar a HU04: mínimo por persona y hora límite | 5 |
| HU09 | Similar: modificación y baja sobre registros existentes | 3 |
| HU10 | Similar a HU07: cálculo por persona, agrupado, dos formatos | 8 |
| HU11 | Similar: consulta con detalle por persona | 3 |

> La evidencia de la votación (foto o acta) va en [entregas.md](entregas.md). Si una estimación cambió en la reunión, se corrige aquí y en el tablero.

## 5. Revisión INVEST

✓* = tiene una dependencia declarada; se desarrolla y prueba sola una vez hecha esa dependencia, por eso está en un sprint igual o posterior.

| Historia | I | N | V | E | S | T |
| --- | --- | --- | --- | --- | --- | --- |
| HU01 Registrar usuario y grupo familiar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU02 Iniciar sesión | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU03 Publicar el menú semanal | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU04 Reservar almuerzo | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU05 Cancelar reserva | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU06 Ver almuerzos del día | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU07 Pensionar | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU08 Avisar inasistencia | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU09 Modificar o dar de baja | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU10 Generar reporte mensual | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |
| HU11 Consultar mi consumo | ✓* | ✓ | ✓ | ✓ | ✓ | ✓ |

La T se comprueba en el repositorio: cada criterio tiene su prueba automática (columna **Prueba**).

### Historias que no cumplían INVEST y su corrección

| Historia mal planteada | Incumple | Corrección |
| --- | --- | --- |
| «Como administrador, quiero gestionar todo el sistema.» | S, E | Se dividió en HU01, HU03, HU06, HU09 y HU10. |
| «Como desarrollador, quiero crear las tablas de usuarios y familiares.» | V | Tarea técnica sin valor visible; es parte de HU01. |
| «Como familiar, quiero ingresar para reservar.» | V | Contradice R4: el empleado reserva por él (HU04). |
| «Como empleado, quiero reservar cinco almuerzos para mi familia.» | T | Sin reserva nominal no se verifica el mínimo por persona; se reemplazó por HU04. |
| «Como administrador, quiero que el cobro sea justo.» | T | No verificable; se reemplazó por HU10 con 15 Bs y 18 Bs por persona. |
