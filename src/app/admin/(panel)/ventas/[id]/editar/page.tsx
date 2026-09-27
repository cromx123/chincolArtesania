import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isChannel, isPayment } from "@/domain/sale";
import { todayISO } from "@/lib/dates";
import { customerService } from "@/server/services/customer-service";
import { saleService } from "@/server/services/sale-service";
import { SaleForm } from "@/components/admin/SaleForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { sellableProducts } from "../../sellable";

export const metadata: Metadata = { title: "Editar venta" };

export default async function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const sale = await saleService.get((await params).id);
  if (!sale) notFound();

  const back = `/admin/ventas/${sale.id}`;
  if (sale.items.some((i) => !i.productId)) {
    return (
      <div className="a-page a-page--narrow">
        <PageHeader title="Editar venta" back={back} />
        <div className="a-empty">
          <p>Esta venta tiene una pieza que ya no existe en tus productos, así que no se puede editar. Si necesitas corregirla, bórrala y regístrala de nuevo.</p>
          <Link href={back} className="a-btn a-btn--ghost">
            Volver a la venta
          </Link>
        </div>
      </div>
    );
  }

  // Lo que esta venta sacó del stock vuelve al guardar: se muestra como disponible.
  const stockBack = new Map<string, number>();
  for (const i of sale.items) stockBack.set(i.productId!, (stockBack.get(i.productId!) ?? 0) + i.fromStock);

  const [sellable, fairNames, customers] = await Promise.all([sellableProducts(stockBack), saleService.recentFairNames(), customerService.pickList()]);

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Editar venta" subtitle="Corrige lo que necesites; el stock se ajusta solo" back={back} />
      <SaleForm
        products={sellable}
        today={todayISO()}
        fairNames={fairNames}
        customers={customers}
        editing={{
          id: sale.id,
          channel: isChannel(sale.channel) ? sale.channel : "otro",
          fairName: sale.fairName ?? "",
          payment: sale.paid ? (isPayment(sale.payment) ? sale.payment : "transferencia") : "pendiente",
          customer: sale.customer ?? "",
          customerId: sale.customerId,
          date: todayISO(sale.soldAt),
          discountStock: sale.discountStock,
          lines: sale.items.map((i) => ({ productId: i.productId!, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount })),
        }}
      />
    </div>
  );
}
