import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const empleados = [
  { codigoInstitucional: "UB-100", nombreCompleto: "Ana Rojas", activo: true },
  { codigoInstitucional: "UB-101", nombreCompleto: "Carlos Mamani", activo: true },
  { codigoInstitucional: "UB-102", nombreCompleto: "Laura Quispe", activo: false },
  { codigoInstitucional: "UB-200", nombreCompleto: "Elena Vargas", activo: true },
];

async function main() {
  for (const empleado of empleados) {
    await prisma.empleado.upsert({
      where: { codigoInstitucional: empleado.codigoInstitucional },
      update: empleado,
      create: empleado,
    });
  }
  await prisma.autorizacion.upsert({
    where: { codigoEmpleado: "UB-200" },
    update: { rol: "ENCARGADO" },
    create: { codigoEmpleado: "UB-200", rol: "ENCARGADO" },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
