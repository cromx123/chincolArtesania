"use server";

import { headers } from "next/headers";
import { type CartQuoteInput, type CartQuoteResult, quoteService } from "@/server/services/quote-service";

// Es público (sin login): se limita por IP para que nadie llene el admin de cotizaciones.
// En memoria, como el límite del chat: suficiente para un solo servidor.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, { count: number; start: number }>();

function allowed(ip: string): boolean {
  const now = Date.now();
  const hit = hits.get(ip);
  if (!hit || now - hit.start > WINDOW_MS) {
    hits.set(ip, { count: 1, start: now });
    return true;
  }
  if (hit.count >= MAX_PER_WINDOW) return false;
  hit.count += 1;
  return true;
}

export async function requestCartQuoteAction(input: CartQuoteInput): Promise<CartQuoteResult> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocida";
  if (!allowed(ip)) return { ok: false, error: "Ya enviaste varias cotizaciones seguidas. Espera unos minutos o escríbenos por WhatsApp." };
  return quoteService.fromCart(input);
}
