import Link from "next/link";
import { quoteChannelName } from "@/domain/bot-quote";
import { capitalize, relativeDays } from "@/domain/event";
import { type ProductionOrder, isOverdue, orderStatusName } from "@/domain/production-order";
import { formatPrice } from "@/lib/format";
import { OrderAdvanceButton } from "./OrderAdvanceButton";

export const ORDER_STATUS_PILL: Record<string, string> = {
  "por-empezar": "a-pill--warn",
  "en-progreso": "a-pill--info",
  finalizado: "a-pill--ok",
  entregado: "a-pill--plain",
};

export function orderMeta(o: ProductionOrder, today: string): string {
  const when = o.status === "entregado" ? null : isOverdue(o, today) ? `Atrasado (${relativeDays(today, o.dueDate)})` : capitalize(relativeDays(today, o.dueDate));
  return [when, o.quantity > 1 && `${o.quantity} unidades`, o.customerName, o.price > 0 && formatPrice(o.price)].filter(Boolean).join(" · ");
}

/** De dónde vino: el canal de la cotización original, o "Manual" si la creó la dueña. */
export function orderOrigin(o: ProductionOrder): string {
  return o.quoteChannel ? quoteChannelName(o.quoteChannel) : "Manual";
}

export function OrderRow({ order: o, today }: { order: ProductionOrder; today: string }) {
  const late = isOverdue(o, today);
  return (
    <div className={`a-row${o.status === "entregado" ? " is-past" : ""}`}>
      <span className={`a-cal__date${late ? " a-cal__date--late" : ""}`} aria-hidden>
        <strong>{Number(o.dueDate.slice(8))}</strong>
        {new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" }).format(new Date(`${o.dueDate}T12:00:00Z`))}
      </span>
      <Link href={`/admin/cotizaciones/pedido/${o.id}`} className="a-row__main a-row__main--link">
        <span className="a-row__title">{o.title}</span>
        <span className="a-row__meta">
          {orderOrigin(o)} · {orderMeta(o, today)}
        </span>
      </Link>
      <span className="a-row__end">
        <span className={`a-pill ${ORDER_STATUS_PILL[o.status]}`}>{orderStatusName(o.status)}</span>
        <OrderAdvanceButton id={o.id} status={o.status} />
      </span>
    </div>
  );
}
