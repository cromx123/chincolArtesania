"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LoyaltyKind } from "@/domain/customer";
import { requireAdmin } from "@/server/require-admin";
import { customerService } from "@/server/services/customer-service";

function refresh() {
  revalidatePath("/admin/clientas", "layout");
}

export async function addLoyaltyRuleAction(kind: LoyaltyKind, threshold: number, percent: number): Promise<string | null> {
  await requireAdmin();
  const error = await customerService.addRule(kind, threshold, percent);
  if (!error) refresh();
  return error;
}

export async function toggleLoyaltyRuleAction(id: string, active: boolean) {
  await requireAdmin();
  await customerService.setRuleActive(id, active);
  refresh();
}

export async function deleteLoyaltyRuleAction(id: string) {
  await requireAdmin();
  await customerService.removeRule(id);
  refresh();
}

export async function deleteCustomerAction(id: string) {
  await requireAdmin();
  await customerService.remove(id);
  revalidatePath("/", "layout");
  redirect("/admin/clientas?aviso=eliminada");
}
