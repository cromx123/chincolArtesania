import "server-only";
import { QUOTE_DRAFT_STATUS, type QuoteDetail } from "@/domain/bot-quote";
import { quoteVariation } from "@/domain/pricing";
import { availabilityLabel, effectivePrice } from "@/domain/product";
import { recipeCost } from "@/domain/production";
import { catalogService } from "../container";
import { db } from "../db";
import { productAdminService } from "./product-admin-service";
import { settingsService } from "./settings-service";

// Cotizaciones del bot. El precio se calcula UNA vez, al cotizar, y queda guardado:
// lo que el bot le dice al cliente y lo que recibe la dueña es el mismo registro.

const DEFAULT_HOURS = 2;
/** Cotizaciones que nunca recibieron contacto: se borran solas después de este plazo. */
const DRAFT_DAYS = 30;

export interface QuoteOrigin {
  conversationId: string | null;
  channel: string;
}

export interface QuoteContact {
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  note?: string;
}

export type DraftResult = { ok: true; id: string; price: number; productName: string; detail: QuoteDetail } | { ok: false; error: string };

async function saveDraft(origin: QuoteOrigin, productId: string, productName: string, changes: string, detail: QuoteDetail) {
  const price = detail.tipo === "catalogo" ? detail.precio : detail.price;
  await db.quoteRequest.deleteMany({ where: { status: QUOTE_DRAFT_STATUS, createdAt: { lt: new Date(Date.now() - DRAFT_DAYS * 86_400_000) } } });
  const row = await db.quoteRequest.create({
    data: {
      conversationId: origin.conversationId,
      channel: origin.channel,
      productId,
      productName,
      changes,
      estimateLow: price,
      estimateHigh: price,
      estimateDetail: JSON.stringify(detail),
      status: QUOTE_DRAFT_STATUS,
    },
  });
  return { id: row.id, price };
}

const NOT_FOUND = "No existe una pieza publicada con ese id. Búscala con buscar_productos.";

export const quoteService = {
  /**
   * La pieza tal cual está en el catálogo, aunque esté agotada. El precio es el que el
   * cliente ve en la tienda (el normal, o el de promoción si hay una vigente).
   */
  async draftAsIs(origin: QuoteOrigin, productId: string, changes: string): Promise<DraftResult> {
    const product = await catalogService.getById(productId);
    if (!product) return { ok: false, error: NOT_FOUND };
    const detail: QuoteDetail = { tipo: "catalogo", precio: effectivePrice(product), precioNormal: product.price, disponibilidad: availabilityLabel(product) };
    const { id, price } = await saveDraft(origin, productId, product.name, changes, detail);
    return { ok: true, id, price, productName: product.name, detail };
  },

  /** Una variación de una pieza del catálogo (esté o no en stock): precio normal + material y trabajo extra, con tope de 30%. */
  async draftVariation(origin: QuoteOrigin, productId: string, changes: string, extraMaterialPct: number, extraHoursPct: number): Promise<DraftResult> {
    const [published, product, settings] = await Promise.all([catalogService.getById(productId), productAdminService.get(productId), settingsService.pricing()]);
    if (!published || !product) return { ok: false, error: NOT_FOUND };
    const detail: QuoteDetail = {
      tipo: "variacion",
      ...quoteVariation({
        basePrice: product.price,
        materialsCost: product.recipe.length ? recipeCost(product.recipe) : null,
        hours: product.hours ?? DEFAULT_HOURS,
        extraMaterialPct,
        extraHoursPct,
        settings,
      }),
    };
    const { id, price } = await saveDraft(origin, productId, product.name, changes, detail);
    return { ok: true, id, price, productName: product.name, detail };
  },

  /** El cliente deja sus datos: la cotización le llega a la dueña con el mismo precio que vio. */
  async confirm(id: string, origin: QuoteOrigin, contact: QuoteContact) {
    const quote = await db.quoteRequest.findUnique({ where: { id } });
    // Solo se puede confirmar una cotización hecha en esta misma conversación.
    if (!quote || quote.conversationId !== origin.conversationId) {
      return { ok: false as const, error: "No encuentro esa cotización en esta conversación. Cotiza de nuevo con cotizar_pedido." };
    }
    if (quote.status !== QUOTE_DRAFT_STATUS) return { ok: true as const, price: quote.estimateLow, productName: quote.productName, alreadySaved: true };
    await db.quoteRequest.update({ where: { id }, data: { ...contact, status: "pendiente" } });
    return { ok: true as const, price: quote.estimateLow, productName: quote.productName, alreadySaved: false };
  },

  list() {
    return db.quoteRequest.findMany({ where: { status: { not: QUOTE_DRAFT_STATUS } }, orderBy: { createdAt: "desc" }, include: { product: true } });
  },

  get(id: string) {
    return db.quoteRequest.findUnique({ where: { id }, include: { product: true } });
  },

  async setStatus(id: string, status: string) {
    await db.quoteRequest.update({ where: { id }, data: { status } });
  },
};
