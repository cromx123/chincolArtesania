// Códigos de promoción: se usan en el carrito y se administran en /admin/promociones.
import { formatPrice } from "@/lib/format";

export const PROMO_KINDS = [
  { id: "porcentaje", name: "Porcentaje (%)" },
  { id: "monto", name: "Monto fijo ($)" },
] as const;
export type PromoKind = (typeof PROMO_KINDS)[number]["id"];

/** Lo que el carrito necesita saber para calcular el descuento. */
export interface PromoRule {
  code: string;
  kind: PromoKind;
  value: number;
  minTotal: number;
}

export interface Promo extends PromoRule {
  id: string;
  expiresOn: string | null;
  active: boolean;
  note: string | null;
}

export type PromoInput = Omit<Promo, "id" | "expiresOn" | "note"> & { expiresOn: string; note: string };
export type PromoErrors = Partial<Record<keyof PromoInput, string>>;

export const EMPTY_PROMO: PromoInput = { code: "", kind: "porcentaje", value: 10, minTotal: 0, expiresOn: "", active: true, note: "" };

export const MAX_PERCENT = 90;

export function isPromoKind(v: string): v is PromoKind {
  return PROMO_KINDS.some((k) => k.id === v);
}

/** "chincol 10" → "CHINCOL10" */
export function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase().slice(0, 30);
}

/** Descuento en pesos para un total; 0 si no alcanza la compra mínima. Nunca más que el total. */
export function promoDiscount(rule: PromoRule, total: number): number {
  if (total <= 0 || total < rule.minTotal) return 0;
  const raw = rule.kind === "porcentaje" ? Math.round((total * rule.value) / 100) : rule.value;
  return Math.min(raw, total);
}

/** "10% de descuento" o "$5.000 de descuento". */
export function describePromo(rule: Pick<PromoRule, "kind" | "value">): string {
  return rule.kind === "porcentaje" ? `${rule.value}% de descuento` : `${formatPrice(rule.value)} de descuento`;
}
