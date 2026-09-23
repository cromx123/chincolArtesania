import { CATEGORIES, type CategoryId, type Product } from "@/domain/product";
import { type CatalogFilters, EMPTY_FILTERS, applyFilters } from "@/domain/catalog-filters";
import type { ProductRepository } from "../repositories/product-repository";

export interface CategoryCount {
  id: CategoryId;
  name: string;
  count: number;
}

/** Casos de uso del catálogo. Punto de entrada común para la web, la API y el bot. */
export function createCatalogService(repo: ProductRepository) {
  return {
    async search(filters: Partial<CatalogFilters> = {}): Promise<Product[]> {
      return applyFilters(await repo.findPublished(), { ...EMPTY_FILTERS, ...filters });
    },

    getBySlug(slug: string): Promise<Product | null> {
      return repo.findBySlug(slug);
    },

    getById(id: string): Promise<Product | null> {
      return repo.findById(id);
    },

    async featured(limit = 4): Promise<Product[]> {
      const all = applyFilters(await repo.findPublished(), EMPTY_FILTERS);
      const featured = all.filter((p) => p.featured);
      return (featured.length ? featured : all).slice(0, limit);
    },

    /** Primero de la misma categoría, luego el resto. */
    async related(product: Product, limit = 4): Promise<Product[]> {
      const others = applyFilters(await repo.findPublished(), EMPTY_FILTERS).filter((p) => p.id !== product.id);
      const same = others.filter((p) => p.category === product.category);
      const rest = others.filter((p) => p.category !== product.category);
      return [...same, ...rest].slice(0, limit);
    },

    async categoriesWithCount(): Promise<CategoryCount[]> {
      const all = await repo.findPublished();
      return CATEGORIES.map((c) => ({ id: c.id, name: c.name, count: all.filter((p) => p.category === c.id).length }));
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
