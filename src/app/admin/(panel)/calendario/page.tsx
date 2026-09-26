import type { Metadata } from "next";
import Link from "next/link";
import { type FairEvent, capitalize, formatDay, formatHours, formatRange, lastDay, relativeDays, statusName } from "@/domain/event";
import { type ProductionOrder, isOverdue, orderStatusName } from "@/domain/production-order";
import { currentMonth, isValidMonth, monthName, shiftMonth, todayISO } from "@/lib/dates";
import { eventService } from "@/server/services/event-service";
import { orderService } from "@/server/services/order-service";
import { Notice } from "@/components/admin/Notice";
import { ORDER_STATUS_PILL, orderMeta } from "@/components/admin/OrderRow";
import { PageHeader } from "@/components/admin/PageHeader";
import { ArrowLeftIcon, ArrowRightIcon, HammerIcon, PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Calendario" };

const NOTICES: Record<string, string> = { creado: "Agregado al calendario.", eliminado: "Eliminado del calendario." };
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Props = { searchParams: Promise<{ mes?: string; aviso?: string }> };

/** Días del mes en semanas de lunes a domingo; null = casilla vacía. */
function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(offset).fill(null)];
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

type AgendaItem =
  | { date: string; type: "evento" | "cierre"; event: FairEvent }
  | { date: string; type: "encargo"; order: ProductionOrder };

// En un mismo día: primero los cierres de postulación, después las entregas y al final los eventos.
const AGENDA_ORDER = { cierre: 0, encargo: 1, evento: 2 } as const;

function agenda(events: FairEvent[], orders: ProductionOrder[], month: string): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const e of events) {
    if (e.startDate.slice(0, 7) === month || (e.startDate < `${month}-01` && lastDay(e) >= `${month}-01`)) {
      items.push({ date: e.startDate < `${month}-01` ? `${month}-01` : e.startDate, type: "evento", event: e });
    }
    if (e.applyBy?.slice(0, 7) === month && e.status === "por-postular") items.push({ date: e.applyBy, type: "cierre", event: e });
  }
  for (const o of orders) items.push({ date: o.dueDate, type: "encargo", order: o });
  return items.sort((a, b) => a.date.localeCompare(b.date) || AGENDA_ORDER[a.type] - AGENDA_ORDER[b.type]);
}

const STATUS_PILL: Record<string, string> = { "por-postular": "a-pill--warn", postulada: "a-pill--info", confirmada: "a-pill--ok", descartada: "a-pill--plain" };

function orderChipClass(o: ProductionOrder, today: string): string {
  if (o.status === "entregado") return "a-cal__chip a-cal__chip--encargo a-cal__chip--entregado";
  return `a-cal__chip a-cal__chip--encargo${isOverdue(o, today) ? " a-cal__chip--atrasado" : ""}`;
}

function shortWeekday(date: string): string {
  return new Intl.DateTimeFormat("es-CL", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = isValidMonth(params.mes) ? params.mes : currentMonth();
  const today = todayISO();
  const weeks = monthGrid(month);
  const [events, orders] = await Promise.all([
    eventService.between(`${month}-01`, `${month}-31`),
    orderService.dueBetween(`${month}-01`, `${month}-31`),
  ]);
  const items = agenda(events, orders, month);

  const onDay = (day: string) => events.filter((e) => e.startDate <= day && lastDay(e) >= day);
  const closingOn = (day: string) => events.filter((e) => e.applyBy === day && e.status === "por-postular");
  const dueOn = (day: string) => orders.filter((o) => o.dueDate === day);
  const dateParam = month === currentMonth() ? "" : `?fecha=${month}-01`;

  return (
    <div className="a-page">
      <Notice message={params.aviso ? (NOTICES[params.aviso] ?? null) : null} />
      <PageHeader
        title="Calendario"
        subtitle="Ferias, eventos, postulaciones y entregas de encargos"
        actions={
          <>
            <Link href={`/admin/encargos/nuevo${dateParam}`} className="a-btn a-btn--ghost">
              <HammerIcon /> Encargo
            </Link>
            <Link href={`/admin/calendario/nuevo${dateParam}`} className="a-btn a-btn--primary">
              <PlusIcon /> Feria o evento
            </Link>
          </>
        }
      />

      <div className="a-cal-layout">
        <div className="a-cal-layout__main">
          <nav className="a-month" aria-label="Cambiar mes">
            <Link href={`/admin/calendario?mes=${shiftMonth(month, -1)}`} className="a-icon-btn" aria-label="Mes anterior">
              <ArrowLeftIcon />
            </Link>
            <span className="a-month__name">{monthName(month)}</span>
            <Link href={`/admin/calendario?mes=${shiftMonth(month, 1)}`} className="a-icon-btn" aria-label="Mes siguiente">
              <ArrowRightIcon />
            </Link>
          </nav>

          <div className="a-cal" role="grid" aria-label={`Calendario de ${monthName(month)}`}>
            <div className="a-cal__row a-cal__head" role="row">
              {WEEKDAYS.map((d) => (
                <span key={d} role="columnheader">
                  {d}
                </span>
              ))}
            </div>
            {weeks.map((week, i) => (
              <div key={i} className="a-cal__row" role="row">
                {week.map((day, j) => {
                  if (!day) return <span key={j} className="a-cal__cell is-empty" role="gridcell" />;
                  const list = onDay(day);
                  const closing = closingOn(day);
                  const due = dueOn(day);
                  return (
                    <div key={day} className={`a-cal__cell${day === today ? " is-today" : ""}${day < today ? " is-past" : ""}`} role="gridcell">
                      <Link href={`/admin/calendario/nuevo?fecha=${day}`} className="a-cal__day" aria-label={`Agregar el ${formatDay(day)}`}>
                        {Number(day.slice(8))}
                      </Link>
                      {(closing.length > 0 || due.length > 0 || list.length > 0) && (
                        <div className="a-cal__chips">
                          {closing.map((e) => (
                            <Link key={`c-${e.id}`} href={`/admin/calendario/${e.id}`} className="a-cal__chip a-cal__chip--deadline" title={`Cierra postulación: ${e.name}`}>
                              <span className="a-cal__chip-text">Cierre: {e.name}</span>
                            </Link>
                          ))}
                          {due.map((o) => (
                            <Link
                              key={`o-${o.id}`}
                              href={`/admin/encargos/${o.id}`}
                              className={orderChipClass(o, today)}
                              title={`Entrega: ${o.title} (${orderStatusName(o.status)})`}
                            >
                              <span className="a-cal__chip-text">Entrega: {o.title}</span>
                            </Link>
                          ))}
                          {list.map((e) => (
                            <Link
                              key={e.id}
                              href={`/admin/calendario/${e.id}`}
                              className={`a-cal__chip a-cal__chip--${e.status}${e.kind === "evento" ? " a-cal__chip--other" : ""}`}
                              title={[e.name, formatHours(e)].filter(Boolean).join(" · ")}
                            >
                              <span className="a-cal__chip-text">{e.name}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <ul className="a-cal__legend" aria-label="Qué significa cada color">
            <li>
              <i className="a-cal__swatch a-cal__chip--confirmada" /> Voy
            </li>
            <li>
              <i className="a-cal__swatch a-cal__chip--postulada" /> Postulé
            </li>
            <li>
              <i className="a-cal__swatch a-cal__chip--por-postular" /> Por postular
            </li>
            <li>
              <i className="a-cal__swatch a-cal__chip--deadline" /> Cierre de postulación
            </li>
            <li>
              <i className="a-cal__swatch a-cal__chip--encargo" /> Entrega de encargo
            </li>
            <li>
              <i className="a-cal__swatch a-cal__chip--atrasado" /> Encargo atrasado
            </li>
          </ul>
        </div>

        <section className="a-day a-cal-layout__agenda">
          <h2 className="a-day__title">
            <span>{capitalize(monthName(month))}</span>
          </h2>
          {items.length === 0 ? (
            <div className="a-empty">
              <p>No tienes ferias, eventos ni entregas de encargos anotados en {monthName(month)}.</p>
              <Link href={`/admin/calendario/nuevo${dateParam}`} className="a-btn a-btn--primary">
                Agregar una feria
              </Link>
            </div>
          ) : (
            <div className="a-rows a-card a-card--flush">
              {items.map((item) => {
                if (item.type === "encargo") {
                  const o = item.order;
                  return (
                    <Link key={`encargo-${o.id}`} href={`/admin/encargos/${o.id}`} className={`a-row${o.status === "entregado" ? " is-past" : ""}`}>
                      <span className={`a-cal__date a-cal__date--encargo${isOverdue(o, today) ? " a-cal__date--late" : ""}`} aria-hidden>
                        <strong>{Number(item.date.slice(8))}</strong>
                        {shortWeekday(item.date)}
                      </span>
                      <span className="a-row__main">
                        <span className="a-row__title">Entrega: {o.title}</span>
                        <span className="a-row__meta">{orderMeta(o, today)}</span>
                      </span>
                      <span className="a-row__end">
                        <span className={`a-pill ${ORDER_STATUS_PILL[o.status]}`}>{orderStatusName(o.status)}</span>
                      </span>
                    </Link>
                  );
                }

                const { date, type, event: e } = item;
                return (
                  <Link key={`${type}-${e.id}`} href={`/admin/calendario/${e.id}`} className={`a-row${lastDay(e) < today && type === "evento" ? " is-past" : ""}`}>
                    <span className={`a-cal__date${type === "cierre" ? " a-cal__date--deadline" : ""}`} aria-hidden>
                      <strong>{Number(date.slice(8))}</strong>
                      {shortWeekday(date)}
                    </span>
                    <span className="a-row__main">
                      <span className="a-row__title">{type === "cierre" ? `Cierra postulación: ${e.name}` : e.name}</span>
                      <span className="a-row__meta">
                        {type === "cierre"
                          ? `${capitalize(relativeDays(today, date))} · la feria es el ${formatDay(e.startDate, false)}`
                          : [formatRange(e), formatHours(e), e.place].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="a-row__end">
                      <span className={`a-pill ${STATUS_PILL[e.status]}`}>{statusName(e.status)}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}