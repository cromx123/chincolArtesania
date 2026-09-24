"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MAX_PERCENT, PROMO_KINDS, type PromoErrors, type PromoInput, describePromo, normalizeCode, promoDiscount } from "@/domain/promo";
import { formatPrice } from "@/lib/format";
import { deletePromoAction, savePromoAction } from "@/app/admin/_actions/promos";
import { ConfirmButton } from "./ConfirmButton";
import { Choice, MoneyInput } from "./inputs";
import { Notice } from "./Notice";

const EXAMPLE_TOTAL = 40_000;

export function PromoForm({ id, initial }: { id: string | null; initial: PromoInput }) {
  const router = useRouter();
  const [form, setForm] = useState<PromoInput>(initial);
  const [saved, setSaved] = useState<PromoInput>(initial);
  const [errors, setErrors] = useState<PromoErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof PromoInput>(key: K, value: PromoInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Avisa antes de salir si quedaron cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function save() {
    start(async () => {
      const result = await savePromoAction(id, form);
      if (!result.ok) {
        setErrors(result.errors);
        return;
      }
      setErrors({});
      if (!id) {
        router.push("/admin/promociones?aviso=creado");
      } else {
        const clean = { ...form, code: normalizeCode(form.code) };
        setForm(clean);
        setSaved(clean);
        setNotice("Cambios guardados.");
        router.refresh();
      }
    });
  }

  const errorCount = Object.keys(errors).length;
  const exampleTotal = Math.max(EXAMPLE_TOTAL, form.minTotal);
  const example = form.value > 0 ? promoDiscount({ ...form, code: "" }, exampleTotal) : 0;

  return (
    <div className="a-form a-form--with-bar">
      <Notice message={notice} />

      <section className="a-card">
        <div className="a-field">
          <label htmlFor="promo-codigo" className="a-label">
            Código
          </label>
          <input
            id="promo-codigo"
            className="a-input a-input--code"
            placeholder="Ej: CHINCOL10"
            autoComplete="off"
            spellCheck={false}
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s+/g, ""))}
            aria-invalid={errors.code ? true : undefined}
          />
          {errors.code && <p className="a-error">{errors.code}</p>}
          <p className="a-hint">Es lo que tu cliente escribe en el carrito. No importan mayúsculas ni minúsculas.</p>
        </div>

        <div className="a-field">
          <span className="a-label">Tipo de descuento</span>
          <Choice label="Tipo de descuento" options={PROMO_KINDS} value={form.kind} onChange={(v) => set("kind", v)} columns={2} />
        </div>

        <div className="a-field">
          <label htmlFor="promo-valor" className="a-label">
            {form.kind === "porcentaje" ? "Porcentaje" : "Cuánto descuenta"}
          </label>
          {form.kind === "porcentaje" ? (
            <div className="a-qty">
              <input
                id="promo-valor"
                inputMode="numeric"
                autoComplete="off"
                value={form.value || ""}
                onChange={(e) => set("value", Math.min(MAX_PERCENT, Number(e.target.value.replace(/\D/g, "").slice(0, 2)) || 0))}
                aria-invalid={errors.value ? true : undefined}
              />
              <span className="a-qty__suffix">%</span>
            </div>
          ) : (
            <MoneyInput id="promo-valor" value={form.value} onChange={(v) => set("value", v)} invalid={Boolean(errors.value)} />
          )}
          {errors.value && <p className="a-error">{errors.value}</p>}
          {example > 0 && (
            <p className="a-hint">
              Ejemplo: en una compra de {formatPrice(exampleTotal)}, descuenta {formatPrice(example)} y paga {formatPrice(exampleTotal - example)}.
            </p>
          )}
        </div>
      </section>

      <section className="a-card">
        <h2 className="a-card__title">Condiciones</h2>
        <div className="a-grid-2">
          <div className="a-field">
            <label htmlFor="promo-minimo" className="a-label">
              Compra mínima <span className="a-optional">(opcional)</span>
            </label>
            <MoneyInput id="promo-minimo" value={form.minTotal} onChange={(v) => set("minTotal", v)} invalid={Boolean(errors.minTotal)} placeholder="Sin mínimo" />
            {errors.minTotal && <p className="a-error">{errors.minTotal}</p>}
          </div>
          <div className="a-field">
            <label htmlFor="promo-vence" className="a-label">
              Válido hasta <span className="a-optional">(opcional)</span>
            </label>
            <input
              id="promo-vence"
              type="date"
              className="a-input"
              value={form.expiresOn}
              onChange={(e) => set("expiresOn", e.target.value)}
              aria-invalid={errors.expiresOn ? true : undefined}
            />
            {errors.expiresOn && <p className="a-error">{errors.expiresOn}</p>}
          </div>
        </div>

        <label className="a-check-card">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          <span>
            <strong>Código activo</strong>
            <span className="a-muted">Si lo apagas, deja de funcionar en el carrito pero no se borra.</span>
          </span>
        </label>

        <div className="a-field">
          <label htmlFor="promo-nota" className="a-label">
            Nota para ti <span className="a-optional">(ej: para seguidores de Instagram)</span>
          </label>
          <input id="promo-nota" className="a-input" value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>
      </section>

      {id && <ConfirmButton label="Eliminar código" confirmLabel="Sí, eliminar" warning="El código deja de existir. Si solo quieres pausarlo, desmarca “Código activo”." onConfirm={() => deletePromoAction(id)} />}

      <div className="a-bar">
        {errorCount > 0 && (
          <p className="a-error" role="alert">
            Falta completar {errorCount === 1 ? "un dato" : `${errorCount} datos`} (marcados en rojo).
          </p>
        )}
        <div className="a-bar__row">
          <span className="a-muted a-small">{dirty ? "Tienes cambios sin guardar" : id ? `${describePromo(form)} · todo guardado` : ""}</span>
          <button type="button" className="a-btn a-btn--primary a-btn--lg" onClick={save} disabled={pending || (!dirty && Boolean(id))}>
            {pending ? "Guardando…" : id ? "Guardar cambios" : "Crear código"}
          </button>
        </div>
      </div>
    </div>
  );
}
