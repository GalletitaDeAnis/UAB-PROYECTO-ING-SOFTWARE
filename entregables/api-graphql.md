# API GraphQL

Contrato entre el backend y las pantallas. El frontend del equipo habla solo con este endpoint. No se conecta directo a la base de datos ni a la API empresarial.

| | |
| --- | --- |
| Endpoint | `POST http://localhost:3000/graphql` (en producción, la URL del servidor) |
| Explorador | Abrir `http://localhost:3000/graphql` en el navegador (GraphiQL, con autocompletado y documentación) |
| Esquema | [src/presentacion/graphql/esquema.ts](../src/presentacion/graphql/esquema.ts) |
| Fechas | Texto `"AAAA-MM-DD"`, siempre en hora de Bolivia |
| Montos | Bolivianos enteros (`15`, `18`, `384`) |

## Por qué la base no se consume directo

Las reglas del restaurante viven en el servidor: las 9:00, lunes a jueves, 18 y 15 Bs, el tope por familia, el mínimo de 10 y los feriados. Si una pantalla escribe directo en Supabase, puede guardar una reserva a las 10:00 o a 5 Bs y nadie la detiene. Por eso:

- todas las tablas tienen RLS activo y sin políticas, así que la API de datos de Supabase con la clave `anon` no lee ni escribe nada (ver [base-de-datos.md](base-de-datos.md));
- la única puerta es esta API, que pasa por los casos de uso.

La rúbrica marca como insuficiente la «lógica de negocio mezclada con interfaz o datos». Este diseño lo evita.

## Sesión: el token

1. La pantalla llama a `iniciarSesion` con usuario y contraseña del sistema empresarial.
2. Si `ok` es `true`, guarda `token` (en memoria o `sessionStorage`).
3. En cada pedido siguiente manda el encabezado:

   ```
   Authorization: Bearer <token>
   ```

4. Si pasa 30 minutos sin pedidos, el token vence (HU01 CA5). Cada pedido renueva los 30 minutos.
5. `cerrarSesion` invalida el token.

La contraseña va del navegador al backend y del backend a la API empresarial. El restaurante no la guarda. En la base queda solo el SHA-256 del token, así que quien lea la tabla no puede usar la sesión.

> El token de la API empresarial (el que devuelve `/auth/login` de TI) se queda en el backend. El frontend nunca lo ve. El que maneja la pantalla es el del restaurante.

### Ejemplo con `fetch`

```js
const API = "http://localhost:3000/graphql";

async function gql(query, variables = {}, token) {
  const respuesta = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await respuesta.json();
  if (errors?.[0]?.extensions?.code === "UNAUTHENTICATED") {
    // volver a la pantalla de ingreso, con errors[0].message
  }
  if (errors) throw new Error(errors[0].message);
  return data;
}

const { iniciarSesion } = await gql(
  `mutation ($u: String!, $c: String!) {
     iniciarSesion(usuario: $u, contrasena: $c) {
       ok mensaje token
       usuario { codigoInstitucional rol }
       familia { topeDiario titular { id nombreCompleto } familiares { id nombreCompleto parentesco } }
     }
   }`,
  { u: "pflores", c: "demo123" },
);
if (!iniciarSesion.ok) mostrarError(iniciarSesion.mensaje);
const token = iniciarSesion.token;
```

Si el frontend corre en otro puerto (Vite usa `5173`), su origen tiene que estar en `CORS_ORIGENES` del `.env` del backend.

## Cómo llegan los errores

| Caso | Qué recibe la pantalla | Qué hacer |
| --- | --- | --- |
| Regla de negocio en una **mutación** (las 9:00, viernes, duplicado, tope, mínimo de 10) | `ok: false` y `mensaje` listo para mostrar | Mostrar `mensaje` tal cual |
| Sin token o sesión vencida | `errors[0].extensions.code = "UNAUTHENTICATED"` | Ir al ingreso y mostrar `errors[0].message` |
| Un empleado pide algo del encargado | `code = "FORBIDDEN"` | No mostrar esa opción si `rol` no es `ENCARGADO` |
| Dato inválido en una **consulta** (mes 13, fecha mal escrita) | `code = "BAD_USER_INPUT"` con el mensaje | Mostrar el mensaje |
| Falla interna (base caída) | `"Unexpected error."` sin detalles | Mensaje genérico; el detalle queda en el log del servidor |

## Operaciones por historia

| HU | Operación | Quién |
| --- | --- | --- |
| HU01 | `iniciarSesion`, `cerrarSesion`, `yo` | Todos |
| HU02 | `reservarAlmuerzo(fecha)` | Empleado |
| HU03 | `cancelarReserva(fecha)` | Empleado |
| HU04 | `listaDelDia(fecha)` | Encargado |
| HU05 | `miFamilia` | Empleado |
| HU06 | `reservarAlmuerzo(fecha, personaId)`, `cancelarReserva(fecha, personaId)` | Empleado |
| HU07 | `registrarFeriado`, `feriados(anio, mes)` | Encargado registra; todos consultan |
| HU08 | `pensionar(anio, mes, personaIds: [mi código])`, `diasDeServicio` | Empleado |
| HU09 | `pensionar(anio, mes, personaIds: [familiares])` | Empleado |
| HU10 | `avisarInasistencia(fecha, personaId)` | Empleado |
| HU11 | `reporteMensual(anio, mes)` y descarga `GET /api/reportes/AAAA/M.xlsx` o `.pdf` | Encargado |
| HU12 | `miConsumo(anio, mes)` | Empleado |
| — | `hoy`: fecha de Bolivia y próximo día reservable (sin sesión) | Todos |
| — | `misAlmuerzos(anio, mes)`: «mis reservas» del titular y su familia | Empleado |

`personaId` es el `id` que llega en `miFamilia` (`titular.id` o `familiares[].id`). Si se omite, la operación es para quien inició sesión. No hay campo de nombre libre (R11): solo se puede elegir a alguien de esa lista.

## Ejemplos

### Pantalla principal del empleado

```graphql
query Inicio($anio: Int!, $mes: Int!) {
  hoy { fecha fechaSugerida horaLimite }
  yo { codigoInstitucional rol }
  miFamilia {
    topeDiario
    titular { id nombreCompleto }
    familiares { id nombreCompleto parentesco }
  }
  misAlmuerzos(anio: $anio, mes: $mes) {
    personaId nombrePersona fecha modalidad precioBs estado
  }
}
```

Para los botones de cada almuerzo:

- `estado = CONFIRMADO` y `modalidad = ESPORADICO`: «Cancelar» (`cancelarReserva`);
- `estado = CONFIRMADO` y `modalidad = PENSION`: «No asistirá» (`avisarInasistencia`).

### Reservar para un familiar (HU06)

```graphql
mutation {
  reservarAlmuerzo(fecha: "2026-10-27", personaId: "FAM-2002") {
    ok
    mensaje
    almuerzo { personaId fecha precioBs estado }
  }
}
```

### Pensión del mes siguiente (HU08 y HU09)

Primero se muestran los días y el monto (CU08 paso 3):

```graphql
{ diasDeServicio(anio: 2026, mes: 11) }
```

`diasDeServicio.length × 15` es el monto por persona. Después:

```graphql
mutation {
  pensionar(anio: 2026, mes: 11, personaIds: ["UB-103", "FAM-2001", "FAM-2002"]) {
    ok
    mensaje
    resultados { personaId ok mensaje diasConfirmados totalBs }
  }
}
```

Cada persona tiene su propio resultado. Si una no queda pensionada (por ejemplo, ya lo estaba), las demás sí quedan. En ese caso `ok` general es `false` y el detalle está en `resultados`.

### Avisar inasistencia (HU10)

```graphql
mutation {
  avisarInasistencia(fecha: "2026-11-03", personaId: "FAM-2002") {
    ok mensaje almuerzosRestantes
  }
}
```

### Mi consumo (HU12)

```graphql
{
  miConsumo(anio: 2026, mes: 11) {
    totalBs
    personas {
      persona { nombreCompleto parentesco }
      pensionado cantidad subtotalBs inasistenciasDisponibles
      lineas { modalidad cantidad precioUnitarioBs subtotalBs }
    }
  }
}
```

### Encargado: lista del día, feriados y reporte

```graphql
{
  listaDelDia(fecha: "2026-11-03") {
    total esFeriado
    filas { nombre tipoPersona parentesco nombreTitular modalidad }
  }
}
```

Si `total` es 0, la pantalla muestra «No hay almuerzos confirmados para hoy» (HU04 CA3). Si `esFeriado`, «Ese día es feriado».

```graphql
mutation { registrarFeriado(fecha: "2026-11-02", descripcion: "Todos Santos") { ok mensaje } }
```

```graphql
{
  reporteMensual(anio: 2026, mes: 10) {
    totalBs urlExcel urlPdf
    titulares {
      codigoTitular nombreTitular totalBs
      lineas { nombreCompleto tipo parentesco modalidad cantidad precioUnitarioBs subtotalBs }
    }
  }
}
```

### Descargar el archivo del reporte

GraphQL no devuelve archivos binarios. El reporte se descarga con un `GET` normal y el mismo token:

```js
const r = await fetch(`http://localhost:3000${reporte.urlExcel}`, {
  headers: { authorization: `Bearer ${token}` },
});
const blob = await r.blob();
const enlace = document.createElement("a");
enlace.href = URL.createObjectURL(blob);
enlace.download = "descuento-almuerzos.xlsx";
enlace.click();
```

Respuestas: `200` con el archivo, `401` sin sesión, `403` si no es encargado, `400` con un mes inválido.

## Usuarios de prueba

Con `EMPRESARIAL_SIMULADO=true` el backend trae una API empresarial simulada. La contraseña de todos es `demo123`.

| Usuario | Persona | Para probar |
| --- | --- | --- |
| `arojas` | Ana Rojas (UB-100), un hijo | Reserva propia y de un familiar |
| `pflores` | Pedro Flores (UB-103), cónyuge y 3 hijos | Tope de 5, pensión por persona, reporte de 384 Bs |
| `cmamani` | Carlos Mamani (UB-101), sin familiares | Tope 1 |
| `lquispe` | Laura Quispe (UB-102), inactiva | HU01 CA3: no entra |
| `evargas` | Elena Vargas (UB-200), encargada | Lista del día, feriados, reporte |
| `lento` | — | HU01 CA4: la API tarda más de 5 s |

Para probar la regla de las 9:00 sin esperar: `RELOJ_FIJO=2026-11-03T08:59` en el `.env` y reiniciar el servidor.
