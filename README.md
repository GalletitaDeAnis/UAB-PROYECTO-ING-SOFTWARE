# Sistema de Reservas y Pensionamiento de Almuerzos

Restaurante de la Unión Boliviana. Proyecto final de Ingeniería de Software, UAB.

**Aplicación desplegada:** <https://almuerzos-union-boliviana.onrender.com> · API en [/graphql](https://almuerzos-union-boliviana.onrender.com/graphql) · estado en [/salud](https://almuerzos-union-boliviana.onrender.com/salud). Si estuvo sin uso, la primera visita tarda unos 50 s.

La rama de trabajo es **`desarrollo`**. `main` recibe un corte cuando el equipo lo acepta.

## Para el docente

El restaurante sirve almuerzos de lunes a jueves a los empleados y a sus familiares de primer grado; hoy las reservas van por WhatsApp. En el sistema, el **administrador** registra a los usuarios y sus familias, publica el menú de la semana, ve cuántos almuerzos preparar y genera el reporte para el descuento por planilla. El **empleado** reserva (18 Bs) o se pensiona (15 Bs) por persona, cancela o avisa inasistencias hasta las 9:00 y consulta cuánto se le descontará.

### Usuarios de prueba

Contraseña de todos: **`Demo2026`**.

| Usuario | Persona | Para mostrar |
| --- | --- | --- |
| `evargas` | Elena Vargas, administradora | Usuarios, menú, almuerzos del día, reporte (HU01, HU03, HU06, HU09, HU10) |
| `pflores` | Pedro Flores, cónyuge y 3 hijos; él y su cónyuge pensionados este mes | Tope 5, pensión, inasistencias, consumo (HU04, HU07, HU08, HU11) |
| `arojas` | Ana Rojas, un hijo | Reserva propia y de un familiar, cancelar (HU04, HU05) |
| `cmamani` | Carlos Mamani, sin familiares | Tope 1 |
| `lquispe` | Laura Quispe, dada de baja | No ingresa (HU02 CA5) |
| `nuevo` | Usuario recién registrado | Debe cambiar la contraseña (HU02 CA6) |

### Dónde está cada criterio de la rúbrica

| Criterio | Dónde mirarlo |
| --- | --- |
| Backlog e historias (8) | [backlog.md](entregables/backlog.md): 11 historias, criterios con su prueba, Planning Poker, INVEST, decisiones y cambios desde la v2 |
| Casos de uso y clases (8) | [casos-de-uso.md](entregables/casos-de-uso.md) y [diagrama-de-clases.md](entregables/diagrama-de-clases.md), con trazabilidad a las historias |
| Arquitectura y decisiones (8) | [arquitectura.md](entregables/arquitectura.md): capas, DIP, Repository, DI y dónde no hacen falta; [base-de-datos.md](entregables/base-de-datos.md) |
| Producto funcional (12) | La aplicación desplegada y la [API GraphQL](entregables/api-graphql.md) |
| Testing y DoD (10) | `npm test`, `npm run test:cobertura` y [definition-of-done.md](entregables/definition-of-done.md) con la verificación por historia |
| Calidad y refactorización (6) | [registro-de-refactorizacion.md](entregables/registro-de-refactorizacion.md); `tests/capas.test.ts` |
| Entregas por sprint (8) | [entregas.md](entregables/entregas.md): calendario y guion del Demo Day |
| Retros (5) | [plantilla-retro.md](entregables/plantilla-retro.md) |
| Git e IA (12) | Historial de `desarrollo` y [declaracion-uso-de-ia.md](entregables/declaracion-uso-de-ia.md) |

Versiones en Word (con carátula) de toda la documentación: [entregables/word/](entregables/word/); se regeneran con `python entregables/word/generar_word.py`.

Observaciones sobre los documentos del equipo: [revision-documentos-final.md](entregables/revision-documentos-final.md).

## Cómo levantarlo en local

Hace falta Node.js 20 o más y un PostgreSQL (local o Supabase).

```bash
git clone https://github.com/GalletitaDeAnis/UAB-PROYECTO-ING-SOFTWARE.git
cd UAB-PROYECTO-ING-SOFTWARE
git checkout desarrollo
npm install
cp .env.example .env        # completar DATABASE_URL y DIRECT_URL
npm run preparar            # cliente Prisma + migraciones + datos iniciales
npm test
npm run dev                 # http://localhost:3000
```

| Dirección | Qué hay |
| --- | --- |
| http://localhost:3000 | Pantallas del administrador y del empleado |
| http://localhost:3000/graphql | API GraphQL; en el navegador abre GraphiQL |
| http://localhost:3000/salud | Estado del servidor y de la base |

Para probar la regla de las 9:00 a cualquier hora: `RELOJ_FIJO=2026-11-03T08:59` en el `.env`.

Sin `SEMBRAR_DEMO=true`, `npm run preparar` crea solo un administrador inicial (`ADMIN_USUARIO`, por defecto `admin` / `Admin2026`) que debe cambiar la contraseña al entrar (R3).

## Despliegue (Render + Supabase)

El servidor es un proceso Express que queda encendido, así que va en un servicio web (Render) y no en funciones serverless (Vercel, Firebase Functions). La base es PostgreSQL en Supabase.

1. En [render.com](https://render.com), entrar con GitHub y elegir **New → Blueprint** con este repositorio; Render lee [render.yaml](render.yaml).
2. Completar `DATABASE_URL` y `DIRECT_URL` con las URLs de Supabase (Transaction pooler y Session pooler).
3. **Apply**. Cada push a `desarrollo` vuelve a desplegar: `npm run build` aplica las migraciones y los datos iniciales, y `npm start` levanta el servidor.

En el plan gratis el servicio se duerme tras 15 minutos sin uso.

## Cómo está organizado

```text
entregables/            lo que se lee para calificar (y diagrams/ con su fuente)
src/dominio/            entidades, reglas (9:00, lunes a jueves, 18/15 Bs, tope, mínimo) y puertos
src/aplicacion/         un caso de uso por historia (HU01 a HU11)
src/presentacion/       pantallas HTML y API GraphQL
src/infraestructura/    PostgreSQL (Prisma), contraseñas, reloj, exportadores, arranque
prisma/                 esquema, migraciones y datos iniciales
tests/                  pruebas por criterio, pantallas, GraphQL e integración con PostgreSQL
```

La pantalla y la API no deciden el precio ni si son las 9:00: llaman al caso de uso y muestran su mensaje.

## Para el equipo

- **Ramas:** el trabajo nuevo sale de `desarrollo` en `feature/HU0X-nombre` y vuelve revisado por otro integrante ([flujo-de-trabajo-git.md](entregables/flujo-de-trabajo-git.md)).
- **`.env`:** no se sube a Git. Las URLs de Supabase se pasan por privado.
- **Frontend aparte:** solo necesita la URL de `/graphql` ([api-graphql.md](entregables/api-graphql.md)). No se conecta a Supabase: las tablas tienen RLS y esa vía no devuelve nada a propósito.
- **Pendientes del equipo:** Planning Poker, actas de Retro, tablero y revisión en GitHub ([entregas.md](entregables/entregas.md)).
