export interface PhotoStorage {
  /** Guarda una foto ya procesada y devuelve la URL pública. */
  save(data: Buffer, extension: string): Promise<string>;
  remove(url: string): Promise<void>;
}
