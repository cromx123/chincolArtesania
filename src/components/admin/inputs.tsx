"use client";

import { type InputHTMLAttributes, useEffect, useState } from "react";

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
