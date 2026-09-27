"use server";

import { revalidatePath } from "next/cache";
import type { CampaignAction, ComposerInput } from "@/domain/newsletter";
import { runDueCampaigns } from "@/server/newsletter/scheduler";
import { requireAdmin } from "@/server/require-admin";
import { newsletterCampaignService } from "@/server/services/newsletter-campaign-service";

export async function saveCampaignAction(id: string | null, input: ComposerInput, action: CampaignAction) {
  await requireAdmin();
  const result = await newsletterCampaignService.save(id, input, action);
  if (!result.ok) return result;
  // Las ofertas pueden cambiar precios en toda la tienda.
  revalidatePath("/", "layout");
  // "Enviar ahora": se parte al tiro, sin esperar la próxima vuelta del programador.
  // No se espera el envío: con muchos suscriptores tomaría varios minutos.
  if (action === "enviar") void runDueCampaigns();
  return result;
}

export async function deleteCampaignAction(id: string) {
  await requireAdmin();
  const result = await newsletterCampaignService.remove(id);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function endPromoAction(id: string) {
  await requireAdmin();
  await newsletterCampaignService.endPromo(id);
  revalidatePath("/", "layout");
}

export async function sendTestNewsletterAction(input: ComposerInput & { recipient: string }) {
  await requireAdmin();
  return newsletterCampaignService.sendTest(input);
}
