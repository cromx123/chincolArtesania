import "server-only";
import { type CartQuoteLine, QUOTE_DRAFT_STATUS, type QuoteDetail, quotePrice } from "@/domain/bot-quote";
import { type CartSelection, describeSelection, pickDiscount } from "@/domain/cart";
import { quoteVariation } from "@/domain/pricing";
import { type Product, availabilityLabel, effectivePrice } from "@/domain/product";
import { promoDiscount } from "@/domain/promo";
import { recipeCost } from "@/domain/production";
import { todayISO } from "@/lib/dates";
import { catalogService } from "../container";
import { db } from "../db";
import { customerService } from "./customer-service";
import { productAdminService } from "./product-admin-service";
import { promoService } from "./promo-service";
import { settingsService } from "./settings-service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CART_LINES = 30;
const MAX_LINE_QUANTITY = 20;

export interface CartQuoteInput {
  lines: { productId: string; quantity: number; selection: CartSelection }[];
  promoCode: string | null;
  /** Token de la clienta guardada en este dispositivo (ver saved-customer.ts). */
  customerToken: string | null;
  contact: { name: string; phone: string; email: string };
  note: string;
}

export type CartQuoteResult = { ok: true; id: string; total: number } | { ok: false; error: string };

/** Deja solo las opciones que la pieza ofrece de verdad (el carrito vive en el navegador). */
function cleanSelection(p: Product, s: CartSelection): CartSelection {
  const initials = typeof s?.initials === "string" ? s.initials.toUpperCase().replace(/[^A-ZÑ]/g, "").slice(0, 3) : "";
  return {
    leatherColor: s?.leatherColor && p.options.leatherColors.includes(s.leatherColor) ? s.leatherColor : undefined,
    threadColor: s?.threadColor && p.options.threadColors.includes(s.threadColor) ? s.threadColor : undefined,
    initials: p.options.engraving && initials ? initials : undefined,
  };
}

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
  const price = quotePrice(detail);
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

  /**
   * Cotización pedida desde el carrito: las piezas tal cual del catálogo. Precios, opciones y
   * descuento se recalculan aquí (nunca se confía en lo que manda el navegador), con las mismas
   * reglas que muestra el carrito, así el total guardado es el que vio el cliente.
   */
  async fromCart(input: CartQuoteInput): Promise<CartQuoteResult> {
    const raw = Array.isArray(input.lines) ? input.lines.slice(0, MAX_CART_LINES) : [];
    if (raw.length === 0) return { ok: false, error: "Tu carrito está vacío." };
    if (raw.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_LINE_QUANTITY)) {
      return { ok: false, error: "Revisa las cantidades del carrito." };
    }

    const products = await Promise.all(raw.map((l) => (typeof l.productId === "string" ? catalogService.getById(l.productId) : null)));
    if (products.some((p) => !p)) return { ok: false, error: "Una de las piezas ya no está en la tienda. Quítala del carrito e inténtalo de nuevo." };

    const lines: CartQuoteLine[] = raw.map((l, i) => {
      const p = products[i]!;
      const price = effectivePrice(p);
      return { productId: p.id, nombre: p.name, opciones: describeSelection(cleanSelection(p, l.selection)), cantidad: l.quantity, precioUnitario: price, subtotal: price * l.quantity };
    });
    const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);

    const token = typeof input.customerToken === "string" && input.customerToken ? input.customerToken.slice(0, 64) : null;
    const [promo, perk, device] = await Promise.all([
      input.promoCode ? promoService.check(String(input.promoCode), todayISO(), subtotal) : null,
      token ? customerService.perkFor(token) : null,
      token ? db.customerDevice.findUnique({ where: { token }, include: { customer: true } }) : null,
    ]);
    const rule = promo?.ok ? promo.rule : null;
    const descuento = pickDiscount(subtotal, rule, rule ? promoDiscount(rule, subtotal) : 0, perk);
    const total = subtotal - (descuento?.amount ?? 0);

    // Contacto: el de la clienta registrada en este dispositivo, o el que escribió.
    const contact = device
      ? { contactName: device.customer.name, contactPhone: device.customer.phone, contactEmail: device.customer.email ?? undefined }
      : {
          contactName: input.contact?.name?.trim().slice(0, 80) || undefined,
          contactPhone: input.contact?.phone?.replace(/[^\d+]/g, "").slice(0, 20) || undefined,
          contactEmail: input.contact?.email?.trim().toLowerCase().slice(0, 254) || undefined,
        };
    if (!contact.contactName) return { ok: false, error: "Escribe tu nombre." };
    if (!contact.contactPhone && !contact.contactEmail) return { ok: false, error: "Déjanos un teléfono o un correo para responderte." };
    if (contact.contactPhone && contact.contactPhone.replace(/\D/g, "").length < 8) return { ok: false, error: "Revisa el teléfono." };
    if (contact.contactEmail && !EMAIL_RE.test(contact.contactEmail)) return { ok: false, error: "Revisa el correo." };

    const pieces = lines.reduce((n, l) => n + l.cantidad, 0);
    const distinct = new Set(lines.map((l) => l.productId));
    const detail: QuoteDetail = { tipo: "carrito", lineas: lines, subtotal, descuento, total };
    const row = await db.quoteRequest.create({
      data: {
        conversationId: null,
        channel: "carrito",
        // Con una sola pieza distinta queda enlazada (sirve para "Crear encargo").
        productId: distinct.size === 1 ? lines[0].productId : null,
        productName: distinct.size === 1 ? lines[0].nombre : `Carrito · ${pieces} piezas`,
        changes: lines.map((l) => `${l.cantidad} × ${l.nombre}${l.opciones ? ` (${l.opciones})` : ""}`).join("\n"),
        estimateLow: total,
        estimateHigh: total,
        estimateDetail: JSON.stringify(detail),
        note: input.note?.trim().slice(0, 1000) || undefined,
        status: "pendiente",
        ...contact,
      },
    });
    return { ok: true, id: row.id, total };
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

  /** Las que ya no están en borrador. `productionOrder` indica si ya se agendó para producción. */
  list() {
    return db.quoteRequest.findMany({
      where: { status: { not: QUOTE_DRAFT_STATUS } },
      orderBy: { createdAt: "desc" },
      include: { product: true, productionOrder: { select: { id: true } } },
    });
  },

  /** Nuevas del chat o del carrito que la dueña aún no revisa ni agenda (la burbujita del menú). */
  pendingCount() {
    return db.quoteRequest.count({ where: { status: "pendiente", productionOrder: null } });
  },

  get(id: string) {
    return db.quoteRequest.findUnique({ where: { id }, include: { product: true } });
  },

  async setStatus(id: string, status: string) {
    await db.quoteRequest.update({ where: { id }, data: { status } });
  },
};
