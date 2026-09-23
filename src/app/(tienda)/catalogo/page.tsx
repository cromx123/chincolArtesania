import type { Metadata } from "next";
import Link from "next/link";
import { hasActiveFilters, parseFilters } from "@/domain/catalog-filters";
import { catalogService } from "@/server/container";
import { ProductGrid } from "@/components/ProductCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { CatalogToolbar } from "@/components/catalog/CatalogToolbar";

export const metadata: Metadata = { title: "Catálogo" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CatalogPage({ searchParams }: Props) {
  const filters = parseFilters(await searchParams);
  const [products, categories] = await Promise.all([catalogService.search(filters), catalogService.categoriesWithCount()]);
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <div className="page-head">
        <div className="container">
          <nav aria-label="Ruta" className="breadcrumb">
            <Link href="/">Inicio</Link>
            <span aria-hidden>/</span>
            <span aria-current="page">Catálogo</span>
          </nav>
          <h1>Catálogo</h1>
          <p className="muted">
            {hasActiveFilters(filters) ? `${products.length} de ${total} piezas` : `${total} piezas`} · hechas a mano en el taller
          </p>
        </div>
      </div>

      <div className="container catalog">
        <CatalogFilters filters={filters} categories={categories} total={products.length} />
        <div className="catalog__main">
          <CatalogToolbar filters={filters} />
          {products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <div className="empty">
              <h2>No encontramos piezas con esos filtros</h2>
              <p className="muted">Prueba con otra búsqueda o pregúntanos por un encargo a medida.</p>
              <Link href="/catalogo" className="btn btn--outline">
                Ver todo el catálogo
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
