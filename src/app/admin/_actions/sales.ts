"use server";

import { revalidatePath } from "next/cache";
import type { SaleInput } from "@/domain/sale";
import { requireAdmin } from "@/server/require-admin";
import { saleService } from "@/server/services/sale-service";

function refresh() {
  revalidatePath("/", "layout");
}

export async function registerSaleAction(input: SaleInput) {
  await requireAdmin();
  const result = await saleService.register(input);
  if (result.ok) refresh();
  return result;
}

/** También sirve para "Deshacer" justo después de registrar. */
export async function deleteSaleAction(id: string) {
  await requireAdmin();
  await saleService.remove(id);
  refresh();
}

export async function markPaidAction(id: string, payment: string) {
  await requireAdmin();
  await saleService.markPaid(id, payment);
  refresh();
}
