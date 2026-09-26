import "server-only";
import { randomBytes } from "node:crypto";
import {
  type CustomerFormErrors,
  type CustomerFormInput,
  type CustomerStats,
  type LoyaltyKind,
  type LoyaltyPerk,
  type LoyaltyRule,
  MAX_LOYALTY_PERCENT,
  bestRule,
  isLoyaltyKind,
  normalizePhone,
  perkReason,
} from "@/domain/customer";
import { isComunaRM } from "@/domain/comunas";
import { todayISO } from "@/lib/dates";
import { db } from "../db";
import { newsletterService } from "./newsletter-service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  comuna: string | null;
  source: string | null;
  newsletter: boolean;
  createdAt: Date;
  stats: CustomerStats;
}

export type RegisterResult = { ok: true; token: string } | { ok: false; errors: CustomerFormErrors };

/** "feria:<id>" → nombre de la feria; lo demás tal cual. */
export async function sourceLabels(sources: (string | null)[]): Promise<Map<string, string>> {
  const fairIds = [...new Set(sources.filter((s): s is string => !!s?.startsWith("feria:")).map((s) => s.slice(6)))];
  const fairs = fairIds.length ? await db.fairEvent.findMany({ where: { id: { in: fairIds } }, select: { id: true, name: true } }) : [];
  const labels = new Map<string, string>();
  for (const s of sources) {
    if (!s) continue;
    if (s.startsWith("feria:")) labels.set(s, fairs.find((f) => f.id === s.slice(6))?.name ?? "Feria eliminada");
    else labels.set(s, s.charAt(0).toUpperCase() + s.slice(1));
  }
  return labels;
}

/** Origen que viene en la URL (?origen=...): solo letras, números, guiones y "feria:<id>". */
export function cleanSource(raw: string | undefined | null): string | null {
  const s = (raw ?? "").trim().toLowerCase().slice(0, 60);
  return /^[a-z0-9:_-]+$/.test(s) ? s : null;
}

async function statsFor(customerIds: string[]): Promise<Map<string, CustomerStats>> {
  const sales = customerIds.length
    ? await db.sale.findMany({
        where: { customerId: { in: customerIds } },
        select: { customerId: true, soldAt: true, items: { select: { quantity: true } } },
      })
    : [];
  const stats = new Map<string, CustomerStats>(customerIds.map((id) => [id, { pieces: 0, firstPurchase: null }]));
  for (const s of sales) {
    const st = stats.get(s.customerId!)!;
    st.pieces += s.items.reduce((n, i) => n + i.quantity, 0);
    const day = todayISO(s.soldAt);
    if (!st.firstPurchase || day < st.firstPurchase) st.firstPurchase = day;
  }
  return stats;
}

function toRule(r: { id: string; kind: string; threshold: number; percent: number; active: boolean }): LoyaltyRule {
  return { id: r.id, kind: isLoyaltyKind(r.kind) ? r.kind : "piezas", threshold: r.threshold, percent: r.percent, active: r.active };
}

export const customerService = {
  /**
   * Guarda los datos del formulario. Con `token` de este dispositivo, actualiza a esa clienta.
   * Si el celular ya estaba registrado desde otro dispositivo, solo completa lo que faltaba
   * (nadie puede cambiar los datos de otra persona escribiendo su número).
   */
  async register(input: CustomerFormInput, token: string | null, source: string | null): Promise<RegisterResult> {
    const errors: CustomerFormErrors = {};
    const name = input.name.replace(/\s+/g, " ").trim().slice(0, 80);
    const phone = normalizePhone(input.phone);
    const email = input.email.trim().toLowerCase().slice(0, 254);
    const comuna = input.comuna.trim();
    if (!name) errors.name = "Escribe tu nombre.";
    if (!phone) errors.phone = "Revisa tu número (ej: 9 1234 5678).";
    if (email && !EMAIL_RE.test(email)) errors.email = "Revisa tu correo.";
    if (!input.consent) errors.consent = "Para guardar tus datos necesitamos tu autorización.";
    if (comuna && !isComunaRM(comuna)) errors.comuna = "Elige tu comuna de la lista.";
    if (input.newsletter && !email) errors.email = "Para recibir novedades escribe tu correo.";
    if (Object.keys(errors).length) return { ok: false, errors };

    const data = { name, email: email || null, comuna: comuna || null, newsletter: input.newsletter };
    const own = token ? await db.customerDevice.findUnique({ where: { token }, include: { customer: true } }) : null;
    const byPhone = await db.customer.findUnique({ where: { phone: phone! } });

    let customerId: string;
    if (own && (!byPhone || byPhone.id === own.customerId)) {
      await db.customer.update({ where: { id: own.customerId }, data: { ...data, phone: phone!, consentAt: new Date() } });
      customerId = own.customerId;
    } else if (byPhone) {
      await db.customer.update({
        where: { id: byPhone.id },
        data: { email: byPhone.email ?? data.email, comuna: byPhone.comuna ?? data.comuna, newsletter: byPhone.newsletter || data.newsletter },
      });
      customerId = byPhone.id;
    } else {
      const created = await db.customer.create({ data: { ...data, phone: phone!, source, consentAt: new Date() } });
      customerId = created.id;
    }

    if (input.newsletter && email) await newsletterService.subscribe(email);
    const newToken = own?.customerId === customerId ? own.token : randomBytes(24).toString("base64url");
    if (newToken !== own?.token) await db.customerDevice.create({ data: { token: newToken, customerId } });
    await db.formVisit.create({ data: { source, saved: true } });
    return { ok: true, token: newToken };
  },

  async recordSkip(source: string | null) {
    await db.formVisit.create({ data: { source, saved: false } });
  },

  /** Descuento para la clienta de este dispositivo (null si no hay o no aplica). */
  async perkFor(token: string): Promise<LoyaltyPerk | null> {
    const device = await db.customerDevice.findUnique({ where: { token }, select: { customerId: true } });
    if (!device) return null;
    const [rules, stats] = await Promise.all([this.rules(), statsFor([device.customerId])]);
    const rule = bestRule(rules, stats.get(device.customerId)!, todayISO());
    return rule ? { percent: rule.percent, reason: perkReason(rule) } : null;
  },

  async list(): Promise<CustomerSummary[]> {
    const rows = await db.customer.findMany({ orderBy: { createdAt: "desc" } });
    const stats = await statsFor(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, stats: stats.get(r.id)! }));
  },

  async get(id: string): Promise<CustomerSummary | null> {
    const row = await db.customer.findUnique({ where: { id } });
    if (!row) return null;
    const stats = await statsFor([id]);
    return { ...row, stats: stats.get(id)! };
  },

  /** Para elegir la clienta al registrar una venta. */
  async pickList(): Promise<{ id: string; name: string; phone: string }[]> {
    return db.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } });
  },

  /** Borra a la clienta y sus dispositivos. Sus ventas quedan, sin la clienta asociada. */
  async remove(id: string) {
    await db.customer.delete({ where: { id } });
  },

  /** Cuántas personas terminaron el formulario por origen, y cuántas guardaron sus datos. */
  async visitsBySource(): Promise<{ source: string | null; label: string; total: number; saved: number }[]> {
    const groups = await db.formVisit.groupBy({ by: ["source", "saved"], _count: { _all: true } });
    const labels = await sourceLabels(groups.map((g) => g.source));
    const bySource = new Map<string | null, { total: number; saved: number }>();
    for (const g of groups) {
      const cur = bySource.get(g.source) ?? { total: 0, saved: 0 };
      cur.total += g._count._all;
      if (g.saved) cur.saved += g._count._all;
      bySource.set(g.source, cur);
    }
    return [...bySource.entries()]
      .map(([source, v]) => ({ source, label: source ? (labels.get(source) ?? source) : "Directo / sin origen", ...v }))
      .sort((a, b) => b.total - a.total);
  },

  async rules(): Promise<LoyaltyRule[]> {
    const rows = await db.loyaltyRule.findMany({ orderBy: [{ kind: "asc" }, { threshold: "asc" }] });
    return rows.map(toRule);
  },

  async addRule(kind: LoyaltyKind, threshold: number, percent: number): Promise<string | null> {
    if (!isLoyaltyKind(kind)) return "Elige el tipo de descuento.";
    if (!Number.isInteger(threshold) || threshold < 1 || threshold > 999) return kind === "antiguedad" ? "Pon cuántos meses." : "Pon cuántas piezas.";
    if (!Number.isInteger(percent) || percent < 1 || percent > MAX_LOYALTY_PERCENT) return `El descuento va de 1% a ${MAX_LOYALTY_PERCENT}%.`;
    await db.loyaltyRule.create({ data: { kind, threshold, percent } });
    return null;
  },

  async setRuleActive(id: string, active: boolean) {
    await db.loyaltyRule.update({ where: { id }, data: { active } });
  },

  async removeRule(id: string) {
    await db.loyaltyRule.delete({ where: { id } });
  },
};
