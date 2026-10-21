import { timingSafeEqual } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { empleadosSimulados, USUARIO_LENTO, type EmpleadoSimulado } from "./datos.js";

export type OpcionesSimulador = {
  apiKey: string;
  empleados?: EmpleadoSimulado[];
  demoraLentoMs?: number;
};

function iguales(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** API empresarial simulada: POST /auth/login, GET /empleados/:codigo y GET /empleados/:codigo/familiares. */
export function crearSimuladorEmpresarial(opciones: OpcionesSimulador): express.Router {
  const empleados = opciones.empleados ?? empleadosSimulados;
  const router = express.Router();
  router.use(express.json());

  router.use((req: Request, res: Response, next: NextFunction) => {
    const clave = req.header("x-api-key") ?? "";
    if (!iguales(clave, opciones.apiKey)) {
      res.status(401).json({ error: "API key inválida" });
      return;
    }
    next();
  });

  router.post("/auth/login", async (req, res) => {
    const usuario = typeof req.body?.usuario === "string" ? req.body.usuario : "";
    const contrasena = typeof req.body?.contrasena === "string" ? req.body.contrasena : "";
    if (usuario === USUARIO_LENTO) {
      await new Promise((resolver) => setTimeout(resolver, opciones.demoraLentoMs ?? 6000));
    }
    const empleado = empleados.find((candidato) => candidato.usuario === usuario);
    if (!empleado || !iguales(empleado.contrasena, contrasena)) {
      res.status(401).json({ valido: false });
      return;
    }
    res.json({ valido: true, codigoEmpleado: empleado.codigo, token: `simulado-${empleado.codigo}` });
  });

  router.get("/empleados/:codigo", (req, res) => {
    const empleado = empleados.find((candidato) => candidato.codigo === req.params.codigo);
    if (!empleado) {
      res.status(404).json({ error: "No existe" });
      return;
    }
    res.json({
      codigo: empleado.codigo,
      nombre: empleado.nombre,
      ci: empleado.ci,
      activo: empleado.activo,
      cargo: empleado.cargo,
    });
  });

  router.get("/empleados/:codigo/familiares", (req, res) => {
    const empleado = empleados.find((candidato) => candidato.codigo === req.params.codigo);
    if (!empleado) {
      res.status(404).json({ error: "No existe" });
      return;
    }
    res.json(empleado.familiares);
  });

  return router;
}
