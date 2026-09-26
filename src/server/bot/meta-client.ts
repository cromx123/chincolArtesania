import "server-only";
import { metaConfig } from "@/config/meta";

// Envío de respuestas por la API de Meta (WhatsApp Business Cloud API / Instagram
// Messaging), con fetch directo: no hay SDK de Meta instalado.

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

const CHANNEL_LIMIT = { whatsapp: 4096, instagram: 1000 } as const;

function truncateForChannel(text: string, channel: "whatsapp" | "instagram"): string {
  const limit = CHANNEL_LIMIT[channel];
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${metaConfig.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`[meta] error al enviar (${res.status}):`, await res.text().catch(() => ""));
  }
}

/** Envía un mensaje de texto por WhatsApp. No lanza: el webhook siempre debe responder 200 a Meta. */
export async function sendWhatsAppText(to: string, text: string): Promise<void> {
  if (!metaConfig.accessToken || !metaConfig.whatsappPhoneNumberId) return;
  try {
    await post(`${GRAPH_BASE}/${metaConfig.whatsappPhoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: truncateForChannel(text, "whatsapp") },
    });
  } catch (e) {
    console.error("[meta] no se pudo enviar por WhatsApp:", e);
  }
}

/** Envía un mensaje de texto por Instagram DM. No lanza: el webhook siempre debe responder 200 a Meta. */
export async function sendInstagramText(recipientId: string, text: string): Promise<void> {
  if (!metaConfig.accessToken || !metaConfig.instagramAccountId) return;
  try {
    await post(`${GRAPH_BASE}/${metaConfig.instagramAccountId}/messages`, {
      recipient: { id: recipientId },
      message: { text: truncateForChannel(text, "instagram") },
    });
  } catch (e) {
    console.error("[meta] no se pudo enviar por Instagram:", e);
  }
}
