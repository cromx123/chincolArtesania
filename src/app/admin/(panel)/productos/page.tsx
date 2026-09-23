import type { Metadata } from "next";
import Link from "next/link";
import { categoryName } from "@/domain/product";
import { unitsPossible } from "@/domain/production";
import { productAdminService } from "@/server/services/product-admin-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductList, type ProductListItem } from "@/components/admin/ProductList";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Productos" };

const NOTICES: Record<string, string> = {
  guardado: "Producto guardado.",
  creado: "Producto creado. Ya aparece en tu tienda.",
  eliminado: "Producto eliminado.",
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const products = await productAdminService.list();
  const items: ProductListItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    categoryName: categoryName(p.category),
    price: p.price,
    stock: p.stock,
    lowStockAlert: p.lowStockAlert,
    madeToOrder: p.madeToOrder,
    published: p.published,
    image: p.images[0],
    recipe: p.recipe,
    canMake: unitsPossible(p.recipe),
  }));

  return (
    <div className="a-page">
      <PageHeader
        title="Productos"
        subtitle="Lo que se ve en tu tienda y cuántas piezas tienes hechas"
        actions={
          <Link href="/admin/productos/nuevo" className="a-btn a-btn--primary">
            <PlusIcon /> Nuevo producto
          </Link>
        }
      />
      {items.length === 0 ? (
        <div className="a-empty">
          <p>Todavía no tienes productos. Empieza agregando el primero.</p>
          <Link href="/admin/productos/nuevo" className="a-btn a-btn--primary">
            Agregar mi primer producto
          </Link>
        </div>
      ) : (
        <ProductList products={items} notice={aviso ? (NOTICES[aviso] ?? null) : null} />
      )}
    </div>
  );
}
