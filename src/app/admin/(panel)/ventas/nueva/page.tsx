import type { Metadata } from "next";
import { todayISO } from "@/lib/dates";
import { productAdminService } from "@/server/services/product-admin-service";
import { customerService } from "@/server/services/customer-service";
import { saleService } from "@/server/services/sale-service";
import { SaleForm, type SellableProduct } from "@/components/admin/SaleForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Registrar venta" };

export default async function NewSalePage() {
  const [products, fairNames, customers] = await Promise.all([productAdminService.list(), saleService.recentFairNames(), customerService.pickList()]);
  const sellable: SellableProduct[] = products
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      madeToOrder: p.madeToOrder,
      image: p.images[0],
      hasRecipe: p.recipe.length > 0,
    }));

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Registrar venta" back="/admin" />
      {sellable.length === 0 ? (
        <p className="a-empty">Primero agrega tus productos para poder registrar ventas.</p>
      ) : (
        <SaleForm products={sellable} today={todayISO()} fairNames={fairNames} customers={customers} />
      )}
    </div>
  );
}
