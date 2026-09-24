import Link from "next/link";
import { formatAmount } from "@/domain/material";
import { formatPrice } from "@/lib/format";
import { greeting, monthName } from "@/lib/dates";
import { getDashboard } from "@/server/services/dashboard-service";
import { SaleRow, saleTitle } from "@/components/admin/SaleRow";
import { AlertIcon, ArrowRightIcon, BoxIcon, CalculatorIcon, CalendarIcon, CartIcon, ChatIcon, PlusIcon, TagIcon } from "@/components/icons";

export default async function AdminHome() {
  const d = await getDashboard();
  const pendingTotal = d.pending.reduce((s, x) => s + x.total, 0);
  const todo = d.lowProducts.length + d.lowMaterials.length + d.pending.length + d.closing.length;

  return (
    <div className="a-page">
      <header className="a-hello">
        <p className="a-muted">{greeting()}</p>
        <h1>¿Qué hacemos hoy?</h1>
      </header>

      <Link href="/admin/ventas/nueva" className="a-bigaction">
        <span className="a-bigaction__icon">
          <PlusIcon size={28} />
        </span>
        <span>
          <strong>Registrar una venta</strong>
          <span>Instagram, WhatsApp, feria o página web</span>
        </span>
        <ArrowRightIcon />
      </Link>

      <section className="a-stats" aria-label={`Resumen de ${monthName(d.month)}`}>
        <Link href="/admin/ventas" className="a-stat">
          <span className="a-stat__label">Vendiste en {monthName(d.month)}</span>
          <span className="a-stat__value">{formatPrice(d.monthTotal)}</span>
          <span className="a-stat__hint">
            {d.monthCount === 1 ? "1 venta" : `${d.monthCount} ventas`} · {d.monthPieces === 1 ? "1 pieza" : `${d.monthPieces} piezas`}
          </span>
        </Link>
        {d.pending.length > 0 && (
          <Link href="/admin/ventas?ver=por-cobrar" className="a-stat a-stat--warn">
            <span className="a-stat__label">Te deben</span>
            <span className="a-stat__value">{formatPrice(pendingTotal)}</span>
            <span className="a-stat__hint">{d.pending.length === 1 ? "1 venta por cobrar" : `${d.pending.length} ventas por cobrar`}</span>
          </Link>
        )}
      </section>

      <section className="a-card">
        <h2 className="a-card__title">
          {todo > 0 ? (
            <>
              <AlertIcon size={20} /> Para revisar
            </>
          ) : (
            "Todo en orden"
          )}
        </h2>
        {todo === 0 && <p className="a-muted">No hay piezas por acabarse, materiales bajos, cobros pendientes ni postulaciones por cerrar.</p>}
        <ul className="a-todo">
          {d.closing.map((e) => (
            <li key={`feria-${e.id}`}>
              <Link href={`/admin/calendario/${e.id}`}>
                <span className={`a-dot ${e.daysLeft <= 2 ? "a-dot--bad" : "a-dot--warn"}`} />
                <span>
                  {e.daysLeft === 0 ? "Hoy cierra" : e.daysLeft === 1 ? "Mañana cierra" : `En ${e.daysLeft} días cierra`} la postulación a {e.name}
                </span>
              </Link>
            </li>
          ))}
          {d.pending.map((s) => (
            <li key={s.id}>
              <Link href={`/admin/ventas/${s.id}`}>
                <span className="a-dot a-dot--warn" />
                <span>
                  {s.customer ? `${s.customer} te debe` : "Te deben"} {formatPrice(s.total)} <span className="a-muted">({saleTitle(s)})</span>
                </span>
              </Link>
            </li>
          ))}
          {d.lowProducts.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/productos/${p.id}`}>
                <span className={`a-dot ${p.stock === 0 ? "a-dot--bad" : "a-dot--warn"}`} />
                <span>
                  {p.stock === 0 ? `Se acabaron: ${p.name}` : `Quedan ${p.stock} de ${p.name}`}
                </span>
              </Link>
            </li>
          ))}
          {d.lowMaterials.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/materiales#m-${m.id}`}>
                <span className={`a-dot ${m.stock < m.minStock / 2 ? "a-dot--bad" : "a-dot--warn"}`} />
                <span>
                  Queda poco {m.name.toLowerCase()} <span className="a-muted">({formatAmount(m.stock, m.unit)})</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="a-card">
        <div className="a-card__head">
          <h2 className="a-card__title">Últimas ventas</h2>
          <Link href="/admin/ventas" className="a-link">
            Ver todas
          </Link>
        </div>
        {d.recent.length === 0 ? (
          <p className="a-muted">Todavía no registras ventas. Cuando vendas algo, tócale a “Registrar una venta”.</p>
        ) : (
          <div className="a-rows">
            {d.recent.map((s) => (
              <SaleRow key={s.id} sale={s} showDate />
            ))}
          </div>
        )}
      </section>

      <section className="a-shortcuts" aria-label="Atajos">
        <Link href="/admin/productos/nuevo" className="a-shortcut">
          <CartIcon /> Agregar un producto
        </Link>
        <Link href="/admin/materiales" className="a-shortcut">
          <BoxIcon /> Anotar compra de materiales
        </Link>
        <Link href="/admin/calculadora" className="a-shortcut">
          <CalculatorIcon /> Calcular un precio
        </Link>
        <Link href="/admin/ventas" className="a-shortcut">
          <TagIcon /> Ver ventas del mes
        </Link>
        <Link href="/admin/calendario" className="a-shortcut">
          <CalendarIcon /> Calendario de ferias
        </Link>
        <Link href="/admin/asistencia" className="a-shortcut">
          <ChatIcon /> Ayuda para escribir (publicaciones, ferias)
        </Link>
      </section>
    </div>
  );
}
