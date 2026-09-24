import "server-only";
import type { PromoCode as PromoRow } from "@prisma/client";
import { isISODate } from "@/domain/event";
import { MAX_PERCENT, type Promo, type PromoErrors, type PromoInput, type PromoRule, isPromoKind, normalizeCode } from "@/domain/promo";
import { formatPrice } from "@/lib/format";
import { db } from "../db";

export type SavePromoResult = { ok: true; id: string } | { ok: false; errors: PromoErrors };
export type CheckPromoResult = { ok: true; rule: PromoRule } | { ok: false; error: string };

function toPromo(row: PromoRow): Promo {
  return {
    id: row.id,
    code: row.code,
    kind: isPromoKind(row.kind) ? row.kind : "monto",
    value: row.value,
    minTotal: row.minTotal,
    expiresOn: row.expiresOn,
    active: row.active,
    note: row.note,
  };
}

export const promoService = {
  async list(): Promise<Promo[]> {
    const rows = await db.promoCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });
    return rows.map(toPromo);
  },

  async get(id: string): Promise<Promo | null> {
    const row = await db.promoCode.findUnique({ where: { id } });
    return row ? toPromo(row) : null;
  },

  /** Revisa un código escrito por un cliente. No revela si existe pero está apagado o vencido. */
  async check(rawCode: string, today: string, total: number): Promise<CheckPromoResult> {
    const code = normalizeCode(rawCode);
    if (!code) return { ok: false, error: "Escribe un código." };
    const row = await db.promoCode.findUnique({ where: { code } });
    if (!row || !row.active) return { ok: false, error: "Ese código no existe o ya no está activo." };
    if (row.expiresOn && row.expiresOn < today) return { ok: false, error: "Ese código ya venció." };
    const promo = toPromo(row);
    if (total < promo.minTotal) return { ok: false, error: `Este código es para compras desde ${formatPrice(promo.minTotal)}.` };
    return { ok: true, rule: { code: promo.code, kind: promo.kind, value: promo.value, minTotal: promo.minTotal } };
  },

  async save(id: string | null, input: PromoInput): Promise<SavePromoResult> {
    const code = normalizeCode(input.code);
    const errors: PromoErrors = {};
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) errors.code = "Usa de 3 a 30 letras o números, sin espacios ni tildes.";
    if (!isPromoKind(input.kind)) errors.kind = "Elige el tipo de descuento.";
    if (input.kind === "porcentaje" && (!Number.isInteger(input.value) || input.value < 1 || input.value > MAX_PERCENT)) {
      errors.value = `Pon un porcentaje entre 1 y ${MAX_PERCENT}.`;
    }
    if (input.kind === "monto" && (!Number.isInteger(input.value) || input.value < 1)) errors.value = "Pon cuánto descuenta.";
    if (!Number.isInteger(input.minTotal) || input.minTotal < 0) errors.minTotal = "Revisa el monto.";
    if (input.expiresOn && !isISODate(input.expiresOn)) errors.expiresOn = "Revisa la fecha.";
    if (!errors.code) {
      const taken = await db.promoCode.findUnique({ where: { code }, select: { id: true } });
      if (taken && taken.id !== id) errors.code = "Ya tienes un código con ese nombre.";
    }
    if (Object.keys(errors).length) return { ok: false, errors };

    const data = {
      code,
      kind: input.kind,
      value: input.value,
      minTotal: input.minTotal,
      expiresOn: input.expiresOn || null,
      active: input.active,
      note: input.note.trim() || null,
    };
    const row = id ? await db.promoCode.update({ where: { id }, data }) : await db.promoCode.create({ data });
    return { ok: true, id: row.id };
  },

  async remove(id: string) {
    await db.promoCode.delete({ where: { id } });
  },
};
