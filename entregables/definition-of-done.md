# Definition of Done

Una historia del Sprint 1 está hecha cuando se cumple todo esto:

1. Los criterios de aceptación de esa historia tienen una prueba automática cada uno, con el caso normal, el inválido o el de borde que el criterio describe.
2. Las pruebas del caso de uso usan reloj y repositorios en memoria. No abren SQLite ni el servidor.
3. La pantalla no calcula precios ni decide si son las 9:00. Llama al caso de uso y muestra el mensaje que este devuelve.
4. El dominio no importa Prisma ni Express.
5. Alguien del equipo puede entrar con un identificador de prueba y recorrer la historia en http://localhost:3000.
6. El código de esa historia está en una rama y otro integrante lo puede leer.

HU01, HU02, HU03 y HU04 cumplen los puntos 1 a 5 en este incremento. El punto 6 se cierra cuando el pull request tiene la revisión de otro integrante.
