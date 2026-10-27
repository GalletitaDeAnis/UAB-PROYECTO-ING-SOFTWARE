import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const entorno = loadEnv("test", process.cwd(), "");
// Sin base de pruebas, los adaptadores de Prisma no se ejecutan: se miden solo cuando corre integracion.postgres.
const sinBase = entorno.DATABASE_URL_PRUEBAS
  ? []
  : ["src/infraestructura/repositoriosPrisma.ts", "src/infraestructura/composicion.ts"];

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Lee DATABASE_URL_PRUEBAS del .env para la prueba contra Postgres. Sin esa variable, se salta.
    env: entorno,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Arranques del proceso: solo leen el entorno y escuchan un puerto. Se prueban al levantar la app.
      exclude: ["src/infraestructura/servidor.ts", ...sinBase],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "cobertura",
      thresholds: { lines: 80, branches: 75, functions: 80 },
    },
  },
});
