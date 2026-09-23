import type { LeatherColorId, ThreadColorId } from "./product";

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
