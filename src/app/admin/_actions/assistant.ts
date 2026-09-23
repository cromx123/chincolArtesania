"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type Requirement, isAssistantTask } from "@/domain/assistant";
import { requireAdmin } from "@/server/require-admin";
import { type SendResult, assistantService } from "@/server/assistant/assistant-service";
import { productAdminService } from "@/server/services/product-admin-service";

export async function sendAssistantMessageAction(formData: FormData): Promise<SendResult> {
  await requireAdmin();
  const task = String(formData.get("task") ?? "");
  if (!isAssistantTask(task)) return { ok: false, error: "Elige con qué te ayudo." };

  const file = formData.get("pdf");
  let pdf: { name: string; data: Buffer } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return { ok: false, error: "Por ahora solo puedo leer archivos PDF." };
    pdf = { name: file.name, data: Buffer.from(await file.arrayBuffer()) };
  }

  const result = await assistantService.send({
    conversationId: String(formData.get("conversationId") ?? "") || null,
    task,
    text: String(formData.get("text") ?? ""),
    pdf,
    productId: String(formData.get("productId") ?? "") || null,
  });
  if (result.ok) revalidatePath("/admin/asistencia");
  return result;
}

export async function updateRequirementsAction(id: string, requirements: Requirement[]) {
  await requireAdmin();
  await assistantService.updateRequirements(id, requirements);
}

export async function deleteConversationAction(id: string) {
  await requireAdmin();
  await assistantService.remove(id);
  revalidatePath("/admin/asistencia");
  redirect("/admin/asistencia");
}

/** "Guardar en el producto": usa el borrador como descripción de la ficha. */
export async function saveDescriptionAction(productId: string, text: string) {
  await requireAdmin();
  await productAdminService.setDescription(productId, text);
  revalidatePath("/", "layout");
}
