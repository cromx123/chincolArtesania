"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PromoInput } from "@/domain/promo";
import { requireAdmin } from "@/server/require-admin";
import { type SavePromoResult, promoService } from "@/server/services/promo-service";

export async function savePromoAction(id: string | null, input: PromoInput): Promise<SavePromoResult> {
  await requireAdmin();
  const result = await promoService.save(id, input);
  if (result.ok) revalidatePath("/admin/promociones", "layout");
  return result;
}

export async function deletePromoAction(id: string) {
  await requireAdmin();
  await promoService.remove(id);
  revalidatePath("/admin/promociones", "layout");
  redirect("/admin/promociones?aviso=eliminado");
}
