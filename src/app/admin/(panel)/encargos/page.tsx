import type { Metadata } from "next";
import Link from "next/link";
import { isOverdue } from "@/domain/production-order";
import { todayISO } from "@/lib/dates";
import { orderService } from "@/server/services/order-service";
import { Notice } from "@/components/admin/Notice";
import { OrderRow } from "@/components/admin/OrderRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Encargos" };

const NOTICES: Record<string, string> = { creado: "Encargo creado. Ya aparece en el calendario.", eliminado: "Encargo eliminado." };
const DELIVERED_SHOWN = 10;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const [orders, today] = [await orderService.list(), todayISO()];

  const late = orders.filter((o) => isOverdue(o, today));
  const open = orders.filter((o) => o.status !== "entregado" && !isOverdue(o, today));
  const delivered = orders.filter((o) => o.status === "entregado").reverse().slice(0, DELIVERED_SHOWN);

  const section = (title: string, list: typeof orders) =>
    list.length > 0 && (
      <section>
        <h2 className="a-section-title">{title}</h2>
        <div className="a-rows a-card a-card--flush">
          {list.map((o) => (
            <OrderRow key={o.id} order={o} today={today} />
          ))}
        </div>
      </section>
    );

  return (
    <div className="a-page a-page--narrow">
      <Notice message={aviso ? (NOTICES[aviso] ?? null) : null} />
      <PageHeader
        title="Encargos"
        subtitle="Piezas por hacer, en qué van y cuándo se entregan"
        actions={
          <Link href="/admin/encargos/nuevo" className="a-btn a-btn--primary">
            <PlusIcon /> Nuevo encargo
          </Link>
        }
      />

      {orders.length === 0 ? (
        <div className="a-empty">
          <p>No tienes encargos. Cuando alguien te pida una pieza, anótala aquí con su fecha de entrega y la verás en el calendario.</p>
          <Link href="/admin/encargos/nuevo" className="a-btn a-btn--primary">
            Anotar un encargo
          </Link>
        </div>
      ) : (
        <>
          {section("Atrasados", late)}
          {section("Por entregar", open)}
          {section("Entregados", delivered)}
        </>
      )}
    </div>
  );
}
