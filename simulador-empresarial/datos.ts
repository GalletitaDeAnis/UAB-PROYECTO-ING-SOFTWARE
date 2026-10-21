/**
 * Datos de prueba del sistema empresarial. El equipo no tiene la base real de la Unión Boliviana:
 * este simulador responde con la misma forma que el backlog §2.3 espera de la API de TI.
 * Las contraseñas son de demostración y solo existen aquí; el restaurante nunca las guarda.
 */
export type EmpleadoSimulado = {
  codigo: string;
  usuario: string;
  contrasena: string;
  nombre: string;
  ci: string;
  activo: boolean;
  cargo: string;
  familiares: { id: string; nombre: string; parentesco: string }[];
};

export const empleadosSimulados: EmpleadoSimulado[] = [
  {
    codigo: "UB-100",
    usuario: "arojas",
    contrasena: "demo123",
    nombre: "Ana Rojas",
    ci: "4567890",
    activo: true,
    cargo: "Contadora",
    familiares: [{ id: "FAM-1001", nombre: "Diego Rojas", parentesco: "Hijo" }],
  },
  {
    codigo: "UB-101",
    usuario: "cmamani",
    contrasena: "demo123",
    nombre: "Carlos Mamani",
    ci: "5678901",
    activo: true,
    cargo: "Auxiliar administrativo",
    familiares: [],
  },
  {
    codigo: "UB-102",
    usuario: "lquispe",
    contrasena: "demo123",
    nombre: "Laura Quispe",
    ci: "6789012",
    activo: false,
    cargo: "Secretaria",
    familiares: [],
  },
  {
    codigo: "UB-103",
    usuario: "pflores",
    contrasena: "demo123",
    nombre: "Pedro Flores",
    ci: "7890123",
    activo: true,
    cargo: "Técnico de sistemas",
    familiares: [
      { id: "FAM-2001", nombre: "María Flores", parentesco: "Cónyuge" },
      { id: "FAM-2002", nombre: "Juan Flores", parentesco: "Hijo" },
      { id: "FAM-2003", nombre: "Ana Flores", parentesco: "Hija" },
      { id: "FAM-2004", nombre: "Luis Flores", parentesco: "Hijo" },
    ],
  },
  {
    codigo: "UB-200",
    usuario: "evargas",
    contrasena: "demo123",
    nombre: "Elena Vargas",
    ci: "8901234",
    activo: true,
    cargo: "Encargada del restaurante",
    familiares: [],
  },
];

/** Usuario que hace esperar a la API más de 5 segundos, para mostrar HU01 CA4 en vivo. */
export const USUARIO_LENTO = "lento";
