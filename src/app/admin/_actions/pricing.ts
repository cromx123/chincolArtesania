"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/require-admin";
import { productAdminService } from "@/server/services/product-admin-service";
import { type PricingSettings, settingsService } from "@/server/services/settings-service";

export async function savePricingSettingsAction(settings: PricingSettings) {
  await requireAdmin();
  await settingsService.savePricing(settings);
}

/** "Usar este precio": actualiza el precio publicado del producto. */
export async function applyPriceAction(productId: string, price: number) {
  await requireAdmin();
  await productAdminService.setPrice(productId, price);
  revalidatePath("/", "layout");
}
