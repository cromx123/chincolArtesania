import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatHours, formatRange, lastDay, relativeDays } from "@/domain/event";
import { formatPrice } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { eventService } from "@/server/services/event-service";
import { EventForm } from "@/components/admin/EventForm";
import { FormQr } from "@/components/admin/FormQr";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Feria o evento" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const event = await eventService.get((await params).id);
  if (!event) notFound();

  const today = todayISO();
  const started = event.startDate <= today;
  const sales = event.kind === "feria" && started ? await eventService.salesAt(event.name) : null;
  const when = started ? (lastDay(event) >= today ? "Es hoy" : `Fue ${relativeDays(today, lastDay(event))}`) : `Es ${relativeDays(today, event.startDate)}`;

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title={event.name} subtitle={[formatRange(event), formatHours(event), when].filter(Boolean).join(" · ")} back={`/admin/calendario?mes=${event.startDate.slice(0, 7)}`} />

      {sales && (
        <section className="a-stats">
          <div className="a-stat">
            <span className="a-stat__label">Vendiste en esta feria</span>
            <span className="a-stat__value">{formatPrice(sales.total)}</span>
            <span className="a-stat__hint">
              {sales.count === 0
                ? "No hay ventas registradas con este nombre de feria."
                : `${sales.count === 1 ? "1 venta" : `${sales.count} ventas`}${event.cost > 0 ? ` · el stand costó ${formatPrice(event.cost)}` : ""}`}
            </span>
          </div>
          {event.cost > 0 && sales.count > 0 && (
            <div className={`a-stat${sales.total < event.cost ? " a-stat--warn" : ""}`}>
              <span className="a-stat__label">{sales.total >= event.cost ? "Te quedó (sin contar materiales)" : "Faltó para cubrir el stand"}</span>
              <span className="a-stat__value">{formatPrice(Math.abs(sales.total - event.cost))}</span>
            </div>
          )}
        </section>
      )}

      {event.kind === "feria" && event.status !== "descartada" && (
        <FormQr
          source={`feria:${event.id}`}
          title="QR para el stand"
          hint="Imprímelo y ponlo en tu mesa: quien lo escanee deja sus datos, y en Clientas verás cuántas personas llegaron desde esta feria."
        />
      )}

      <EventForm
        id={event.id}
        initial={{
          name: event.name,
          kind: event.kind,
          startDate: event.startDate,
          endDate: event.endDate ?? "",
          startTime: event.startTime ?? "",
          endTime: event.endTime ?? "",
          place: event.place ?? "",
          applyBy: event.applyBy ?? "",
          status: event.status,
          cost: event.cost,
          note: event.note ?? "",
        }}
      />
    </div>
  );
}
