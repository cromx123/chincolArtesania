import type { Metadata } from "next";
import { isAssistantTask } from "@/domain/assistant";
import { isAssistantConfigured } from "@/server/assistant/assistant-service";
import { pickerProductsFor } from "@/server/assistant/picker";
import { AssistantChat } from "@/components/admin/assistant/AssistantChat";

export const metadata: Metadata = { title: "Asistencia" };

export default async function NewConversationPage({ searchParams }: { searchParams: Promise<{ tarea?: string }> }) {
  const { tarea } = await searchParams;
  const task = tarea && isAssistantTask(tarea) ? tarea : "publicacion";
  return <AssistantChat key={task} task={task} initial={null} configured={isAssistantConfigured()} products={await pickerProductsFor(task)} />;
}
