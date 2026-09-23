import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assistantService, isAssistantConfigured } from "@/server/assistant/assistant-service";
import { pickerProductsFor } from "@/server/assistant/picker";
import { AssistantChat } from "@/components/admin/assistant/AssistantChat";

export const metadata: Metadata = { title: "Asistencia" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const view = await assistantService.get((await params).id);
  if (!view) notFound();
  return (
    <AssistantChat key={view.id} task={view.task} initial={view} configured={isAssistantConfigured()} products={await pickerProductsFor(view.task)} />
  );
}
