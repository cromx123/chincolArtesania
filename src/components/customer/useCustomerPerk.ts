"use client";

import { useEffect, useState } from "react";
import type { LoyaltyPerk } from "@/domain/customer";
import { customerPerkAction } from "@/app/(tienda)/_actions/customer";
import { type SavedCustomer, loadSavedCustomer } from "./saved-customer";

/** Clienta guardada en este dispositivo y su descuento por fidelidad (si tiene). */
export function useCustomerPerk(ready: boolean) {
  const [customer, setCustomer] = useState<SavedCustomer | null>(null);
  const [perk, setPerk] = useState<LoyaltyPerk | null>(null);

  useEffect(() => {
    if (!ready) return;
    const saved = loadSavedCustomer();
    setCustomer(saved);
    if (saved) customerPerkAction(saved.token).then(setPerk).catch(() => setPerk(null));
  }, [ready]);

  return { customer, perk };
}
