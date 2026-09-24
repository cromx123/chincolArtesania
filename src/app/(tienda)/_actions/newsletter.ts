"use server";

import { newsletterService } from "@/server/services/newsletter-service";

export type NewsletterState = { ok?: boolean; error?: string };

export async function subscribeAction(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!newsletterService.isValidEmail(email)) return { error: "Revisa tu correo, parece que tiene un error." };
  await newsletterService.subscribe(email);
  return { ok: true };
}
