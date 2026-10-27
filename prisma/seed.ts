import { PrismaClient } from "@prisma/client";
import { precioDe, type Parentesco } from "../src/dominio/modelo.js";
import { anioMes, lunesAJuevesDe, lunesDe, sumarDias } from "../src/dominio/tiempo.js";
import { CifradorScrypt } from "../src/infraestructura/contrasenas.js";
import { momentoEnLaPaz } from "../src/infraestructura/relojLaPaz.js";
import { aFecha, deFecha } from "../src/infraestructura/repositoriosPrisma.js";

/**
 * Se ejecuta en cada despliegue (`npm run build`) y no pisa nada que ya exista.
 * - Siempre: R3, el primer administrador se crea al instalar si no hay ninguno.
 * - Con SEMBRAR_DEMO=true: usuarios de prueba, menús de este mes y la semana siguiente,
 *   una pensión de ejemplo y algunas reservas, para recorrer las 11 historias en la demo.
 */
const db = new PrismaClient();
const cifrador = new CifradorScrypt();
const CLAVE_DEMO = "Demo2026";

type Familiar = { nombres: string; apellidos: string; ci: string; nacimiento: string; parentesco: Parentesco };
type UsuarioDemo = {
  usuario: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  ci: string;
  tipo: "ADMINISTRADOR" | "EMPLEADO";
  activo?: boolean;
  debeCambiar?: boolean;
  familiares?: Familiar[];
};

const USUARIOS_DEMO: UsuarioDemo[] = [
  { usuario: "evargas", codigo: "UB-200", nombres: "Elena", apellidos: "Vargas", ci: "4100200", tipo: "ADMINISTRADOR" },
  {
    usuario: "pflores", codigo: "UB-103", nombres: "Pedro", apellidos: "Flores", ci: "4100103", tipo: "EMPLEADO",
    familiares: [
      { nombres: "María", apellidos: "Flores", ci: "5200201", nacimiento: "1986-04-12", parentesco: "CONYUGE" },
      { nombres: "Juan", apellidos: "Flores", ci: "5200202", nacimiento: "2012-09-03", parentesco: "HIJO" },
      { nombres: "Lucía", apellidos: "Flores", ci: "5200203", nacimiento: "2015-01-22", parentesco: "HIJA" },
      { nombres: "Luis", apellidos: "Flores", ci: "5200204", nacimiento: "2018-06-30", parentesco: "HIJO" },
    ],
  },
  {
    usuario: "arojas", codigo: "UB-100", nombres: "Ana", apellidos: "Rojas", ci: "4100100", tipo: "EMPLEADO",
    familiares: [{ nombres: "Diego", apellidos: "Rojas", ci: "5200101", nacimiento: "2014-11-08", parentesco: "HIJO" }],
  },
  { usuario: "cmamani", codigo: "UB-101", nombres: "Carlos", apellidos: "Mamani", ci: "4100101", tipo: "EMPLEADO" },
  { usuario: "lquispe", codigo: "UB-102", nombres: "Laura", apellidos: "Quispe", ci: "4100102", tipo: "EMPLEADO", activo: false },
  { usuario: "nuevo", codigo: "UB-104", nombres: "Nicolás", apellidos: "Nina", ci: "4100104", tipo: "EMPLEADO", debeCambiar: true },
];

const PLATOS = [
  "Sopa de maní y pollo al horno con arroz",
  "Crema de zapallo y silpancho",
  "Chairo y pique macho",
  "Sopa de quinua y milanesa con puré",
  "Caldo de verduras y ají de fideo",
  "Sopa de fideo y pollo a la plancha",
  "Lagua de choclo y majadito",
  "Sopa de arroz y estofado de res",
];

async function crearUsuario(datos: UsuarioDemo, hash: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.$transaction([
    db.persona.create({
      data: {
        id, tipo: "EMPLEADO", titularId: id, nombres: datos.nombres, apellidos: datos.apellidos, ci: datos.ci,
        fechaNacimiento: aFecha("1985-03-15"), telefono: "70012345", activo: datos.activo ?? true,
      },
    }),
    db.cuenta.create({
      data: {
        personaId: id, codigoEmpleado: datos.codigo, nombreUsuario: datos.usuario, contrasenaHash: hash,
        tipo: datos.tipo, debeCambiarContrasena: datos.debeCambiar ?? false,
      },
    }),
    ...(datos.familiares ?? []).map((f) =>
      db.persona.create({
        data: {
          tipo: "FAMILIAR", titularId: id, nombres: f.nombres, apellidos: f.apellidos, ci: f.ci,
          fechaNacimiento: aFecha(f.nacimiento), telefono: "70012345", parentesco: f.parentesco, activo: datos.activo ?? true,
        },
      }),
    ),
  ]);
  return id;
}

/** R3: si no hay ningún administrador, se crea uno con ADMIN_USUARIO / ADMIN_CONTRASENA. */
async function asegurarAdministrador(): Promise<void> {
  if (await db.cuenta.count({ where: { tipo: "ADMINISTRADOR" } })) return;
  const usuario = process.env.ADMIN_USUARIO ?? "admin";
  const contrasena = process.env.ADMIN_CONTRASENA ?? "Admin2026";
  await crearUsuario(
    { usuario, codigo: "ADMIN-1", nombres: "Administrador", apellidos: "del Sistema", ci: "1000001", tipo: "ADMINISTRADOR", debeCambiar: true },
    await cifrador.cifrar(contrasena),
  );
  console.log(`Administrador inicial: ${usuario} (debe cambiar la contraseña al ingresar).`);
}

/** Publica las semanas que falten y confirma a los pensionados, igual que HU03 + HU07 CA2. */
async function asegurarMenus(desde: string, hasta: string): Promise<void> {
  for (let lunes = lunesDe(desde); lunes <= hasta; lunes = sumarDias(lunes, 7)) {
    if (await db.menuSemanal.findUnique({ where: { lunes: aFecha(lunes) } })) continue;
    const dias = lunesAJuevesDe(lunes);
    await db.menuSemanal.create({
      data: {
        lunes: aFecha(lunes),
        publicadoEl: aFecha(sumarDias(lunes, -1)),
        dias: {
          create: dias.map((fecha) => ({
            fecha: aFecha(fecha),
            descripcion: PLATOS[Number(fecha.slice(8, 10)) % PLATOS.length],
          })),
        },
      },
    });
    for (const fecha of dias) {
      const { anio, mes } = anioMes(fecha);
      const pensiones = await db.pension.findMany({ where: { anio, mes, persona: { activo: true } } });
      for (const pension of pensiones) {
        await db.reserva.upsert({
          where: { personaId_fecha: { personaId: pension.personaId, fecha: aFecha(fecha) } },
          update: {},
          create: {
            personaId: pension.personaId, titularId: pension.titularId, fecha: aFecha(fecha),
            modalidad: "PENSIONADO", precioBs: precioDe("PENSIONADO"), estado: "CONFIRMADA",
          },
        });
      }
    }
  }
}

async function sembrarDemo(hoy: string): Promise<void> {
  const { anio, mes } = anioMes(hoy);
  const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const yaEstaba = await db.cuenta.findUnique({ where: { nombreUsuario: "evargas" } });

  if (!yaEstaba) {
    const hash = await cifrador.cifrar(CLAVE_DEMO);
    const ids = new Map<string, string>();
    for (const usuario of USUARIOS_DEMO) ids.set(usuario.usuario, await crearUsuario(usuario, hash));

    // Pedro y su cónyuge, pensionados del mes en curso (pidieron la pensión el mes anterior).
    const pedro = ids.get("pflores")!;
    const maria = await db.persona.findUniqueOrThrow({ where: { ci: "5200201" } });
    for (const personaId of [pedro, maria.id]) {
      await db.pension.create({
        data: { personaId, titularId: pedro, anio, mes, solicitadaEl: aFecha(sumarDias(inicioMes, -5)) },
      });
    }
    await asegurarMenus(inicioMes, sumarDias(lunesDe(hoy), 7));

    // Algunas reservas no pensionadas de días que ya pasaron, para el reporte y el consumo.
    const pasados = (await db.menuDia.findMany({ where: { fecha: { gte: aFecha(inicioMes), lt: aFecha(hoy) } } })).map((d) =>
      deFecha(d.fecha),
    );
    const ana = ids.get("arojas")!;
    const diego = await db.persona.findUniqueOrThrow({ where: { ci: "5200101" } });
    const reservas = [
      ...pasados.slice(0, 3).map((fecha) => ({ personaId: ana, fecha })),
      ...pasados.slice(1, 3).map((fecha) => ({ personaId: diego.id, fecha })),
    ];
    for (const { personaId, fecha } of reservas) {
      await db.reserva.create({
        data: {
          personaId, titularId: ana, fecha: aFecha(fecha), modalidad: "NO_PENSIONADO",
          precioBs: precioDe("NO_PENSIONADO"), estado: "CONFIRMADA",
        },
      });
    }
    console.log(`Demo sembrada: ${USUARIOS_DEMO.length} usuarios (contraseña ${CLAVE_DEMO}), menús y una pensión de ejemplo.`);
  }

  // En cada despliegue: que siempre haya menú para esta semana y la siguiente.
  await asegurarMenus(lunesDe(hoy), sumarDias(lunesDe(hoy), 7));
}

async function main() {
  const hoy = momentoEnLaPaz(new Date()).fecha;
  if (process.env.SEMBRAR_DEMO === "true") await sembrarDemo(hoy);
  await asegurarAdministrador();
}

main()
  .then(() => db.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
