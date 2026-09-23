import type { Metadata } from "next";
import { materialService } from "@/server/services/material-service";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/ProductForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const materials = await materialService.all();
  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Nuevo producto" back="/admin/productos" />
      <ProductForm id={null} initial={EMPTY_PRODUCT} materials={materials} />
    </div>
  );
}
