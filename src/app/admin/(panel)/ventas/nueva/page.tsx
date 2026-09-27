import type { Metadata } from "next";
import { todayISO } from "@/lib/dates";
import { customerService } from "@/server/services/customer-service";
import { saleService } from "@/server/services/sale-service";
import { SaleForm } from "@/components/admin/SaleForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { sellableProducts } from "../sellable";

export const metadata: Metadata = { title: "Registrar venta" };

export default async function NewSalePage() {
  const [sellable, fairNames, customers] = await Promise.all([sellableProducts(), saleService.recentFairNames(), customerService.pickList()]);

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
