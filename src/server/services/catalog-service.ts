import { CATEGORIES, type CategoryId, type Product, discountedPrice } from "@/domain/product";
import { type CatalogFilters, EMPTY_FILTERS, applyFilters } from "@/domain/catalog-filters";
import type { ProductRepository } from "../repositories/product-repository";

export interface CategoryCount {
  id: CategoryId;
  name: string;
  count: number;
}

/** Descuentos vigentes hoy, por id de producto. */
export type OfferSource = () => Promise<Map<string, { percent: number; until: string }>>;

/** Casos de uso del catálogo. Punto de entrada común para la web, la API y el bot. */
export function createCatalogService(repo: ProductRepository, offers: OfferSource) {
  function withOffer(p: Product, active: Awaited<ReturnType<OfferSource>>): Product {
    const o = active.get(p.id);
    return o ? { ...p, offer: { price: discountedPrice(p.price, o.percent), percent: o.percent, until: o.until } } : p;
  }

  async function published(): Promise<Product[]> {
    const [list, active] = await Promise.all([repo.findPublished(), offers()]);
    return list.map((p) => withOffer(p, active));
  }

  async function one(product: Product | null): Promise<Product | null> {
    return product ? withOffer(product, await offers()) : null;
  }

  return {
    async search(filters: Partial<CatalogFilters> = {}): Promise<Product[]> {
      return applyFilters(await published(), { ...EMPTY_FILTERS, ...filters });
    },

    async getBySlug(slug: string): Promise<Product | null> {
      return one(await repo.findBySlug(slug));
    },

    async getById(id: string): Promise<Product | null> {
      return one(await repo.findById(id));
    },

    async featured(limit = 4): Promise<Product[]> {
      const all = applyFilters(await published(), EMPTY_FILTERS);
      const featured = all.filter((p) => p.featured);
      return (featured.length ? featured : all).slice(0, limit);
    },

    /** Primero de la misma categoría, luego el resto. */
    async related(product: Product, limit = 4): Promise<Product[]> {
      const others = applyFilters(await published(), EMPTY_FILTERS).filter((p) => p.id !== product.id);
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
