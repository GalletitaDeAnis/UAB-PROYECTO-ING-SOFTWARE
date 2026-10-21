# Base de datos

PostgreSQL. En desarrollo corre local; para el equipo y el Demo Day, en Supabase. El esquema es el mismo en los dos: solo cambia la URL del `.env`.

| | |
| --- | --- |
| Esquema | [prisma/schema.prisma](../prisma/schema.prisma) |
| Migración | [prisma/migrations/20261021000000_inicial/migration.sql](../prisma/migrations/20261021000000_inicial/migration.sql) |
| Datos iniciales | [prisma/seed.ts](../prisma/seed.ts): rol de encargado y un feriado de ejemplo |
| Acceso | Solo el servidor, con Prisma, a través de los repositorios de `src/infraestructura` |

## Modelo

```mermaid
erDiagram
    persona ||--o{ persona : "titular de"
    persona ||--o{ almuerzo : consume
    persona ||--o{ pension : "pensionada en"

    persona {
        text id PK "código del empleado o id del familiar en la API"
        TipoPersona tipo "EMPLEADO | FAMILIAR"
        text nombre_completo
        text parentesco "null si es el empleado"
        text codigo_titular FK "el empleado se apunta a sí mismo"
        boolean vigente "false si la API ya no lo entrega"
    }
    almuerzo {
        text persona_id PK
        date fecha PK
        text codigo_titular "a quién se descuenta"
        OrigenAlmuerzo origen "ESPORADICO | PENSION"
        int precio_bs "18 | 15"
        EstadoAlmuerzo estado "CONFIRMADO | CANCELADO | INASISTENCIA_AVISADA"
    }
    pension {
        text persona_id PK
        int anio PK
        int mes PK
        text codigo_titular
        date solicitada_el
    }
    feriado {
        date fecha PK
        text descripcion
    }
    autorizacion {
        text codigo_empleado PK
        Rol rol "ENCARGADO"
    }
    sesion {
        text token_hash PK "SHA-256, nunca el token"
        text codigo_empleado
        Rol rol
        timestamptz ultima_actividad "30 min de inactividad"
    }
```

## Decisiones

### Una tabla `persona` para empleados y familiares

R11 pide que cada almuerzo sea nominal y R5 controla el mínimo de 10 por persona. Si empleados y familiares estuvieran en tablas distintas, `almuerzo` necesitaría dos columnas opcionales (`empleado_id` o `familiar_id`) y cada consulta del reporte se duplicaría. Con una tabla, el almuerzo apunta a una persona y basta.

El empleado es su propio titular (`codigo_titular = id`). Un `CHECK` lo garantiza: un empleado no puede quedar a cargo de otro y un familiar no puede ser su propio titular.

### Es una copia, no un alta

Empleados y familiares son del sistema empresarial (R1b). Este sistema no tiene pantalla ni operación para darlos de alta. La copia se actualiza en cada inicio de sesión (backlog §2.4) y guarda lo mínimo: nombre, parentesco y si sigue vigente. No guarda CI, cargo ni contraseña.

Un familiar que la API deja de entregar no se borra: queda `vigente = false`. Ya no se puede elegir para reservar, pero sus almuerzos del mes siguen en el reporte con su nombre. Qué pasa con sus reservas futuras es la pregunta abierta S5 del Product Owner.

### `almuerzo` guarda el titular y el precio

- `codigo_titular` se copia al reservar. Si la familia cambia después, el almuerzo sigue descontándose a quien lo reservó (R8).
- `precio_bs` se copia al confirmar. Si la tarifa cambia el próximo año, los meses ya cerrados no se recalculan.

La clave primaria es `(persona_id, fecha)`, así que la base no admite dos almuerzos de la misma persona el mismo día (R2). Cancelar y volver a reservar actualiza la misma fila.

### Lo que no es tabla

| Cosa | Por qué no |
| --- | --- |
| Reporte mensual y líneas de descuento | Se calculan al pedirlos desde `almuerzo` y `feriado`. Si se guardaran, un feriado cargado tarde dejaría un reporte viejo que contradice la base (HU07 CA2). |
| Tarifa 15 / 18 | Es regla fija (R2, R3). Está en el dominio y en un `CHECK`. |
| Asistencia física | El sistema cobra lo confirmado (R7). Nadie marca quién entró al comedor. |
| Tope diario | Se calcula: 1 + familiares vigentes (R10). |

### Restricciones en la base

El dominio ya valida todo. La base lo repite para que un `INSERT` hecho a mano tampoco pueda romper las reglas:

| Restricción | Regla |
| --- | --- |
| PK `almuerzo(persona_id, fecha)` | Un almuerzo por persona y por día (R2) |
| PK `pension(persona_id, anio, mes)` | Una pensión por persona y mes (HU08 CA5) |
| `almuerzo_precio_valido` | Esporádico = 18, pensión = 15 |
| `almuerzo_lunes_a_jueves` | No hay almuerzos de viernes a domingo (R1) |
| `pension_mes_valido` | Mes entre 1 y 12 |
| `persona_empleado_es_su_titular` | El empleado es su propio titular; el familiar, no |

La pensión y sus almuerzos se guardan en una sola transacción: si algo falla, no queda una pensión sin días ni días sin pensión.

### Índices

Están pensados para las consultas que se hacen de verdad: lista del día (`almuerzo(fecha, estado)`), «mis almuerzos» y consumo (`almuerzo(codigo_titular, fecha)`), pensiones del titular (`pension(codigo_titular, anio, mes)`) y familia (`persona(codigo_titular)`).

### Seguridad (Supabase)

Supabase publica automáticamente cada tabla del esquema `public` en su API de datos (REST y GraphQL), accesible con la clave `anon` que viaja en el navegador. Si no se hace nada, cualquiera con esa clave podría leer o insertar almuerzos sin pasar por las reglas.

Por eso la migración activa **Row Level Security en todas las tablas y no crea ninguna política**. El resultado:

- la API de datos de Supabase no devuelve ni acepta filas, con ninguna clave pública;
- el servidor del restaurante se conecta como dueño de las tablas (el usuario `postgres` de la cadena de conexión), que no está sujeto a RLS;
- la única forma de leer o escribir es la [API GraphQL](api-graphql.md), que pasa por los casos de uso.

Además, la cadena de conexión y la contraseña de la base van solo en el `.env` del servidor. No van en el frontend, ni en el repositorio, ni en el chat del grupo.

## Puesta en marcha

### Local

```bash
cp .env.example .env               # completar DATABASE_URL y DIRECT_URL con la contraseña local
createdb -U postgres almuerzos     # o desde pgAdmin
npm run preparar                   # genera el cliente, aplica la migración y siembra
```

### Supabase

1. Crear el proyecto en supabase.com (región São Paulo, la más cercana a Bolivia). Guardar la contraseña de la base que pide al crearlo.
2. En **Project Settings → Database → Connection string**:
   - **Transaction pooler** (puerto 6543) → `DATABASE_URL`, agregando `?pgbouncer=true` al final;
   - **Session pooler** (puerto 5432) → `DIRECT_URL`. Prisma lo usa para las migraciones. No usar «Direct connection» (`db.xxx.supabase.co`): en el plan gratuito es solo IPv6 y falla con `P1001: Can't reach database server`.
3. Poner las dos en el `.env` del servidor y correr `npm run preparar`.
4. En **Table Editor** tienen que aparecer las 6 tablas con el candado de RLS activo.

El plan gratuito pausa el proyecto después de una semana sin uso. Antes de cada demo hay que entrar al panel y, si está pausado, reanudarlo.

### Cambios al esquema

1. Editar `prisma/schema.prisma`.
2. `npm run db:migrar -- --name descripcion-corta` crea la migración nueva en `prisma/migrations/`.
3. La migración se sube en el mismo pull request que el código que la usa.
4. Los demás corren `npm run preparar` (aplica las pendientes).

Nunca se edita una migración que ya está en `desarrollo`: se crea otra.

## Pruebas contra la base

Las pruebas de casos de uso no abren la base (usan repositorios en memoria). La prueba [tests/integracion.postgres.test.ts](../tests/integracion.postgres.test.ts) sí: aplica la migración, recorre los repositorios y comprueba las restricciones y el RLS. Corre solo si existe `DATABASE_URL_PRUEBAS`, porque **borra las tablas**. Tiene que apuntar a una base vacía aparte, nunca a la del equipo:

```bash
createdb -U postgres almuerzos_pruebas
# en .env:
DATABASE_URL_PRUEBAS="postgresql://postgres:CONTRASEÑA@localhost:5432/almuerzos_pruebas"
npm test
```
