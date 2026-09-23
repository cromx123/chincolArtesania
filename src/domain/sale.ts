// Ventas: dónde se vendió y cómo se pagó.

export const CHANNELS = [
  { id: "instagram", name: "Instagram" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "feria", name: "Feria" },
  { id: "web", name: "Página web" },
  { id: "otro", name: "Otro" },
] as const;
export type Channel = (typeof CHANNELS)[number]["id"];

export const PAYMENTS = [
  { id: "transferencia", name: "Transferencia" },
  { id: "efectivo", name: "Efectivo" },
  { id: "tarjeta", name: "Tarjeta" },
  { id: "pendiente", name: "Me debe" },
] as const;
export type Payment = (typeof PAYMENTS)[number]["id"];

export function channelName(id: string): string {
  return CHANNELS.find((c) => c.id === id)?.name ?? id;
}

/** "Instagram", o "Feria · Pulgas Providencia" si se sabe en qué feria fue. */
export function channelLabel(channel: string, fairName?: string | null): string {
  return channel === "feria" && fairName ? `${channelName(channel)} · ${fairName}` : channelName(channel);
}

/** Quita espacios de más, para que "Feria  Pulgas " y "Feria Pulgas" sean la misma. */
export function cleanFairName(name: string | undefined): string | null {
  const clean = (name ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  return clean || null;
}

export function paymentName(id: string): string {
  return PAYMENTS.find((p) => p.id === id)?.name ?? id;
}

export function isChannel(v: string): v is Channel {
  return CHANNELS.some((c) => c.id === v);
}

export function isPayment(v: string): v is Payment {
  return PAYMENTS.some((p) => p.id === v);
}

export interface SaleLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  /** Descuento en pesos sobre la línea completa (ej. rebaja a un cliente). */
  discount?: number;
}

export interface SaleInput {
  channel: Channel;
  /** En qué feria se vendió (solo si channel = "feria"). */
  fairName?: string;
  payment: Payment;
  customer?: string;
  note?: string;
  /** Fecha AAAA-MM-DD; vacío = hoy. */
  date?: string;
  discountStock: boolean;
  lines: SaleLineInput[];
}

type LineAmounts = Pick<SaleLineInput, "quantity" | "unitPrice" | "discount">;

/** Lo que paga el cliente por una línea: precio normal menos descuento. */
export function lineTotal(l: LineAmounts): number {
  return l.quantity * l.unitPrice - (l.discount ?? 0);
}

export function saleTotal(lines: LineAmounts[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}
