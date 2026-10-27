import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { CifradorDeContrasenas } from "../dominio/puertos.js";

const OPCIONES: ScryptOptions = { N: 16384, r: 8, p: 1 };
const LARGO = 32;

function derivar(contrasena: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    scrypt(contrasena, sal, LARGO, OPCIONES, (error, clave) => (error ? rechazar(error) : resolver(clave)));
  });
}

/**
 * scrypt con sal aleatoria de 16 bytes. Se guarda "scrypt$<sal>$<hash>" en base64: quien lea la
 * tabla no obtiene la contraseña, y dos usuarios con la misma contraseña tienen hashes distintos.
 */
export class CifradorScrypt implements CifradorDeContrasenas {
  async cifrar(contrasena: string): Promise<string> {
    const sal = randomBytes(16);
    const hash = await derivar(contrasena, sal);
    return `scrypt$${sal.toString("base64")}$${hash.toString("base64")}`;
  }

  async verificar(contrasena: string, guardado: string): Promise<boolean> {
    const [algoritmo, sal, hash] = guardado.split("$");
    if (algoritmo !== "scrypt" || !sal || !hash) return false;
    const esperado = Buffer.from(hash, "base64");
    const calculado = await derivar(contrasena, Buffer.from(sal, "base64"));
    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
  }

  /** Diez caracteres sin letras que se confunden (0/O, 1/l), con letras y números. */
  temporal(): string {
    const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    const numeros = "23456789";
    const todos = letras + numeros;
    const elegidos = [letras[randomInt(letras.length)], numeros[randomInt(numeros.length)]];
    while (elegidos.length < 10) elegidos.push(todos[randomInt(todos.length)]);
    return elegidos.sort(() => randomInt(3) - 1).join("");
  }
}
