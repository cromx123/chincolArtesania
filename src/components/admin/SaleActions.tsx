"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PAYMENTS, type Payment } from "@/domain/sale";
import { deleteSaleAction, markPaidAction } from "@/app/admin/_actions/sales";
import { ConfirmButton } from "./ConfirmButton";
import { Choice } from "./inputs";

const PAID_OPTIONS = PAYMENTS.filter((p) => p.id !== "pendiente");

export function SaleActions({ id, paid }: { id: string; paid: boolean }) {
  const router = useRouter();
  const [method, setMethod] = useState<Payment | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="a-stack">
      {!paid && (
        <section className="a-card">
          <h2 className="a-card__title">¿Ya te pagó?</h2>
          <Choice label="Cómo te pagó" options={PAID_OPTIONS} value={method} onChange={setMethod} columns={3} />
          <button
            type="button"
            className="a-btn a-btn--primary a-btn--block"
            disabled={!method || pending}
            onClick={() => start(async () => await markPaidAction(id, method!))}
          >
            {pending ? "Guardando…" : "Marcar como pagada"}
          </button>
        </section>
      )}
      <ConfirmButton
        label="Eliminar esta venta"
        confirmLabel="Sí, eliminar"
        warning="Se borra la venta y las piezas vuelven al stock."
        onConfirm={async () => {
          await deleteSaleAction(id);
          router.push("/admin/ventas");
        }}
      />
    </div>
  );
}
