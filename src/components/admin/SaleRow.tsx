import Link from "next/link";
import { channelLabel } from "@/domain/sale";
import { formatPrice } from "@/lib/format";
import type { SaleSummary } from "@/server/services/sale-service";

export function saleTitle(sale: SaleSummary): string {
  const [first, ...rest] = sale.items;
  if (!first) return "Venta";
  const main = first.quantity > 1 ? `${first.name} × ${first.quantity}` : first.name;
  return rest.length ? `${main} y ${rest.length} más` : main;
}

export function SaleRow({ sale, showDate }: { sale: SaleSummary; showDate?: boolean }) {
  const time = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    ...(showDate ? { day: "numeric", month: "short" } : { hour: "2-digit", minute: "2-digit" }),
  }).format(sale.soldAt);

  return (
    <Link href={`/admin/ventas/${sale.id}`} className="a-row">
      <span className="a-row__main">
        <span className="a-row__title">{saleTitle(sale)}</span>
        <span className="a-row__meta">
          {channelLabel(sale.channel, sale.fairName)}
          {sale.customer && ` · ${sale.customer}`}
          {` · ${time}`}
        </span>
      </span>
      <span className="a-row__end">
        <strong>{formatPrice(sale.total)}</strong>
        {!sale.paid && <span className="a-pill a-pill--warn">Me debe</span>}
      </span>
    </Link>
  );
}
