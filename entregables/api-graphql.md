# API GraphQL

Contrato del backend para un frontend aparte. Las pantallas que sirve el propio servidor usan los mismos casos de uso, así que una regla se cumple igual por los dos caminos.

| | |
| --- | --- |
| Endpoint | `POST https://almuerzos-union-boliviana.onrender.com/graphql` (local: `http://localhost:3000/graphql`) |
| Explorador | Abrir la misma URL en el navegador: GraphiQL, con autocompletado y documentación del esquema |
| Esquema | [src/presentacion/graphql/esquema.ts](../src/presentacion/graphql/esquema.ts) |
| Fechas | Texto `"AAAA-MM-DD"`, en hora de Bolivia |
| Montos | Bolivianos enteros (`15`, `18`, `384`) |

## Por qué la base no se consume directo

Las reglas viven en el servidor: las 9:00, el menú publicado, 18 y 15 Bs, el tope por familia y el mínimo por pensionado. Si una pantalla escribiera directo en Supabase podría guardar una reserva a las 10:00 o a 5 Bs. Por eso todas las tablas tienen RLS activo y sin políticas (la API de datos de Supabase no ve nada) y la única puerta es esta API.

## Sesión

1. `iniciarSesion(usuario, contrasena)`. Si `ok` es `true`, guardar `token`.
2. En cada pedido: `Authorization: Bearer <token>`.
3. Si `usuario.debeCambiarContrasena` es `true`, todo responde `PASSWORD_CHANGE_REQUIRED` hasta llamar a `cambiarContrasena` (HU02 CA6).
4. Treinta minutos sin pedidos y el token vence (HU02 CA7). Cada pedido renueva el plazo.
5. `cerrarSesion` invalida el token.

```js
async function gql(query, variables, token) {
  const r = await fetch("/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  return r.json();
}

const { data } = await gql(
  `mutation ($u: String!, $c: String!) {
     iniciarSesion(usuario: $u, contrasena: $c) { ok mensaje token usuario { id tipo debeCambiarContrasena } }
   }`,
  { u: "pflores", c: "Demo2026" },
);
```

Si el frontend corre en otro origen, ese origen tiene que estar en `CORS_ORIGENES`.

## Cómo llegan los errores

| Caso | Forma | Qué hacer |
| --- | --- | --- |
| Una regla rechaza una **mutación** (9:00, tope, duplicado…) | `{ ok: false, mensaje: "…" }` | Mostrar `mensaje` tal cual. |
| Varias personas en una mutación (`reservarAlmuerzo`, `pensionar`) | `ok` es `false` si alguna falló; `resultados[]` trae `ok` y `mensaje` por persona | Mostrar el detalle por persona. |
| Una **consulta** con datos inválidos | `errors[0].extensions.code = "BAD_USER_INPUT"` | Mostrar `errors[0].message`. |
| Sin sesión o sesión vencida | `UNAUTHENTICATED` | Volver al ingreso. |
| Opción del otro tipo de usuario | `FORBIDDEN` | No mostrar esa opción. |
| Contraseña pendiente de cambio | `PASSWORD_CHANGE_REQUIRED` | Llevar a cambiar la contraseña. |
| Error interno | `"Unexpected error."` | Reintentar; el detalle queda en el servidor. |

## Operaciones por historia

| Historia | Operación | Quién |
| --- | --- | --- |
| HU01 | `registrarUsuario(registro)` | Administrador |
| HU02 | `iniciarSesion`, `cambiarContrasena`, `cerrarSesion`, `yo` | Todos |
| HU03 | `publicarMenu(lunes, dias)`; `menuSemanal(lunes)` | Administrador publica; todos consultan |
| HU04 | `reservarAlmuerzo(fecha, personaIds)`; `miFamilia` | Empleado |
| HU05 | `cancelarReserva(fecha, personaId)`; `misReservas(anio, mes)` | Empleado |
| HU06 | `listaDelDia(fecha)` | Administrador |
| HU07 | `pensionar(anio, mes, personaIds)` | Empleado |
| HU08 | `avisarInasistencia(fecha, personaId)` | Empleado |
| HU09 | `usuarios`, `usuario(id)`, `agregarFamiliar`, `modificarDatos`, `cambiarTipoUsuario`, `darDeBaja`, `restablecerContrasena` | Administrador |
| HU10 | `reporteMensual(anio, mes)` → `urlExcel`, `urlPdf` | Administrador |
| HU11 | `miConsumo(anio, mes)` | Empleado |
| — | `hoy` (fecha, hora límite y lunes de la semana) | Público |

## Ejemplos

**HU03 – publicar el menú** (administrador). Un día que no se manda queda «Sin atención».

```graphql
mutation {
  publicarMenu(lunes: "2026-11-02", dias: [
    { fecha: "2026-11-02", descripcion: "Sopa de maní y pollo al horno" }
    { fecha: "2026-11-03", descripcion: "Silpancho" }
  ]) { ok mensaje reservasDePension menu { dias { fecha descripcion } } }
}
```

**HU04 – reservar para varias personas** (empleado). Sin `personaIds`, reserva para quien inició sesión.

```graphql
query { miFamilia { topeDiario titular { id nombreCompleto } familiares { id nombreCompleto parentesco } } }

mutation ($p: [ID!]) {
  reservarAlmuerzo(fecha: "2026-11-03", personaIds: $p) { ok mensaje resultados { nombre ok mensaje } }
}
```

**HU05 / HU08 – cancelar o avisar**

```graphql
mutation { cancelarReserva(fecha: "2026-11-03", personaId: "…") { ok mensaje reserva { estado } } }
mutation { avisarInasistencia(fecha: "2026-11-03", personaId: "…") { ok mensaje programadosRestantes minimo } }
```

**HU07 – pensionar para el mes siguiente**

```graphql
mutation ($p: [ID!]!) { pensionar(anio: 2026, mes: 12, personaIds: $p) { ok mensaje resultados { nombre ok mensaje } } }
```

**HU01 – registrar un usuario con su familia** (administrador)

```graphql
mutation ($r: RegistroInput!) {
  registrarUsuario(registro: $r) { ok mensaje ficha { topeDiario persona { id nombreCompleto } familiares { nombreCompleto parentesco } } }
}
```

```json
{
  "r": {
    "datos": { "nombres": "Rosa", "apellidos": "Choque", "ci": "7654321", "fechaNacimiento": "1988-03-14", "telefono": "71234567" },
    "codigoEmpleado": "UB-300", "nombreUsuario": "rchoque", "contrasenaInicial": "Inicio2026", "tipo": "EMPLEADO",
    "familiares": [
      { "nombres": "Tomás", "apellidos": "Choque", "ci": "9876543", "fechaNacimiento": "2015-08-01", "telefono": "71234567", "parentesco": "HIJO" }
    ]
  }
}
```

**HU09 – baja y contraseña temporal**

```graphql
mutation { darDeBaja(personaId: "…") { ok mensaje personas { nombreCompleto } reservasAnuladasDesde } }
mutation { restablecerContrasena(personaId: "…") { ok temporal } }
```

**HU10 – reporte** (los archivos se descargan con un GET y el mismo token)

```graphql
query {
  reporteMensual(anio: 2026, mes: 10) {
    totalBs urlExcel urlPdf
    titulares { nombreTitular codigoEmpleado totalBs lineas { nombreCompleto parentesco modalidad cantidad precioUnitarioBs subtotalBs } }
  }
}
```

**HU11 – mi consumo**

```graphql
query {
  miConsumo(anio: 2026, mes: 10) {
    totalBs diasSinAtencion
    personas { persona { nombreCompleto } pensionado cantidad subtotalBs programados minimo inasistenciasDisponibles }
  }
}
```

## Pruebas

`tests/api.graphql.test.ts` recorre estas operaciones de punta a punta con datos en memoria: sesión y cambio de contraseña, menú, reservas, pensión, gestión de usuarios, reporte y los códigos de error.
