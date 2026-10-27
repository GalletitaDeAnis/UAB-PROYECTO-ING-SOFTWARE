# Sistema de Reservas y Pensionamiento de Almuerzos

Restaurante de la Unión Boliviana. Proyecto final de Ingeniería de Software, Comp. Sist. A.

La rama que hay que abrir es **`desarrollo`**. Ahí está el trabajo del equipo. `main` es la rama central y solo recibe un corte cuando el equipo lo acepta.

**Desplegado en:** <https://almuerzos-union-boliviana.onrender.com> (API en [/graphql](https://almuerzos-union-boliviana.onrender.com/graphql)). Usuarios de prueba más abajo, contraseña `demo123`. Si estuvo sin uso, la primera visita tarda unos 50 s.

## Para el docente

El restaurante sirve almuerzos de lunes a jueves a funcionarios y a sus familiares de primer grado. Hoy las reservas van por WhatsApp. El sistema permite reservar, pensionar y cancelar por persona, aplica 18 Bs (uso esporádico) o 15 Bs (pensión) y deja el reporte por empleado titular para el descuento por planilla. El ingreso usa el usuario del sistema empresarial de la institución, a través de su API. No da de alta empleados, no cobra en línea, no publica el menú, no manda push y no se conecta solo con planilla.

### Dónde está cada criterio

| Criterio de la rúbrica | Dónde mirarlo |
| --- | --- |
| Backlog e historias (8) | [entregables/backlog.md](entregables/backlog.md): 12 historias v2, criterios, Planning Poker, INVEST y control de cambios v1 → v2 |
| Casos de uso y diagrama de clases (8) | [entregables/casos-de-uso.md](entregables/casos-de-uso.md), [entregables/diagrama-de-clases.md](entregables/diagrama-de-clases.md) e imágenes en [entregables/diagrams/](entregables/diagrams/) |
| Arquitectura y decisiones (8) | [entregables/arquitectura.md](entregables/arquitectura.md): capas, DIP, Repository, DI y dónde no hacen falta; [entregables/base-de-datos.md](entregables/base-de-datos.md) |
| Producto funcional (12) | La aplicación (más abajo) y la [API GraphQL](entregables/api-graphql.md) |
| Testing y Definition of Done (10) | `npm test`, `npm run test:cobertura` y [entregables/definition-of-done.md](entregables/definition-of-done.md) |
| Calidad y refactorización (6) | `src/`, separado en capas y verificado por `tests/capas.test.ts` |
| Entregas por sprint (8) | [entregables/sprint-1.md](entregables/sprint-1.md) |
| Retros (5) | [entregables/plantilla-retro.md](entregables/plantilla-retro.md) |
| Git e IA (12) | Historial de ramas y pull requests, y [entregables/declaracion-uso-de-ia.md](entregables/declaracion-uso-de-ia.md) |

Observaciones abiertas del equipo: [entregables/revision-documentos-v2.md](entregables/revision-documentos-v2.md).

## Cómo levantarlo

Hace falta Node.js 20 o más y un PostgreSQL (local o Supabase).

```bash
git clone https://github.com/GalletitaDeAnis/UAB-PROYECTO-ING-SOFTWARE.git
cd UAB-PROYECTO-ING-SOFTWARE
git checkout desarrollo
npm install
cp .env.example .env        # completar DATABASE_URL y DIRECT_URL
npm run preparar            # cliente Prisma + migraciones + datos iniciales
npm test
npm run dev
```

| Dirección | Qué hay |
| --- | --- |
| http://localhost:3000 | Pantallas mínimas: ingresar, reservar (para uno o un familiar), cancelar, avisar inasistencia, lista del día y descarga del reporte |
| http://localhost:3000/graphql | API GraphQL. En el navegador abre GraphiQL para probar consultas |
| http://localhost:3000/salud | Estado del servidor y de la base |

Si el puerto está ocupado, cambiar `PORT` en el `.env`. Para probar la regla de las 9:00 sin esperar: `RELOJ_FIJO=2026-11-03T08:59` en el `.env`.

### Desplegarlo en Render

El servidor es un proceso Express que queda encendido y se llama a sí mismo para el simulador empresarial, así que va en un servicio web (Render), no en funciones serverless (Vercel, Firebase Functions). La base sigue en Supabase.

1. En [render.com](https://render.com), entrar con GitHub y elegir **New → Blueprint** con este repositorio. Render lee `render.yaml`.
2. Completar `DATABASE_URL` y `DIRECT_URL` con las mismas URLs de Supabase del `.env` (Transaction pooler y Session pooler).
3. **Apply**. Cada push a `desarrollo` vuelve a desplegar: `npm run build` aplica migraciones y datos iniciales, y `npm start` levanta el servidor.

Está en <https://almuerzos-union-boliviana.onrender.com>, con `/graphql` y `/salud`. En el plan gratis el servicio se duerme tras 15 minutos sin uso y la primera visita tarda unos 50 s en despertarlo.

### Usuarios de prueba

Con `EMPRESARIAL_SIMULADO=true` (valor por defecto del `.env.example`), el servidor trae una API empresarial simulada, porque el equipo no tiene todavía la de TI. La contraseña de todos es **`demo123`**.

| Usuario | Persona | Qué demuestra |
| --- | --- | --- |
| `lquispe` | Laura Quispe, inactiva | No ingresa (HU01 CA3) |
| `arojas` | Ana Rojas, un hijo | Reserva propia y de un familiar (HU02, HU06) |
| `pflores` | Pedro Flores, cónyuge y 3 hijos | Tope de 5, pensión por persona (HU05, HU08, HU09) |
| `cmamani` | Carlos Mamani, sin familiares | Tope 1 |
| `evargas` | Elena Vargas, encargada | Lista del día, feriados y reporte (HU04, HU07, HU11) |
| `lento` | — | La API tarda más de 5 s (HU01 CA4) |

## Cómo está organizado el código

```text
entregables/            lo que se lee para calificar
src/dominio/            reglas (9:00, lunes a jueves, 18/15 Bs, tope, mínimo de 10) y puertos
src/aplicacion/         un caso de uso por historia (HU01 a HU12)
src/presentacion/       API GraphQL, pantallas y descarga del reporte
src/infraestructura/    PostgreSQL (Prisma), API empresarial, reloj, exportadores, arranque
simulador-empresarial/  API de TI simulada
prisma/                 esquema, migraciones y datos iniciales
tests/                  pruebas por criterio e integración (GraphQL, HTTP, PostgreSQL)
```

La pantalla y la API no deciden el precio ni si son las 9:00. Llaman al caso de uso y muestran el mensaje.

## Para el equipo

### Unirse al repositorio

El dueño del repositorio entra a Settings → Collaborators → Add people y pone el usuario de GitHub (el de `github.com/usuario`). El rol es Write. La otra persona acepta el correo de GitHub.

### Configurar el `.env`

El `.env` no se sube a Git. Cada integrante copia `.env.example` y lo completa.

- **Para el frontend**, no hace falta base propia: alcanza con apuntar a un backend que ya esté corriendo y usar su URL `/graphql`.
- **Para correr el backend**, se necesita `DATABASE_URL` y `DIRECT_URL`. Las de Supabase las pasa por privado quien administra la base, nunca por el grupo ni en un commit.

Lo que **no** se comparte con el frontend: la contraseña de la base, las URLs de conexión, `EMPRESARIAL_API_KEY` ni ninguna clave de Supabase. El frontend no necesita nada de eso, solo la URL de la API.

### Consumir la API

Toda la guía está en [entregables/api-graphql.md](entregables/api-graphql.md): cómo iniciar sesión, cómo mandar el token (`Authorization: Bearer …`), cómo llegan los errores y un ejemplo por historia. El frontend **no** se conecta a Supabase directo: las tablas tienen RLS y esa vía no devuelve nada a propósito.

### Flujo de trabajo

El trabajo nuevo sale de `desarrollo` en una rama `feature/HU0X-nombre` y vuelve por pull request, revisado por otro integrante. Detalle en [entregables/flujo-de-trabajo-git.md](entregables/flujo-de-trabajo-git.md).

## Producto

El restaurante no es obligatorio ni gratuito. Uso esporádico: 18 Bs, un almuerzo por persona y por día, de lunes a jueves, hasta las 9:00. El empleado reserva también para sus familiares de primer grado registrados, hasta 1 + familiares por día. Pensión: 15 Bs por persona, se pide para el mes siguiente y el sistema confirma los días de servicio. El pensionado solo avisa las inasistencias y no puede bajar de 10. Quien no cancela a tiempo se descuenta igual. El feriado no se cobra. El pago es por planilla, con el reporte por titular que exporta el encargado.
