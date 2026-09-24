"use client";

import { useEffect, useState, useTransition } from "react";
import { type PromoRule, describePromo, normalizeCode, promoDiscount } from "@/domain/promo";
import { formatPrice } from "@/lib/format";
import { checkPromoAction } from "@/app/(tienda)/_actions/promo";

const STORAGE_KEY = "chincol.promo.v1";

/** Código aplicado en el carrito, guardado en el navegador y revisado de nuevo al volver. */
export function usePromo(total: number, ready: boolean) {
  const [rule, setRule] = useState<PromoRule | null>(null);

  useEffect(() => {
    if (!ready) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {}
    if (!saved) return;
    // Al volver solo importa que siga vigente; la compra mínima se avisa en el cuadro.
    checkPromoAction(saved, Number.MAX_SAFE_INTEGER).then((r) => {
      if (r.ok) setRule(r.rule);
      else {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      }
    });
  }, [ready]);

  const apply = (r: PromoRule | null) => {
    setRule(r);
    try {
      if (r) localStorage.setItem(STORAGE_KEY, r.code);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return { rule, discount: rule ? promoDiscount(rule, total) : 0, apply };
}

export function PromoBox({ total, rule, onApply }: { total: number; rule: PromoRule | null; onApply: (r: PromoRule | null) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeCode(code);
    if (!clean) return setError("Escribe un código.");
    start(async () => {
      const r = await checkPromoAction(clean, total);
      if (r.ok) {
        onApply(r.rule);
        setCode("");
        setError(null);
      } else setError(r.error);
    });
  }

  if (rule) {
    const short = rule.minTotal - total;
    return (
      <div className="promo promo--applied">
        <div className="promo__row">
          <span>
            <strong className="promo__code">{rule.code}</strong>
            <span className="muted"> · {describePromo(rule)}</span>
          </span>
          <button type="button" className="promo__remove" onClick={() => onApply(null)}>
            Quitar
          </button>
        </div>
        {short > 0 && <p className="promo__warn">Te faltan {formatPrice(short)} para usar este código.</p>}
      </div>
    );
  }

  return (
    <form className="promo" onSubmit={submit} noValidate>
      <label htmlFor="promo-code" className="promo__label">
        Código de promoción
      </label>
      <div className="promo__row">
        <input
          id="promo-code"
          className="input promo__input"
          placeholder="Ej: CHINCOL10"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "promo-error" : undefined}
        />
        <button type="submit" className="btn btn--ghost promo__btn" disabled={pending}>
          {pending ? "Revisando…" : "Aplicar"}
        </button>
      </div>
      {error && (
        <p id="promo-error" className="promo__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
