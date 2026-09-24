// Clientas registradas en /formulario y sus descuentos automáticos.

export const LOYALTY_KINDS = [
  { id: "antiguedad", name: "Por antigüedad" },
  { id: "piezas", name: "Por piezas compradas" },
] as const;
export type LoyaltyKind = (typeof LOYALTY_KINDS)[number]["id"];

export interface LoyaltyRule {
  id: string;
  kind: LoyaltyKind;
  /** Meses desde la primera compra, o piezas compradas. */
  threshold: number;
  percent: number;
  active: boolean;
}

export interface CustomerStats {
  pieces: number;
  /** Primera compra registrada, "2026-03-14"; null si aún no compra. */
  firstPurchase: string | null;
}

/** Descuento que el carrito aplica solo cuando reconoce a la clienta. */
export interface LoyaltyPerk {
  percent: number;
  reason: string;
}

export interface CustomerFormInput {
  name: string;
  phone: string;
  email: string;
  comuna: string;
  newsletter: boolean;
  consent: boolean;
}

export type CustomerFormErrors = Partial<Record<keyof CustomerFormInput, string>>;

export const MAX_LOYALTY_PERCENT = 50;

export function isLoyaltyKind(v: string): v is LoyaltyKind {
  return LOYALTY_KINDS.some((k) => k.id === v);
}

/** "+56 9 1234 5678" o "912345678" → "56912345678". Devuelve null si no parece un celular. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("9")) digits = `56${digits}`; // celular chileno sin código
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/** "56912345678" → "+56 9 1234 5678" (otros países: "+" y los dígitos). */
export function formatPhone(digits: string): string {
  const m = digits.match(/^56(9)(\d{4})(\d{4})$/);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : `+${digits}`;
}

/** Meses completos entre dos fechas "YYYY-MM-DD". */
export function monthsBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}

export function describeRule(r: Pick<LoyaltyRule, "kind" | "threshold" | "percent">): string {
  const cond =
    r.kind === "antiguedad"
      ? `desde ${r.threshold === 1 ? "1 mes" : `${r.threshold} meses`} de su primera compra`
      : `desde ${r.threshold === 1 ? "1 pieza comprada" : `${r.threshold} piezas compradas`}`;
  return `${r.percent}% ${cond}`;
}

/** La regla activa de mayor porcentaje que la clienta cumple (no se suman). */
export function bestRule(rules: LoyaltyRule[], stats: CustomerStats, today: string): LoyaltyRule | null {
  const months = stats.firstPurchase ? monthsBetween(stats.firstPurchase, today) : -1;
  const met = rules.filter((r) => r.active && (r.kind === "antiguedad" ? months >= r.threshold : stats.pieces >= r.threshold));
  return met.sort((a, b) => b.percent - a.percent)[0] ?? null;
}

export function perkReason(rule: LoyaltyRule): string {
  return rule.kind === "antiguedad" ? "por ser clienta antigua" : "por tus compras anteriores";
}
