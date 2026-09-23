// Asistencia: la IA que ayuda a la dueña con lo que hay que escribir.
// Es para ella, no para clientes: trabaja con los datos reales del administrador.

import type { CategoryId } from "./product";

export const ASSISTANT_TASKS = [
  {
    id: "publicacion",
    name: "Crear una publicación",
    hint: "Para Instagram o historias, con tus productos, stock y precios reales",
    opener: "¿Sobre qué pieza quieres publicar y qué te gustaría contar?",
    placeholder: "Ej: del bolso Andes, que se note que quedan pocos y que es hecho a mano",
    followUps: ["Más corto", "Tono más cercano", "Versión para historia", "Agregar precio", "Otra versión"],
  },
  {
    id: "feria",
    name: "Postular a una feria",
    hint: "Sube las bases y te digo qué requisitos ya tienes y qué falta",
    opener:
      "Sube el PDF con las bases de la feria (con el clip) o pega el texto. Te digo qué requisitos ya se resuelven con lo que hay en el sistema y te ayudo a escribir lo que falta.",
    placeholder: "Pega aquí las bases o cuéntame de la feria",
    followUps: ["Ajustar a 500 caracteres", "Otra versión", "Carta de motivación", "¿Qué evalúan más?"],
  },
  {
    id: "respuesta",
    name: "Responder a un cliente",
    hint: "Pega el mensaje que te llegó y te propongo una respuesta",
    opener: "Pega el mensaje del cliente (de Instagram, WhatsApp o correo) y te propongo una respuesta.",
    placeholder: "Ej: Hola! ¿tienen el bolso Andes en café? ¿cuánto demora el envío?",
    followUps: ["Más corto", "Más formal", "Más cercano", "Otra versión"],
  },
  {
    id: "descripcion",
    name: "Describir un producto",
    hint: "Un texto para la ficha de la tienda, basado en sus materiales reales",
    opener:
      "Toca “Elegir producto” y te propongo una descripción nueva para su ficha, basada en sus materiales reales. Si quieres, escribe antes qué te gustaría destacar.",
    placeholder: "Opcional: qué quieres destacar (ej: que es resistente, que sirve para regalo)",
    followUps: ["Más corto", "Más detalles de materiales", "Otra versión"],
  },
] as const;

export type AssistantTask = (typeof ASSISTANT_TASKS)[number]["id"];

export function isAssistantTask(v: string): v is AssistantTask {
  return ASSISTANT_TASKS.some((t) => t.id === v);
}

export function taskInfo(id: AssistantTask) {
  return ASSISTANT_TASKS.find((t) => t.id === id)!;
}

export const DRAFT_KINDS = {
  publicacion: "Publicación de Instagram",
  historia: "Historia de Instagram",
  respuesta: "Respuesta a cliente",
  descripcion: "Descripción de producto",
  postulacion: "Texto para postulación",
  otro: "Borrador",
} as const;
export type DraftKind = keyof typeof DRAFT_KINDS;

export interface Draft {
  title: string;
  kind: DraftKind;
  text: string;
  hashtags: string[];
  /** Si es la descripción de un producto, se puede guardar directo en su ficha. */
  productId?: string;
}

/** Producto en el selector de "Describir un producto". */
export interface PickerProduct {
  id: string;
  name: string;
  category: CategoryId;
  image?: string;
  description: string;
}

export interface Requirement {
  id: string;
  text: string;
  status: "listo" | "falta";
  note?: string;
}

/** Lo que muestra el chat (el historial de la API se traduce a esto). */
export type ChatItem =
  | { kind: "user"; text: string; attachment?: string }
  | { kind: "assistant"; text: string }
  | { kind: "draft"; draft: Draft }
  | { kind: "notice"; text: string };

export interface ConversationView {
  id: string;
  task: AssistantTask;
  title: string;
  items: ChatItem[];
  requirements: Requirement[] | null;
  fairName: string | null;
  fairDeadline: string | null;
  /** Productos que la IA consultó, para mostrar "Datos que usó". */
  usedProducts: { id: string; name: string }[];
  updatedAt: string;
}

export function requirementsProgress(list: Requirement[]): { done: number; total: number } {
  return { done: list.filter((r) => r.status === "listo").length, total: list.length };
}
