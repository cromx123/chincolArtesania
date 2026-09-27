// Campañas del newsletter: estados y cómo se guardan desde el editor.

export const CAMPAIGN_STATUSES = [
  { id: "borrador", name: "Borrador" },
  { id: "programada", name: "Programada" },
  { id: "enviando", name: "Enviando" },
  { id: "enviada", name: "Enviada" },
  { id: "error", name: "Con error" },
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number]["id"];

export function campaignStatusName(id: string): string {
  return CAMPAIGN_STATUSES.find((s) => s.id === id)?.name ?? id;
}

/** Ya salió (o está saliendo): el contenido no se puede cambiar. */
export function isLocked(status: string): boolean {
  return status === "enviando" || status === "enviada";
}

/** Qué hacer al guardar desde el editor. */
export type CampaignAction = "borrador" | "programar" | "enviar";

/** Una pieza de la tienda con descuento especial en la campaña. */
export interface CampaignDiscountInput {
  productId: string;
  percent: number;
}

/**
 * Lo que manda el editor. `eventAt` y `scheduledAt` vienen como "2026-10-04T18:30" (hora de Chile);
 * `promoFrom` y `promoUntil` son días ("2026-10-04").
 */
export interface ComposerInput {
  subject: string;
  body: string;
  eventAt: string;
  aiContext: string;
  productsText: string;
  promoText: string;
  ctaLabel: string;
  ctaUrl: string;
  scheduledAt: string;
  promoFrom: string;
  promoUntil: string;
  discounts: CampaignDiscountInput[];
}

/** Contexto común de cualquier pedido al asistente que redacta. */
interface WriterContext {
  subject: string;
  eventAt: string;
  context: string;
  discounts: CampaignDiscountInput[];
  promoFrom: string;
  promoUntil: string;
}

/** Pedido al asistente que redacta: escribir desde cero o cambiar lo que ya hay. */
export type WriterRequest =
  | ({ mode: "escribir" } & WriterContext)
  | ({
      mode: "cambiar";
      body: string;
      instruction: string;
      /** Si viene, solo se reescribe body.slice(start, end). */
      selection?: { start: number; end: number } | null;
    } & WriterContext);

export const MAX_CAMPAIGN_DISCOUNTS = 30;

/** Lee la lista de descuentos que manda el navegador, descartando lo inválido o repetido. */
export function parseDiscounts(value: unknown, maxPercent: number): CampaignDiscountInput[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: CampaignDiscountInput[] = [];
  for (const item of value.slice(0, MAX_CAMPAIGN_DISCOUNTS)) {
    const productId = typeof item?.productId === "string" ? item.productId : "";
    const percent = Number(item?.percent);
    if (!productId || seen.has(productId) || !Number.isInteger(percent) || percent < 1 || percent > maxPercent) continue;
    seen.add(productId);
    out.push({ productId, percent });
  }
  return out;
}
