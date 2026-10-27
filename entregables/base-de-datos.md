# Base de datos

PostgreSQL en Supabase. Esquema: [prisma/schema.prisma](../prisma/schema.prisma). Migraciones: [prisma/migrations](../prisma/migrations).

## Tablas

| Tabla | Clave | Columnas | Regla que sostiene |
| --- | --- | --- | --- |
| `persona` | `id` (uuid) | tipo, nombres, apellidos, `ci` único, fecha_nacimiento, telefono, parentesco, `titular_id` → persona, activo | R4. El usuario es su propio titular; el familiar apunta al suyo. |
| `cuenta` | `persona_id` → persona | `codigo_empleado` único, `nombre_usuario` único, contrasena_hash, tipo, debe_cambiar_contrasena | R2, R5. Solo los usuarios tienen fila aquí. |
| `menu_semanal` | `lunes` (date) | publicado_el | R6. |
| `menu_dia` | `fecha` (date) | lunes → menu_semanal, descripcion | R7. |
| `reserva` | (`persona_id`, `fecha`) | `titular_id` → persona, `fecha` → menu_dia, modalidad, precio_bs, estado | R8, R15, R16. Una por persona por día; solo en días con menú. |
| `pension` | (`persona_id`, `anio`, `mes`) | titular_id, solicitada_el | R10. |
| `sesion` | `token_hash` | persona_id → cuenta (se borra en cascada), ultima_actividad | HU02 CA7. |

No hay tabla de reporte ni de inasistencias: el reporte se calcula y la inasistencia es un estado de la reserva.

## Restricciones que repiten las reglas

El dominio ya cumple estas reglas; la base las repite para que un `INSERT` manual tampoco las rompa (migración `20261027000000_backlog_final`):

| Restricción | Regla |
| --- | --- |
| `reserva_precio_valido`: NO_PENSIONADO = 18, PENSIONADO = 15 | R8, R10 |
| Llave foránea `reserva.fecha → menu_dia.fecha` | R7: sin menú no hay reserva |
| `menu_dia_lunes_a_jueves` y `menu_semanal_es_lunes` | R1, R6 |
| `persona_tipo_coherente`: el empleado es su titular y no tiene parentesco; el familiar sí | R4 |
| `persona.ci`, `cuenta.codigo_empleado`, `cuenta.nombre_usuario` únicos | HU01 CA3 |
| `pension_mes_valido` | — |
| RLS activo en las 7 tablas, sin políticas | El frontend no se conecta a Supabase directo. |

## Transacciones

Publicar el menú, pensionar, registrar un usuario y dar de baja guardan todo o nada (ver [arquitectura.md](arquitectura.md), decisión 2).

## Conexión

- `DATABASE_URL`: Transaction pooler (puerto 6543, `?pgbouncer=true`). La usa el servidor.
- `DIRECT_URL`: Session pooler (puerto 5432). La usan las migraciones. La conexión directa de Supabase es solo IPv6 y falla desde la mayoría de las redes.

## Datos iniciales

`prisma/seed.ts` corre en cada despliegue y no pisa nada:

- Si no hay ningún administrador, crea uno con `ADMIN_USUARIO` / `ADMIN_CONTRASENA` y la obligación de cambiar la contraseña (R3).
- Con `SEMBRAR_DEMO=true`, la primera vez crea los usuarios de prueba, los menús del mes, una pensión de ejemplo y algunas reservas; en cada despliegue asegura el menú de esta semana y la siguiente.

## Historial

La migración `20261021000000_inicial` es el modelo v2 (API empresarial, feriados). La del backlog final la reemplaza: borra esas tablas, que solo tenían datos de prueba del simulador, y crea las nuevas.
