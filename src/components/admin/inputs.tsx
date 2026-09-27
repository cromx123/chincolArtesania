"use client";

import { Fragment, type InputHTMLAttributes, useEffect, useRef, useState } from "react";
import { cm2ToPie2, pie2ToCm2 } from "@/domain/material";

const thousands = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

/** Campo de plata: se escribe "24990" y se ve "$ 24.990". */
export function MoneyInput({
  value,
  onChange,
  id,
  invalid,
  ...rest
}: { value: number; onChange: (v: number) => void; id: string; invalid?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value ? thousands.format(value) : "");

  useEffect(() => {
    setText((current) => (Number(current.replace(/\D/g, "")) === value ? current : value ? thousands.format(value) : ""));
  }, [value]);

  return (
    <div className={`a-money${invalid ? " is-invalid" : ""}`}>
      <span aria-hidden>$</span>
      <input
        {...rest}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          const n = digits ? Number(digits) : 0;
          setText(digits ? thousands.format(n) : "");
          onChange(n);
        }}
      />
    </div>
  );
}

/** Número con decimales (acepta coma o punto): 1,5 pie². */
export function QuantityInput({
  value,
  onChange,
  id,
  suffix,
  ...rest
}: { value: number; onChange: (v: number) => void; id: string; suffix?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState(value ? String(value).replace(".", ",") : "");

  useEffect(() => {
    setText((current) => (parseQuantity(current) === value ? current : value ? String(value).replace(".", ",") : ""));
  }, [value]);

  return (
    <div className="a-qty">
      <input
        {...rest}
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(e) => {
          const clean = e.target.value.replace(/[^\d.,]/g, "");
          setText(clean);
          onChange(parseQuantity(clean));
        }}
      />
      {suffix && <span className="a-qty__suffix">{suffix}</span>}
    </div>
  );
}

/** 0.25 → "0,25" con hasta `decimals` decimales (sin ceros de sobra). */
function formatDecimal(value: number, decimals: number): string {
  return value ? String(Number(value.toFixed(decimals))).replace(".", ",") : "";
}

const moneyText = (value: number, decimals: number) =>
  value ? new Intl.NumberFormat("es-CL", { maximumFractionDigits: decimals }).format(value) : "";

/** Plata con decimales: el punto separa miles y la coma los decimales ("5.000", "0,55"). */
function parseMoney(text: string): number {
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Un lado del conversor: cómo se muestra y cómo se pasa a la unidad que se guarda. */
export interface ConvertSide {
  /** Para lectores de pantalla, ej: "en yardas". */
  name: string;
  suffix?: string;
  /** Para plata: "$" delante y punto de miles. */
  money?: boolean;
  decimals: number;
  fromStored: (stored: number) => number;
  toStored: (shown: number) => number;
}

/**
 * Dos campos conectados, como un conversor de monedas: se escribe en cualquiera y el
 * otro se calcula solo. `value` y `onChange` van en la unidad que se guarda.
 */
export function ConvertInput({ id, value, onChange, label, sides }: { id: string; value: number; onChange: (stored: number) => void; label: string; sides: [ConvertSide, ConvertSide] }) {
  const show = (side: ConvertSide, stored: number) => (side.money ? moneyText : formatDecimal)(side.fromStored(stored), side.decimals);
  const [texts, setTexts] = useState<[string, string]>([show(sides[0], value), show(sides[1], value)]);
  // Lo último que se avisó hacia afuera: si `value` vuelve igual, no se pisa lo que se está escribiendo.
  const emitted = useRef(value);

  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    setTexts([show(sides[0], value), show(sides[1], value)]);
    // Solo cuando `value` cambia desde afuera (ej. al cambiar de unidad).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function type(index: 0 | 1, raw: string) {
    const side = sides[index];
    const other = sides[1 - index];
    const clean = raw.replace(/[^\d.,]/g, "");
    const stored = side.toStored(side.money ? parseMoney(clean) : parseQuantity(clean));
    setTexts(index === 0 ? [clean, show(other, stored)] : [show(other, stored), clean]);
    emitted.current = stored;
    onChange(stored);
  }

  return (
    <div className="a-area" role="group" aria-label={label}>
      {sides.map((side, i) => (
        <Fragment key={side.name}>
          {i === 1 && (
            <span className="a-area__swap" aria-hidden>
              ⇄
            </span>
          )}
          <div className={side.money ? "a-money" : "a-qty"}>
            {side.money && <span aria-hidden>$</span>}
            <input
              id={i === 0 ? id : undefined}
              inputMode="decimal"
              autoComplete="off"
              aria-label={`${label} ${side.name}`}
              value={texts[i]}
              onChange={(e) => type(i as 0 | 1, e.target.value)}
            />
            {side.suffix && <span className="a-qty__suffix">{side.suffix}</span>}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

const same = (v: number) => v;

/** Superficie en pie² ⇄ cm². `value` y `onChange` van en pie². */
export function AreaInput({ id, value, onChange, label }: { id: string; value: number; onChange: (pie2: number) => void; label: string }) {
  return (
    <ConvertInput
      id={id}
      value={value}
      onChange={onChange}
      label={label}
      sides={[
        { name: "en pies cuadrados", suffix: "pie²", decimals: 4, fromStored: same, toStored: same },
        { name: "en centímetros cuadrados", suffix: "cm²", decimals: 1, fromStored: pie2ToCm2, toStored: cm2ToPie2 },
      ]}
    />
  );
}

/** Largo de hilo en yardas ⇄ la unidad del material (cm o m). `value` va en esa unidad. */
export function YardsInput({ id, value, onChange, label, unit, perYard }: { id: string; value: number; onChange: (v: number) => void; label: string; unit: string; perYard: number }) {
  return (
    <ConvertInput
      id={id}
      value={value}
      onChange={onChange}
      label={label}
      sides={[
        { name: "en yardas", suffix: "yd", decimals: 2, fromStored: (v) => v / perYard, toStored: (yd) => yd * perYard },
        { name: `en ${unit}`, suffix: unit, decimals: 2, fromStored: same, toStored: same },
      ]}
    />
  );
}

/**
 * Costo en dos precios conectados, ej: $ por yarda ⇄ $ por cm. `value` es el costo por
 * la unidad del material; `factor` es cuántas de esas unidades hay en la otra.
 */
export function UnitCostInput({ id, value, onChange, label, unit, other, factor }: { id: string; value: number; onChange: (v: number) => void; label: string; unit: string; other: string; factor: number }) {
  return (
    <ConvertInput
      id={id}
      value={value}
      onChange={onChange}
      label={label}
      sides={[
        { name: `por ${other}`, money: true, suffix: `/ ${other}`, decimals: 0, fromStored: (v) => v * factor, toStored: (p) => p / factor },
        { name: `por ${unit}`, money: true, suffix: `/ ${unit}`, decimals: 2, fromStored: same, toStored: same },
      ]}
    />
  );
}

export function parseQuantity(text: string): number {
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Botones − y + grandes para cantidades enteras. */
export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  label,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "md" | "lg";
}) {
  return (
    <div className={`a-stepper a-stepper--${size}`} role="group" aria-label={label}>
      <button type="button" aria-label={`Restar uno: ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`Sumar uno: ${label}`} disabled={max !== undefined && value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

/** Opciones como botones grandes (en vez de listas desplegables). */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  label,
  columns,
}: {
  options: readonly { id: T; name: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  columns?: number;
}) {
  return (
    <div className="a-choice" role="radiogroup" aria-label={label} style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="a-choice__opt" onClick={() => onChange(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  );
}
