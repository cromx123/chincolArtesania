import "server-only";
import { db } from "../db";

/** Estados en que la campaña ya se confirmó (programada o enviada): sus descuentos rigen en la tienda. */
export const OFFER_ACTIVE_STATUSES = ["programada", "enviando", "enviada", "error"];

export interface ActiveOffer {
  percent: number;
  until: string;
}

export const offerService = {
  /** Descuentos vigentes el día `today` ("2026-10-04"), por producto. Si hay varios, gana el mayor. */
  async activeByProduct(today: string): Promise<Map<string, ActiveOffer>> {
    const rows = await db.campaignDiscount.findMany({
      where: { campaign: { status: { in: OFFER_ACTIVE_STATUSES }, promoFrom: { lte: today }, promoUntil: { gte: today } } },
      select: { productId: true, percent: true, campaign: { select: { promoUntil: true } } },
    });
    const offers = new Map<string, ActiveOffer>();
    for (const r of rows) {
      const current = offers.get(r.productId);
      if (!current || r.percent > current.percent) offers.set(r.productId, { percent: r.percent, until: r.campaign.promoUntil! });
    }
    return offers;
  },
};
