import { PrismaClient } from "@prisma/client";

/**
 * Datos mínimos para la demo. Empleados y familiares no se siembran: llegan de la API
 * empresarial en cada inicio de sesión (R1b). Solo se configura el rol de encargado (S4)
 * y un feriado de ejemplo.
 */
const prisma = new PrismaClient();

const encargados = (process.env.ENCARGADOS ?? "UB-200")
  .split(",")
  .map((codigo) => codigo.trim())
  .filter(Boolean);

const feriados = [{ fecha: "2026-11-02", descripcion: "Día de Todos los Difuntos" }];

async function main() {
  for (const codigoEmpleado of encargados) {
    await prisma.autorizacion.upsert({
      where: { codigoEmpleado },
      update: { rol: "ENCARGADO" },
      create: { codigoEmpleado, rol: "ENCARGADO" },
    });
  }
  for (const feriado of feriados) {
    const fecha = new Date(`${feriado.fecha}T00:00:00.000Z`);
    await prisma.feriado.upsert({
      where: { fecha },
      update: { descripcion: feriado.descripcion },
      create: { fecha, descripcion: feriado.descripcion },
    });
  }
  console.log(`Encargados: ${encargados.join(", ")}. Feriados de ejemplo: ${feriados.length}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
