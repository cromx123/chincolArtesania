// Cotizaciones que hace el bot de clientes.

import type { VariationQuote } from "./pricing";

export const QUOTE_STATUSES = [
  { id: "pendiente", name: "Pendiente" },
  { id: "revisada", name: "Revisada" },
  { id: "respondida", name: "Respondida" },
  { id: "descartada", name: "Descartada" },
] as const;

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]["id"];

/**
 * El bot ya le dio el precio al cliente, pero él todavía no deja sus datos. No se muestra
 * en el admin: al dejar el contacto pasa a "pendiente" con el mismo precio que vio.
 */
export const QUOTE_DRAFT_STATUS = "sin-contacto";

export function isQuoteStatus(value: string): value is QuoteStatus {
  return QUOTE_STATUSES.some((s) => s.id === value);
}

export function quoteStatusName(id: string): string {
  return QUOTE_STATUSES.find((s) => s.id === id)?.name ?? id;
}

const QUOTE_CHANNELS: Record<string, string> = { web: "Chat web", whatsapp: "WhatsApp", instagram: "Instagram", carrito: "Carrito web" };

/** De dónde llegó la cotización: el chat (web, WhatsApp, Instagram) o el botón del carrito. */
export function quoteChannelName(channel: string): string {
  return QUOTE_CHANNELS[channel] ?? channel;
}

/** Una línea de una cotización pedida desde el carrito. */
export interface CartQuoteLine {
  productId: string;
  nombre: string;
  /** Opciones elegidas, ej: "Cuero caramelo · hilo natural". */
  opciones: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

/** Cómo se llegó al precio (se guarda como JSON en QuoteRequest.estimateDetail). */
export type QuoteDetail =
  | { tipo: "catalogo"; precio: number; precioNormal: number; disponibilidad: string }
  | ({ tipo: "variacion" } & VariationQuote)
  | { tipo: "carrito"; lineas: CartQuoteLine[]; subtotal: number; descuento: { label: string; amount: number } | null; total: number };

/** El precio final que vio el cliente, según el tipo de cotización. */
export function quotePrice(detail: QuoteDetail): number {
  if (detail.tipo === "catalogo") return detail.precio;
  if (detail.tipo === "variacion") return detail.price;
  return detail.total;
}

export function parseQuoteDetail(json: string): QuoteDetail | null {
  try {
    const value = JSON.parse(json);
    return value?.tipo === "catalogo" || value?.tipo === "variacion" || value?.tipo === "carrito" ? (value as QuoteDetail) : null;
  } catch {
    return null;
  }
}
