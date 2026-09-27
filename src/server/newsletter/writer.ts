import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { site } from "@/config/site";
import { formatDay } from "@/domain/event";
import type { WriterRequest } from "@/domain/newsletter";
import { availabilityLabel, categoryName, discountedPrice, effectivePrice } from "@/domain/product";
import { chileDateTime, formatChileDateTime } from "@/lib/dates";
import { formatPrice } from "@/lib/format";
import { catalogService } from "../container";
import { db } from "../db";
import { newsletterBaseUrl } from "../services/newsletter-template";

// Asistente que redacta el cuerpo del newsletter. Devuelve el texto como un flujo
// para que el editor lo muestre palabra por palabra mientras se escribe.

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1500;

/** Marca que el cliente reconoce como error a mitad del flujo (el texto normal nunca la trae). */
export const STREAM_ERROR_MARK = "\u0000ERROR:";

let client: Anthropic | null = null;
function anthropic() {
  client ??= new Anthropic();
  return client;
}

export function isWriterConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function today(): string {
  return formatChileDateTime(new Date());
}

async function catalogSummary(): Promise<string> {
  const products = await catalogService.search();
  if (products.length === 0) return "(la tienda no tiene piezas publicadas)";
  return products
    .slice(0, 40)
    .map(
      (p) =>
        `- ${p.name} (${categoryName(p.category)}): ${formatPrice(effectivePrice(p))}${p.offer ? ` (oferta vigente de otra campaña: ${p.offer.percent}%, normal ${formatPrice(p.price)})` : ""} · ${availabilityLabel(p)}`,
    )
    .join("\n");
}

async function systemPrompt(): Promise<string> {
  return `Redactas el newsletter por correo de ${site.fullName}, un taller de marroquinería hecha a mano en Chile atendido por su dueña, la artesana. Escribes para sus suscriptores y suscriptoras.

Formato (muy importante):
- Entrega SOLO el cuerpo del correo en texto plano. Sin asunto, sin comillas, sin explicaciones antes ni después.
- Párrafos separados por una línea en blanco. Nada de Markdown: sin asteriscos, sin #, sin negritas. Si necesitas una lista, usa guiones simples.
- No agregues pie de página, datos de contacto, enlaces ni direcciones web: la plantilla del correo ya trae el enlace a la tienda (${newsletterBaseUrl()}) y el de darse de baja. Para invitar a comprar, habla de "la tienda" o "nuestra página".
- Largo normal: entre 90 y 180 palabras, salvo que te pidan otra cosa.

Tono: español de Chile, cálido y cercano, orgulloso del trabajo a mano. Nada de urgencia falsa ni lenguaje de liquidación. Empieza con un saludo breve y termina con una despedida corta firmada por Chincol Artesanía.

Datos:
- Usa solo lo que dice la dueña en su contexto y el catálogo de abajo. No inventes descuentos, códigos, plazos, condiciones ni fechas que no estén ahí. Si falta un dato clave (por ejemplo, hasta cuándo dura la promo), escríbelo de forma que no lo necesite.
- Puedes nombrar hasta 3 piezas del catálogo si ayudan a la campaña, con su precio real. Si hay un porcentaje de descuento claro, puedes calcular el precio con descuento redondeando al peso.

Hoy es ${today()}.

Catálogo publicado:
${await catalogSummary()}`;
}

function eventText(eventAt: string): string {
  const date = eventAt ? chileDateTime(eventAt) : null;
  return date ? formatChileDateTime(date) : "(sin fecha)";
}

/** Las piezas con descuento de esta campaña, con precios calculados aquí (el asistente no hace cuentas). */
async function discountsText(req: WriterRequest): Promise<string> {
  if (req.discounts.length === 0) return "";
  const products = await db.product.findMany({ where: { id: { in: req.discounts.map((d) => d.productId) } }, select: { id: true, name: true, price: true } });
  const lines = req.discounts.flatMap((d) => {
    const p = products.find((x) => x.id === d.productId);
    return p ? [`- ${p.name}: ${d.percent}% de descuento, queda en ${formatPrice(discountedPrice(p.price, d.percent))} (precio normal ${formatPrice(p.price)})`] : [];
  });
  if (lines.length === 0) return "";
  const period =
    req.promoFrom && req.promoUntil
      ? `del ${formatDay(req.promoFrom, false)} al ${formatDay(req.promoUntil, false)}`
      : req.promoUntil
        ? `hasta el ${formatDay(req.promoUntil, false)}`
        : "(fechas por definir: no menciones fechas)";
  return `\n\nPiezas con descuento especial en esta campaña, vigentes ${period}. Son el centro del correo: menciónalas todas, con su porcentaje y estos precios exactos:\n${lines.join("\n")}`;
}

async function userPrompt(req: WriterRequest): Promise<string> {
  const header = `Asunto del correo: ${req.subject.trim() || "(sin asunto)"}
Fecha y hora del evento o promoción: ${eventText(req.eventAt)}
Contexto de la dueña: ${req.context.trim() || "(sin contexto)"}${await discountsText(req)}`;

  if (req.mode === "escribir") return `${header}\n\nEscribe el cuerpo del correo.`;

  const { body, instruction, selection } = req;
  if (selection && selection.end > selection.start) {
    const marked = `${body.slice(0, selection.start)}⟦${body.slice(selection.start, selection.end)}⟧${body.slice(selection.end)}`;
    return `${header}

Este es el correo actual. La dueña marcó un fragmento entre ⟦ y ⟧:

${marked}

Lo que pide para ese fragmento: ${instruction.trim()}

Devuelve SOLO el texto nuevo que reemplaza al fragmento marcado (sin los signos ⟦ ⟧, sin comillas, sin el resto del correo). Debe calzar con el texto de antes y de después.`;
  }
  return `${header}

Este es el correo actual (puede tener correcciones que ella hizo a mano; respétalas salvo que pida cambiarlas):

${body}

Lo que pide cambiar: ${instruction.trim()}

Devuelve el correo completo con el cambio aplicado.`;
}

/** Flujo de texto con el cuerpo del correo. Si algo falla a mitad, envía STREAM_ERROR_MARK + mensaje. */
export function writeNewsletter(req: WriterRequest, signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic().messages.stream(
          { model: MODEL, max_tokens: MAX_TOKENS, system: await systemPrompt(), messages: [{ role: "user", content: await userPrompt(req) }] },
          { signal },
        );
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") controller.enqueue(encoder.encode(event.delta.text));
        }
      } catch (e) {
        if (!signal.aborted) {
          console.error("Redactor del newsletter:", e);
          controller.enqueue(encoder.encode(`${STREAM_ERROR_MARK}${friendlyError(e)}`));
        }
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });
}

function friendlyError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Falta o está mal la clave de la IA (ANTHROPIC_API_KEY).";
  if (e instanceof Anthropic.RateLimitError) return "Hay mucha demanda en este momento. Prueba de nuevo en un minuto.";
  if (e instanceof Anthropic.APIConnectionError) return "No pudimos conectarnos. Revisa tu internet y vuelve a intentar.";
  return "El asistente tuvo un problema. Vuelve a intentar en un rato.";
}
