import { type NextRequest, NextResponse } from "next/server";
import { botService } from "@/server/bot/bot-service";

// Endpoint público (sin login) para el widget de chat de la tienda. `sessionId`
// es un id generado en el navegador (localStorage), solo sirve para mantener el
// hilo de la conversación: mismo modelo de confianza que CustomerDevice.token.

const MAX_SESSION_ID_LENGTH = 100;

// Límite simple por IP, en memoria: evita que un solo visitante sature el chat.
// Se reinicia si el servidor se reinicia; no comparte estado entre instancias.
// Suficiente para el volumen de una tienda de una persona.
const IP_LIMIT_WINDOW_MS = 60 * 1000;
const IP_LIMIT_MAX = 10;
const ipHits = new Map<string, { count: number; windowStart: number }>();

function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now - hit.windowStart > IP_LIMIT_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (hit.count >= IP_LIMIT_MAX) return false;
  hit.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "desconocida";
  if (!ipAllowed(ip)) {
    return NextResponse.json({ ok: false, error: "Escribiste muy rápido. Espera un minuto y vuelve a intentar." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }
  const { sessionId, text } = (body ?? {}) as { sessionId?: unknown; text?: unknown };
  if (typeof sessionId !== "string" || !sessionId || sessionId.length > MAX_SESSION_ID_LENGTH || typeof text !== "string") {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }

  const result = await botService.send({ channel: "web", externalId: sessionId, text });
  return NextResponse.json(result);
}
