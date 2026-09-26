"use server";

import { revalidatePath } from "next/cache";
import { isQuoteStatus } from "@/domain/bot-quote";
import { requireAdmin } from "@/server/require-admin";
import { quoteService } from "@/server/services/quote-service";

export async function setQuoteStatusAction(id: string, status: string) {
  await requireAdmin();
  if (!isQuoteStatus(status)) throw new Error("Estado inválido");
  await quoteService.setStatus(id, status);
  revalidatePath("/admin/cotizaciones");
  revalidatePath(`/admin/cotizaciones/${id}`);
}
