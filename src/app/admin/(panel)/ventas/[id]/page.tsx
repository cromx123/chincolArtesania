import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { channelLabel, lineTotal, paymentName } from "@/domain/sale";
import { formatPrice } from "@/lib/format";
import { dayLabel } from "@/lib/dates";
import { saleService } from "@/server/services/sale-service";
import { Notice } from "@/components/admin/Notice";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaleActions } from "@/components/admin/SaleActions";
import { PencilIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Detalle de venta" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> };

export default async function SaleDetailPage({ params, searchParams }: Props) {
  const [sale, { aviso }] = await Promise.all([params.then(({ id }) => saleService.get(id)), searchParams]);
  if (!sale) notFound();

  const time = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" }).format(sale.soldAt);

  return (
    <div className="a-page a-page--narrow">
      <Notice message={aviso === "editada" ? "Cambios guardados. El stock quedó ajustado a la venta corregida." : null} />
      <PageHeader
        title="Detalle de venta"
        subtitle={`${dayLabel(sale.soldAt)}, ${time}`}
        back="/admin/ventas"
        actions={
          <Link href={`/admin/ventas/${sale.id}/editar`} className="a-btn a-btn--ghost">
            <PencilIcon size={18} /> Editar
          </Link>
        }
      />

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
