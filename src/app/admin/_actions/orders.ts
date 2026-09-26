"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type OrderInput, isOrderStatus } from "@/domain/production-order";
import { requireAdmin } from "@/server/require-admin";
import { type SaveOrderResult, orderService } from "@/server/services/order-service";

export async function saveOrderAction(id: string | null, input: OrderInput): Promise<SaveOrderResult> {
  await requireAdmin();
  const result = await orderService.save(id, input);
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function setOrderStatusAction(id: string, status: string) {
  await requireAdmin();
  if (!isOrderStatus(status)) throw new Error("Estado inválido");
  await orderService.setStatus(id, status);
  revalidatePath("/admin", "layout");
}

export async function deleteOrderAction(id: string) {
  await requireAdmin();
  await orderService.remove(id);
  revalidatePath("/admin", "layout");
  redirect("/admin/encargos?aviso=eliminado");
}
