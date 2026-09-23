import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryName } from "@/domain/product";
import { materialService } from "@/server/services/material-service";
import { type ProductInput, productAdminService } from "@/server/services/product-admin-service";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { StoreIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, materials] = await Promise.all([productAdminService.get(id), materialService.all()]);
  if (!product) notFound();

  const initial: ProductInput = {
    name: product.name,
    category: product.category,
    description: product.description,
    price: product.price,
    stock: product.stock,
    lowStockAlert: product.lowStockAlert,
    madeToOrder: product.madeToOrder,
    leatherColors: product.options.leatherColors,
    threadColors: product.options.threadColors,
    engraving: product.options.engraving,
    images: product.images,
    measures: product.details?.measures ?? "",
    materialsText: product.details?.materials ?? "",
    care: product.details?.care ?? "",
    featured: Boolean(product.featured),
    published: product.published,
    recipe: product.recipe.map((r) => ({ materialId: r.material.id, quantity: r.quantity })),
  };

  return (
    <div className="a-page a-page--narrow">
      <PageHeader
        title={product.name}
        subtitle={categoryName(product.category)}
        back="/admin/productos"
        actions={
          product.published ? (
            <Link href={`/catalogo/${product.slug}`} target="_blank" className="a-btn a-btn--ghost a-btn--sm">
              <StoreIcon size={17} /> Ver en la tienda
            </Link>
          ) : null
        }
      />
      <ProductForm id={product.id} initial={initial} materials={materials} />
    </div>
  );
}
