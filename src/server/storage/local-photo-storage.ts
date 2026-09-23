import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PhotoStorage } from "./photo-storage";

export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
export const PUBLIC_PREFIX = "/fotos/";

/** Guarda las fotos en `data/uploads/` y las sirve la ruta `/fotos/[archivo]`. */
export class LocalPhotoStorage implements PhotoStorage {
  async save(data: Buffer, extension: string): Promise<string> {
    await mkdir(UPLOADS_DIR, { recursive: true });
    const name = `${randomUUID()}.${extension}`;
    await writeFile(path.join(UPLOADS_DIR, name), data);
    return PUBLIC_PREFIX + name;
  }

  async remove(url: string): Promise<void> {
    const name = safeName(url.replace(PUBLIC_PREFIX, ""));
    if (name) await unlink(path.join(UPLOADS_DIR, name)).catch(() => {});
  }
}

/** Evita rutas del tipo `../`: solo nombres simples. */
export function safeName(name: string): string | null {
  return /^[a-zA-Z0-9-]+\.(webp|jpg|jpeg|png)$/.test(name) ? name : null;
}

export async function readUpload(name: string): Promise<Buffer | null> {
  const safe = safeName(name);
  if (!safe) return null;
  return readFile(path.join(UPLOADS_DIR, safe)).catch(() => null);
}
