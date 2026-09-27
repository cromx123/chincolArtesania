import type { LoyaltyPerk } from "./customer";
import { LEATHER_COLORS, THREAD_COLORS, type LeatherColorId, type ThreadColorId } from "./product";
import type { PromoRule } from "./promo";

export interface CartSelection {
  leatherColor?: LeatherColorId;
  threadColor?: ThreadColorId;
  initials?: string;
}

export interface CartItem {
  /** Producto + opciones elegidas: dos colores distintos son dos líneas. */
  key: string;
  productId: string;
  slug: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selection: CartSelection;
}

export function cartItemKey(productId: string, s: CartSelection): string {
  return [productId, s.leatherColor ?? "", s.threadColor ?? "", (s.initials ?? "").toUpperCase()].join("|");
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** "Cuero caramelo · hilo natural · iniciales AB" */
export function describeSelection(s: CartSelection): string {
  return [
    s.leatherColor && `Cuero ${LEATHER_COLORS.find((c) => c.id === s.leatherColor)?.name.toLowerCase()}`,
    s.threadColor && `hilo ${THREAD_COLORS.find((c) => c.id === s.threadColor)?.name.toLowerCase()}`,
    s.initials && `iniciales ${s.initials}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export type AppliedDiscount = { label: string; amount: number };

/** El descuento que se aplica: el mayor entre el código y el de clienta (no se suman). */
export function pickDiscount(total: number, promo: PromoRule | null, promoAmount: number, perk: LoyaltyPerk | null): AppliedDiscount | null {
  const perkAmount = perk ? Math.round((total * perk.percent) / 100) : 0;
  if (perkAmount > 0 && perkAmount >= promoAmount) return { label: `Descuento de clienta ${perk!.percent}%`, amount: perkAmount };
  if (promo && promoAmount > 0) return { label: `Código ${promo.code}`, amount: promoAmount };
  return null;
}
