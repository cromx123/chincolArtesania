import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type QuoteDetail, parseQuoteDetail } from "@/domain/bot-quote";
import { MAX_VARIATION_SURCHARGE } from "@/domain/pricing";
import { formatQuantity } from "@/domain/material";
import { dayLabel } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { orderService } from "@/server/services/order-service";
import { quoteService } from "@/server/services/quote-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { QuoteStatusForm } from "@/components/admin/QuoteStatusForm";

export const metadata: Metadata = { title: "Cotización" };

const CHANNEL_NAME: Record<string, string> = { web: "Web", whatsapp: "WhatsApp", instagram: "Instagram" };

/** El precio que vio el cliente y, si es una variación, de dónde sale. */
function PriceCard({ detail, low, high }: { detail: QuoteDetail | null; low: number; high: number }) {
  if (detail?.tipo === "catalogo") {
    return (
      <div className="a-card">
        <h2 className="a-card__title">Pieza tal cual · precio de la tienda</h2>
        <p className="a-calc__price">{formatPrice(detail.precio)}</p>
        <p className="a-hint">
          Es el precio que le dio el bot al cliente. La quiere igual que en la tienda ({detail.disponibilidad.toLowerCase()} cuando la pidió)
          {detail.precio !== detail.precioNormal ? `, con la promoción vigente (precio normal ${formatPrice(detail.precioNormal)})` : ""}. Confírmale el plazo.
        </p>
      </div>
    );
  }

  if (detail?.tipo === "variacion") {
    return (
      <div className="a-card">
        <h2 className="a-card__title">Variación · precio estimado</h2>
        <p className="a-calc__price">{formatPrice(detail.price)}</p>
        <p className="a-hint">Es el precio que le dio el bot al cliente. Confírmalo o ajústalo antes de responderle.</p>
        <ul className="a-list-plain">
          <li>
            <span>Precio normal de la pieza</span>
            <span>{formatPrice(detail.basePrice)}</span>
          </li>
          <li>
            <span>
              Material extra ({formatQuantity(detail.extraMaterialPct)}% más{detail.estimatedMaterials ? ", estimado" : ""})
            </span>
            <span>{formatPrice(detail.extraMaterials)}</span>
          </li>
          <li>
            <span>
              Trabajo extra ({formatQuantity(detail.extraHours)} h × {formatPrice(detail.hourRate)})
            </span>
            <span>{formatPrice(detail.extraLabor)}</span>
          </li>
          <li>
            <span>Recargo (con gastos del taller y ganancia{detail.capped ? `; tope de ${MAX_VARIATION_SURCHARGE * 100}%` : ""})</span>
            <span>+{formatPrice(detail.surcharge)}</span>
          </li>
          <li className="a-list-plain__total">
            <span>Precio estimado</span>
            <strong>{formatPrice(detail.price)}</strong>
          </li>
        </ul>
        {detail.estimatedMaterials && (
          <p className="a-hint">
            Esta pieza no tiene materiales anotados, así que se supuso que son el 30% de su precio. Anótalos en su ficha para cotizaciones más precisas.
          </p>
        )}
      </div>
    );
  }

  // Cotizaciones antiguas (antes de este cálculo): solo se muestra lo guardado.
  return (
    <div className="a-card">
      <h2 className="a-card__title">Precio cotizado</h2>
      <p className="a-calc__price">{low === high ? formatPrice(low) : `${formatPrice(low)}–${formatPrice(high)}`}</p>
    </div>
  );
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const quote = await quoteService.get((await params).id);
  if (!quote) notFound();

  const detail = parseQuoteDetail(quote.estimateDetail);
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

      <PriceCard detail={detail} low={quote.estimateLow} high={quote.estimateHigh} />
      {quote.productId && detail?.tipo !== "catalogo" && (
        <p className="a-hint">
          <Link href={`/admin/calculadora?producto=${quote.productId}`} className="a-link">
            Afinar el precio en la calculadora
          </Link>
        </p>
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
