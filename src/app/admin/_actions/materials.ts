"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/require-admin";
import { type MaterialInput, materialService } from "@/server/services/material-service";

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function saveMaterialAction(id: string | null, input: MaterialInput) {
  await requireAdmin();
  const result = await materialService.save(id, input);
  if (result.ok) refresh();
  return result;
}

export async function deleteMaterialAction(id: string) {
  await requireAdmin();
  await materialService.remove(id);
  refresh();
}

export async function purchaseMaterialAction(id: string, quantity: number, totalPaid: number) {
  await requireAdmin();
  await materialService.purchase(id, quantity, totalPaid);
  refresh();
}

export async function setMaterialStockAction(id: string, value: number) {
  await requireAdmin();
  await materialService.setStock(id, value);
  refresh();
}
