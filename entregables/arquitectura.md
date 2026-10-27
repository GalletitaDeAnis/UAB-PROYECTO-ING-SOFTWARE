# Arquitectura y decisiones de diseño

![Arquitectura por capas](diagrams/arquitectura.png)

Node.js 20+ y TypeScript. Express sirve las pantallas y GraphQL Yoga la API. Prisma habla con PostgreSQL en Supabase. Está desplegado en Render (ver el [README](../README.md)).

## Capas

| Capa | Carpeta | Qué hace | Puede importar |
| --- | --- | --- | --- |
| Dominio | `src/dominio` | Entidades, reglas (precios, 9:00, tope, mínimo, validación de datos), cálculo del reporte y **puertos** (interfaces de lo que necesita del exterior). | Nada fuera de sí misma. |
| Aplicación | `src/aplicacion` | Un caso de uso por historia. Cada uno valida permisos (`sinPermiso`), aplica las reglas del dominio y usa los puertos. | Dominio. |
| Presentación | `src/presentacion` | Pantallas HTML (`web.ts`, `paginas*.ts`) y API GraphQL. Lee el pedido, llama a un caso de uso y muestra el resultado o el mensaje. | Aplicación y dominio. **No** Prisma ni infraestructura. |
| Infraestructura | `src/infraestructura` | Implementa los puertos: repositorios Prisma, scrypt, tokens, reloj de La Paz, Excel y PDF. `composicion.ts` arma todo; `servidor.ts` arranca Express. | Todas. |

`tests/capas.test.ts` lee los `import` de cada carpeta y falla si una capa importa a otra en sentido contrario. Así la regla no depende de que alguien la recuerde.

Comparado con la propuesta del equipo (rutas → controladores → servicios → repositorios): las **rutas y controladores** son `web.ts` y `graphql/resolvers.ts`; los **servicios** son los casos de uso de `src/aplicacion`; los **repositorios** son `repositoriosPrisma.ts`; los **modelos** están en `src/dominio/modelo.ts`; los **middlewares** de sesión y rol son `usuarioDe()` en `web.ts` y el `context` de GraphQL. Se usan vistas en TypeScript en vez de EJS: es una plantilla menos que aprender y el compilador revisa los datos que recibe cada pantalla.

## Decisiones

### 1. Dependencias hacia abstracciones (DIP)

Los casos de uso dependen de interfaces del dominio (`PersonaRepositorio`, `ReservaRepositorio`, `MenuRepositorio`, `CifradorDeContrasenas`, `Reloj`…), no de Prisma ni de `Date`. Ejemplo: `ReservarAlmuerzo` pregunta `reloj.ahora()` y `menus.obtenerDia(fecha)`; no sabe si la respuesta viene de PostgreSQL o de un arreglo en memoria.

**Qué se gana:** las 105 pruebas de las historias corren en memoria en menos de un segundo, con el reloj fijado en 8:59 o 9:00. Cambiar de base o de librería de cifrado toca un archivo de infraestructura.

### 2. Repository, donde aporta

Un repositorio por agregado que el negocio consulta de varias formas: personas, cuentas, reservas, pensiones, menús y sesiones. Las operaciones que tienen que ser atómicas son un método del repositorio con su transacción, para que el caso de uso no conozca Prisma:

| Operación | Método | Qué guarda junto |
| --- | --- | --- |
| Registrar usuario (HU01) | `CuentaRepositorio.registrar` | persona + cuenta + familiares |
| Publicar menú (HU03) | `MenuRepositorio.publicar` | semana + días + reservas de los pensionados |
| Pensionar (HU07) | `PensionRepositorio.registrar` | pensión + reservas de los días ya publicados |
| Dar de baja (HU09) | `PersonaRepositorio.darDeBaja` | personas inactivas + reservas futuras canceladas |

**Dónde no hace falta:** el reporte y el consumo no tienen repositorio ni tabla; se calculan con una función pura (`calcularDescuentos`) sobre las reservas. Los exportadores no son repositorios: son un puerto propio (`ExportadorReporte`) con dos implementaciones (Excel y PDF), y elegir el formato es una búsqueda en una lista, sin `if` por formato en el caso de uso.

### 3. Inyección de dependencias, sin contenedor

Cada caso de uso recibe por constructor solo los puertos que usa. `crearCasosDeUso(dependencias)` arma los 24 casos de uso; producción le pasa los repositorios Prisma (`composicion.ts`) y las pruebas los dobles en memoria (`tests/fakes.ts`).

**Dónde no hace falta:** no hay contenedor de DI ni decoradores. Con una sola raíz de composición de unas 30 líneas, un contenedor agregaría configuración y magia sin resolver nada. Las funciones puras del dominio (`precioDe`, `topeDiario`, `minimoDelMes`, `admiteCambio`) no se inyectan: no tienen estado ni efectos.

### 4. Dos presentaciones sobre los mismos casos de uso

Las pantallas HTML (para la demo y para quien no tenga otro frontend) y GraphQL (para un frontend aparte) llaman a los mismos objetos de `CasosDeUso`. Ninguna decide si son las 9:00 ni cuánto cobrar: si una regla cambia, cambia en un solo lugar y las dos pantallas la respetan.

### 5. Seguridad

| Riesgo | Medida |
| --- | --- |
| Contraseñas filtradas | scrypt con sal aleatoria (`contrasenas.ts`); comparación en tiempo constante. |
| Robo de sesión | Token de 256 bits; en la base solo su SHA-256. Cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción. 30 minutos de inactividad. |
| Usuario dado de baja con sesión abierta | `ValidarSesion` relee la cuenta y la persona en cada pedido; la baja y el restablecimiento cierran sus sesiones. |
| Acceso directo a Supabase | RLS activo sin políticas: la API de datos de Supabase no ve nada; solo el servidor, con la cadena de conexión. |
| Reglas saltadas con un pedido armado a mano | Las reglas están en los casos de uso, no en la pantalla; la base repite las críticas con `CHECK` y llaves foráneas. |
| Errores internos expuestos | GraphQL enmascara los errores que no son de negocio. |

### 6. Despliegue

Render ejecuta `npm run build` (cliente Prisma, migraciones, datos iniciales) y `npm start`. La base es la de Supabase. Por qué Render y no Vercel o Firebase: el servidor es un proceso Express que queda encendido; las plataformas de funciones serverless lo arrancarían en cada pedido y Firebase Functions exige el plan pago.
