"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ORDER_STATUSES, type OrderErrors, type OrderInput } from "@/domain/production-order";
import { formatPrice } from "@/lib/format";
import { deleteOrderAction, saveOrderAction } from "@/app/admin/_actions/orders";
import { ConfirmButton } from "./ConfirmButton";
import { Choice, MoneyInput, Stepper } from "./inputs";
import { Notice } from "./Notice";

export interface OrderProductOption {
  id: string;
  name: string;
  price: number;
}

export function OrderForm({ id, initial, products }: { id: string | null; initial: OrderInput; products: OrderProductOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState<OrderInput>(initial);
  const [saved, setSaved] = useState<OrderInput>(initial);
  const [errors, setErrors] = useState<OrderErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof OrderInput>(key: K, value: OrderInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const product = products.find((p) => p.id === form.productId) ?? null;

  // Avisa antes de salir si quedaron cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function chooseProduct(productId: string) {
    const p = products.find((x) => x.id === productId);
    setForm((f) => ({ ...f, productId, title: f.title.trim() || !p ? f.title : p.name }));
  }

  function save() {
    start(async () => {
      const result = await saveOrderAction(id, form);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      if (!id) {
        router.push("/admin/encargos?aviso=creado");
      } else {
        setSaved(form);
        setNotice("Cambios guardados.");
        router.refresh();
      }
    });
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="a-form a-form--with-bar">
      <Notice message={notice} />

      <section className="a-card">
        <div className="a-field">
          <label htmlFor="enc-producto" className="a-label">
            Pieza base <span className="a-optional">(opcional)</span>
          </label>
          <select id="enc-producto" className="a-input" value={form.productId} onChange={(e) => chooseProduct(e.target.value)}>
            <option value="">Una pieza nueva (sin producto)</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {product && <p className="a-hint">En la tienda cuesta {formatPrice(product.price)}.</p>}
        </div>

        <div className="a-field">
          <label htmlFor="enc-titulo" className="a-label">
            ¿Qué hay que hacer?
          </label>
          <input
            id="enc-titulo"
            className="a-input"
            placeholder="Ej: Billetera Ñire con 2 bolsillos extra, cuero negro"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            aria-invalid={errors.title ? true : undefined}
          />
          {errors.title && <p className="a-error">{errors.title}</p>}
        </div>

        <div className="a-grid-2">
          <div className="a-field">
            <span className="a-label">Cantidad</span>
            <Stepper label="Cantidad" value={form.quantity} min={1} onChange={(v) => set("quantity", v)} />
            {errors.quantity && <p className="a-error">{errors.quantity}</p>}
          </div>
          <div className="a-field">
            <label htmlFor="enc-entrega" className="a-label">
              Fecha de entrega
            </label>
            <input
              id="enc-entrega"
              type="date"
              className="a-input"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              aria-invalid={errors.dueDate ? true : undefined}
            />
            {errors.dueDate && <p className="a-error">{errors.dueDate}</p>}
          </div>
        </div>

        <div className="a-field">
          <span className="a-label">¿En qué va?</span>
          <Choice label="Estado" options={ORDER_STATUSES} value={form.status} onChange={(v) => set("status", v)} columns={2} />
        </div>
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Cliente y precio</h2>
        <div className="a-grid-2">
          <div className="a-field">
            <label htmlFor="enc-cliente" className="a-label">
              Nombre <span className="a-optional">(opcional)</span>
            </label>
            <input id="enc-cliente" className="a-input" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
          </div>
          <div className="a-field">
            <label htmlFor="enc-contacto" className="a-label">
              Contacto <span className="a-optional">(teléfono, correo o Instagram)</span>
            </label>
            <input id="enc-contacto" className="a-input" value={form.customerContact} onChange={(e) => set("customerContact", e.target.value)} />
          </div>
        </div>

        <div className="a-field">
          <label htmlFor="enc-precio" className="a-label">
            Precio acordado <span className="a-optional">(total, opcional)</span>
          </label>
          <MoneyInput id="enc-precio" value={form.price} onChange={(v) => set("price", v)} invalid={Boolean(errors.price)} placeholder="0" />
          {errors.price && <p className="a-error">{errors.price}</p>}
        </div>

        <div className="a-field">
          <label htmlFor="enc-nota" className="a-label">
            Notas <span className="a-optional">(colores, medidas, grabado, abono…)</span>
          </label>
          <textarea id="enc-nota" className="a-input a-textarea" rows={3} value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>
      </section>

      {id && (
        <ConfirmButton
          label="Eliminar encargo"
          confirmLabel="Sí, eliminar"
          warning="Se borra el encargo y su fecha del calendario."
          onConfirm={() => deleteOrderAction(id)}
        />
      )}

      <div className="a-bar">
        {errorCount > 0 && (
          <p className="a-error" role="alert">
            Falta completar {errorCount === 1 ? "un dato" : `${errorCount} datos`} (marcados en rojo).
          </p>
        )}
        <div className="a-bar__row">
          <span className="a-muted a-small">{dirty ? "Tienes cambios sin guardar" : id ? "Todo guardado" : ""}</span>
          <button type="button" className="a-btn a-btn--primary a-btn--lg" onClick={save} disabled={pending || (!dirty && Boolean(id))}>
            {pending ? "Guardando…" : id ? "Guardar cambios" : "Crear encargo"}
          </button>
        </div>
      </div>
    </div>
  );
}
