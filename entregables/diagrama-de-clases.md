# Diagrama de clases

Versión alineada con el backlog v2: familiares de primer grado, reserva y pensión nominales, y login con la API empresarial. El diagrama muestra lo que el sistema guarda y lo que calcula, con las multiplicidades que salen de las reglas. Las tablas concretas están en [base-de-datos.md](base-de-datos.md).

![Diagrama de clases](diagrams/clases.png)

Fuente editable: [diagrams/clases.puml](diagrams/clases.puml). Código: [src/dominio/modelo.ts](../src/dominio/modelo.ts) y [src/dominio/reporte.ts](../src/dominio/reporte.ts).

## Entidades

### Persona, Empleado y Familiar

`Persona` es quien consume un almuerzo. Es abstracta: siempre es un `Empleado` o un `Familiar`. La generalización existe porque R11 pide que cada almuerzo y cada pensión sean nominales, y R5 controla el mínimo de 10 por persona, no por familia. Así, `Almuerzo` y `Pension` apuntan a una `Persona` sin importar quién sea.

| Atributo | Para qué está |
| --- | --- |
| id | Código institucional del empleado o id del familiar en la API empresarial. |
| nombreCompleto | Lista del día, reporte y consumo. |
| vigente | Empleado: activo en el sistema empresarial. Familiar: vino en la última lectura de la API. Un familiar no vigente no se puede elegir, pero su historial se conserva. |
| parentesco (Familiar) | Lo decide el sistema empresarial (S2), no este sistema. |

Las dos son **copias** de la API empresarial (R1b). No hay alta ni contraseña. La copia se actualiza en cada inicio de sesión (HU05 CA3).

`Empleado 1 o-- 0..* Familiar`: un empleado tiene cero o más familiares a cargo, y cada familiar tiene un solo titular. Es agregación, no composición: el familiar existe en el sistema empresarial con independencia del restaurante. El tope diario de R10 sale de esta multiplicidad: `1 + familiares vigentes`.

### Autorizacion

Dato de este sistema, no de la API (pregunta abierta S4). Da el rol de encargado. Un empleado tiene como máximo una. Sin fila, es empleado.

### Sesion

La sesión propia del restaurante (HU01 CA5). Guarda el hash del token, nunca el token ni la contraseña, y la última actividad para vencerla a los 30 minutos. Un empleado puede tener varias abiertas (por ejemplo, celular y computadora).

### Pension

La pensión de **una persona** en un año y un mes (HU08, HU09). La pide el empleado titular para sí o para un familiar, y la pensión de cada persona es independiente (S3).

| Atributo | Para qué está |
| --- | --- |
| anio, mes | El mes pensionado. Con la persona, no se repiten (HU08 CA5, HU09 CA5). |
| solicitadaEl | Evidencia de que se pidió antes de que empezara el mes (HU08 CA4). |

`Pension 0..1 --> 0..* Almuerzo`: al confirmarla se generan los almuerzos del mes (R4). Un almuerzo esporádico no viene de ninguna pensión.

Si la solicitud se rechaza, no se guarda una pensión «rechazada»: no se crea la fila. Por eso no tiene estado.

### Almuerzo

Un almuerzo de una persona en una fecha. Cubre la reserva esporádica y el día generado por la pensión. Es lo que la cocina cuenta y lo que el reporte cobra.

| Atributo | Para qué está |
| --- | --- |
| fecha | El día de servicio. |
| origen | `ESPORADICO` o `PENSION`. Define el precio y si se cancela (HU03) o se avisa (HU10). |
| precioBs | 18 o 15, copiado al confirmar. Si la tarifa cambia, los meses cerrados no se reescriben. |
| estado | `CONFIRMADO`, `CANCELADO` o `INASISTENCIA_AVISADA`. |

Tiene **dos** asociaciones distintas:

- `Persona consume Almuerzo`: a nombre de quién está (R11). Es lo que cuenta para el mínimo de 10.
- `Empleado es titular del descuento de Almuerzo`: a quién se le descuenta (R8). Se copia al reservar, para que el descuento no cambie si la familia cambia después en la API.

No hay un estado «asistió». R7 cobra lo que sigue confirmado. El comedor no marca presencia.

`CANCELADO` es la reserva esporádica anulada a tiempo. `INASISTENCIA_AVISADA` es el día de pensión avisado a tiempo. Ninguno de los dos se cobra, pero son distintos: solo el segundo entra en la regla del mínimo de 10.

Hay un solo almuerzo por persona y fecha (R2). Cancelar y volver a reservar actualiza el mismo registro.

### Feriado

Un día de lunes a jueves sin servicio (HU07). No hay asociación con `Almuerzo`: el feriado significa que ese día no debe haber un almuerzo cobrable. El cálculo lo excluye aunque el feriado se haya cargado después de confirmar la pensión (HU07 CA2).

## Calculados, no guardados

### DescuentoTitular y LineaDescuento

Resultado de HU11 (y de HU12, para un solo titular). Se arma al pedir el reporte o el consumo y se descarta después. Guardarlo aparte duplicaría los almuerzos: si alguien corrige un feriado, el archivo viejo y la base dirían cosas distintas.

| DescuentoTitular | |
| --- | --- |
| codigoTitular, nombreTitular | A quién se descuenta por planilla. |
| lineas | Una por persona y modalidad. |
| totalBs | Suma de las líneas (HU11 CA1: 384 Bs). |

| LineaDescuento | |
| --- | --- |
| persona, parentesco | Quién consumió. |
| modalidad | Pensionado o no pensionado. |
| cantidad | Almuerzos confirmados que no son feriado. |
| precioUnitarioBs, subtotalBs | 15 o 18, y cantidad × precio. |

## Trazabilidad con el backlog

| Clase | Historias |
| --- | --- |
| Persona, Empleado | HU01, HU02, HU04 |
| Familiar | HU05, HU06, HU09 |
| Autorizacion | HU01 CA6 |
| Sesion | HU01 CA5 |
| Almuerzo | HU02, HU03, HU04, HU06, HU08, HU10 |
| Pension | HU08, HU09 |
| Feriado | HU07 |
| DescuentoTitular, LineaDescuento | HU11, HU12 |
