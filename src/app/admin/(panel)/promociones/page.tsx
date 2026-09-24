import type { Metadata } from "next";
import Link from "next/link";
import { formatDay } from "@/domain/event";
import { type Promo, describePromo } from "@/domain/promo";
import { formatPrice } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { promoService } from "@/server/services/promo-service";
import { Notice } from "@/components/admin/Notice";
import { PageHeader } from "@/components/admin/PageHeader";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Promociones" };

const NOTICES: Record<string, string> = { creado: "Código creado. Ya se puede usar en el carrito.", eliminado: "Código eliminado." };

function status(p: Promo, today: string): { label: string; pill: string } {
  if (!p.active) return { label: "Apagado", pill: "a-pill--plain" };
  if (p.expiresOn && p.expiresOn < today) return { label: "Vencido", pill: "a-pill--bad" };
  return { label: "Activo", pill: "a-pill--ok" };
}

export default async function PromosPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const [promos, today] = [await promoService.list(), todayISO()];

  return (
    <div className="a-page a-page--narrow">
      <Notice message={aviso ? (NOTICES[aviso] ?? null) : null} />
      <PageHeader
        title="Promociones"
        subtitle="Códigos de descuento para el carrito de la tienda"
        actions={
          <Link href="/admin/promociones/nuevo" className="a-btn a-btn--primary">
            <PlusIcon /> Nuevo código
          </Link>
        }
      />

      {promos.length === 0 ? (
        <div className="a-empty">
          <p>Todavía no tienes códigos. Crea uno para compartirlo en Instagram o con tus clientas frecuentes.</p>
          <Link href="/admin/promociones/nuevo" className="a-btn a-btn--primary">
            Crear un código
          </Link>
        </div>
      ) : (
        <div className="a-rows a-card a-card--flush">
          {promos.map((p) => {
            const s = status(p, today);
            const meta = [
              p.minTotal > 0 && `desde ${formatPrice(p.minTotal)}`,
              p.expiresOn && (p.expiresOn < today ? `venció el ${formatDay(p.expiresOn, false)}` : `hasta el ${formatDay(p.expiresOn, false)}`),
              p.note,
            ].filter(Boolean);
            return (
              <Link key={p.id} href={`/admin/promociones/${p.id}`} className="a-row">
                <span className="a-row__main">
                  <span className="a-row__title a-promo-code">{p.code}</span>
                  <span className="a-row__meta">
                    {describePromo(p)}
                    {meta.length > 0 && ` · ${meta.join(" · ")}`}
                  </span>
                </span>
                <span className="a-row__end">
                  <span className={`a-pill ${s.pill}`}>{s.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
      <p className="a-hint">Los pedidos llegan por WhatsApp con el código y el descuento ya calculado, para que los revises antes de confirmar.</p>
    </div>
  );
}
