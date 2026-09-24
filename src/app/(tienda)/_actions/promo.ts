"use server";

import { todayISO } from "@/lib/dates";
import { type CheckPromoResult, promoService } from "@/server/services/promo-service";

export async function checkPromoAction(code: string, total: number): Promise<CheckPromoResult> {
  return promoService.check(String(code ?? ""), todayISO(), Number(total) || 0);
}
