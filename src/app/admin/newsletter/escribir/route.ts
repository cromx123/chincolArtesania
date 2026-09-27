import { type NextRequest, NextResponse } from "next/server";
import { type WriterRequest, parseDiscounts } from "@/domain/newsletter";
import { MAX_DISCOUNT_PERCENT } from "@/domain/product";
import { SESSION_COOKIE, isValidSession } from "@/server/auth";
import { isWriterConfigured, writeNewsletter } from "@/server/newsletter/writer";

// Flujo de texto del asistente que redacta el newsletter. Vive bajo /admin para
// quedar detrás del middleware de sesión; igual se revisa la sesión aquí.

export const dynamic = "force-dynamic";

const MAX_FIELD = 12000;

function str(v: unknown, max = MAX_FIELD): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function parse(body: unknown): WriterRequest | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const base = {
    subject: str(b.subject, 180),
    eventAt: str(b.eventAt, 20),
    context: str(b.context, 2000),
    discounts: parseDiscounts(b.discounts, MAX_DISCOUNT_PERCENT),
    promoFrom: str(b.promoFrom, 10),
    promoUntil: str(b.promoUntil, 10),
  };
  if (b.mode === "escribir") return { mode: "escribir", ...base };
  if (b.mode !== "cambiar") return null;
  const text = str(b.body);
  const instruction = str(b.instruction, 1000);
  if (!text.trim() || !instruction.trim()) return null;
  const sel = b.selection as { start?: unknown; end?: unknown } | null | undefined;
  const start = Number(sel?.start);
  const end = Number(sel?.end);
  const selection = Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= text.length ? { start, end } : null;
  return { mode: "cambiar", ...base, body: text, instruction, selection };
}

export async function POST(req: NextRequest) {
  if (!(await isValidSession(req.cookies.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Tu sesión expiró. Vuelve a entrar." }, { status: 401 });
  }
  if (!isWriterConfigured()) {
    return NextResponse.json({ error: "Falta la clave de la IA (ANTHROPIC_API_KEY en .env.local)." }, { status: 503 });
  }
  const request = parse(await req.json().catch(() => null));
  if (!request) return NextResponse.json({ error: "Faltan datos para el asistente." }, { status: 400 });

  return new Response(writeNewsletter(request, req.signal), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
