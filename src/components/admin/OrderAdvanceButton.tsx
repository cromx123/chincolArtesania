"use client";

import { useTransition } from "react";
import { type OrderStatus, nextStatus, orderStatusName } from "@/domain/production-order";
import { setOrderStatusAction } from "@/app/admin/_actions/orders";

/** Pasa el encargo al estado siguiente con un toque (por empezar → en progreso → finalizado → entregado). */
export function OrderAdvanceButton({ id, status }: { id: string; status: OrderStatus }) {
  const [pending, start] = useTransition();
  const next = nextStatus(status);
  if (!next) return null;

  return (
    <button type="button" className="a-btn a-btn--ghost a-btn--sm" disabled={pending} onClick={() => start(() => setOrderStatusAction(id, next))}>
      {pending ? "…" : `Pasar a ${orderStatusName(next).toLowerCase()}`}
    </button>
  );
}
