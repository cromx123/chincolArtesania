"use client";

import { useState, useTransition } from "react";
import { formatAmount } from "@/domain/material";
import { type RecipeLine, missingMaterials } from "@/domain/production";
import { produceAction } from "@/app/admin/_actions/products";
import { Stepper } from "./inputs";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
  product: { id: string; name: string; recipe: RecipeLine[] };
};

/** "Hice más piezas": suma al stock y descuenta los materiales que usan. */
export function ProduceSheet({ open, onClose, onDone, product }: Props) {
  const [units, setUnits] = useState(1);
  const [pending, start] = useTransition();
  const missing = missingMaterials(product.recipe, units);

  return (
    <Sheet open={open} onClose={onClose} title={`Hice más: ${product.name}`}>
      <div className="a-form">
        <div className="a-field a-field--center">
          <span className="a-label">¿Cuántas terminaste?</span>
          <Stepper label="Unidades terminadas" value={units} min={1} onChange={setUnits} size="lg" />
        </div>

        {product.recipe.length > 0 ? (
          <div className="a-field">
            <span className="a-label">Se descontará de tus materiales</span>
            <ul className="a-list-plain">
              {product.recipe.map((l) => (
                <li key={l.material.id} className={missing.includes(l) ? "is-warn" : undefined}>
                  <span>{l.material.name}</span>
                  <strong>−{formatAmount(l.quantity * units, l.material.unit)}</strong>
                </li>
              ))}
            </ul>
            {missing.length > 0 && (
              <p className="a-hint a-hint--warn">
                Según lo anotado no alcanza {missing.map((l) => l.material.name.toLowerCase()).join(", ")}. Se guardará igual y quedará en 0;
                revisa el stock de materiales después.
              </p>
            )}
          </div>
        ) : (
          <p className="a-hint">Este producto no tiene materiales asignados, así que solo se suma al stock.</p>
        )}

        <button
          type="button"
          className="a-btn a-btn--primary a-btn--lg a-btn--block"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await produceAction(product.id, units);
              onDone(units === 1 ? "Sumamos 1 pieza al stock." : `Sumamos ${units} piezas al stock.`);
              setUnits(1);
            })
          }
        >
          {pending ? "Guardando…" : `Sumar ${units} al stock`}
        </button>
      </div>
    </Sheet>
  );
}
