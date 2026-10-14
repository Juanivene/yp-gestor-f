import { randomInt } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | null = null;

// Se verifica contra este hash cuando el usuario no existe, para que el
// tiempo de respuesta sea parecido y no se pueda adivinar qué usuarios hay.
export function verifyAgainstDummy(password: string): Promise<boolean> {
  dummyHash ??= hash("contraseña-inexistente-dummy");
  return dummyHash.then((h) => verifyPassword(h, password));
}

// Sin caracteres ambiguos (0/O, 1/l/I) para que sea fácil de dictar o copiar.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
