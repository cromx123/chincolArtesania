import type { Metadata } from "next";
import Link from "next/link";
import { quoteStatusName } from "@/domain/bot-quote";
import { dayLabel } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { quoteService } from "@/server/services/quote-service";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Cotizaciones" };

const CHANNEL_NAME: Record<string, string> = { web: "Web", whatsapp: "WhatsApp", instagram: "Instagram" };

const STATUS_PILL: Record<string, string> = {
  pendiente: "a-pill--warn",
  revisada: "a-pill--info",
  respondida: "a-pill--ok",
  descartada: "a-pill--plain",
};

export default async function QuotesPage() {
  const quotes = await quoteService.list();

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title="Cotizaciones" subtitle="Solicitudes de variaciones que el bot cotizó a clientes" />

      {quotes.length === 0 ? (
        <div className="a-empty">
          <p>Todavía no hay cotizaciones. Aparecerán aquí cuando un cliente le pida al bot una variación de una pieza.</p>
        </div>
      ) : (
        <div className="a-rows a-card a-card--flush">
          {quotes.map((q) => (
            <Link key={q.id} href={`/admin/cotizaciones/${q.id}`} className="a-row">
              <span className="a-row__main">
                <span className="a-row__title">{q.productName}</span>
                <span className="a-row__meta">
                  {q.changes.length > 80 ? `${q.changes.slice(0, 80)}…` : q.changes}
                </span>
                <span className="a-row__meta">
                  {formatPrice(q.estimateLow)}–{formatPrice(q.estimateHigh)} · {CHANNEL_NAME[q.channel] ?? q.channel} · {dayLabel(q.createdAt)}
                </span>
              </span>
              <span className="a-row__end">
                <span className={`a-pill ${STATUS_PILL[q.status] ?? "a-pill--plain"}`}>{quoteStatusName(q.status)}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
