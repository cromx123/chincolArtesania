import type { Metadata } from "next";
import Link from "next/link";
import { CHANNELS } from "@/domain/sale";
import { formatPrice } from "@/lib/format";
import { currentMonth, dayLabel, isValidMonth, monthName, shiftMonth, todayISO } from "@/lib/dates";
import { type SaleSummary, saleService } from "@/server/services/sale-service";
import { PageHeader } from "@/components/admin/PageHeader";
import { SaleRow } from "@/components/admin/SaleRow";
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Ventas" };

type Props = { searchParams: Promise<{ mes?: string; ver?: string }> };

function groupByDay(sales: SaleSummary[]) {
  const groups = new Map<string, SaleSummary[]>();
  for (const s of sales) {
    const key = todayISO(s.soldAt);
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()];
}

export default async function SalesPage({ searchParams }: Props) {
  const params = await searchParams;
  const onlyPending = params.ver === "por-cobrar";
  const month = isValidMonth(params.mes) ? params.mes : currentMonth();
  const isCurrent = month === currentMonth();

  const sales = onlyPending ? await saleService.pending() : await saleService.byMonth(month);
  const total = sales.reduce((s, x) => s + x.total, 0);
  const pieces = sales.reduce((s, x) => s + x.pieces, 0);
  const byChannel = CHANNELS.map((c) => ({ ...c, total: sales.filter((s) => s.channel === c.id).reduce((n, s) => n + s.total, 0) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="a-page">
      <PageHeader
        title={onlyPending ? "Ventas por cobrar" : "Ventas"}
        back={onlyPending ? "/admin/ventas" : undefined}
        actions={
          <Link href="/admin/ventas/nueva" className="a-btn a-btn--primary hide-on-phone">
            <PlusIcon /> Registrar venta
          </Link>
        }
      />

      {!onlyPending && (
        <nav className="a-month" aria-label="Cambiar mes">
          <Link href={`/admin/ventas?mes=${shiftMonth(month, -1)}`} className="a-icon-btn" aria-label="Mes anterior">
            <ArrowLeftIcon />
          </Link>
          <span className="a-month__name">{monthName(month)}</span>
          {isCurrent ? (
            <span className="a-icon-btn is-disabled" aria-hidden />
          ) : (
            <Link href={`/admin/ventas?mes=${shiftMonth(month, 1)}`} className="a-icon-btn" aria-label="Mes siguiente">
              <ArrowRightIcon />
            </Link>
          )}
        </nav>
      )}

      <section className="a-stats">
        <div className="a-stat">
          <span className="a-stat__label">{onlyPending ? "Te deben en total" : isCurrent ? "Vendido este mes" : "Vendido"}</span>
          <span className="a-stat__value">{formatPrice(total)}</span>
          <span className="a-stat__hint">
            {sales.length === 1 ? "1 venta" : `${sales.length} ventas`} · {pieces === 1 ? "1 pieza" : `${pieces} piezas`}
          </span>
        </div>
        {!onlyPending && byChannel.length > 0 && (
          <div className="a-stat">
            <span className="a-stat__label">Dónde vendiste más</span>
            <ul className="a-bars">
              {byChannel.map((c) => (
                <li key={c.id}>
                  <span className="a-bars__name">{c.name}</span>
                  <span className="a-bars__track">
                    <span className="a-bars__fill" style={{ width: `${Math.max(4, (c.total / total) * 100)}%` }} />
                  </span>
                  <span className="a-bars__value">{formatPrice(c.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {sales.length === 0 ? (
        <div className="a-empty">
          <p>{onlyPending ? "Nadie te debe. ¡Todo cobrado!" : `No hay ventas registradas en ${monthName(month)}.`}</p>
          {!onlyPending && isCurrent && (
            <Link href="/admin/ventas/nueva" className="a-btn a-btn--primary">
              Registrar una venta
            </Link>
          )}
        </div>
      ) : (
        groupByDay(sales).map(([day, list]) => (
          <section key={day} className="a-day">
            <h2 className="a-day__title">
              <span>{dayLabel(list[0].soldAt)}</span>
              <span>{formatPrice(list.reduce((n, s) => n + s.total, 0))}</span>
            </h2>
            <div className="a-rows a-card a-card--flush">
              {list.map((s) => (
                <SaleRow key={s.id} sale={s} showDate={onlyPending} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
