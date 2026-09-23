import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  type AssistantTask,
  type ChatItem,
  type ConversationView,
  DRAFT_KINDS,
  type Draft,
  type DraftKind,
  type Requirement,
  isAssistantTask,
  requirementsProgress,
  taskInfo,
} from "@/domain/assistant";
import { TIME_ZONE } from "@/lib/dates";
import { db } from "../db";
import { productAdminService } from "../services/product-admin-service";
import { systemPrompt } from "./prompts";
import { type ToolContext, executeTool, toolsFor } from "./tools";

type MessageParam = Anthropic.Beta.BetaMessageParam;

const MODEL = "claude-opus-5";
const MAX_STEPS = 10;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

let client: Anthropic | null = null;
function anthropic() {
  // Toma la clave de ANTHROPIC_API_KEY (ver .env.example).
  client ??= new Anthropic();
  return client;
}

export function isAssistantConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function parse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function todayText(): string {
  return new Intl.DateTimeFormat("es-CL", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
}

function draftFromToolInput(input: unknown): Draft | null {
  const i = (input ?? {}) as Record<string, unknown>;
  const text = typeof i.texto === "string" ? i.texto.trim() : "";
  if (!text) return null;
  const kind = (typeof i.tipo === "string" && i.tipo in DRAFT_KINDS ? i.tipo : "otro") as DraftKind;
  return {
    title: typeof i.titulo === "string" && i.titulo.trim() ? i.titulo.trim() : DRAFT_KINDS[kind],
    kind,
    text,
    hashtags: Array.isArray(i.hashtags) ? i.hashtags.filter((h): h is string => typeof h === "string").map((h) => h.replace(/^#/, "")) : [],
    productId: typeof i.producto_id === "string" && i.producto_id ? i.producto_id : undefined,
  };
}

/** Traduce el historial de la API a lo que muestra el chat (sin razonamiento ni llamadas internas). */
function toItems(messages: MessageParam[]): { items: ChatItem[]; productIds: string[] } {
  const items: ChatItem[] = [];
  const productIds: string[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") {
      items.push({ kind: m.role === "user" ? "user" : "assistant", text: m.content });
      continue;
    }
    if (m.role === "user") {
      const text = m.content.flatMap((b) => (b.type === "text" && !b.text.startsWith(HIDDEN_PREFIX) ? [b.text] : [])).join("\n");
      const doc = m.content.find((b) => b.type === "document");
      const attachment = doc && doc.type === "document" ? (doc.title ?? "Documento") : undefined;
      if (text || attachment) items.push({ kind: "user", text, attachment });
      continue;
    }
    for (const b of m.content) {
      if (b.type === "text" && b.text.trim()) items.push({ kind: "assistant", text: b.text.trim() });
      if (b.type === "tool_use" && b.name === "mostrar_borrador") {
        const draft = draftFromToolInput(b.input);
        if (draft) items.push({ kind: "draft", draft });
      }
      if (b.type === "tool_use" && b.name === "ver_producto") {
        const id = (b.input as { id?: unknown })?.id;
        if (typeof id === "string" && !productIds.includes(id)) productIds.push(id);
      }
    }
  }
  return { items, productIds };
}

type Row = Awaited<ReturnType<typeof db.assistantConversation.findUniqueOrThrow>>;

async function toView(row: Row, extra: ChatItem[] = []): Promise<ConversationView> {
  const { items, productIds } = toItems(parse<MessageParam[]>(row.messages, []));
  const products = productIds.length ? await productAdminService.list() : [];
  return {
    id: row.id,
    task: isAssistantTask(row.task) ? row.task : "publicacion",
    title: row.title,
    items: [...items, ...extra],
    requirements: parse<Requirement[] | null>(row.requirements, null),
    fairName: row.fairName,
    fairDeadline: row.fairDeadline,
    usedProducts: productIds.flatMap((id) => {
      const p = products.find((x) => x.id === id);
      return p ? [{ id: p.id, name: p.name }] : [];
    }),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Explica los errores de la API en palabras simples. */
function friendlyError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "La asistencia no está configurada: falta la clave de la IA (ANTHROPIC_API_KEY).";
  if (e instanceof Anthropic.RateLimitError) return "Hay mucha demanda en este momento. Prueba de nuevo en un minuto.";
  if (e instanceof Anthropic.APIConnectionError) return "No pudimos conectarnos. Revisa tu internet y vuelve a intentar.";
  if (e instanceof Anthropic.BadRequestError) return "No pudimos procesar el mensaje (¿el PDF es muy grande?). Prueba con un texto más corto.";
  if (e instanceof Anthropic.APIError) return "La asistencia tuvo un problema. Vuelve a intentar en un rato.";
  return "Algo salió mal. Vuelve a intentar.";
}

export interface SendInput {
  conversationId: string | null;
  task: AssistantTask;
  text: string;
  pdf?: { name: string; data: Buffer } | null;
  /** Producto elegido con el botón "Elegir producto" (se le pasa a la IA sin mostrarlo en el chat). */
  productId?: string | null;
}

/** Bloques de texto con este prefijo son contexto para la IA y no se muestran en el chat. */
const HIDDEN_PREFIX = "[ref ";

export type SendResult = { ok: true; view: ConversationView } | { ok: false; error: string };

export const assistantService = {
  async list() {
    const rows = await db.assistantConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, task: true, title: true, updatedAt: true, requirements: true },
    });
    return rows.map((r) => ({
      id: r.id,
      task: isAssistantTask(r.task) ? r.task : ("publicacion" as AssistantTask),
      title: r.title,
      updatedAt: r.updatedAt,
      progress: r.requirements ? requirementsProgress(parse<Requirement[]>(r.requirements, [])) : null,
    }));
  },

  async get(id: string): Promise<ConversationView | null> {
    const row = await db.assistantConversation.findUnique({ where: { id } });
    return row ? toView(row) : null;
  },

  async remove(id: string) {
    await db.assistantConversation.delete({ where: { id } });
  },

  async updateRequirements(id: string, requirements: Requirement[]) {
    const clean = requirements
      .filter((r) => r.text.trim())
      .map((r) => ({ id: r.id, text: r.text.trim(), status: r.status === "listo" ? "listo" : "falta", note: r.note?.trim() || undefined }));
    await db.assistantConversation.update({ where: { id }, data: { requirements: JSON.stringify(clean) } });
  },

  /** Envía un mensaje, deja que Claude use las herramientas y guarda todo el historial. */
  async send(input: SendInput): Promise<SendResult> {
    if (!isAssistantConfigured()) {
      return { ok: false, error: "La asistencia no está configurada: falta la clave de la IA (ANTHROPIC_API_KEY en .env.local)." };
    }
    const text = input.text.trim();
    if (!text && !input.pdf) return { ok: false, error: "Escribe un mensaje." };
    if (input.pdf && input.pdf.data.length > MAX_PDF_BYTES) return { ok: false, error: "El PDF pesa más de 10 MB. Prueba pegando el texto de las bases." };

    const existing = input.conversationId ? await db.assistantConversation.findUnique({ where: { id: input.conversationId } }) : null;
    const task = existing && isAssistantTask(existing.task) ? existing.task : input.task;
    const messages = parse<MessageParam[]>(existing?.messages ?? null, []);

    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (input.pdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: input.pdf.data.toString("base64") },
        title: input.pdf.name,
      });
    }
    content.push({ type: "text", text: text || "Estas son las bases de la feria." });
    if (input.productId) {
      const product = await productAdminService.get(input.productId);
      if (product) {
        content.push({
          type: "text",
          text: `${HIDDEN_PREFIX}producto elegido con el botón: "${product.name}", producto_id=${product.id}. Usa ver_producto con ese id; no hace falta buscarlo.]`,
        });
      }
    }
    messages.push({ role: "user", content });

    const ctx: ToolContext = {
      requirements: parse<Requirement[] | null>(existing?.requirements ?? null, null),
      fairName: existing?.fairName ?? null,
      fairDeadline: existing?.fairDeadline ?? null,
      drafts: [],
    };
    const notices: ChatItem[] = [];

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const response = await anthropic().beta.messages.create({
          model: MODEL,
          max_tokens: 16000,
          // Si un filtro de seguridad rechaza por error, la API reintenta con otro modelo.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          // Textos cortos y conversación: "medium" responde más rápido sin perder calidad.
          output_config: { effort: "medium" },
          cache_control: { type: "ephemeral" },
          system: systemPrompt(task, todayText()),
          tools: toolsFor(task),
          messages,
        });

        if (response.stop_reason === "refusal") {
          notices.push({ kind: "notice", text: "No pude ayudarte con ese mensaje. Prueba diciéndolo de otra forma." });
          break;
        }

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason === "pause_turn") continue;
        if (response.stop_reason === "max_tokens") {
          notices.push({ kind: "notice", text: "La respuesta quedó cortada. Pídeme que continúe o que lo haga más corto." });
          break;
        }
        if (response.stop_reason !== "tool_use") break;

        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          const r = await executeTool(block.name, block.input, ctx);
          results.push({ type: "tool_result", tool_use_id: block.id, content: r.content, is_error: r.isError });
        }
        messages.push({ role: "user", content: results });
      }
    } catch (e) {
      console.error("Asistencia:", e);
      return { ok: false, error: friendlyError(e) };
    }

    const title = existing?.title ?? `${taskInfo(task).name}: ${(text || input.pdf?.name || "").slice(0, 60)}`;
    const data = {
      messages: JSON.stringify(messages),
      requirements: ctx.requirements ? JSON.stringify(ctx.requirements) : null,
      fairName: ctx.fairName,
      fairDeadline: ctx.fairDeadline,
      title: task === "feria" && ctx.fairName ? `Postulación ${ctx.fairName}` : title,
    };
    const row = existing
      ? await db.assistantConversation.update({ where: { id: existing.id }, data })
      : await db.assistantConversation.create({ data: { ...data, task } });

    return { ok: true, view: await toView(row, notices) };
  },
};
