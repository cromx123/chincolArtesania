import "server-only";
import { type EstimateRange, estimateRange } from "@/domain/pricing";
import { recipeCost } from "@/domain/production";
import { db } from "../db";
import { type AdminProduct, productAdminService } from "./product-admin-service";
import { settingsService } from "./settings-service";

const DEFAULT_HOURS = 2;

export interface QuoteFactors {
  /** Multiplicadores sobre el costo de materiales, ej: [1, 1.3]. */
  materials?: [number, number];
  /** Multiplicadores sobre las horas, ej: [1, 1.3]. */
  hours?: [number, number];
}

export interface CreateQuoteInput {
  conversationId: string | null;
  channel: string;
  productId: string;
  changes: string;
  estimateLow: number;
  estimateHigh: number;
  estimateDetail: unknown;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  note?: string;
}

export const quoteService = {
  /** Rango estimado para una variación de un producto real: nunca inventa costos, usa receta + Setting("pricing"). */
  async estimate(productId: string, factors?: QuoteFactors): Promise<{ product: AdminProduct; range: EstimateRange } | null> {
    const product = await productAdminService.get(productId);
    if (!product) return null;
    const settings = await settingsService.pricing();
    const range = estimateRange({
      ...settings,
      baseMaterialsCost: recipeCost(product.recipe),
      baseHours: product.hours ?? DEFAULT_HOURS,
      materialsFactorRange: factors?.materials ?? [1, 1.3],
      hoursFactorRange: factors?.hours ?? [1, 1.3],
    });
    return { product, range };
  },

  async create(input: CreateQuoteInput) {
    const product = await productAdminService.get(input.productId);
    return db.quoteRequest.create({
      data: {
        conversationId: input.conversationId,
        channel: input.channel,
        productId: input.productId,
        productName: product?.name ?? "Producto no encontrado",
        changes: input.changes,
        estimateLow: Math.round(input.estimateLow),
        estimateHigh: Math.round(input.estimateHigh),
        estimateDetail: JSON.stringify(input.estimateDetail),
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        note: input.note,
      },
    });
  },

  list() {
    return db.quoteRequest.findMany({ orderBy: { createdAt: "desc" }, include: { product: true } });
  },

  get(id: string) {
    return db.quoteRequest.findUnique({ where: { id }, include: { product: true } });
  },

  async setStatus(id: string, status: string) {
    await db.quoteRequest.update({ where: { id }, data: { status } });
  },
};
