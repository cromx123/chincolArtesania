"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { type PricingInput, computePrice, marginOf } from "@/domain/pricing";
import { formatAmount, type MaterialUnit } from "@/domain/material";
import { formatPrice } from "@/lib/format";
import { applyPriceAction, savePricingSettingsAction } from "@/app/admin/_actions/pricing";
import type { PricingSettings } from "@/server/services/settings-service";
import { MoneyInput, QuantityInput } from "./inputs";
import { Notice } from "./Notice";

export interface PricedProduct {
  id: string;
  name: string;
  price: number;
  materialsCost: number;
  lines: { name: string; quantity: number; unit: MaterialUnit; cost: number }[];
}

const HOURS_KEY = "chincol.admin.hours";

function loadHours(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(HOURS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function Percent({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="a-field">
      <label htmlFor={id} className="a-label">
        {label}
      </label>
      <QuantityInput id={id} value={value} onChange={onChange} suffix="%" />
      <p className="a-hint">{hint}</p>
    </div>
  );
}

export function PricingCalculator({ products, settings, initialProductId }: { products: PricedProduct[]; settings: PricingSettings; initialProductId?: string }) {
  const [productId, setProductId] = useState(initialProductId && products.some((p) => p.id === initialProductId) ? initialProductId : (products[0]?.id ?? "nueva"));
  const [manualMaterials, setManualMaterials] = useState(0);
  const [hours, setHours] = useState(2);
  const [s, setS] = useState<PricingSettings>(settings);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const product = products.find((p) => p.id === productId) ?? null;
  const set = <K extends keyof PricingSettings>(k: K, v: PricingSettings[K]) => setS((x) => ({ ...x, [k]: v }));

  // Las horas de cada pieza se recuerdan en este equipo.
  useEffect(() => {
    setHours(loadHours()[productId] ?? 2);
  }, [productId]);

  function changeHours(value: number) {
    setHours(value);
    try {
      localStorage.setItem(HOURS_KEY, JSON.stringify({ ...loadHours(), [productId]: value }));
    } catch {}
  }

  const input: PricingInput = useMemo(
    () => ({ ...s, hours, materialsCost: product && product.lines.length ? product.materialsCost : manualMaterials }),
    [s, hours, product, manualMaterials],
  );
  const r = computePrice(input);
  const currentMargin = product ? marginOf(product.price, input) : null;
  const alternatives = [30, 40, 50, 60].map((m) => ({ margin: m, price: computePrice({ ...input, marginPct: m }).price }));

  return (
    <div className="a-calc">
      <Notice message={notice} />
      <div className="a-calc__inputs">
        <section className="a-card">
          <label htmlFor="calc-producto" className="a-card__title">
            ¿Para qué pieza?
          </label>
          <select id="calc-producto" className="a-input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="nueva">Una pieza nueva (sin producto)</option>
          </select>
        </section>

        <section className="a-card">
          <h2 className="a-card__title">
            <span className="a-step">1</span> Materiales
          </h2>
          {product && product.lines.length > 0 ? (
            <>
              <ul className="a-list-plain">
                {product.lines.map((l) => (
                  <li key={l.name}>
                    <span>
                      {l.name} <span className="a-muted">· {formatAmount(l.quantity, l.unit)}</span>
                    </span>
                    <strong>{formatPrice(l.cost)}</strong>
                  </li>
                ))}
                <li className="a-list-plain__total">
                  <span>Costo de materiales</span>
                  <strong>{formatPrice(product.materialsCost)}</strong>
                </li>
              </ul>
              <p className="a-hint">
                Se calcula solo con los costos de tus materiales.{" "}
                <Link href={`/admin/productos/${product.id}`} className="a-link">
                  Cambiar materiales
                </Link>
              </p>
            </>
          ) : (
            <div className="a-field">
              {product && (
                <p className="a-hint">
                  Esta pieza no tiene materiales asignados.{" "}
                  <Link href={`/admin/productos/${product.id}`} className="a-link">
                    Agrégalos
                  </Link>{" "}
                  o escribe el costo aproximado:
                </p>
              )}
              <label htmlFor="calc-mat" className="a-label">
                ¿Cuánto gastas en materiales por pieza?
              </label>
              <MoneyInput id="calc-mat" value={manualMaterials} onChange={setManualMaterials} placeholder="0" />
            </div>
          )}
        </section>

        <section className="a-card">
          <h2 className="a-card__title">
            <span className="a-step">2</span> Tu trabajo
          </h2>
          <p className="a-hint">Lo que casi nunca se cobra. Tu tiempo también vale.</p>
          <div className="a-grid-2">
            <div className="a-field">
              <label htmlFor="calc-horas" className="a-label">
                Horas que te toma
              </label>
              <QuantityInput id="calc-horas" value={hours} onChange={changeHours} suffix="h" />
            </div>
            <div className="a-field">
              <label htmlFor="calc-hora" className="a-label">
                Valor de tu hora
              </label>
              <MoneyInput id="calc-hora" value={s.hourRate} onChange={(v) => set("hourRate", v)} />
            </div>
          </div>
          <p className="a-calc__eq">
            Mano de obra: <strong>{formatPrice(Math.round(r.labor))}</strong>
          </p>
        </section>

        <section className="a-card">
          <h2 className="a-card__title">
            <span className="a-step">3</span> Gastos y ganancia
          </h2>
          <div className="a-grid-2">
            <Percent id="calc-merma" label="Pérdida en cortes" hint="Cuero que se pierde al cortar." value={s.wastePct} onChange={(v) => set("wastePct", v)} />
            <Percent id="calc-gastos" label="Gastos del taller" hint="Luz, arriendo, herramientas." value={s.overheadPct} onChange={(v) => set("overheadPct", v)} />
            <Percent id="calc-comision" label="Comisión de venta" hint="Lo que cobra la plataforma o la feria." value={s.commissionPct} onChange={(v) => set("commissionPct", v)} />
            <Percent id="calc-margen" label="Ganancia que quieres" hint="Parte del precio que queda para ti." value={s.marginPct} onChange={(v) => set("marginPct", v)} />
          </div>
          <label className="a-check-card">
            <input type="checkbox" checked={s.includeTax} onChange={(e) => set("includeTax", e.target.checked)} />
            <span>
              <strong>Incluir IVA (19%) en el precio</strong>
              <span className="a-muted">Márcalo si emites boleta o factura con IVA.</span>
            </span>
          </label>
          <label className="a-check-card">
            <input type="checkbox" checked={s.roundTo === 1000} onChange={(e) => set("roundTo", e.target.checked ? 1000 : 100)} />
            <span>
              <strong>Redondear a mil</strong>
              <span className="a-muted">Ej: $47.312 queda en $48.000.</span>
            </span>
          </label>
        </section>
      </div>

      <aside className="a-calc__result">
        <section className="a-card a-card--result">
          <span className="a-stat__label">Precio sugerido</span>
          {r.ok ? (
            <>
              <span className="a-calc__price">{formatPrice(r.price)}</span>
              <span className="a-calc__profit">
                Te quedan <strong>{formatPrice(Math.round(r.profit))}</strong> de ganancia por pieza
              </span>
            </>
          ) : (
            <p className="a-error">{r.problem}</p>
          )}

          {product && currentMargin !== null && (
            <p className={`a-calc__today ${currentMargin < s.marginPct - 5 ? "is-warn" : ""}`}>
              Hoy lo vendes en <strong>{formatPrice(product.price)}</strong>
              {currentMargin <= 0
                ? " y no te deja ganancia."
                : ` y te deja ${Math.round(currentMargin)}% de ganancia.`}
            </p>
          )}

          {product && r.ok && r.price !== product.price && (
            <button
              type="button"
              className="a-btn a-btn--primary a-btn--block"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await applyPriceAction(product.id, r.price);
                  setNotice(`Listo: ${product.name} ahora cuesta ${formatPrice(r.price)} en la tienda.`);
                })
              }
            >
              Usar {formatPrice(r.price)} como precio
            </button>
          )}
          <button
            type="button"
            className="a-btn a-btn--ghost a-btn--block"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await savePricingSettingsAction(s);
                setNotice("Guardamos tus valores para la próxima vez.");
              })
            }
          >
            Recordar estos valores
          </button>
        </section>

        {r.ok && (
          <section className="a-card">
            <h2 className="a-card__title">Si cambias la ganancia</h2>
            <ul className="a-list-plain">
              {alternatives.map((a) => (
                <li key={a.margin} className={a.margin === s.marginPct ? "is-current" : undefined}>
                  <button type="button" className="a-link-btn a-link-btn--left" onClick={() => set("marginPct", a.margin)}>
                    {a.margin}% de ganancia
                  </button>
                  <strong>{formatPrice(a.price)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {r.ok && (
          <section className="a-card">
            <h2 className="a-card__title">De dónde sale el precio</h2>
            <ul className="a-list-plain">
              <li>
                <span>Materiales</span>
                <span>{formatPrice(Math.round(r.materials))}</span>
              </li>
              <li>
                <span>Pérdida en cortes</span>
                <span>{formatPrice(Math.round(r.waste))}</span>
              </li>
              <li>
                <span>Tu trabajo</span>
                <span>{formatPrice(Math.round(r.labor))}</span>
              </li>
              <li>
                <span>Gastos del taller</span>
                <span>{formatPrice(Math.round(r.overhead))}</span>
              </li>
              <li className="a-list-plain__total">
                <span>Lo que te cuesta hacerla</span>
                <strong>{formatPrice(Math.round(r.cost))}</strong>
              </li>
              {r.commission > 0 && (
                <li>
                  <span>Comisión de venta</span>
                  <span>{formatPrice(Math.round(r.commission))}</span>
                </li>
              )}
              {r.tax > 0 && (
                <li>
                  <span>IVA</span>
                  <span>{formatPrice(Math.round(r.tax))}</span>
                </li>
              )}
              <li>
                <span>Tu ganancia</span>
                <span>{formatPrice(Math.round(r.profit))}</span>
              </li>
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
