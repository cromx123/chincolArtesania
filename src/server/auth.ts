// Acceso al administrador con una sola contraseña (la pyme es de una persona).
// La sesión es una cookie firmada con HMAC que dura 30 días. Usa Web Crypto,
// así funciona tanto en el middleware como en el servidor.

export const SESSION_COOKIE = "chincol_admin";
export const SESSION_DAYS = 30;

function secret(): string | null {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || null;
}

async function sign(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const key = secret();
  if (!key) throw new Error("Falta ADMIN_PASSWORD");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  return `${expires}.${await sign(String(expires), key)}`;
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  const key = secret();
  if (!key || !token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || Number(expires) < Date.now()) return false;
  return safeEqual(sig, await sign(expires, key));
}

export function isPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function checkPassword(input: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Se comparan las firmas para no filtrar el largo de la contraseña.
  const key = "chincol-password-check";
  return safeEqual(await sign(input.trim(), key), await sign(expected, key));
}
