import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isISODate } from "@/domain/event";
import { EMPTY_ORDER, type OrderInput } from "@/domain/production-order";
import { formatPrice } from "@/lib/format";
import { orderService } from "@/server/services/order-service";
import { productAdminService } from "@/server/services/product-admin-service";
import { quoteService } from "@/server/services/quote-service";
import { OrderForm } from "@/components/admin/OrderForm";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Nueva cotización" };

type Props = { searchParams: Promise<{ fecha?: string; cotizacion?: string }> };

/** Cotización manual, o agendar para producción una que llegó del chat o del carrito (?cotizacion=). */
export default async function NewOrderPage({ searchParams }: Props) {
  const { fecha, cotizacion } = await searchParams;
  const initial: OrderInput = { ...EMPTY_ORDER, dueDate: fecha && isISODate(fecha) ? fecha : "" };
  let back = "/admin/cotizaciones";
  let title = "Nueva cotización";

  // Desde una cotización del chat o del carrito: se precargan pieza, pedido y contacto.
  if (cotizacion) {
    const existing = await orderService.byQuote(cotizacion);
    if (existing) redirect(`/admin/cotizaciones/pedido/${existing.id}`);
    const quote = await quoteService.get(cotizacion);
    if (quote) {
      back = `/admin/cotizaciones/${quote.id}`;
      title = "Agendar cotización";
      Object.assign(initial, {
        title: `${quote.productName}: ${quote.changes}`.slice(0, 120),
        productId: quote.productId ?? "",
        customerName: quote.contactName ?? "",
        customerContact: quote.contactPhone ?? quote.contactEmail ?? "",
        note:
          quote.estimateLow === quote.estimateHigh
            ? `${quote.changes}\n\nSe le cotizó ${formatPrice(quote.estimateLow)}.`
            : `${quote.changes}\n\nSe le cotizó entre ${formatPrice(quote.estimateLow)} y ${formatPrice(quote.estimateHigh)}.`,
        // Las cotizaciones actuales tienen un solo precio: el mismo que vio el cliente.
        price: quote.estimateLow === quote.estimateHigh ? quote.estimateLow : 0,
        quoteRequestId: quote.id,
      } satisfies Partial<OrderInput>);
    }
  }

  const products = (await productAdminService.list())
    .map((p) => ({ id: p.id, name: p.name, price: p.price }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title={title} subtitle="Con su fecha de entrega aparece en el calendario" back={back} />
      <OrderForm id={null} initial={initial} products={products} />
    </div>
  );
}
