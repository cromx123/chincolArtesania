import type { Metadata } from "next";
import Link from "next/link";
import { bestRule, formatPhone } from "@/domain/customer";
import { todayISO } from "@/lib/dates";
import { customerService, sourceLabels } from "@/server/services/customer-service";
import { FormQr } from "@/components/admin/FormQr";
import { LoyaltyRules } from "@/components/admin/LoyaltyRules";
import { Notice } from "@/components/admin/Notice";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata: Metadata = { title: "Clientas" };

const NOTICES: Record<string, string> = { eliminada: "Datos de la clienta eliminados." };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  const [customers, rules, visits] = await Promise.all([customerService.list(), customerService.rules(), customerService.visitsBySource()]);
  const labels = await sourceLabels(customers.map((c) => c.source));
  const today = todayISO();

  return (
    <div className="a-page a-page--narrow">
      <Notice message={aviso ? (NOTICES[aviso] ?? null) : null} />
      <PageHeader title="Clientas" subtitle={customers.length === 1 ? "1 clienta registrada" : `${customers.length} clientas registradas`} />

      {visits.length > 0 && (
        <section className="a-card">
          <h2 className="a-card__title">De dónde llegan</h2>
          <ul className="a-bars">
            {visits.map((v) => (
              <li key={v.source ?? "directo"}>
                <span className="a-bars__name">{v.label}</span>
                <span className="a-bars__track">
                  <span className="a-bars__fill" style={{ width: `${Math.max(4, (v.saved / Math.max(1, v.total)) * 100)}%` }} />
                </span>
                <span className="a-bars__value">
                  {v.saved} de {v.total}
                </span>
              </li>
            ))}
          </ul>
          <p className="a-hint">Personas que completaron el formulario y cuántas guardaron sus datos.</p>
        </section>
      )}

      {customers.length === 0 ? (
        <div className="a-empty">
          <p>Todavía nadie deja sus datos. Comparte el QR de abajo o imprime el de cada feria desde el Calendario.</p>
        </div>
      ) : (
        <div className="a-rows a-card a-card--flush">
          {customers.map((c) => {
            const rule = bestRule(rules, c.stats, today);
            return (
              <Link key={c.id} href={`/admin/clientas/${c.id}`} className="a-row">
                <span className="a-row__main">
                  <span className="a-row__title">{c.name}</span>
                  <span className="a-row__meta">
                    {[formatPhone(c.phone), c.comuna, c.source && labels.get(c.source)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="a-row__end">
                  <span className="a-muted a-small">{c.stats.pieces === 1 ? "1 pieza" : `${c.stats.pieces} piezas`}</span>
                  {rule && <span className="a-pill a-pill--ok">{rule.percent}% dcto.</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <LoyaltyRules rules={rules} />

      <FormQr
        source={null}
        title="QR del formulario"
        hint="Para Instagram, el mostrador del taller o una tarjeta. Para una feria, usa el QR de esa feria en el Calendario: así sabes cuántas clientas trajo."
      />
    </div>
  );
}
