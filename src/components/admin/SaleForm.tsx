"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CHANNELS, type Channel, PAYMENTS, type Payment, isChannel, isPayment, lineTotal, saleTotal } from "@/domain/sale";
import type { CategoryId } from "@/domain/product";
import { formatPrice } from "@/lib/format";
import { deleteSaleAction, registerSaleAction } from "@/app/admin/_actions/sales";
import { CheckIcon, PlusIcon, SearchIcon, TrashIcon } from "../icons";
import { Choice, MoneyInput, Stepper } from "./inputs";
import { ProductThumb } from "./ProductThumb";
import { Sheet } from "./Sheet";

export interface SellableProduct {
  id: string;
  name: string;
  category: CategoryId;
  price: number;
  stock: number;
  madeToOrder: boolean;
  image?: string;
  hasRecipe: boolean;
}

/** `discount` en pesos: se calcula cuando ella escribe el total que realmente cobró. */
type Line = { productId: string; quantity: number; unitPrice: number; discount: number; editingTotal: boolean };

const PREFS_KEY = "chincol.admin.sale-prefs";

function loadPrefs(): { channel?: string; payment?: string; fair?: { name: string; date: string } } {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function normalize(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function SaleForm({ products, today, fairNames }: { products: SellableProduct[]; today: string; fairNames: string[] }) {
  const [channel, setChannel] = useState<Channel>("instagram");
  const [fairName, setFairName] = useState("");
  const [payment, setPayment] = useState<Payment>("transferencia");
  const [lines, setLines] = useState<Line[]>([]);
  const [customer, setCustomer] = useState("");
  const [otherDay, setOtherDay] = useState(false);
  const [date, setDate] = useState(today);
  const [discountStock, setDiscountStock] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string; total: number } | null>(null);
  const [pending, start] = useTransition();

  // Recuerda dónde y cómo vendió la última vez: casi siempre se repite.
  useEffect(() => {
    const p = loadPrefs();
    if (p.channel && isChannel(p.channel)) setChannel(p.channel);
    if (p.payment && isPayment(p.payment)) setPayment(p.payment);
    // La feria se recuerda solo el mismo día: en una feria se registran muchas ventas seguidas.
    if (p.fair?.date === today) setFairName(p.fair.name);
  }, [today]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const total = saleTotal(lines);
  const discountSum = lines.reduce((n, l) => n + l.discount, 0);
  const pieces = lines.reduce((n, l) => n + l.quantity, 0);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return q ? products.filter((p) => normalize(p.name).includes(q)) : products;
  }, [products, query]);

  function addProduct(p: SellableProduct) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) return prev.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1, discount: 0 } : l));
      return [...prev, { productId: p.id, quantity: 1, unitPrice: p.price, discount: 0, editingTotal: false }];
    });
    setPickerOpen(false);
    setQuery("");
    setError(null);
  }

  function updateLine(productId: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function submit() {
    if (!lines.length) {
      setError("Agrega al menos una pieza.");
      return;
    }
    if (channel === "feria" && !fairName.trim()) {
      setError("Escribe en qué feria vendiste.");
      document.getElementById("feria")?.focus();
      return;
    }
    start(async () => {
      const result = await registerSaleAction({
        channel,
        fairName: channel === "feria" ? fairName : undefined,
        payment,
        customer,
        date: otherDay ? date : undefined,
        discountStock,
        lines: lines.map(({ productId, quantity, unitPrice, discount }) => ({ productId, quantity, unitPrice, discount })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({ channel, payment, fair: channel === "feria" ? { name: fairName.trim(), date: today } : undefined }),
        );
      } catch {}
      setDone({ id: result.id, total: result.total });
      window.scrollTo({ top: 0 });
    });
  }

  function reset() {
    setLines([]);
    setCustomer("");
    setOtherDay(false);
    setDate(today);
    setDone(null);
    setError(null);
  }

  function undo() {
    if (!done) return;
    start(async () => {
      await deleteSaleAction(done.id);
      setDone(null); // vuelve al formulario con los mismos datos, para corregir
    });
  }

  if (done) {
    return (
      <div className="a-success">
        <span className="a-success__icon">
          <CheckIcon size={36} />
        </span>
        <h1>¡Venta registrada!</h1>
        <p className="a-success__total">{formatPrice(done.total)}</p>
        <p className="a-muted">{discountStock ? "Ya descontamos las piezas del stock." : "No se descontó nada del stock."}</p>
        <div className="a-success__actions">
          <button type="button" className="a-btn a-btn--primary a-btn--lg a-btn--block" onClick={reset}>
            Registrar otra venta
          </button>
          <Link href="/admin/ventas" className="a-btn a-btn--ghost a-btn--lg a-btn--block">
            Ver mis ventas
          </Link>
          <button type="button" className="a-link-btn" onClick={undo} disabled={pending}>
            {pending ? "Deshaciendo…" : "Me equivoqué, deshacer esta venta"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="a-form a-form--with-bar">
      <section className="a-field">
        <span className="a-label">¿Qué vendiste?</span>
        {lines.length > 0 && (
          <ul className="a-lines">
            {lines.map((l) => {
              const p = byId.get(l.productId)!;
              const needsMaking = discountStock && !p.madeToOrder && l.quantity > p.stock;
              return (
                <li key={l.productId} className="a-line">
                  <div className="a-line__top">
                    <ProductThumb image={p.image} category={p.category} />
                    <div className="a-line__info">
                      <strong>{p.name}</strong>
                      <span className="a-muted">{formatPrice(l.unitPrice)} c/u</span>
                    </div>
                    <button type="button" className="a-icon-btn" aria-label={`Quitar ${p.name}`} onClick={() => removeLine(p.id)}>
                      <TrashIcon />
                    </button>
                  </div>
                  <div className="a-line__bottom">
                    {/* Cambiar la cantidad vuelve al precio normal, para no arrastrar un descuento que ya no calza. */}
                    <Stepper label={`Cantidad de ${p.name}`} value={l.quantity} min={1} onChange={(v) => updateLine(p.id, { quantity: v, discount: 0 })} />
                    {l.editingTotal ? (
                      <MoneyInput
                        id={`total-${p.id}`}
                        className="a-line__total-input"
                        aria-label={`Total cobrado por ${p.name}`}
                        value={lineTotal(l)}
                        onChange={(v) => updateLine(p.id, { discount: l.quantity * l.unitPrice - v })}
                        onBlur={() => updateLine(p.id, { editingTotal: false })}
                        onKeyDown={(e) => e.key === "Enter" && updateLine(p.id, { editingTotal: false })}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="a-line__total"
                        aria-label={`Total ${formatPrice(lineTotal(l))}, tocar para cambiarlo`}
                        onClick={() => updateLine(p.id, { editingTotal: true })}
                      >
                        <strong>{formatPrice(lineTotal(l))}</strong>
                        <span>editar</span>
                      </button>
                    )}
                  </div>
                  {l.discount !== 0 && (
                    <p className="a-line__discount">
                      <span>
                        Precio normal {formatPrice(l.quantity * l.unitPrice)} ·{" "}
                        {l.discount > 0 ? `descuento ${formatPrice(l.discount)}` : `recargo ${formatPrice(-l.discount)}`}
                      </span>
                      <button type="button" className="a-link-btn" onClick={() => updateLine(p.id, { discount: 0, editingTotal: false })}>
                        Quitar
                      </button>
                    </p>
                  )}
                  {lineTotal(l) < 0 && <p className="a-error">El total no puede ser negativo.</p>}
                  {needsMaking && (
                    <p className="a-hint a-hint--warn">
                      {p.stock === 0 ? "No tienes piezas hechas" : `Tienes ${p.stock} hecha${p.stock === 1 ? "" : "s"}`}
                      {p.hasRecipe ? "; el resto se descuenta de los materiales." : "; se venderá igual."}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" className="a-add" onClick={() => setPickerOpen(true)}>
          <PlusIcon /> {lines.length ? "Agregar otra pieza" : "Elegir pieza"}
        </button>
      </section>

      <section className="a-field">
        <span className="a-label">¿Dónde vendiste?</span>
        <Choice label="Dónde vendiste" options={CHANNELS} value={channel} onChange={setChannel} columns={3} />
        {channel === "feria" && (
          <div className="a-fair">
            <label htmlFor="feria" className="a-label">
              ¿En qué feria?
            </label>
            {fairNames.length > 0 && (
              <div className="a-fair__recent" role="group" aria-label="Ferias anteriores">
                {fairNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="a-swatch"
                    aria-pressed={fairName.trim().toLowerCase() === name.toLowerCase()}
                    onClick={() => {
                      setFairName(name);
                      setError(null);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            <input
              id="feria"
              className="a-input"
              placeholder={fairNames.length ? "O escribe una feria nueva" : "Ej: Feria de las Pulgas, Providencia"}
              value={fairName}
              onChange={(e) => {
                setFairName(e.target.value);
                setError(null);
              }}
              autoComplete="off"
              maxLength={80}
            />
          </div>
        )}
      </section>

      <section className="a-field">
        <span className="a-label">¿Cómo te pagaron?</span>
        <Choice label="Cómo te pagaron" options={PAYMENTS} value={payment} onChange={setPayment} columns={2} />
        {payment === "pendiente" && <p className="a-hint">Quedará en “Para revisar” hasta que marques que te pagó.</p>}
      </section>

      <section className="a-field">
        <label htmlFor="cliente" className="a-label">
          Cliente <span className="a-optional">(opcional)</span>
        </label>
        <input
          id="cliente"
          className="a-input"
          placeholder="Nombre o @usuario de Instagram"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          autoComplete="off"
        />
      </section>

      <section className="a-field">
        {otherDay ? (
          <>
            <label htmlFor="fecha" className="a-label">
              ¿Qué día fue?
            </label>
            <input id="fecha" type="date" className="a-input" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
          </>
        ) : (
          <button type="button" className="a-link-btn a-link-btn--left" onClick={() => setOtherDay(true)}>
            La venta fue otro día
          </button>
        )}
      </section>

      <label className="a-check-card">
        <input type="checkbox" checked={discountStock} onChange={(e) => setDiscountStock(e.target.checked)} />
        <span>
          <strong>Descontar del stock</strong>
          <span className="a-muted">Resta las piezas vendidas (y los materiales si había que hacerlas).</span>
        </span>
      </label>

      <div className="a-bar">
        <div className="a-bar__total">
          <span>
            {pieces === 1 ? "Total · 1 pieza" : `Total · ${pieces} piezas`}
            {discountSum > 0 && <span className="a-bar__discount"> · con {formatPrice(discountSum)} de descuento</span>}
          </span>
          <strong>{formatPrice(total)}</strong>
        </div>
        {error && (
          <p className="a-error" role="alert">
            {error}
          </p>
        )}
        <button type="button" className="a-btn a-btn--primary a-btn--lg a-btn--block" onClick={submit} disabled={pending}>
          {pending ? "Guardando…" : "Registrar venta"}
        </button>
      </div>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="¿Qué pieza vendiste?">
        <div className="a-search">
          <SearchIcon size={18} />
          <input
            type="search"
            className="a-input"
            placeholder="Buscar por nombre…"
            aria-label="Buscar pieza"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="a-picker">
          {filtered.length === 0 && <p className="a-muted a-center">No hay piezas con ese nombre.</p>}
          {filtered.map((p) => (
            <button key={p.id} type="button" className="a-picker__item" onClick={() => addProduct(p)}>
              <ProductThumb image={p.image} category={p.category} />
              <span className="a-picker__info">
                <strong>{p.name}</strong>
                <span className="a-muted">
                  {formatPrice(p.price)} · {p.madeToOrder ? "a pedido" : p.stock === 0 ? "sin piezas hechas" : `quedan ${p.stock}`}
                </span>
              </span>
              <PlusIcon />
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
