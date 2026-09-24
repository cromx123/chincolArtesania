"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EventInput } from "@/domain/event";
import { requireAdmin } from "@/server/require-admin";
import { type SaveEventResult, eventService } from "@/server/services/event-service";

export async function saveEventAction(id: string | null, input: EventInput): Promise<SaveEventResult> {
  await requireAdmin();
  const result = await eventService.save(id, input);
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}

export async function deleteEventAction(id: string) {
  await requireAdmin();
  await eventService.remove(id);
  revalidatePath("/admin", "layout");
  redirect("/admin/calendario?aviso=eliminado");
}
