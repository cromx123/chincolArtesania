"use client";

import { useState, useTransition } from "react";
import { LOYALTY_KINDS, type LoyaltyKind, type LoyaltyRule, MAX_LOYALTY_PERCENT, describeRule } from "@/domain/customer";
import { addLoyaltyRuleAction, deleteLoyaltyRuleAction, toggleLoyaltyRuleAction } from "@/app/admin/_actions/customers";
import { TrashIcon } from "../icons";

const toInt = (v: string, max: number) => Math.min(max, Number(v.replace(/\D/g, "").slice(0, 3)) || 0);

export function LoyaltyRules({ rules }: { rules: LoyaltyRule[] }) {
  const [kind, setKind] = useState<LoyaltyKind>("piezas");
  const [threshold, setThreshold] = useState(5);
  const [percent, setPercent] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    start(async () => {
      const err = await addLoyaltyRuleAction(kind, threshold, percent);
      setError(err);
    });
  }

  return (
    <section className="a-card">
      <h2 className="a-card__title">Descuentos para clientas</h2>
      <p className="a-hint">
        Se aplican solos en el carrito cuando la clienta dejó sus datos en ese celular. Si cumple varias reglas, se usa la de mayor porcentaje (no se suman), y si además
        escribe un código de promoción, se usa el mayor de los dos. Solo cuentan las ventas donde la elegiste como clienta.
      </p>

      {rules.length > 0 && (
        <ul className="a-rules">
          {rules.map((r) => (
            <li key={r.id} className={r.active ? undefined : "is-off"}>
              <span className="a-rules__text">{describeRule(r)}</span>
              <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={pending} onClick={() => start(() => toggleLoyaltyRuleAction(r.id, !r.active))}>
                {r.active ? "Pausar" : "Activar"}
              </button>
              <button type="button" className="a-icon-btn" aria-label={`Eliminar: ${describeRule(r)}`} disabled={pending} onClick={() => start(() => deleteLoyaltyRuleAction(r.id))}>
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="a-rule-add">
        <div className="a-field">
          <label htmlFor="regla-tipo" className="a-label">
            Nueva regla
          </label>
          <select id="regla-tipo" className="a-input" value={kind} onChange={(e) => setKind(e.target.value as LoyaltyKind)}>
            {LOYALTY_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
        <div className="a-field">
          <label htmlFor="regla-desde" className="a-label">
            {kind === "antiguedad" ? "Desde (meses)" : "Desde (piezas)"}
          </label>
          <div className="a-qty">
            <input id="regla-desde" inputMode="numeric" value={threshold || ""} onChange={(e) => setThreshold(toInt(e.target.value, 999))} />
          </div>
        </div>
        <div className="a-field">
          <label htmlFor="regla-pct" className="a-label">
            Descuento
          </label>
          <div className="a-qty">
            <input id="regla-pct" inputMode="numeric" value={percent || ""} onChange={(e) => setPercent(toInt(e.target.value, MAX_LOYALTY_PERCENT))} />
            <span className="a-qty__suffix">%</span>
          </div>
        </div>
        <button type="button" className="a-btn a-btn--primary" onClick={add} disabled={pending}>
          Agregar
        </button>
      </div>
      {error && <p className="a-error">{error}</p>}
    </section>
  );
}
