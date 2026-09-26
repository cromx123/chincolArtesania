import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { EstimateRange } from "@/domain/pricing";
import { dayLabel } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { orderService } from "@/server/services/order-service";
import { quoteService } from "@/server/services/quote-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { QuoteStatusForm } from "@/components/admin/QuoteStatusForm";

export const metadata: Metadata = { title: "Cotización" };

const CHANNEL_NAME: Record<string, string> = { web: "Web", whatsapp: "WhatsApp", instagram: "Instagram" };

function parseDetail(json: string): EstimateRange | null {
  try {
    const value = JSON.parse(json);
    return value?.low && value?.high ? (value as EstimateRange) : null;
  } catch {
    return null;
  }
}

function Breakdown({ title, result }: { title: string; result: EstimateRange["low"] }) {
  if (!result.ok) return null;
  return (
    <div className="a-card">
      <h2 className="a-card__title">{title}</h2>
      <ul className="a-list-plain">
        <li>
          <span>Materiales</span>
          <span>{formatPrice(Math.round(result.materials))}</span>
        </li>
        <li>
          <span>Pérdida en cortes</span>
          <span>{formatPrice(Math.round(result.waste))}</span>
        </li>
        <li>
          <span>Mano de obra</span>
          <span>{formatPrice(Math.round(result.labor))}</span>
        </li>
        <li>
          <span>Gastos del taller</span>
          <span>{formatPrice(Math.round(result.overhead))}</span>
        </li>
        <li className="a-list-plain__total">
          <span>Precio</span>
          <strong>{formatPrice(result.price)}</strong>
        </li>
      </ul>
    </div>
  );
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const quote = await quoteService.get((await params).id);
  if (!quote) notFound();

  const detail = parseDetail(quote.estimateDetail);
  const order = await orderService.byQuote(quote.id);

  return (
    <div className="a-page a-page--narrow">
      <PageHeader
        title={quote.productName}
        subtitle={`${CHANNEL_NAME[quote.channel] ?? quote.channel} · ${dayLabel(quote.createdAt)}`}
        back="/admin/cotizaciones"
      />

      <div className="a-card">
        <h2 className="a-card__title">Lo que pide el cliente</h2>
        <p>{quote.changes}</p>
        {quote.note && (
          <p className="a-hint">
            <strong>Nota:</strong> {quote.note}
          </p>
        )}
      </div>

      <div className="a-card">
        <h2 className="a-card__title">Rango estimado</h2>
        <p className="a-calc__price">
          {formatPrice(quote.estimateLow)}–{formatPrice(quote.estimateHigh)}
        </p>
        <p className="a-hint">Esto es lo que vio el cliente. Confírmalo o ajústalo antes de responderle.</p>
        {quote.productId && (
          <Link href={`/admin/calculadora?producto=${quote.productId}`} className="a-link">
            Afinar el precio en la calculadora
          </Link>
        )}
      </div>

      {detail && (
        <div className="a-grid-2">
          <Breakdown title="Mínimo" result={detail.low} />
          <Breakdown title="Máximo" result={detail.high} />
        </div>
      )}

      <div className="a-card">
        <h2 className="a-card__title">Contacto</h2>
        <ul className="a-list-plain">
          {quote.contactName && (
            <li>
              <span>Nombre</span>
              <span>{quote.contactName}</span>
            </li>
          )}
          {quote.contactPhone && (
            <li>
              <span>Teléfono</span>
              <span>{quote.contactPhone}</span>
            </li>
          )}
          {quote.contactEmail && (
            <li>
              <span>Correo</span>
              <span>{quote.contactEmail}</span>
            </li>
          )}
          {!quote.contactName && !quote.contactPhone && !quote.contactEmail && <li>Sin datos de contacto.</li>}
        </ul>
      </div>

      <div className="a-card">
        <QuoteStatusForm id={quote.id} status={quote.status} />
      </div>

      <div className="a-card">
        <h2 className="a-card__title">Encargo</h2>
        {order ? (
          <>
            <p className="a-hint">Ya hay un encargo creado desde esta cotización.</p>
            <Link href={`/admin/encargos/${order.id}`} className="a-btn a-btn--ghost">
              Ver el encargo
            </Link>
          </>
        ) : (
          <>
            <p className="a-hint">Si el cliente confirmó, conviértela en encargo con su fecha de entrega: aparecerá en el calendario.</p>
            <Link href={`/admin/encargos/nuevo?cotizacion=${quote.id}`} className="a-btn a-btn--primary">
              Crear encargo
            </Link>
          </>
        )}
      </div>

      {quote.productId && (
        <p className="a-hint">
          <Link href={`/admin/productos/${quote.productId}`} className="a-link">
            Ver la pieza original
          </Link>
        </p>
      )}
    </div>
  );
}
