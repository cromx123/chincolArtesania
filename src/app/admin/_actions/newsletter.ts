"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/require-admin";
import { newsletterCampaignService, type CampaignInput } from "@/server/services/newsletter-campaign-service";

export async function saveCampaignAction(id: string | null, input: CampaignInput) {
  await requireAdmin();
  const result = await newsletterCampaignService.save(id, input);
  if (result.ok) revalidatePath("/admin/newsletter");
  return result;
}

export async function deleteCampaignAction(id: string) {
  await requireAdmin();
  const result = await newsletterCampaignService.remove(id);
  if (result.ok) revalidatePath("/admin/newsletter");
  return result;
}

export async function sendTestNewsletterAction(input: { subject: string; body: string; recipient: string }) {
  await requireAdmin();
  return newsletterCampaignService.sendTest(input);
}
