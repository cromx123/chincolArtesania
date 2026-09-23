import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { channelLabel, lineTotal, paymentName } from "@/domain/sale";
import { formatPrice } from "@/lib/format";
import { dayLabel } from "@/lib/dates";
import { saleService } from "@/server/services/sale-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaleActions } from "@/components/admin/SaleActions";

export const metadata: Metadata = { title: "Detalle de venta" };

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const sale = await saleService.get((await params).id);
  if (!sale) notFound();

  const time = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }).format(sale.soldAt);

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Detalle de venta" subtitle={`${dayLabel(sale.soldAt)}, ${time}`} back="/admin/ventas" />

      <section className="a-card">
        <ul className="a-receipt">
          {sale.items.map((i, n) => (
            <li key={n}>
              <span>
                {i.quantity} × {i.name}
                <span className="a-muted"> ({formatPrice(i.unitPrice)} c/u)</span>
                {i.discount > 0 && <span className="a-receipt__discount">Descuento de {formatPrice(i.discount)}</span>}
                {i.discount < 0 && <span className="a-receipt__discount">Recargo de {formatPrice(-i.discount)}</span>}
              </span>
              <span className="a-receipt__amount">
                {i.discount !== 0 && <s className="a-muted">{formatPrice(i.unitPrice * i.quantity)}</s>}
                <strong>{formatPrice(lineTotal(i))}</strong>
              </span>
            </li>
          ))}
          <li className="a-receipt__total">
            <span>Total</span>
            <strong>{formatPrice(sale.total)}</strong>
          </li>
        </ul>
      </section>

      <section className="a-card">
        <dl className="a-facts">
          <div>
            <dt>Dónde</dt>
            <dd>{channelLabel(sale.channel, sale.fairName)}</dd>
          </div>
          <div>
            <dt>Pago</dt>
            <dd>{sale.paid ? paymentName(sale.payment) : <span className="a-pill a-pill--warn">Me debe</span>}</dd>
          </div>
          {sale.customer && (
            <div>
              <dt>Cliente</dt>
              <dd>{sale.customer}</dd>
            </div>
          )}
        </dl>
      </section>

      <SaleActions id={sale.id} paid={sale.paid} />
    </div>
  );
}
