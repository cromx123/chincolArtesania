import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { metaConfig } from "@/config/meta";
import { botService } from "@/server/bot/bot-service";
import { sendInstagramText, sendWhatsAppText } from "@/server/bot/meta-client";
import { type MetaEvent, parseMetaEvent } from "@/server/bot/meta-parse";

// Punto de entrada de Meta (WhatsApp Business e Instagram).
// GET: Meta verifica la URL al registrar el webhook.
// POST: valida la firma, saca los mensajes de texto y responde con el bot de
// clientes (src/server/bot/bot-service.ts), que usa las mismas herramientas de
// catálogo y cotizaciones que el widget de la tienda.

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const ok =
    params.get("hub.mode") === "subscribe" &&
    metaConfig.verifyToken !== null &&
    params.get("hub.verify_token") === metaConfig.verifyToken;
  if (!ok) return new NextResponse("Token de verificación inválido", { status: 403 });
  return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
}

/** Comprueba la firma X-Hub-Signature-256 (HMAC-SHA256 del cuerpo con el app secret). */
function validSignature(raw: string, header: string | null): boolean {
  if (!metaConfig.appSecret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", metaConfig.appSecret).update(raw).digest("hex");
  const got = header.slice("sha256=".length);
  return got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Firma inválida", { status: 401 });
  }

  let event: MetaEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse("JSON inválido", { status: 400 });
  }

  // Meta reintenta si no recibe 200 rápido; con tráfico bajo (un taller de una
  // persona) procesar aquí mismo es aceptable. Si el volumen crece, esto debería
  // pasar a una cola para no arriesgar reintentos duplicados por la latencia del bot.
  const messages = parseMetaEvent(event);
  for (const m of messages) {
    try {
      const result = await botService.send({ channel: m.channel, externalId: m.externalId, text: m.text });
      const reply = result.ok ? result.reply : result.error;
      if (m.channel === "whatsapp") await sendWhatsAppText(m.externalId, reply);
      else await sendInstagramText(m.externalId, reply);
    } catch (e) {
      console.error("[meta] error procesando mensaje:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
