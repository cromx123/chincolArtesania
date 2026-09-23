"use client";

import { useEffect, useState, useTransition } from "react";

type Props = {
  label: string;
  confirmLabel: string;
  /** Explicación corta de lo que va a pasar. */
  warning?: string;
  onConfirm: () => Promise<unknown> | void;
  className?: string;
};

/** Botón de dos toques para acciones que no se pueden deshacer. Sin ventanas emergentes. */
export function ConfirmButton({ label, confirmLabel, warning, onConfirm, className = "a-btn a-btn--danger-ghost" }: Props) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 6000);
    return () => clearTimeout(t);
  }, [asking]);

  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }

  return (
    <div className="a-confirm" role="alert">
      {warning && <p>{warning}</p>}
      <div className="a-confirm__actions">
        <button type="button" className="a-btn a-btn--ghost" onClick={() => setAsking(false)} disabled={pending}>
          No, volver
        </button>
        <button type="button" className="a-btn a-btn--danger" disabled={pending} onClick={() => start(async () => void (await onConfirm()))}>
          {pending ? "Un momento…" : confirmLabel}
        </button>
      </div>
    </div>
  );
}
