import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { quoteChannelName, quoteStatusName } from "@/domain/bot-quote";
import { isOverdue } from "@/domain/production-order";
import { dayLabel, todayISO } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { orderService } from "@/server/services/order-service";
import { quoteService } from "@/server/services/quote-service";
import { Notice } from "@/components/admin/Notice";
import { OrderRow } from "@/components/admin/OrderRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Cotizaciones" };

// Una sola lista para todo lo cotizado, venga del chat, del carrito o creado a mano.
// Las del chat/carrito se revisan aquí; al agendarlas (fecha de entrega) pasan a producción
// y se muestran una sola vez, como las manuales.

const NOTICES: Record<string, string> = { creada: "Cotización guardada. Ya aparece en el calendario.", eliminada: "Cotización eliminada." };
const CLOSED_SHOWN = 10;

const STATUS_PILL: Record<string, string> = {
  pendiente: "a-pill--warn",
  revisada: "a-pill--info",
  respondida: "a-pill--ok",
  descartada: "a-pill--plain",
};

type Quote = Awaited<ReturnType<typeof quoteService.list>>[number];

function QuoteRow({ q }: { q: Quote }) {
  return (
    <Link href={`/admin/cotizaciones/${q.id}`} className="a-row">
      <span className="a-row__main">
        <span className="a-row__title">{q.productName}</span>
        <span className="a-row__meta">{q.changes.length > 80 ? `${q.changes.slice(0, 80)}…` : q.changes}</span>
        <span className="a-row__meta">
          {quoteChannelName(q.channel)} · {q.estimateLow === q.estimateHigh ? formatPrice(q.estimateLow) : `${formatPrice(q.estimateLow)}–${formatPrice(q.estimateHigh)}`} ·{" "}
          {dayLabel(q.createdAt)}
        </span>
      </span>
      <span className="a-row__end">
        <span className={`a-pill ${STATUS_PILL[q.status] ?? "a-pill--plain"}`}>{quoteStatusName(q.status)}</span>
      </span>
    </Link>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="a-section-title">{title}</h2>
      {hint && <p className="a-hint">{hint}</p>}
      <div className="a-rows a-card a-card--flush">{children}</div>
    </section>
  );
}

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const [quotes, orders] = await Promise.all([quoteService.list(), orderService.list()]);
  const today = todayISO();

  const unscheduled = quotes.filter((q) => !q.productionOrder);
  const toReview = unscheduled.filter((q) => q.status === "pendiente");
  const waiting = unscheduled.filter((q) => q.status === "revisada" || q.status === "respondida");
  const discarded = unscheduled.filter((q) => q.status === "descartada").slice(0, CLOSED_SHOWN);
  // Atrasadas primero; después por fecha de entrega.
  const open = orders.filter((o) => o.status !== "entregado").sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)));
  const delivered = orders.filter((o) => o.status === "entregado").reverse().slice(0, CLOSED_SHOWN);
  const empty = quotes.length === 0 && orders.length === 0;

  return (
    <div className="a-page a-page--narrow">
      <Notice message={aviso ? (NOTICES[aviso] ?? null) : null} />
      <PageHeader
        title="Cotizaciones"
        subtitle="Lo que piden por el chat y el carrito, y las que anotas tú"
        actions={
          <Link href="/admin/cotizaciones/nueva" className="a-btn a-btn--primary">
            <PlusIcon /> Nueva cotización
          </Link>
        }
      />

      {empty ? (
        <div className="a-empty">
          <p>Todavía no hay cotizaciones. Llegan desde el chat de la tienda y el botón del carrito, o puedes anotar una tú.</p>
          <Link href="/admin/cotizaciones/nueva" className="a-btn a-btn--primary">
            Anotar una cotización
          </Link>
        </div>
      ) : (
        <>
          {toReview.length > 0 && (
            <Section title="Nuevas por revisar" hint="Llegaron del chat o del carrito. Revísalas y, si el cliente confirma, agéndalas con su fecha de entrega.">
              {toReview.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </Section>
          )}
          {open.length > 0 && (
            <Section title="Por hacer y entregar">
              {open.map((o) => (
                <OrderRow key={o.id} order={o} today={today} />
              ))}
            </Section>
          )}
          {waiting.length > 0 && (
            <Section title="Esperando respuesta del cliente">
              {waiting.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </Section>
          )}
          {delivered.length > 0 && (
            <Section title="Entregadas">
              {delivered.map((o) => (
                <OrderRow key={o.id} order={o} today={today} />
              ))}
            </Section>
          )}
          {discarded.length > 0 && (
            <Section title="Descartadas">
              {discarded.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}
