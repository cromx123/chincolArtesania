import "server-only";
import sharp from "sharp";
import { photoStorage } from "../container";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Recibe fotos tal como salen del celular y las deja listas para la web:
 * las endereza, las achica a 1600 px y las convierte a WebP (livianas).
 */
export async function savePhotos(files: File[]): Promise<{ urls: string[]; rejected: string[] }> {
  const urls: string[] = [];
  const rejected: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > MAX_BYTES) {
      rejected.push(file.name);
      continue;
    }
    try {
      const input = Buffer.from(await file.arrayBuffer());
      const output = await sharp(input).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      urls.push(await photoStorage.save(output, "webp"));
    } catch {
      rejected.push(file.name);
    }
  }
  return { urls, rejected };
}

export async function deletePhotos(urls: string[]) {
  await Promise.all(urls.map((u) => photoStorage.remove(u)));
}
