import { createHmac, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { metaConfig } from "@/config/meta";

// Punto de entrada de Meta (WhatsApp Business e Instagram).
// GET: Meta verifica la URL al registrar el webhook.
// POST: Meta avisa de mensajes nuevos. Por ahora solo se validan y se registran en el log;
// el bot que responde usará las herramientas de src/server/bot/catalog-tools.ts.

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

type MetaEvent = { object?: string; entry?: { changes?: unknown[]; messaging?: unknown[] }[] };

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

  const count = (event.entry ?? []).reduce((n, e) => n + (e.changes?.length ?? 0) + (e.messaging?.length ?? 0), 0);
  console.info(`[meta] evento ${event.object ?? "desconocido"} con ${count} cambio(s)`);

  // Meta reintenta si no recibe 200 rápido: responder siempre de inmediato.
  return NextResponse.json({ ok: true });
}
