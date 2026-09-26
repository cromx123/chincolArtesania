import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { TIME_ZONE } from "@/lib/dates";
import { db } from "../db";
import { customerSystemPrompt } from "./prompts";
import { botToolSchemas, executeBotTool } from "./tools";
import type { BotToolContext } from "./types";

type MessageParam = Anthropic.Beta.BetaMessageParam;

const MODEL = "claude-haiku-4-5-20251001";
const MAX_STEPS = 10;
const MAX_TOKENS = 2000;
const MAX_TEXT_LENGTH = 2000;

// Sin cola ni Redis: se limita el abuso contando mensajes por conversación en una
// ventana de 1 hora. Suficiente para el volumen de una tienda de una persona.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 30;

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

export function isBotConfigured(): boolean {
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

/** Nunca menciona detalles internos (claves, errores técnicos) a un cliente. */
function friendlyError(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "Hay mucha demanda en este momento. Prueba de nuevo en un minuto.";
  if (e instanceof Anthropic.APIConnectionError) return "No pudimos conectarnos. Intenta de nuevo en un momento.";
  console.error("Bot de clientes:", e);
  return "En este momento no puedo responder. Escríbenos directo y te ayudamos.";
}

/** El widget, WhatsApp e Instagram muestran texto plano: se quitan negritas y títulos de Markdown. */
function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "");
}

function lastReplyText(messages: MessageParam[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant" || typeof m.content === "string") continue;
    const text = m.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (text) return plainText(text);
  }
  return "No tengo una respuesta para eso. ¿Puedes contarme un poco más?";
}

async function loadConversation(channel: string, externalId: string) {
  return db.botConversation.upsert({
    where: { channel_externalId: { channel, externalId } },
    create: { channel, externalId },
    update: {},
  });
}

/** true si puede seguir conversando; si no, ya no hace falta llamar a la IA. */
async function checkRateLimit(conv: { id: string; messageCount: number; lastMessageAt: Date }): Promise<boolean> {
  const now = new Date();
  const withinWindow = now.getTime() - conv.lastMessageAt.getTime() < RATE_LIMIT_WINDOW_MS;
  const count = withinWindow ? conv.messageCount : 0;
  if (count >= RATE_LIMIT_MAX) return false;
  await db.botConversation.update({
    where: { id: conv.id },
    data: { messageCount: count + 1, lastMessageAt: withinWindow ? conv.lastMessageAt : now },
  });
  return true;
}

async function saveConversation(id: string, messages: MessageParam[]) {
  await db.botConversation.update({ where: { id }, data: { messages: JSON.stringify(messages) } });
}

export interface BotSendInput {
  channel: "web" | "whatsapp" | "instagram";
  externalId: string;
  text: string;
}

export type BotSendResult = { ok: true; reply: string } | { ok: false; error: string };

export const botService = {
  /** Envía un mensaje de un cliente, deja que Claude use las herramientas y guarda el historial. */
  async send(input: BotSendInput): Promise<BotSendResult> {
    if (!isBotConfigured()) {
      return { ok: false, error: "En este momento no puedo responder. Escríbenos directo y te ayudamos." };
    }
    const text = input.text.trim().slice(0, MAX_TEXT_LENGTH);
    if (!text) return { ok: false, error: "Escribe tu mensaje." };

    const conv = await loadConversation(input.channel, input.externalId);
    const allowed = await checkRateLimit(conv);
    if (!allowed) {
      return { ok: false, error: "Has escrito muchos mensajes seguidos. Espera un rato o escríbenos directo." };
    }

    const messages = parse<MessageParam[]>(conv.messages, []);
    messages.push({ role: "user", content: text });

    const ctx: BotToolContext = { channel: input.channel, conversationId: conv.id };

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const response = await anthropic().beta.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // Si un filtro de seguridad rechaza por error, la API reintenta con otro modelo.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          // Haiku 4.5 no admite thinking adaptativo ni effort: no agregarlos aquí.
          cache_control: { type: "ephemeral" },
          system: customerSystemPrompt(todayText()),
          tools: botToolSchemas() as Anthropic.Beta.BetaTool[],
          messages,
        });

        if (response.stop_reason === "refusal") {
          await saveConversation(conv.id, messages);
          return { ok: true, reply: "No puedo ayudarte con ese mensaje. ¿Me lo cuentas de otra forma?" };
        }

        messages.push({ role: "assistant", content: response.content });

        if (response.stop_reason === "pause_turn") continue;
        if (response.stop_reason !== "tool_use") break;

        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          const r = await executeBotTool(block.name, block.input, ctx);
          results.push({ type: "tool_result", tool_use_id: block.id, content: r.content, is_error: r.isError });
        }
        messages.push({ role: "user", content: results });
      }
    } catch (e) {
      await saveConversation(conv.id, messages);
      return { ok: false, error: friendlyError(e) };
    }

    await saveConversation(conv.id, messages);
    return { ok: true, reply: lastReplyText(messages) };
  },
};
