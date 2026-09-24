import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bestRule, describeRule, formatPhone, monthsBetween } from "@/domain/customer";
import { formatDay } from "@/domain/event";
import { todayISO } from "@/lib/dates";
import { customerService, sourceLabels } from "@/server/services/customer-service";
import { saleService } from "@/server/services/sale-service";
import { CustomerDelete } from "@/components/admin/CustomerDelete";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaleRow } from "@/components/admin/SaleRow";

export const metadata: Metadata = { title: "Clienta" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await customerService.get(id);
  if (!c) notFound();

  const today = todayISO();
  const [rules, sales, labels] = await Promise.all([customerService.rules(), saleService.byCustomer(id), sourceLabels([c.source])]);
  const rule = bestRule(rules, c.stats, today);
  const months = c.stats.firstPurchase ? monthsBetween(c.stats.firstPurchase, today) : null;

  return (
    <div className="a-page a-page--narrow">
      <PageHeader title={c.name} subtitle={`Registrada el ${formatDay(todayISO(c.createdAt), false)}${c.source ? ` · llegó por ${labels.get(c.source)}` : ""}`} back="/admin/clientas" />

      <section className="a-card">
        <dl className="a-facts">
          <div>
            <dt>WhatsApp</dt>
            <dd>
              <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer" className="a-link">
                {formatPhone(c.phone)}
              </a>
            </dd>
          </div>
          {c.email && (
            <div>
              <dt>Correo</dt>
              <dd>{c.email}</dd>
            </div>
          )}
          {c.comuna && (
            <div>
              <dt>Comuna</dt>
              <dd>{c.comuna}</dd>
            </div>
          )}
          <div>
            <dt>Novedades por correo</dt>
            <dd>{c.newsletter ? "Sí" : "No"}</dd>
          </div>
        </dl>
      </section>

      <section className="a-stats">
        <div className="a-stat">
          <span className="a-stat__label">Piezas compradas</span>
          <span className="a-stat__value">{c.stats.pieces}</span>
          <span className="a-stat__hint">
            {months === null
              ? "Aún no tiene compras registradas"
              : months === 0
                ? "Su primera compra fue este último mes"
                : `Clienta hace ${months === 1 ? "1 mes" : `${months} meses`}`}
          </span>
        </div>
        <div className={`a-stat${rule ? "" : " a-stat--muted"}`}>
          <span className="a-stat__label">Su descuento</span>
          <span className="a-stat__value">{rule ? `${rule.percent}%` : "—"}</span>
          <span className="a-stat__hint">{rule ? describeRule(rule) : "No cumple ninguna regla todavía"}</span>
        </div>
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Compras</h2>
        {sales.length === 0 ? (
          <p className="a-muted">Cuando registres una venta, búscala en “Cliente” para que cuente aquí.</p>
        ) : (
          <div className="a-rows">
            {sales.map((s) => (
              <SaleRow key={s.id} sale={s} showDate />
            ))}
          </div>
        )}
      </section>

      <CustomerDelete id={c.id} />
    </div>
  );
}
