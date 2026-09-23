import "server-only";
import { DEFAULT_PRICING } from "@/domain/pricing";
import { db } from "../db";

export type PricingSettings = typeof DEFAULT_PRICING;

export const settingsService = {
  async pricing(): Promise<PricingSettings> {
    const row = await db.setting.findUnique({ where: { key: "pricing" } });
    try {
      return { ...DEFAULT_PRICING, ...(row ? JSON.parse(row.value) : {}) };
    } catch {
      return DEFAULT_PRICING;
    }
  },

  async savePricing(value: PricingSettings) {
    const json = JSON.stringify(value);
    await db.setting.upsert({ where: { key: "pricing" }, create: { key: "pricing", value: json }, update: { value: json } });
  },
};
