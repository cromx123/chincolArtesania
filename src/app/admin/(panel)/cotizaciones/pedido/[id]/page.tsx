import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { quoteChannelName } from "@/domain/bot-quote";
import { capitalize, formatDay } from "@/domain/event";
import { todayISO } from "@/lib/dates";
import { orderService } from "@/server/services/order-service";
import { productAdminService } from "@/server/services/product-admin-service";
import { OrderForm } from "@/components/admin/OrderForm";
import { orderMeta } from "@/components/admin/OrderRow";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Cotización" };

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const order = await orderService.get((await params).id);
  if (!order) notFound();

  const products = (await productAdminService.list())
    .map((p) => ({ id: p.id, name: p.name, price: p.price }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const meta = orderMeta(order, todayISO());

  return (
    <div className="a-page a-page--narrow">
      <PageHeader
        title={order.title}
        subtitle={`Entrega: ${capitalize(formatDay(order.dueDate))}${meta ? ` · ${meta}` : ""}`}
        back="/admin/cotizaciones"
      />

      <p className="a-hint">
        <Link href={`/admin/calendario?mes=${order.dueDate.slice(0, 7)}`} className="a-link">
          Ver en el calendario
        </Link>
        {order.quoteRequestId && (
          <>
            {" · "}
            <Link href={`/admin/cotizaciones/${order.quoteRequestId}`} className="a-link">
              Ver lo que pidió el cliente ({quoteChannelName(order.quoteChannel ?? "")})
            </Link>
          </>
        )}
      </p>

      <OrderForm
        id={order.id}
        products={products}
        initial={{
          title: order.title,
          productId: order.productId ?? "",
          quantity: order.quantity,
          customerName: order.customerName ?? "",
          customerContact: order.customerContact ?? "",
          price: order.price,
          status: order.status,
          dueDate: order.dueDate,
          note: order.note ?? "",
          quoteRequestId: order.quoteRequestId ?? "",
        }}
      />
    </div>
  );
}
