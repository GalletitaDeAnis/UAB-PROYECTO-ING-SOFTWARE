# Casos de uso

Sistema de reservas y pensionamiento de almuerzos · backlog final (HU01–HU11).

![Diagrama de casos de uso](diagrams/casos-de-uso.png)

Fuente del diagrama: [diagrams/render_diagramas.py](diagrams/render_diagramas.py) (`python render_diagramas.py` regenera los tres PNG).

## 1. Actores

| Actor | Tipo | Qué hace en el sistema |
| --- | --- | --- |
| Usuario | Actor general (abstracto) | Inicia sesión. Lo heredan los dos tipos de usuario (R2). |
| Usuario administrador | Especialización de Usuario | Registra, modifica y da de baja usuarios y familiares; publica el menú; ve los almuerzos del día; genera y exporta el reporte. |
| Usuario empleado | Especialización de Usuario | Consulta el menú; reserva, cancela, pensiona y avisa inasistencias para sí y sus familiares; consulta su consumo. |
| Familiar de primer grado | **No es actor** | Consume, pero no ingresa (R4). El empleado actúa a su nombre (R15). Por eso no aparece como actor en el diagrama, solo en la nota. |

No hay actores de sistema externo: el backlog final dejó la API empresarial fuera (ver [backlog.md](backlog.md), «Qué cambió»).

## 2. Relaciones del diagrama

| Relación | Tipo | Por qué |
| --- | --- | --- |
| Usuario administrador, Usuario empleado → Usuario | Generalización | Los dos inician sesión de la misma forma; cada uno agrega sus opciones. |
| CU01 → Validar credenciales y usuario activo | «include» | Siempre ocurre al ingresar (HU02 CA1, CA4, CA5). |
| Cambiar contraseña en el primer ingreso → CU01 | «extend» | Solo cuando la cuenta tiene la contraseña inicial o temporal (HU02 CA6, HU09 CA5). |
| CU02 → Validar datos obligatorios, duplicados y parentesco | «include» | Todo registro pasa por ahí (HU01 CA3, CA4, CA6). |
| CU03 → Confirmar almuerzos de los pensionados | «include» | Publicar siempre confirma a los pensionados de esos días (HU07 CA2). |
| CU12 → Confirmar almuerzos de los pensionados | «include» | Al pensionar se confirman los días con menú ya publicado del mes. |
| CU05 → Validar que quede un administrador activo | «include» | Cada cambio de tipo o baja lo comprueba (HU09 CA6). |
| Cambiar tipo, Restablecer contraseña, Anular reservas futuras → CU05 | «extend» | Variantes opcionales de la gestión; anular solo ocurre al dar de baja (HU09 CA2–CA5). |
| CU06, CU07 → Calcular montos por persona y total por titular | «include» | El reporte y el consumo usan la misma cuenta (`calcularDescuentos`). |
| Exportar en Excel o PDF → CU06 | «extend» | El administrador ve el reporte en pantalla y exporta solo si lo pide (HU10 CA3). |
| CU09 → Validar una por persona por día y tope diario | «include» | HU04 CA3, CA4. |
| CU09, CU10, CU11 → Validar día con menú y hora límite (9:00) | «include» | La misma regla R7 + R9 en los tres. |
| CU11 → Validar mínimo de almuerzos por persona | «include» | HU08 CA2, CA6. |
| CU12 → Validar plazo y pensión no duplicada | «include» | HU07 CA4, CA5. |

Un rechazo (las 9:00, el tope, el mínimo) **no** es un «extend»: es un flujo alternativo del caso que lo valida.

## 3. Trazabilidad

| Caso de uso | Historia | Actor | Caso de uso en código | Pantalla / API |
| --- | --- | --- | --- | --- |
| CU01 Iniciar sesión | HU02 | Usuario | `IniciarSesion`, `CambiarContrasena`, `ValidarSesion` | `/`, `/contrasena`; `iniciarSesion`, `cambiarContrasena` |
| CU02 Registrar usuario y su grupo familiar | HU01 | Administrador | `RegistrarUsuario` | `/usuarios/nuevo`; `registrarUsuario` |
| CU03 Publicar el menú semanal | HU03 | Administrador | `PublicarMenu` | `/menu`; `publicarMenu` |
| CU04 Ver almuerzos confirmados del día | HU06 | Administrador | `VerListaDelDia` | `/dia`; `listaDelDia` |
| CU05 Modificar o dar de baja usuarios y familiares | HU09 | Administrador | `ListarUsuarios`, `AgregarFamiliar`, `ModificarDatos`, `CambiarTipoUsuario`, `DarDeBaja`, `RestablecerContrasena` | `/usuarios/:id`; mutaciones de HU09 |
| CU06 Generar reporte mensual | HU10 | Administrador | `GenerarReporteMensual`, `ExportarReporteMensual` | `/reporte`, `/api/reportes/…`; `reporteMensual` |
| CU07 Consultar mi consumo del mes | HU11 | Empleado | `VerMiConsumo` | `/consumo`; `miConsumo` |
| CU08 Consultar el menú semanal | HU03 CA1 | Empleado | `VerMenuSemanal` | `/inicio`; `menuSemanal` |
| CU09 Reservar almuerzo | HU04 | Empleado | `ReservarAlmuerzo` | `/inicio`; `reservarAlmuerzo` |
| CU10 Cancelar reserva | HU05 | Empleado | `CancelarReserva` | `/inicio`; `cancelarReserva` |
| CU11 Avisar inasistencia de un pensionado | HU08 | Empleado | `AvisarInasistencia` | `/inicio`; `avisarInasistencia` |
| CU12 Pensionar | HU07 | Empleado | `Pensionar` | `/pension`; `pensionar` |

Las 11 historias tienen al menos un caso de uso y cada caso de uso viene de una historia.

## 4. Descripción de los casos de uso

### CU01 – Iniciar sesión (HU02)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario (administrador o empleado) |
| Precondición | El administrador registró al usuario (CU02). |
| Flujo principal | 1. El usuario escribe su nombre de usuario y contraseña. 2. El sistema busca la cuenta y compara la contraseña con su hash (include «Validar credenciales»). 3. Comprueba que la persona está activa. 4. Crea una sesión: guarda el hash de un token aleatorio y la hora de la última actividad. 5. Muestra las opciones de su tipo: el administrador va a Usuarios, el empleado a Reservas. |
| Extensión | 4a. Si la cuenta tiene la contraseña inicial o una temporal, el sistema solo permite cambiarla (extend «Cambiar contraseña en el primer ingreso»): pide la actual, la nueva (8 caracteres, letras y números) y su confirmación. Después continúa en 5. |
| Alternativos | 2a. Usuario inexistente o contraseña incorrecta: «Usuario o contraseña incorrectos». 3a. Dado de baja: «Tu usuario fue dado de baja. No puedes ingresar.». 6a. Treinta minutos sin actividad: la sesión se elimina y se pide ingresar de nuevo. |
| Postcondición | Sesión activa; cada pedido renueva los 30 minutos. |

### CU02 – Registrar usuario y su grupo familiar (HU01)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario administrador |
| Flujo principal | 1. El administrador abre «Registrar usuario». 2. Escribe nombres, apellidos, CI, fecha de nacimiento y teléfono; código de empleado, nombre de usuario, contraseña inicial y tipo. 3. Si es empleado, agrega familiares con sus datos y parentesco. 4. El sistema valida (include): datos obligatorios y formato, parentesco de primer grado, un solo cónyuge/padre/madre, CI único entre todas las personas y dentro del formulario, código y nombre de usuario únicos. 5. Guarda persona, cuenta y familiares en una sola transacción. La cuenta queda con «debe cambiar la contraseña». 6. Muestra la ficha con el tope diario. |
| Alternativos | 4a. Un dato falta o es inválido: se indica cuál y no se guarda nada; el formulario conserva lo escrito. 4b. Tipo administrador con familiares: se rechaza (D7). |
| Postcondición | El usuario puede ingresar; sus familiares aparecen para reservar y pensionar, sin credenciales. |

### CU03 – Publicar el menú semanal (HU03)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario administrador |
| Flujo principal | 1. Elige la semana (por defecto, la próxima). 2. Escribe el menú de cada día de lunes a jueves; deja vacío el que no tendrá atención. 3. Publica. 4. El sistema valida que la semana no terminó, que no está publicada y que los días son lunes a jueves de esa semana y no pasaron. 5. Calcula, para cada pensionado activo del mes, un almuerzo confirmado a 15 Bs en cada día publicado (include). 6. Guarda el menú y esos almuerzos en una transacción. |
| Alternativos | 4a. Ya publicada: «no se puede modificar». 4b. Viernes a domingo: se rechaza. 4c. Ningún día con menú: se pide al menos uno. |
| Postcondición | Los días publicados admiten reservas; los demás de esa semana son «Sin atención». |

### CU04 – Ver almuerzos confirmados del día (HU06)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario administrador |
| Flujo principal | 1. Elige el día (por defecto hoy). 2. El sistema lista las reservas confirmadas: nombre, tipo (empleado o familiar y parentesco), usuario titular y modalidad, con el total y el menú del día. |
| Alternativos | 2a. Sin menú: «Sin atención» y total 0. 2b. Fecha inválida: se informa. |

### CU05 – Modificar o dar de baja usuarios y familiares (HU09)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario administrador |
| Flujo principal | 1. Abre la lista de usuarios y elige uno. 2. Ve sus datos, tipo, estado y grupo familiar con el tope. 3. Corrige datos personales o el parentesco de un familiar (CI sin repetir), o agrega un familiar (el tope sube en uno). |
| Extensiones | **Cambiar tipo**: rige desde el siguiente pedido del usuario. **Restablecer contraseña**: genera una temporal de 10 caracteres, la muestra una sola vez, cierra sus sesiones y exige cambiarla al ingresar. **Dar de baja** (extend «Anular reservas futuras»): el usuario y su grupo familiar, o solo un familiar, quedan inactivos; sus reservas que todavía se podían cancelar se anulan sin cobro; lo ya consumido sigue en el reporte; se cierran sus sesiones. |
| Include | Antes de cambiar el tipo o dar de baja a un administrador, se valida que quede otro administrador activo (R3). |
| Alternativos | Último administrador: «Debe quedar al menos un usuario administrador activo». Persona ya dada de baja: se informa. |

### CU06 – Generar reporte mensual (HU10)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario administrador |
| Flujo principal | 1. Elige el mes. 2. El sistema toma las reservas del mes y, por titular, suma lo confirmado por persona y modalidad (include «Calcular montos»): cantidad × precio = subtotal, y el total por titular. 3. Incluye a todos los usuarios empleados activos, también con 0 Bs, y a cualquier titular con consumo aunque esté de baja. 4. Muestra el reporte y el total del mes. |
| Extensión | Exportar en Excel o PDF: el archivo trae exactamente las mismas filas. |

### CU07 – Consultar mi consumo del mes (HU11)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario empleado |
| Flujo principal | 1. Elige el mes. 2. El sistema muestra, por persona de su grupo, los almuerzos y el subtotal (la misma cuenta del reporte), el total a descontar y, para cada pensionado, programados, mínimo e inasistencias disponibles. 3. Lista los días «Sin atención – no se cobra». |

### CU08 – Consultar el menú semanal (HU03 CA1)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario empleado |
| Flujo principal | El sistema muestra la semana actual y la siguiente, día por día: el menú, «Sin atención» si la semana se publicó sin ese día, o «Menú pendiente» si todavía no se publicó. |

### CU09 – Reservar almuerzo (HU04)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario empleado |
| Flujo principal | 1. Marca a quiénes reserva: él y/o sus familiares activos (CA7). 2. Elige un día con menú. 3. El sistema valida para todos: fecha válida, no pasada, lunes a jueves, con menú y antes de las 9:00 (include). 4. Para cada persona valida que no tenga ya un almuerzo ese día, que no sea pensionada de ese mes y que no se pase el tope diario (include). 5. Registra una reserva a 18 Bs por persona con él como titular e informa el resultado de cada una. |
| Alternativos | 3a. Sin menú: «Ese día no hay atención». 3b. 9:00 o más: «El horario de reservas cerró a las 9:00». 4a. Una persona no se puede reservar: se informa su motivo y las demás siguen. |

### CU10 – Cancelar reserva (HU05)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario empleado |
| Flujo principal | 1. En sus reservas del mes elige «Cancelar» en la de una persona. 2. El sistema valida que la persona esté a su cargo, que la reserva esté confirmada y sea no pensionada, y la hora límite (include). 3. La marca cancelada: no se cobra. |
| Alternativos | 2a. 9:00 o más: no se cancela y se informa que se cobrará. 2b. Almuerzo de pensión: se indica avisar la inasistencia (CU11). |

### CU11 – Avisar inasistencia de un pensionado (HU08)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario empleado |
| Flujo principal | 1. Elige «Avisar que no asistirá» en el almuerzo de pensión de una persona. 2. El sistema valida la hora límite (include) y que la persona, con este aviso, no quede por debajo de su mínimo del mes (include): mínimo = 10, o los días con menú si son menos. 3. Marca el almuerzo como inasistencia avisada e informa cuántos programados le quedan. |
| Alternativos | 2a. Quedaría bajo el mínimo: se rechaza con los números de esa persona. 2b. 9:00 o más: se cobra. |

### CU12 – Pensionar (HU07)

| Campo | Descripción |
| --- | --- |
| Actor | Usuario empleado |
| Precondición | Es un día del mes anterior al de la pensión. |
| Flujo principal | 1. Marca a quiénes pensiona para el mes siguiente. 2. El sistema valida el plazo (include) y, por persona, que no tenga ya pensión y que no se pase el tope. 3. Registra una pensión por persona a 15 Bs y confirma sus almuerzos en los días de ese mes con menú ya publicado (include «Confirmar almuerzos»). Los demás días se confirman al publicarse cada menú (CU03). |
| Alternativos | 2a. El mes ya empezó: se rechaza. 2b. Ya pensionada: no se duplica; las demás siguen. |
