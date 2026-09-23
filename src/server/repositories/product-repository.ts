import type { Product } from "@/domain/product";

/**
 * Lectura del catálogo público (solo productos publicados).
 * La web, la API y el bot dependen de esta interfaz, no de la base de datos.
 */
export interface ProductRepository {
  findPublished(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
}
